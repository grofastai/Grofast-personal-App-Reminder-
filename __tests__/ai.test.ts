import { parseTaskTitle, parseDatetime, parseRecurrence, parseCategory, parseSnoozeTime, computeNextOccurrence } from '@/lib/ai'

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

function mockAIResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
  })
}

beforeEach(() => mockCreate.mockClear())

describe('parseTaskTitle', () => {
  it('extracts task title from natural message', async () => {
    mockAIResponse('Pay EB bill')
    const result = await parseTaskTitle('Remind me to pay EB bill')
    expect(result).toBe('Pay EB bill')
  })
})

describe('parseDatetime', () => {
  it('returns a Date for valid datetime expression', async () => {
    mockAIResponse('2026-06-05T10:00:00+05:30')
    const result = await parseDatetime('June 5 morning 10')
    expect(result).toBeInstanceOf(Date)
    expect(result?.getMonth()).toBe(5) // June = index 5
  })

  it('returns null when AI cannot parse', async () => {
    mockAIResponse('null')
    const result = await parseDatetime('garbled text xyz')
    expect(result).toBeNull()
  })
})

describe('parseRecurrence', () => {
  it('returns monthly recurrence for "monthly 5th"', async () => {
    mockAIResponse('{"recurrence":"monthly","recurrence_rule":"Every month on the 5th"}')
    const result = await parseRecurrence('monthly 5th')
    expect(result.recurrence).toBe('monthly')
    expect(result.recurrence_rule).toBe('Every month on the 5th')
  })

  it('returns none for "no"', async () => {
    mockAIResponse('{"recurrence":"none","recurrence_rule":""}')
    const result = await parseRecurrence('no')
    expect(result.recurrence).toBe('none')
  })
})

describe('parseCategory', () => {
  it('categorises "Pay EB bill" as finance', async () => {
    mockAIResponse('finance')
    const result = await parseCategory('Pay EB bill')
    expect(result).toBe('finance')
  })

  it('falls back to "other" for unrecognised category', async () => {
    mockAIResponse('something_weird')
    const result = await parseCategory('random task')
    expect(result).toBe('other')
  })
})

describe('parseSnoozeTime', () => {
  it('returns a new Date for snooze expression', async () => {
    mockAIResponse('2026-06-06T10:00:00+05:30')
    const result = await parseSnoozeTime('tomorrow same time', '2026-06-05T10:00:00+05:30')
    expect(result).toBeInstanceOf(Date)
  })

  it('returns null when AI cannot parse snooze', async () => {
    mockAIResponse('null')
    const result = await parseSnoozeTime('blah blah', '2026-06-05T10:00:00+05:30')
    expect(result).toBeNull()
  })
})

describe('computeNextOccurrence', () => {
  it('returns next Date for a monthly reminder', async () => {
    mockAIResponse('2026-07-05T10:00:00+05:30')
    const result = await computeNextOccurrence({
      due_at: '2026-06-05T10:00:00+05:30',
      recurrence: 'monthly',
      recurrence_rule: 'Every month on the 5th',
    })
    expect(result).toBeInstanceOf(Date)
    expect(result.getMonth()).toBe(6) // July = index 6
  })
})
