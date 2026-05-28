import { supabase } from './supabase'
import { sendWhatsAppMessage } from './whatsapp'
import { computeNextOccurrence } from './ai'

const CATEGORY_EMOJI: Record<string, string> = {
  professional: '💼',
  personal: '👤',
  finance: '💰',
  health: '❤️',
  other: '📋',
}

function formatIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export async function checkAndFireReminders(): Promise<void> {
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .lte('due_at', new Date().toISOString())
    .eq('status', 'pending')

  if (error) throw error
  if (!reminders?.length) return

  for (const reminder of reminders) {
    const emoji = CATEGORY_EMOJI[reminder.category] || '📋'
    const message =
      `⏰ REMINDER — ${reminder.title}\n` +
      `Category: ${emoji} ${reminder.category}\n` +
      `Set on: ${formatIST(reminder.created_at)} | Due: ${formatIST(reminder.due_at)}\n\n` +
      `Reply:\n✅ DONE — mark as complete\n😴 SNOOZE — remind later`

    await sendWhatsAppMessage(reminder.whatsapp_number, message)

    await supabase
      .from('reminder_logs')
      .insert({ reminder_id: reminder.id, action: 'sent' })

    await supabase.from('conversations').upsert(
      {
        whatsapp_number: reminder.whatsapp_number,
        state: 'idle',
        context: { active_reminder_id: reminder.id },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'whatsapp_number' }
    )

    if (reminder.recurrence !== 'none') {
      const next = await computeNextOccurrence(reminder)
      await supabase
        .from('reminders')
        .update({ due_at: next.toISOString() })
        .eq('id', reminder.id)
    } else {
      await supabase
        .from('reminders')
        .update({ status: 'snoozed' })
        .eq('id', reminder.id)
    }
  }
}
