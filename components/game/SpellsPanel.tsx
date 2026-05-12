'use client'

import { useState } from 'react'
import { SPELLS } from '@/lib/spells'
import { PlayerStats } from '@/types'

interface Props {
  stats: PlayerStats
  onUpdateSpells: (spellsUsed: Record<string, number>) => Promise<void>
}

export default function SpellsPanel({ stats, onUpdateSpells }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (stats.magieInit === undefined || stats.magieInit <= 0) return null

  const spellsUsed = stats.spellsUsed || {}
  const totalUsed = Object.values(spellsUsed).reduce((a, b) => a + b, 0)
  const remaining = stats.magieInit - totalUsed

  const increment = async (id: string) => {
    if (remaining <= 0) return
    const next = { ...spellsUsed, [id]: (spellsUsed[id] || 0) + 1 }
    await onUpdateSpells(next)
  }

  const decrement = async (id: string) => {
    const current = spellsUsed[id] || 0
    if (current <= 0) return
    const next = { ...spellsUsed }
    if (current - 1 <= 0) delete next[id]
    else next[id] = current - 1
    await onUpdateSpells(next)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 rounded bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 border border-purple-800/40 transition-colors"
        title="Formules magiques"
      >
        ✧ Formules ({remaining}/{stats.magieInit})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-stone-900 border border-stone-700 rounded-t-lg sm:rounded-lg flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-stone-900 border-b border-stone-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-medium text-stone-100">✧ Formules Magiques</h2>
                <span className="text-xs text-purple-300">
                  {remaining} restante{remaining > 1 ? 's' : ''} / {stats.magieInit}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-200">✕</button>
            </div>

            <ul className="flex flex-col divide-y divide-stone-800">
              {SPELLS.map(spell => {
                const count = spellsUsed[spell.id] || 0
                const isExpanded = expanded === spell.id
                return (
                  <li key={spell.id} className="px-5 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-6 text-center">{spell.icon}</span>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : spell.id)}
                        className="flex-1 text-left text-sm text-stone-200 hover:text-amber-400 transition-colors"
                      >
                        {spell.name}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => decrement(spell.id)}
                          disabled={count <= 0}
                          className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 text-sm transition-colors"
                          title="Annuler une utilisation"
                        >
                          −
                        </button>
                        <span className="tabular-nums text-sm w-6 text-center text-purple-300">{count}</span>
                        <button
                          onClick={() => increment(spell.id)}
                          disabled={remaining <= 0}
                          className="w-7 h-7 rounded bg-purple-900/40 hover:bg-purple-800/60 disabled:opacity-30 text-purple-300 text-sm transition-colors"
                          title="Utiliser la formule"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <p className="text-xs text-stone-400 leading-relaxed pl-9">{spell.description}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
