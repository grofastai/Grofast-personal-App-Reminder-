import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const IST_TIME_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userNumber = process.env.USER_WHATSAPP_NUMBER
  if (!userNumber) return NextResponse.json({ error: 'USER_WHATSAPP_NUMBER not set' }, { status: 500 })

  // Get today's date range in IST
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const todayStart = new Date(istNow); todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', 'pending')
    .gte('due_at', todayStart.toISOString())
    .lt('due_at', tomorrowStart.toISOString())
    .order('due_at')

  if (!reminders?.length) {
    await sendWhatsAppMessage(
      userNumber,
      `🌅 Good Morning da!\n\nToday no reminders! Free day — enjoy! 🎉`
    )
    return NextResponse.json({ sent: true, count: 0 })
  }

  const critical = reminders.filter(r => r.priority === 'critical')
  const important = reminders.filter(r => r.priority === 'important')
  const normal = reminders.filter(r => r.priority === 'normal')

  const formatLine = (r: { due_at: string; title: string }) =>
    `• ${new Date(r.due_at).toLocaleTimeString('en-IN', IST_TIME_OPTS)} — ${r.title}`

  const sections: string[] = []
  if (critical.length) sections.push(`🔴 Critical (${critical.length})\n${critical.map(formatLine).join('\n')}`)
  if (important.length) sections.push(`🟠 Important (${important.length})\n${important.map(formatLine).join('\n')}`)
  if (normal.length) sections.push(`🟢 Normal (${normal.length})\n${normal.map(formatLine).join('\n')}`)

  const message = [
    `🌅 Good Morning da!`,
    ``,
    `Today's Focus — ${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`,
    ``,
    sections.join('\n\n'),
    ``,
    `Have a productive day! 🚀`,
  ].join('\n')

  await sendWhatsAppMessage(userNumber, message)
  return NextResponse.json({ sent: true, count: reminders.length })
}
