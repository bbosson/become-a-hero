'use client'

import { useState } from 'react'
import { PlayerStats } from '@/types'
import SpellsPanel from './SpellsPanel'

interface Props {
  stats: PlayerStats
  onEatProvision: () => void
  onTestLuck: () => Promise<{ lucky: boolean; roll: number } | null>
  onOpenCombat: () => void
  onEditStats: () => void
  onUpdateSpells: (spellsUsed: Record<string, number>) => Promise<void>
}

export default function StatsPanel({ stats, onEatProvision, onTestLuck, onOpenCombat, onEditStats, onUpdateSpells }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [luckResult, setLuckResult] = useState<{ lucky: boolean; roll: number } | null>(null)

  const endPct = Math.round((stats.endurance / stats.enduranceInit) * 100)
  const endColor = endPct > 60 ? 'bg-emerald-600' : endPct > 30 ? 'bg-amber-500' : 'bg-red-600'

  const handleLuck = async () => {
    const result = await onTestLuck()
    if (result) {
      setLuckResult(result)
      setTimeout(() => setLuckResult(null), 3000)
    }
  }

  if (collapsed) {
    return (
      <div className="border-t border-stone-800/50 bg-stone-950/80 px-4 py-2 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          title="Afficher les stats"
        >
          ▲ Stats
        </button>
        <span className="text-xs text-stone-400">⚔ {stats.habilite}/{stats.habiliteInit}</span>
        <span className={`text-xs ${endPct <= 30 ? 'text-red-400' : 'text-stone-400'}`}>
          ♥ {stats.endurance}/{stats.enduranceInit}
        </span>
        <span className="text-xs text-stone-400">✦ {stats.chance}/{stats.chanceInit}</span>
        {stats.magie !== undefined && (
          <span className="text-xs text-stone-400">✧ {stats.magie}/{stats.magieInit}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <SpellsPanel stats={stats} onUpdateSpells={onUpdateSpells} />
          <button
            onClick={onOpenCombat}
            className="text-xs px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-800/40 transition-colors"
          >
            ⚔ Combat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-stone-800/50 bg-stone-950/80 px-4 py-3 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500 uppercase tracking-widest">Héros</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onEditStats}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
            title="Modifier les stats"
          >
            ✎
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
            title="Réduire"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Habilité" icon="⚔" current={stats.habilite} max={stats.habiliteInit} />
        <StatBox label="Endurance" icon="♥" current={stats.endurance} max={stats.enduranceInit} danger={endPct <= 30} />
        <StatBox label="Chance" icon="✦" current={stats.chance} max={stats.chanceInit} />
        {stats.magie !== undefined && stats.magieInit !== undefined && (
          <StatBox label="Magie" icon="✧" current={stats.magie} max={stats.magieInit} />
        )}
      </div>

      {/* Endurance bar */}
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${endColor}`}
          style={{ width: `${endPct}%` }}
        />
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">🍖 {stats.provisions}</span>
          <button
            onClick={onEatProvision}
            disabled={stats.provisions <= 0 || stats.endurance >= stats.enduranceInit}
            className="text-xs px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-300 border border-stone-700 transition-colors"
            title="Manger une provision (+4 Endurance)"
          >
            Manger
          </button>
        </div>

        <button
          onClick={handleLuck}
          disabled={stats.chance <= 0}
          className="text-xs px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 border border-stone-700 transition-colors"
          title="Tenter la Chance (−1 Chance quel que soit le résultat)"
        >
          ✦ Tenter la Chance
        </button>

        {luckResult && (
          <span className={`text-xs font-medium ${luckResult.lucky ? 'text-emerald-400' : 'text-red-400'}`}>
            {luckResult.roll} → {luckResult.lucky ? 'Chanceux !' : 'Malchanceux'}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <SpellsPanel stats={stats} onUpdateSpells={onUpdateSpells} />
          <button
            onClick={onOpenCombat}
            className="text-xs px-3 py-1 rounded bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-800/40 transition-colors font-medium"
          >
            ⚔ Combat
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs text-stone-600">
          <span>🪙</span>
          <span>{stats.gold}</span>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, icon, current, max, danger }: {
  label: string; icon: string; current: number; max: number; danger?: boolean
}) {
  return (
    <div className="bg-stone-900/60 rounded px-2 py-1.5 flex flex-col gap-0.5">
      <div className="text-xs text-stone-600">{icon} {label}</div>
      <div className={`text-sm font-semibold tabular-nums ${danger ? 'text-red-400' : 'text-stone-200'}`}>
        {current}
        <span className="text-stone-600 font-normal text-xs">/{max}</span>
      </div>
    </div>
  )
}
