'use client'

import { NodeData, SavegameData } from '@/types'

interface Props {
  node: NodeData
  savegame: SavegameData | null
  bookId?: string
  onRestart: () => void
  onReviewGraph: () => void
}

export default function EndScreen({ node, savegame, onRestart, onReviewGraph }: Props) {
  const endType = node.endType || 'neutral'
  const visited = savegame?.visitedNodes?.length || 0

  const path = savegame?.nodeOrder?.slice(0, 10).join(' → ') || ''
  const pathSuffix = (savegame?.nodeOrder?.length || 0) > 10 ? ' → ...' : ''

  const banner = {
    victory: { bg: 'bg-yellow-900/20 border-yellow-700/40', text: 'text-yellow-400', label: '🏆 Victoire !' },
    defeat: { bg: 'bg-red-900/20 border-red-700/40', text: 'text-red-400', label: '💀 Défaite' },
    neutral: { bg: 'bg-stone-800/40 border-stone-700/40', text: 'text-stone-300', label: 'Fin de l\'aventure' },
  }[endType] || { bg: 'bg-stone-800/40 border-stone-700/40', text: 'text-stone-300', label: 'Fin de l\'aventure' }

  return (
    <div className={`mt-8 rounded-xl border p-6 flex flex-col gap-4 ${banner.bg}`}>
      <h2 className={`text-xl font-semibold ${banner.text}`}>{banner.label}</h2>

      <div className="text-sm text-stone-400 flex flex-col gap-1">
        <p>Paragraphes visités : <span className="text-stone-200">{visited}</span></p>
        {path && (
          <p className="text-xs font-mono text-stone-600">
            Chemin : {path}{pathSuffix}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={onRestart}
          className="flex-1 py-2 px-4 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm transition-colors"
        >
          Recommencer depuis le début
        </button>
        <button
          onClick={onReviewGraph}
          className="flex-1 py-2 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm transition-colors"
        >
          Revoir le graphe
        </button>
      </div>
    </div>
  )
}
