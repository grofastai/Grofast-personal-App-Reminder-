'use client'

export type Reminder = {
  id: string
  title: string
  category: string
  due_at: string
  recurrence: string
  recurrence_rule: string
  status: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  professional: '💼', personal: '👤', finance: '💰', health: '❤️', other: '📋',
}

const CATEGORY_COLOR: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-700',
  personal: 'bg-purple-100 text-purple-700',
  finance: 'bg-green-100 text-green-700',
  health: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700',
}

export function ReminderCard({
  reminder, onDone, onDelete, onSnooze,
}: {
  reminder: Reminder
  onDone: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string) => void
}) {
  const emoji = CATEGORY_EMOJI[reminder.category] || '📋'
  const color = CATEGORY_COLOR[reminder.category] || 'bg-gray-100 text-gray-700'
  const due = new Date(reminder.due_at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  })

  return (
    <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-xl mt-0.5">{emoji}</span>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{reminder.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">⏰ {due}</p>
          {reminder.recurrence !== 'none' && reminder.recurrence_rule && (
            <p className="text-xs text-gray-400 mt-0.5">🔁 {reminder.recurrence_rule}</p>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${color}`}>
            {reminder.category}
          </span>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onDone(reminder.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">✅</button>
        <button onClick={() => onSnooze(reminder.id)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors">😴</button>
        <button onClick={() => onDelete(reminder.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">🗑️</button>
      </div>
    </div>
  )
}
