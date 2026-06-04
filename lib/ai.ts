import * as chrono from 'chrono-node'

const IST_OFFSET = 330 // UTC+5:30 in minutes

function normalizeThanglish(text: string): string {
  return text
    .replace(/\bkal\b/gi, 'tomorrow')
    .replace(/\binniki\b/gi, 'today')
    .replace(/\bnaalaikki\b/gi, 'tomorrow')
    .replace(/\bsubah\b/gi, 'morning')
    .replace(/\bshaam\b/gi, 'evening')
    .replace(/\braat\b/gi, 'night')
    .replace(/(\d+)\s*mani\b/gi, '$1 o\'clock')
}

export async function parseTaskTitle(message: string): Promise<string> {
  const cleaned = message
    .replace(/^(remind me to|reminder (for|to|about)|remember to|set (a )?reminder (for|to|about)?|don.?t forget to)\s*/i, '')
    .trim()
  return cleaned || message.trim()
}

export async function parseDatetime(message: string): Promise<Date | null> {
  const normalized = normalizeThanglish(message)
  const parsed = chrono.parseDate(normalized, new Date(), { forwardDate: true, timezones: { IST: IST_OFFSET } })
  return parsed ?? null
}

export async function parseRecurrence(message: string): Promise<{ recurrence: string; recurrence_rule: string }> {
  const lower = message.toLowerCase().trim()

  if (/\b(no|none|once|one.?time|not repeat|don.?t repeat|nope|single|just once)\b/.test(lower)) {
    return { recurrence: 'none', recurrence_rule: '' }
  }
  if (/\b(daily|every.?day|each.?day|everyday|per day)\b/.test(lower)) {
    return { recurrence: 'daily', recurrence_rule: 'Every day' }
  }
  if (/\b(weekly|every.?week|each.?week)\b/.test(lower)) {
    return { recurrence: 'weekly', recurrence_rule: 'Every week' }
  }
  if (/\b(monthly|every.?month|each.?month)\b/.test(lower)) {
    const dayMatch = lower.match(/\b(\d+)(st|nd|rd|th)?\b/)
    const rule = dayMatch ? `Every month on the ${dayMatch[1]}${dayMatch[2] ?? 'th'}` : 'Every month'
    return { recurrence: 'monthly', recurrence_rule: rule }
  }
  const everyN = lower.match(/every\s+(\d+)\s+(days?|weeks?|months?)/i)
  if (everyN) {
    return { recurrence: 'custom', recurrence_rule: `Every ${everyN[1]} ${everyN[2]}` }
  }

  return { recurrence: 'none', recurrence_rule: '' }
}

export async function parsePriority(message: string): Promise<string> {
  const lower = message.toLowerCase()
  if (/\b(urgent|asap|immediately|critical|emergency|last date|due today|overdue|must do|deadline today|expire|final reminder|very important)\b/.test(lower)) return 'critical'
  if (/\b(important|meeting|client|deadline|follow.?up|presentation|interview|report|salary|payment due|bill|submit)\b/.test(lower)) return 'important'
  return 'normal'
}

export async function parseCategory(taskTitle: string): Promise<string> {
  const lower = taskTitle.toLowerCase()
  if (/\b(work|meeting|office|email|client|project|deadline|report|call|task|presentation|interview|boss|standup|sprint)\b/.test(lower)) return 'professional'
  if (/\b(pay|bill|emi|loan|rent|money|bank|fee|tax|insurance|premium|salary|payment|credit|debit|upi)\b/.test(lower)) return 'finance'
  if (/\b(doctor|medicine|gym|workout|exercise|appointment|medical|hospital|health|pill|tablet|physio|diet|weight)\b/.test(lower)) return 'health'
  if (/\b(birthday|anniversary|family|friend|party|celebrate|dinner|wedding|mom|dad|sister|brother|husband|wife)\b/.test(lower)) return 'personal'
  return 'other'
}

export async function parseSnoozeTime(message: string, originalDueAt: string): Promise<Date | null> {
  const originalTime = new Date(originalDueAt)
  const timeStr = originalTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
  const normalized = normalizeThanglish(message).replace(/same time/gi, timeStr)
  const parsed = chrono.parseDate(normalized, new Date(), { forwardDate: true, timezones: { IST: IST_OFFSET } })
  return parsed ?? null
}

export async function computeNextOccurrence(reminder: {
  due_at: string
  recurrence: string
  recurrence_rule: string
}): Promise<Date> {
  const current = new Date(reminder.due_at)

  switch (reminder.recurrence) {
    case 'daily': {
      const next = new Date(current); next.setDate(next.getDate() + 1); return next
    }
    case 'weekly': {
      const next = new Date(current); next.setDate(next.getDate() + 7); return next
    }
    case 'monthly': {
      const next = new Date(current); next.setMonth(next.getMonth() + 1); return next
    }
    case 'custom': {
      const match = reminder.recurrence_rule?.match(/every\s+(\d+)\s+(day|days|week|weeks|month|months)/i)
      if (match) {
        const n = parseInt(match[1])
        const unit = match[2].toLowerCase()
        const next = new Date(current)
        if (unit.startsWith('day')) next.setDate(next.getDate() + n)
        else if (unit.startsWith('week')) next.setDate(next.getDate() + n * 7)
        else if (unit.startsWith('month')) next.setMonth(next.getMonth() + n)
        return next
      }
      const next = new Date(current); next.setDate(next.getDate() + 1); return next
    }
    default: {
      const next = new Date(current); next.setDate(next.getDate() + 1); return next
    }
  }
}
