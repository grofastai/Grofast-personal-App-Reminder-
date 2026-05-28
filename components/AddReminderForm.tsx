'use client'
import { useState } from 'react'

type FormData = {
  title: string
  category: string
  due_at: string
  recurrence: string
  recurrence_rule: string
}

const EMPTY: FormData = { title: '', category: 'other', due_at: '', recurrence: 'none', recurrence_rule: '' }

export function AddReminderForm({ onAdd }: { onAdd: (data: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)

  function set(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, due_at: new Date(form.due_at).toISOString() }
    await onAdd(payload)
    setForm(EMPTY)
    setOpen(false)
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        + Add Reminder
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
      <input required placeholder="What to remind?" value={form.title} onChange={e => set('title', e.target.value)}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.category} onChange={e => set('category', e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm">
          <option value="professional">💼 Professional</option>
          <option value="personal">👤 Personal</option>
          <option value="finance">💰 Finance</option>
          <option value="health">❤️ Health</option>
          <option value="other">📋 Other</option>
        </select>
        <input required type="datetime-local" value={form.due_at} onChange={e => set('due_at', e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm">
          <option value="none">No repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
        {form.recurrence !== 'none' && (
          <input placeholder="e.g. every month on 5th" value={form.recurrence_rule} onChange={e => set('recurrence_rule', e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? 'Saving...' : 'Save Reminder'}
        </button>
      </div>
    </form>
  )
}
