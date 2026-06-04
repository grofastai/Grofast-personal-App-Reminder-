import { parseTaskTitle, parseDatetime, parseRecurrence, parseCategory, parsePriority, parseSnoozeTime, computeNextOccurrence } from '@/lib/ai'

describe('parseTaskTitle', () => {
  it('strips "Remind me to" prefix', async () => {
    expect(await parseTaskTitle('Remind me to pay EB bill')).toBe('pay EB bill')
  })
  it('returns raw message if no known prefix', async () => {
    expect(await parseTaskTitle('Pay EB bill')).toBe('Pay EB bill')
  })
})

describe('parseDatetime', () => {
  it('parses a future date expression', async () => {
    const result = await parseDatetime('tomorrow at 10am')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getTime()).toBeGreaterThan(Date.now())
  })
  it('returns null for unparseable input', async () => {
    expect(await parseDatetime('garbled text xyz')).toBeNull()
  })
  it('handles Thanglish: kal = tomorrow', async () => {
    const result = await parseDatetime('kal 9am')
    expect(result).toBeInstanceOf(Date)
  })
})

describe('parseRecurrence', () => {
  it('returns none for "no"', async () => {
    const r = await parseRecurrence('no')
    expect(r.recurrence).toBe('none')
    expect(r.recurrence_rule).toBe('')
  })
  it('returns daily for "every day"', async () => {
    expect((await parseRecurrence('every day')).recurrence).toBe('daily')
  })
  it('returns weekly for "weekly"', async () => {
    expect((await parseRecurrence('weekly')).recurrence).toBe('weekly')
  })
  it('returns monthly with day for "monthly 5th"', async () => {
    const r = await parseRecurrence('monthly 5th')
    expect(r.recurrence).toBe('monthly')
    expect(r.recurrence_rule).toContain('5')
  })
  it('returns custom for "every 3 days"', async () => {
    const r = await parseRecurrence('every 3 days')
    expect(r.recurrence).toBe('custom')
    expect(r.recurrence_rule).toBe('Every 3 days')
  })
})

describe('parseCategory', () => {
  it('classifies "pay EB bill" as finance', async () => {
    expect(await parseCategory('pay EB bill')).toBe('finance')
  })
  it('classifies "doctor appointment" as health', async () => {
    expect(await parseCategory('doctor appointment')).toBe('health')
  })
  it('classifies "team meeting" as professional', async () => {
    expect(await parseCategory('team meeting')).toBe('professional')
  })
  it('classifies "birthday party" as personal', async () => {
    expect(await parseCategory('birthday party')).toBe('personal')
  })
  it('defaults to other for unrecognised title', async () => {
    expect(await parseCategory('random stuff xyz')).toBe('other')
  })
})

describe('parsePriority', () => {
  it('returns critical for urgent keywords', async () => {
    expect(await parsePriority('pay EB bill URGENT')).toBe('critical')
  })
  it('returns critical for "last date"', async () => {
    expect(await parsePriority('last date to submit form')).toBe('critical')
  })
  it('returns important for meeting', async () => {
    expect(await parsePriority('client meeting at 3pm')).toBe('important')
  })
  it('returns important for deadline', async () => {
    expect(await parsePriority('project deadline tomorrow')).toBe('important')
  })
  it('returns normal for everyday tasks', async () => {
    expect(await parsePriority('buy groceries')).toBe('normal')
  })
})

describe('parseSnoozeTime', () => {
  it('parses a future snooze time', async () => {
    const result = await parseSnoozeTime('tomorrow at 3pm', new Date().toISOString())
    expect(result).toBeInstanceOf(Date)
  })
  it('returns null for unparseable snooze', async () => {
    expect(await parseSnoozeTime('blah blah blah', new Date().toISOString())).toBeNull()
  })
})

describe('computeNextOccurrence', () => {
  it('adds 1 day for daily', async () => {
    const due = '2026-06-05T10:00:00+05:30'
    const next = await computeNextOccurrence({ due_at: due, recurrence: 'daily', recurrence_rule: 'Every day' })
    expect(next.getDate()).toBe(new Date(due).getDate() + 1)
  })
  it('adds 7 days for weekly', async () => {
    const due = '2026-06-05T10:00:00+05:30'
    const next = await computeNextOccurrence({ due_at: due, recurrence: 'weekly', recurrence_rule: 'Every week' })
    expect(next.getTime() - new Date(due).getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })
  it('adds 1 month for monthly', async () => {
    const due = '2026-06-05T10:00:00+05:30'
    const next = await computeNextOccurrence({ due_at: due, recurrence: 'monthly', recurrence_rule: 'Every month' })
    expect(next.getMonth()).toBe(new Date(due).getMonth() + 1)
  })
  it('handles custom "every 3 days"', async () => {
    const due = '2026-06-05T10:00:00+05:30'
    const next = await computeNextOccurrence({ due_at: due, recurrence: 'custom', recurrence_rule: 'Every 3 days' })
    expect(next.getTime() - new Date(due).getTime()).toBe(3 * 24 * 60 * 60 * 1000)
  })
})
