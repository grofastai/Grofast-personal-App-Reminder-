import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { parseTaskTitle, parseDatetime, parseRecurrence, parseCategory, parseSnoozeTime } from '@/lib/ai'

const IST_OPTS: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }

function formatIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', IST_OPTS)
}

// WhatsApp webhook verification (GET)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// WhatsApp incoming messages (POST)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message || message.type !== 'text') return ok()

  const from: string = message.from
  const text: string = message.text.body.trim()

  // Only respond to the configured user number
  const userNumber = (process.env.USER_WHATSAPP_NUMBER ?? '').replace('+', '')
  if (from !== userNumber) return ok()

  const { data: conv } = await supabase.from('conversations').select('*').eq('whatsapp_number', from).single()
  const state: string = conv?.state ?? 'idle'
  const context: Record<string, unknown> = conv?.context ?? {}

  const cmd = text.toUpperCase().trim()

  if (cmd === 'DONE')    return handleDone(from, context)
  if (cmd === 'SNOOZE')  return handleSnoozeStart(from, context)
  if (cmd === 'LIST')    return handleList(from)
  if (cmd === 'ALL')     return handleAll(from)
  if (cmd === 'DELETE')  return handleDeleteStart(from)
  if (cmd === 'HELP')    return handleHelp(from)

  if (state === 'waiting_time')             return handleWaitingTime(from, text, context)
  if (state === 'waiting_recurrence')       return handleWaitingRecurrence(from, text, context)
  if (state === 'waiting_snooze_time')      return handleWaitingSnoozeTime(from, text, context)
  if (state === 'waiting_delete_confirm')   return handleDeleteConfirm(from, text, context)

  return handleNewReminder(from, text)
}

function ok() {
  return NextResponse.json({ status: 'ok' })
}

async function setConv(whatsappNumber: string, state: string, context: Record<string, unknown>) {
  await supabase.from('conversations').upsert(
    { whatsapp_number: whatsappNumber, state, context, updated_at: new Date().toISOString() },
    { onConflict: 'whatsapp_number' }
  )
}

async function handleNewReminder(from: string, text: string) {
  const title = await parseTaskTitle(text)
  await sendWhatsAppMessage(from, `Ok! "${title}" remind panren 💡\nEppo remind pannanum? (date and time sollu)`)
  await setConv(from, 'waiting_time', { title })
  return ok()
}

async function handleWaitingTime(from: string, text: string, context: Record<string, unknown>) {
  const dueAt = await parseDatetime(text)
  if (!dueAt) {
    await sendWhatsAppMessage(from, 'Date time puriyala da 😅 Correct ah sollu\n(e.g. "June 5 morning 10", "tomorrow 3pm")')
    return ok()
  }
  const formatted = formatIST(dueAt.toISOString())
  await sendWhatsAppMessage(from, `${formatted} — correct ah?\nRepeat aaganum-a? (daily/weekly/monthly/custom/no)`)
  await setConv(from, 'waiting_recurrence', { ...context, due_at: dueAt.toISOString() })
  return ok()
}

async function handleWaitingRecurrence(from: string, text: string, context: Record<string, unknown>) {
  const [{ recurrence, recurrence_rule }, category] = await Promise.all([
    parseRecurrence(text),
    parseCategory(context.title as string),
  ])

  await supabase.from('reminders').insert({
    title: context.title,
    category,
    due_at: context.due_at,
    recurrence,
    recurrence_rule,
    status: 'pending',
    whatsapp_number: from,
  })

  const formatted = formatIST(context.due_at as string)
  const repeatText = recurrence === 'none' ? 'one time only' : recurrence_rule
  await sendWhatsAppMessage(from, `✅ Done! ${formatted} ku "${context.title}" — remind panren! 🎯\nRepeat: ${repeatText}`)
  await setConv(from, 'idle', {})
  return ok()
}

async function handleDone(from: string, context: Record<string, unknown>) {
  const reminderId = context.active_reminder_id as string | undefined
  if (!reminderId) {
    await sendWhatsAppMessage(from, 'Active reminder illa da 😅 Nothing to mark done.')
    return ok()
  }
  const { data: reminder } = await supabase.from('reminders').update({ status: 'done' }).eq('id', reminderId).select().single()
  await supabase.from('reminder_logs').insert({ reminder_id: reminderId, action: 'done' })
  await sendWhatsAppMessage(from, `✅ "${reminder?.title}" — completed! Great job da! 💪`)
  await setConv(from, 'idle', {})
  return ok()
}

async function handleSnoozeStart(from: string, context: Record<string, unknown>) {
  if (!context.active_reminder_id) {
    await sendWhatsAppMessage(from, 'Snooze panna active reminder illa da 😅')
    return ok()
  }
  await sendWhatsAppMessage(from, 'Seri! Eppo remind pannanum?')
  await setConv(from, 'waiting_snooze_time', context)
  return ok()
}

async function handleWaitingSnoozeTime(from: string, text: string, context: Record<string, unknown>) {
  const { data: reminder } = await supabase.from('reminders').select('due_at').eq('id', context.active_reminder_id).single()
  const newDueAt = await parseSnoozeTime(text, reminder?.due_at ?? new Date().toISOString())
  if (!newDueAt) {
    await sendWhatsAppMessage(from, 'Time puriyala da 😅 Again sollu (e.g. "1 hour", "tomorrow same time")')
    return ok()
  }
  await supabase.from('reminders').update({ due_at: newDueAt.toISOString(), status: 'pending' }).eq('id', context.active_reminder_id)
  await supabase.from('reminder_logs').insert({ reminder_id: context.active_reminder_id, action: 'snoozed' })
  await sendWhatsAppMessage(from, `✅ ${formatIST(newDueAt.toISOString())} ku remind panren! 🔔`)
  await setConv(from, 'idle', {})
  return ok()
}

async function handleList(from: string) {
  // Compute IST midnight by using IST date string
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const todayIST = new Date(istNow)
  todayIST.setHours(0, 0, 0, 0)
  const tomorrowIST = new Date(todayIST)
  tomorrowIST.setDate(tomorrowIST.getDate() + 1)

  const { data } = await supabase.from('reminders').select('*').eq('status', 'pending')
    .gte('due_at', todayIST.toISOString()).lt('due_at', tomorrowIST.toISOString()).order('due_at')

  if (!data?.length) {
    await sendWhatsAppMessage(from, 'Today no reminders da! 🎉')
    return ok()
  }

  const list = data.map(r =>
    `⏰ ${new Date(r.due_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' })} — ${r.title}`
  ).join('\n')
  await sendWhatsAppMessage(from, `📋 Today's reminders:\n\n${list}`)
  return ok()
}

async function handleAll(from: string) {
  const { data } = await supabase.from('reminders').select('*').eq('status', 'pending')
    .gte('due_at', new Date().toISOString()).order('due_at').limit(10)

  if (!data?.length) {
    await sendWhatsAppMessage(from, 'No upcoming reminders da! 🎉')
    return ok()
  }

  const list = data.map(r => `📅 ${formatIST(r.due_at)} — ${r.title}`).join('\n')
  await sendWhatsAppMessage(from, `📋 Upcoming (next 10):\n\n${list}`)
  return ok()
}

async function handleDeleteStart(from: string) {
  const { data } = await supabase.from('reminders').select('*').eq('status', 'pending')
    .gte('due_at', new Date().toISOString()).order('due_at').limit(10)

  if (!data?.length) {
    await sendWhatsAppMessage(from, 'Delete panna reminders illa da!')
    return ok()
  }

  const list = data.map((r, i) => `${i + 1}. ${r.title}`).join('\n')
  await sendWhatsAppMessage(from, `Enna delete pannanum? Number sollu:\n\n${list}`)
  await setConv(from, 'waiting_delete_confirm', { reminder_ids: data.map(r => r.id) })
  return ok()
}

async function handleDeleteConfirm(from: string, text: string, context: Record<string, unknown>) {
  const ids = context.reminder_ids as string[]
  const num = parseInt(text.trim())
  if (isNaN(num) || num < 1 || num > ids.length) {
    await sendWhatsAppMessage(from, `1 to ${ids.length} la number sollu da 😅`)
    return ok()
  }
  const reminderId = ids[num - 1]
  const { data: reminder } = await supabase.from('reminders').select('title').eq('id', reminderId).single()
  await supabase.from('reminders').delete().eq('id', reminderId)
  await sendWhatsAppMessage(from, `✅ "${reminder?.title}" — deleted! 🗑️`)
  await setConv(from, 'idle', {})
  return ok()
}

async function handleHelp(from: string) {
  await sendWhatsAppMessage(from,
    `🤖 Saji Commands:\n\nJust type anything to set a new reminder!\n\nLIST — Today's reminders\nALL — All upcoming (next 10)\nDELETE — Delete a reminder\nDONE — Mark active reminder done\nSNOOZE — Snooze active reminder\nHELP — This message`
  )
  return ok()
}
