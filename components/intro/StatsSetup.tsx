import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayerStats } from '@/types'

interface Props {
  bookId: string
}

function roll(n: number, sides: number, bonus: number): number {
  let total = bonus
  for (let i = 0; i < n; i++) total += Math.floor(Math.random() * sides) + 1
  return total
}

type StatKey = 'habilite' | 'endurance' | 'chance' | 'magie'

const STAT_LABELS: Record<StatKey, string> = {
  habilite: 'Habilité',
  endurance: 'Endurance',
  chance: 'Chance',
  magie: 'Magie',
}

const STAT_FORMULAS: Record<StatKey, string> = {
  habilite: '1d6+6',
  endurance: '2d6+12',
  chance: '1d6+6',
  magie: '2d6+6',
}

function rollStat(key: StatKey): number {
  switch (key) {
    case 'habilite': return roll(1, 6, 6)
    case 'endurance': return roll(2, 6, 12)
    case 'chance': return roll(1, 6, 6)
    case 'magie': return roll(2, 6, 6)
  }
}

export default function StatsSetup({ bookId }: Props) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [existingStats, setExistingStats] = useState<PlayerStats | null>(null)

  const [habilite, setHabilite] = useState(0)
  const [endurance, setEndurance] = useState(0)
  const [chance, setChance] = useState(0)
  const [magie, setMagie] = useState(0)
  const [provisions, setProvisions] = useState(10)
  const [gold, setGold] = useState(0)

  useEffect(() => {
    fetch(`/api/savegame/${bookId}`)
      .then(r => r.json())
      .then(sg => {
        if (sg?.stats) {
          const s = sg.stats as PlayerStats
          setExistingStats(s)
          setHabilite(s.habiliteInit)
          setEndurance(s.enduranceInit)
          setChance(s.chanceInit)
          setMagie(s.magieInit ?? 0)
          setProvisions(s.provisions)
          setGold(s.gold)
        }
      })
      .catch(() => {})
  }, [bookId])

  const rollAll = () => {
    setHabilite(rollStat('habilite'))
    setEndurance(rollStat('endurance'))
    setChance(rollStat('chance'))
    setMagie(rollStat('magie'))
  }

  const handleSubmit = async () => {
    if (!habilite || !endurance || !chance || !magie) return
    setSaving(true)
    const stats: PlayerStats = {
      habilite,
      habiliteInit: habilite,
      endurance,
      enduranceInit: endurance,
      chance,
      chanceInit: chance,
      magie,
      magieInit: magie,
      provisions,
      gold,
      spellsUsed: existingStats?.spellsUsed ?? {},
    }
    const body = existingStats
      ? { stats }
      : { currentNodeNumber: 1, stats, combatLog: [] }
    await fetch(`/api/savegame/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    navigate(`/play/${bookId}/1`)
  }

  const StatInput = ({ statKey, value, onChange }: { statKey: StatKey; value: number | ''; onChange: (v: number) => void }) => (
    <div className="flex items-center gap-3">
      <div className="w-28 text-stone-300 text-sm font-medium">{STAT_LABELS[statKey]}</div>
      <div className="text-xs text-stone-600 w-14">{STAT_FORMULAS[statKey]}</div>
      <input
        type="number"
        min={1}
        max={30}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-16 bg-stone-800 text-stone-100 text-center rounded px-2 py-1 border border-stone-700 focus:outline-none focus:border-amber-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => onChange(rollStat(statKey))}
        className="text-sm px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 transition-colors"
        title={`Lancer ${STAT_FORMULAS[statKey]}`}
      >
        🎲
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-stone-700/50 rounded-lg p-5 flex flex-col gap-5 bg-stone-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-stone-200 font-semibold text-base">Caractéristiques du héros</h2>
          <button
            onClick={rollAll}
            className="text-xs px-3 py-1.5 rounded bg-amber-800/60 hover:bg-amber-700/60 text-amber-300 border border-amber-700/40 transition-colors"
          >
            🎲 Tout lancer
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <StatInput statKey="habilite" value={habilite} onChange={setHabilite} />
          <StatInput statKey="endurance" value={endurance} onChange={setEndurance} />
          <StatInput statKey="chance" value={chance} onChange={setChance} />
          <StatInput statKey="magie" value={magie} onChange={setMagie} />
        </div>

        <div className="border-t border-stone-700/40 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-28 text-stone-400 text-sm">Provisions</div>
            <input
              type="number"
              min={0}
              max={20}
              value={provisions}
              onChange={e => setProvisions(parseInt(e.target.value) || 0)}
              className="w-16 bg-stone-800 text-stone-100 text-center rounded px-2 py-1 border border-stone-700 focus:outline-none focus:border-amber-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-stone-600 text-xs">repas (rend 4 END)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 text-stone-400 text-sm">Or</div>
            <input
              type="number"
              min={0}
              value={gold}
              onChange={e => setGold(parseInt(e.target.value) || 0)}
              className="w-16 bg-stone-800 text-stone-100 text-center rounded px-2 py-1 border border-stone-700 focus:outline-none focus:border-amber-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-stone-600 text-xs">pièces d&apos;or</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {existingStats && (
          <button
            onClick={() => navigate(`/play/${bookId}/1`)}
            className="py-2.5 px-6 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium transition-colors text-sm"
          >
            Continuer sans modifier
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving || !habilite || !endurance || !chance || !magie}
          className="py-3 px-8 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-lg transition-colors"
        >
          {saving ? 'Départ…' : existingStats ? 'Recommencer avec ces stats' : "Commencer l'aventure →"}
        </button>
      </div>
    </div>
  )
}
