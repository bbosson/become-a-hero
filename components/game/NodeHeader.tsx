'use client'

import { useState } from 'react'

interface Props {
  number: number
  title: string | null
  onSave: (title: string) => Promise<void>
  onGenerateAI: () => Promise<string | null>
}

export default function NodeHeader({ number, title, onSave, onGenerateAI }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title || `Paragraphe ${number}`)
  const [generating, setGenerating] = useState(false)

  const displayTitle = title || `Paragraphe ${number}`

  const handleSave = async () => {
    if (value.trim()) {
      await onSave(value.trim())
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  const handleGenerateAI = async () => {
    setGenerating(true)
    const newTitle = await onGenerateAI()
    if (newTitle) setValue(newTitle)
    setGenerating(false)
  }

  return (
    <div className="flex items-center gap-2 py-3 border-b border-amber-900/20">
      <span className="text-stone-500 text-sm font-mono">── §{number} ──</span>

      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 px-2 py-1 bg-stone-800 border border-amber-700/50 rounded text-stone-100 text-sm focus:outline-none focus:border-amber-500"
        />
      ) : (
        <span className="flex-1 text-amber-200 font-medium text-sm">{displayTitle}</span>
      )}

      <button
        onClick={() => { setEditing(true); setValue(displayTitle) }}
        className="text-stone-500 hover:text-stone-300 text-sm px-1 transition-colors"
        title="Modifier le titre"
      >
        ✏
      </button>

      <button
        onClick={handleGenerateAI}
        disabled={generating}
        className="text-stone-500 hover:text-amber-400 text-xs px-2 py-1 rounded border border-stone-700/50 hover:border-amber-700/50 transition-colors disabled:opacity-40"
        title="Générer par IA"
      >
        {generating ? '...' : '✨ IA'}
      </button>
    </div>
  )
}
