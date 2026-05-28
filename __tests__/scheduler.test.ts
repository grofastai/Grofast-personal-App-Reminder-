import { checkAndFireReminders } from '@/lib/scheduler'

// Mock sendWhatsAppMessage
const mockSendWhatsApp = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: (...args: unknown[]) => mockSendWhatsApp(...args),
}))

// Mock computeNextOccurrence
const mockComputeNext = jest.fn().mockResolvedValue(new Date('2026-07-05T10:00:00+05:30'))
jest.mock('@/lib/ai', () => ({
  computeNextOccurrence: (...args: unknown[]) => mockComputeNext(...args),
}))

// Mock Supabase
const mockSupabaseFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
}))

function makeChain(finalResult: unknown) {
  const chain: Record<string, jest.Mock> = {}
  const methods = ['select', 'lte', 'eq', 'update', 'insert', 'upsert']
  methods.forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  // last call in the chain resolves to finalResult
  chain['eq'] = jest.fn().mockResolvedValue(finalResult)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('checkAndFireReminders', () => {
  it('sends WhatsApp message for each due reminder', async () => {
    const dueReminders = [
      {
        id: 'rem-1',
        title: 'Pay EB bill',
        category: 'finance',
        due_at: '2026-06-05T10:00:00+05:30',
        recurrence: 'none',
        recurrence_rule: '',
        whatsapp_number: '+919876543210',
        created_at: '2026-05-28T00:00:00+05:30',
      },
    ]

    // First call to supabase.from('reminders').select(*).lte(...).eq(...)
    // returns the due reminders list
    let callCount = 0
    mockSupabaseFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial query for due reminders
        return {
          select: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: dueReminders, error: null }),
        }
      }
      // Subsequent calls (insert logs, upsert conversation, update reminder)
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    })

    await checkAndFireReminders()

    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1)
    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      '+919876543210',
      expect.stringContaining('Pay EB bill')
    )
  })

  it('does nothing when no reminders are due', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }))

    await checkAndFireReminders()

    expect(mockSendWhatsApp).not.toHaveBeenCalled()
  })

  it('throws when Supabase query returns an error', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    }))

    await expect(checkAndFireReminders()).rejects.toThrow('DB error')
  })
})
