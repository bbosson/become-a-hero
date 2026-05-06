'use client'

import { useState, useRef, useEffect } from 'react'

const DND_ICONS = [
  { emoji: '⚔️', label: 'Épée' },
  { emoji: '🗡️', label: 'Dague' },
  { emoji: '🛡️', label: 'Bouclier' },
  { emoji: '🪖', label: 'Casque' },
  { emoji: '💀', label: 'Tête de mort' },
  { emoji: '👹', label: 'Monstre' },
  { emoji: '🐉', label: 'Dragon' },
  { emoji: '🧟', label: 'Zombie' },
  { emoji: '🕷️', label: 'Araignée' },
  { emoji: '🧙', label: 'Mage' },
  { emoji: '👑', label: 'Couronne' },
  { emoji: '💎', label: 'Gemme' },
  { emoji: '🏺', label: 'Calice' },
  { emoji: '🗝️', label: 'Clé' },
  { emoji: '🚪', label: 'Porte' },
  { emoji: '📜', label: 'Parchemin' },
  { emoji: '💧', label: 'Eau' },
  { emoji: '🩸', label: 'Sang' },
  { emoji: '🔥', label: 'Feu' },
  { emoji: '⚡', label: 'Éclair' },
  { emoji: '🌑', label: 'Ombre' },
  { emoji: '🌿', label: 'Nature' },
  { emoji: '🎲', label: 'Sort' },
  { emoji: '💣', label: 'Bombe' },
]

interface Props {
  number: number
  title: string | null
  icon: string | null
  onSave: (title: string) => Promise<void>
  onGenerateAI: () => Promise<string | null>
  onSaveIcon: (icon: string | null) => Promise<void>
}

export default function NodeHeader({ number, title, icon, onSave, onGenerateAI, onSaveIcon }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title || `Paragraphe ${number}`)
  const [generating, setGenerating] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const displayTitle = title || `Paragraphe ${number}`

  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const handleSave = async () => {
    if (value.trim()) await onSave(value.trim())
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

  const handleSelectIcon = async (emoji: string) => {
    setPickerOpen(false)
    await onSaveIcon(icon === emoji ? null : emoji)
  }

  return (
    <div className="flex items-center gap-2 py-3 border-b border-amber-900/20">
      {/* Icon picker */}
      <div className="relative flex-shrink-0" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(v => !v)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-stone-800/60 transition-colors text-lg border border-transparent hover:border-stone-700/50"
          title="Choisir une icône"
        >
          {icon || <span className="text-stone-600 text-xs">✦</span>}
        </button>

        {pickerOpen && (
          <div className="absolute top-10 left-0 z-50 bg-stone-900 border border-stone-700 rounded-lg p-2 shadow-xl w-52">
            <p className="text-[10px] text-stone-500 mb-2 px-1">Icône du paragraphe</p>
            <div className="grid grid-cols-6 gap-0.5">
              {DND_ICONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectIcon(emoji)}
                  title={label}
                  className={`w-8 h-8 flex items-center justify-center rounded text-base hover:bg-stone-700 transition-colors ${
                    icon === emoji ? 'bg-amber-900/40 ring-1 ring-amber-600' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {icon && (
              <button
                onClick={() => handleSelectIcon(icon)}
                className="mt-2 w-full text-[10px] text-stone-500 hover:text-red-400 transition-colors py-1"
              >
                Supprimer l&apos;icône
              </button>
            )}
          </div>
        )}
      </div>

      <span className="text-stone-500 text-sm font-mono flex-shrink-0">§{number}</span>

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
        className="text-stone-500 hover:text-stone-300 text-sm px-1 transition-colors flex-shrink-0"
        title="Modifier le titre"
      >
        ✏
      </button>

      <button
        onClick={handleGenerateAI}
        disabled={generating}
        className="text-stone-500 hover:text-amber-400 text-xs px-2 py-1 rounded border border-stone-700/50 hover:border-amber-700/50 transition-colors disabled:opacity-40 flex-shrink-0"
        title="Générer par IA"
      >
        {generating ? '...' : '✨ IA'}
      </button>
    </div>
  )
}
