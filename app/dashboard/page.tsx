'use client'
import { useEffect, useState, useCallback } from 'react'
import { CategoryFilter } from '@/components/CategoryFilter'
import { ReminderCard, type Reminder } from '@/components/ReminderCard'
import { AddReminderForm } from '@/components/AddReminderForm'
import Link from 'next/link'

function groupByDay(reminders: Reminder[]) {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const dayAfterStart = new Date(tomorrowStart); dayAfterStart.setDate(dayAfterStart.getDate() + 1)

  return {
    today: reminders.filter(r => { const d = new Date(r.due_at); return d >= todayStart && d < tomorrowStart }),
    tomorrow: reminders.filter(r => { const d = new Date(r.due_at); return d >= tomorrowStart && d < dayAfterStart }),
    upcoming: reminders.filter(r => new Date(r.due_at) >= dayAfterStart),
  }
}

type FormData = {
  title: string
  category: string
  due_at: string
  recurrence: string
  recurrence_rule: string
}

export default function DashboardPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'pending' })
    if (category !== 'all') params.set('category', category)
    const res = await fetch(`/api/reminders?${params}`)
    setReminders(await res.json())
    setLoading(false)
  }, [category])

  useEffect(() => { load() }, [load])

  async function handleDone(id: string) {
    await fetch('/api/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'done' }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this reminder?')) return
    await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function handleSnooze(id: string) {
    const input = prompt('Snooze until? (YYYY-MM-DDTHH:MM)')
    if (!input) return
    await fetch('/api/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, due_at: new Date(input).toISOString(), status: 'pending' }),
    })
    load()
  }

  async function handleAdd(data: FormData) {
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
  }

  const grouped = groupByDay(reminders)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Saji 🔔</h1>
          <Link href="/dashboard/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            History →
          </Link>
        </div>

        <div className="mb-4">
          <AddReminderForm onAdd={handleAdd} />
        </div>

        <div className="mb-6">
          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-16">Loading...</p>
        ) : (
          <div className="space-y-6">
            {grouped.today.length > 0 && (
              <Section title="Today" reminders={grouped.today} onDone={handleDone} onDelete={handleDelete} onSnooze={handleSnooze} />
            )}
            {grouped.tomorrow.length > 0 && (
              <Section title="Tomorrow" reminders={grouped.tomorrow} onDone={handleDone} onDelete={handleDelete} onSnooze={handleSnooze} />
            )}
            {grouped.upcoming.length > 0 && (
              <Section title="Upcoming" reminders={grouped.upcoming} onDone={handleDone} onDelete={handleDelete} onSnooze={handleSnooze} />
            )}
            {reminders.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-gray-400">No reminders! You&apos;re all clear da.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, reminders, onDone, onDelete, onSnooze }: {
  title: string
  reminders: Reminder[]
  onDone: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h2>
      <div className="space-y-2">
        {reminders.map(r => (
          <ReminderCard key={r.id} reminder={r} onDone={onDone} onDelete={onDelete} onSnooze={onSnooze} />
        ))}
      </div>
    </div>
  )
}
