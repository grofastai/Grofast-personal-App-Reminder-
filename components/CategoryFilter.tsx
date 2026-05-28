'use client'

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '📋' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'personal', label: 'Personal', emoji: '👤' },
  { value: 'finance', label: 'Finance', emoji: '💰' },
  { value: 'health', label: 'Health', emoji: '❤️' },
  { value: 'other', label: 'Other', emoji: '📁' },
]

export function CategoryFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === cat.value
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {cat.emoji} {cat.label}
        </button>
      ))}
    </div>
  )
}
