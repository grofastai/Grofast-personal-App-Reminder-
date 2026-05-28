import Anthropic from '@anthropic-ai/sdk'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AnthropicClass: typeof Anthropic = (require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk'))

let _client: InstanceType<typeof Anthropic> | null = null
function getClient(): InstanceType<typeof Anthropic> {
  if (!_client) _client = new AnthropicClass()
  return _client
}

function nowIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

async function ask(prompt: string, maxTokens = 200): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return (response.content[0] as { type: string; text: string }).text.trim()
}

export async function parseTaskTitle(message: string): Promise<string> {
  return ask(
    `Extract the reminder task title from this message. Return ONLY the task title, nothing else, no quotes.\nMessage: "${message}"\nTask title:`,
    100
  )
}

export async function parseDatetime(message: string): Promise<Date | null> {
  const text = await ask(
    `Current time: ${nowIST()} (timezone: Asia/Kolkata, IST UTC+5:30)\nParse the date and time from this expression. Return an ISO 8601 datetime string with IST offset (+05:30). If you cannot parse it, return the word null.\nExpression: "${message}"`,
    50
  )
  if (text === 'null' || text.toLowerCase().includes('null')) return null
  const date = new Date(text)
  return isNaN(date.getTime()) ? null : date
}

export async function parseRecurrence(message: string): Promise<{ recurrence: string; recurrence_rule: string }> {
  const text = await ask(
    `Parse the recurrence from this message. Return a JSON object with exactly two keys:\n- recurrence: one of "none", "daily", "weekly", "monthly", "custom"\n- recurrence_rule: a short human-readable description (empty string if none)\nReturn ONLY the JSON object, no other text.\nMessage: "${message}"`,
    150
  )
  return JSON.parse(text)
}

export async function parseCategory(taskTitle: string): Promise<string> {
  const text = await ask(
    `Classify this reminder into exactly one category. Return ONLY the category word, nothing else.\nCategories: professional, personal, finance, health, other\nReminder: "${taskTitle}"`,
    20
  )
  const valid = ['professional', 'personal', 'finance', 'health', 'other']
  return valid.includes(text) ? text : 'other'
}

export async function parseSnoozeTime(message: string, originalDueAt: string): Promise<Date | null> {
  const text = await ask(
    `Current time: ${nowIST()} (timezone: Asia/Kolkata, IST UTC+5:30)\nOriginal due time: ${originalDueAt}\nParse the new reminder time from this snooze message. Return an ISO 8601 datetime with IST offset (+05:30). If you cannot parse it, return null.\nMessage: "${message}"`,
    50
  )
  if (text === 'null' || text.toLowerCase().includes('null')) return null
  const date = new Date(text)
  return isNaN(date.getTime()) ? null : date
}

export async function computeNextOccurrence(reminder: {
  due_at: string
  recurrence: string
  recurrence_rule: string
}): Promise<Date> {
  const text = await ask(
    `Current occurrence: ${reminder.due_at}\nRecurrence type: ${reminder.recurrence}\nRecurrence rule: ${reminder.recurrence_rule}\nCompute the NEXT occurrence after the current one. Return ONLY an ISO 8601 datetime string with IST offset (+05:30), nothing else.`,
    50
  )
  return new Date(text)
}
