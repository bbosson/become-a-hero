'use client'

import { useState, useCallback } from 'react'
import { CombatEntry, CombatRound, PlayerStats } from '@/types'

interface Props {
  stats: PlayerStats
  nodeNumber: number
  onClose: (entry: CombatEntry | null) => void
}

type Phase = 'setup' | 'fighting' | 'end'

function d6() { return Math.floor(Math.random() * 6) + 1 }

export default function CombatPanel({ stats, nodeNumber, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [monsterName, setMonsterName] = useState('')
  const [monsterHabilite, setMonsterHabilite] = useState<number | ''>('')
  const [monsterEndurance, setMonsterEndurance] = useState<number | ''>('')

  const [heroEndurance, setHeroEndurance] = useState(stats.endurance)
  const [monsterEnduranceCurrent, setMonsterEnduranceCurrent] = useState(0)
  const [rounds, setRounds] = useState<CombatRound[]>([])
  const [outcome, setOutcome] = useState<CombatEntry['outcome']>('ongoing')
  const [pendingLuck, setPendingLuck] = useState<'hero_hit' | 'monster_hit' | null>(null)
  const [lastRoundIdx, setLastRoundIdx] = useState(-1)
  const [luckMsg, setLuckMsg] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualHeroRoll, setManualHeroRoll] = useState('')
  const [manualMonsterRoll, setManualMonsterRoll] = useState('')

  const heroEnduranceStart = stats.endurance
  const monsterHabiliteNum = Number(monsterHabilite)
  const monsterEnduranceInit = Number(monsterEndurance)

  const startCombat = () => {
    if (!monsterName.trim() || !monsterHabilite || !monsterEndurance) return
    setMonsterEnduranceCurrent(monsterEnduranceInit)
    setHeroEndurance(stats.endurance)
    setPhase('fighting')
  }

  const resolveRound = useCallback((heroRoll: [number, number], monsterRoll: [number, number]) => {
    const heroAttack = heroRoll[0] + heroRoll[1] + stats.habilite
    const monsterAttack = monsterRoll[0] + monsterRoll[1] + monsterHabiliteNum

    let result: CombatRound['result']
    let newHeroEnd = heroEndurance
    let newMonsterEnd = monsterEnduranceCurrent

    if (heroAttack > monsterAttack) {
      result = 'hero_hit'
      newMonsterEnd = Math.max(0, monsterEnduranceCurrent - 2)
    } else if (monsterAttack > heroAttack) {
      result = 'monster_hit'
      newHeroEnd = Math.max(0, heroEndurance - 2)
    } else {
      result = 'tie'
    }

    const round: CombatRound = {
      heroRoll,
      monsterRoll,
      heroAttack,
      monsterAttack,
      result,
      heroEnduranceAfter: newHeroEnd,
      monsterEnduranceAfter: newMonsterEnd,
    }

    setRounds(prev => [...prev, round])
    setLastRoundIdx(prev => prev + 1)
    setHeroEndurance(newHeroEnd)
    setMonsterEnduranceCurrent(newMonsterEnd)

    if (result !== 'tie') setPendingLuck(result)

    if (newHeroEnd <= 0) {
      setOutcome('defeat')
      setPhase('end')
      setPendingLuck(null)
    } else if (newMonsterEnd <= 0) {
      setOutcome('victory')
      setPhase('end')
      setPendingLuck(null)
    }
  }, [heroEndurance, monsterEnduranceCurrent, stats.habilite, monsterHabiliteNum])

  const handleRollRound = () => {
    if (manualMode) {
      const h = parseInt(manualHeroRoll)
      const m = parseInt(manualMonsterRoll)
      if (!h || !m) return
      // treat manual input as total roll (not split into 2 dice)
      resolveRound([Math.ceil(h / 2), Math.floor(h / 2)], [Math.ceil(m / 2), Math.floor(m / 2)])
      setManualHeroRoll('')
      setManualMonsterRoll('')
    } else {
      resolveRound([d6(), d6()], [d6(), d6()])
    }
  }

  const handleTestLuck = () => {
    if (!pendingLuck || stats.chance <= 0) return
    const d1 = d6()
    const d2 = d6()
    const roll = d1 + d2
    const lucky = roll <= stats.chance

    const modifier = lucky
      ? (pendingLuck === 'hero_hit' ? 1 : -1)
      : (pendingLuck === 'hero_hit' ? -1 : 1)

    setRounds(prev => {
      const copy = [...prev]
      const r = { ...copy[lastRoundIdx] }
      r.luckTest = { roll, lucky, damageModifier: modifier }
      if (pendingLuck === 'hero_hit') {
        r.monsterEnduranceAfter = Math.max(0, r.monsterEnduranceAfter - modifier)
        setMonsterEnduranceCurrent(Math.max(0, r.monsterEnduranceAfter))
        if (r.monsterEnduranceAfter <= 0) {
          setOutcome('victory')
          setPhase('end')
        }
      } else {
        r.heroEnduranceAfter = Math.max(0, r.heroEnduranceAfter - modifier)
        setHeroEndurance(Math.max(0, r.heroEnduranceAfter))
        if (r.heroEnduranceAfter <= 0) {
          setOutcome('defeat')
          setPhase('end')
        }
      }
      copy[lastRoundIdx] = r
      return copy
    })

    const msg = lucky
      ? `${roll} ≤ ${stats.chance} — Chanceux ! (${modifier > 0 ? '+' : ''}${modifier} dégâts)`
      : `${roll} > ${stats.chance} — Malchanceux (${modifier > 0 ? '+' : ''}${modifier} dégâts)`
    setLuckMsg(msg)
    setTimeout(() => setLuckMsg(null), 3000)
    setPendingLuck(null)
  }

  const handleFlee = () => {
    // Monster gets a free hit
    const newHeroEnd = Math.max(0, heroEndurance - 2)
    setHeroEndurance(newHeroEnd)
    setOutcome('escaped')
    setPhase('end')
    setPendingLuck(null)
  }

  const buildEntry = (): CombatEntry => ({
    id: `${nodeNumber}-${Date.now()}`,
    nodeNumber,
    monsterName: monsterName.trim(),
    monsterHabiliteInit: monsterHabiliteNum,
    monsterEnduranceInit,
    rounds,
    outcome,
    heroEnduranceStart,
    heroEnduranceEnd: heroEndurance,
  })

  const handleClose = () => onClose(phase === 'end' || rounds.length > 0 ? buildEntry() : null)

  const lastRound = rounds[rounds.length - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 flex-shrink-0">
          <h2 className="text-stone-200 font-semibold text-sm">
            {phase === 'setup' ? '⚔ Nouveau combat' : `⚔ ${monsterName}`}
          </h2>
          <button onClick={handleClose} className="text-stone-500 hover:text-stone-300 text-lg px-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── SETUP PHASE ── */}
          {phase === 'setup' && (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-stone-500">Nom du monstre</span>
                  <input
                    value={monsterName}
                    onChange={e => setMonsterName(e.target.value)}
                    placeholder="ex. Gobelin"
                    className="bg-stone-800 text-stone-100 rounded px-3 py-2 border border-stone-700 focus:outline-none focus:border-amber-600 text-sm"
                  />
                </label>
                <div className="flex gap-3">
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-stone-500">Habilité</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={monsterHabilite}
                      onChange={e => setMonsterHabilite(parseInt(e.target.value) || '')}
                      className="bg-stone-800 text-stone-100 rounded px-3 py-2 border border-stone-700 focus:outline-none focus:border-amber-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-stone-500">Endurance</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={monsterEndurance}
                      onChange={e => setMonsterEndurance(parseInt(e.target.value) || '')}
                      className="bg-stone-800 text-stone-100 rounded px-3 py-2 border border-stone-700 focus:outline-none focus:border-amber-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </label>
                </div>
              </div>
              <button
                onClick={startCombat}
                disabled={!monsterName.trim() || !monsterHabilite || !monsterEndurance}
                className="py-2.5 px-6 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                Commencer le combat
              </button>
            </div>
          )}

          {/* ── FIGHTING PHASE ── */}
          {phase === 'fighting' && (
            <div className="p-4 flex flex-col gap-4">
              {/* Combatants */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-800/60 rounded-lg p-3 flex flex-col gap-1">
                  <div className="text-xs text-stone-500">Héros</div>
                  <div className="text-sm text-stone-300">HAB {stats.habilite}</div>
                  <div className={`text-lg font-bold tabular-nums ${heroEndurance <= stats.enduranceInit * 0.3 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ♥ {heroEndurance}
                  </div>
                </div>
                <div className="bg-stone-800/60 rounded-lg p-3 flex flex-col gap-1">
                  <div className="text-xs text-stone-500">{monsterName}</div>
                  <div className="text-sm text-stone-300">HAB {monsterHabiliteNum}</div>
                  <div className={`text-lg font-bold tabular-nums ${monsterEnduranceCurrent <= monsterEnduranceInit * 0.3 ? 'text-red-400' : 'text-amber-400'}`}>
                    ♥ {monsterEnduranceCurrent}
                  </div>
                </div>
              </div>

              {/* Last round result */}
              {lastRound && (
                <div className="text-xs text-center text-stone-400 bg-stone-800/40 rounded px-3 py-2">
                  {lastRound.result === 'hero_hit' && `Vous frappez ! (${lastRound.heroAttack} vs ${lastRound.monsterAttack}) → −2 END monstre`}
                  {lastRound.result === 'monster_hit' && `Vous êtes touché ! (${lastRound.heroAttack} vs ${lastRound.monsterAttack}) → −2 END héros`}
                  {lastRound.result === 'tie' && `Égalité ! (${lastRound.heroAttack} vs ${lastRound.monsterAttack}) — personne ne frappe`}
                  {lastRound.luckTest && (
                    <span className={`ml-2 ${lastRound.luckTest.lucky ? 'text-emerald-400' : 'text-red-400'}`}>
                      ({lastRound.luckTest.lucky ? 'Chanceux' : 'Malchanceux'})
                    </span>
                  )}
                </div>
              )}

              {luckMsg && (
                <div className="text-xs text-center text-amber-300 bg-amber-900/20 rounded px-3 py-1.5 border border-amber-800/30">
                  {luckMsg}
                </div>
              )}

              {/* Roll mode toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManualMode(false)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${!manualMode ? 'bg-stone-700 border-stone-600 text-stone-200' : 'bg-transparent border-stone-700 text-stone-500'}`}
                >
                  Dés auto
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${manualMode ? 'bg-stone-700 border-stone-600 text-stone-200' : 'bg-transparent border-stone-700 text-stone-500'}`}
                >
                  Dés manuels
                </button>
              </div>

              {manualMode && (
                <div className="flex gap-3">
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-stone-500">Vos dés (2d6)</span>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={manualHeroRoll}
                      onChange={e => setManualHeroRoll(e.target.value)}
                      placeholder="2–12"
                      className="bg-stone-800 text-stone-100 rounded px-3 py-2 border border-stone-700 focus:outline-none focus:border-amber-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-stone-500">Dés monstre (2d6)</span>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={manualMonsterRoll}
                      onChange={e => setManualMonsterRoll(e.target.value)}
                      placeholder="2–12"
                      className="bg-stone-800 text-stone-100 rounded px-3 py-2 border border-stone-700 focus:outline-none focus:border-amber-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleRollRound}
                  disabled={manualMode && (!manualHeroRoll || !manualMonsterRoll)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
                >
                  🎲 Lancer un round
                </button>
                {pendingLuck && (
                  <button
                    onClick={handleTestLuck}
                    disabled={stats.chance <= 0}
                    className="py-2 px-3 rounded-lg bg-amber-800/60 hover:bg-amber-700/60 disabled:opacity-40 text-amber-300 border border-amber-700/40 transition-colors text-xs font-medium"
                    title="Tenter la Chance (−1 Chance)"
                  >
                    ✦ Chance<br />
                    <span className="text-amber-500">{stats.chance}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleFlee}
                className="text-xs text-stone-500 hover:text-red-400 transition-colors text-center"
                title="Fuir — le monstre inflige 2 points d'Endurance"
              >
                Fuir (−2 END)
              </button>

              {/* Round history */}
              {rounds.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-stone-800 pt-3">
                  <div className="text-xs text-stone-600 uppercase tracking-widest mb-1">Historique</div>
                  {[...rounds].reverse().map((r, i) => (
                    <RoundRow key={i} round={r} roundNumber={rounds.length - i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── END PHASE ── */}
          {phase === 'end' && (
            <div className="p-4 flex flex-col gap-4 items-center text-center">
              <div className="text-4xl mt-2">
                {outcome === 'victory' ? '🏆' : outcome === 'defeat' ? '💀' : '🏃'}
              </div>
              <h3 className={`text-lg font-bold ${outcome === 'victory' ? 'text-emerald-400' : outcome === 'defeat' ? 'text-red-400' : 'text-amber-400'}`}>
                {outcome === 'victory' ? 'Victoire !' : outcome === 'defeat' ? 'Défaite…' : 'Fuite !'}
              </h3>
              <div className="text-xs text-stone-400 flex flex-col gap-1">
                <div>{rounds.length} round{rounds.length > 1 ? 's' : ''} de combat</div>
                <div>Endurance : {heroEnduranceStart} → {heroEndurance}</div>
                {outcome === 'escaped' && <div className="text-amber-500">Le monstre a frappé en dernier (−2 END)</div>}
              </div>

              {rounds.length > 0 && (
                <div className="w-full flex flex-col gap-1 border-t border-stone-800 pt-3 mt-1">
                  <div className="text-xs text-stone-600 uppercase tracking-widest mb-1 text-left">Historique</div>
                  {[...rounds].reverse().map((r, i) => (
                    <RoundRow key={i} round={r} roundNumber={rounds.length - i} />
                  ))}
                </div>
              )}

              <button
                onClick={handleClose}
                className="py-2.5 px-8 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium transition-colors"
              >
                Fermer et sauvegarder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RoundRow({ round, roundNumber }: { round: CombatRound; roundNumber: number }) {
  const icon = round.result === 'hero_hit' ? '⚔' : round.result === 'monster_hit' ? '🩸' : '—'
  const color = round.result === 'hero_hit' ? 'text-emerald-400' : round.result === 'monster_hit' ? 'text-red-400' : 'text-stone-500'
  return (
    <div className={`text-xs flex items-center gap-2 ${color}`}>
      <span className="text-stone-600 w-5 text-right flex-shrink-0">{roundNumber}</span>
      <span>{icon}</span>
      <span className="text-stone-400">
        {round.heroRoll[0] + round.heroRoll[1]}+{round.heroRoll[0] + round.heroRoll[1] > 0 ? '' : ''}
        <span className="text-stone-600"> ({round.heroAttack} vs {round.monsterAttack})</span>
      </span>
      <span className="ml-auto tabular-nums text-stone-500">
        ♥{round.heroEnduranceAfter} / ♥{round.monsterEnduranceAfter}
      </span>
      {round.luckTest && (
        <span className={round.luckTest.lucky ? 'text-emerald-500' : 'text-red-500'}>
          {round.luckTest.lucky ? '✦' : '✧'}
        </span>
      )}
    </div>
  )
}
