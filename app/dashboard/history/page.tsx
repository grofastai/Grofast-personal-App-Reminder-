'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Reminder = { id: string; title: string; category: string; due_at: string; status: string }

export default function HistoryPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reminders?status=done')
      .then(r => r.json())
      .then(data => { setReminders(data); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Back</Link>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 py-16">Loading...</p>
        ) : reminders.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No history yet!</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-500 line-through">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✅ Done</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
