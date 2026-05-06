'use client'

import { Checkpoint } from '@/types'

interface Props {
  checkpoints: Checkpoint[]
  currentNodeNumber: number
  onNavigate: (nodeNumber: number) => void
  onRemove: (nodeNumber: number) => void
}

export default function CheckpointBar({ checkpoints, currentNodeNumber, onNavigate, onRemove }: Props) {
  if (checkpoints.length === 0) return null

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-t border-stone-800/50 bg-stone-900/30 overflow-x-auto">
      <span className="text-xs text-stone-600 mr-2 flex-shrink-0">Checkpoints :</span>
      {checkpoints.map((cp, i) => (
        <div
          key={i}
          className={`flex-shrink-0 flex items-center gap-1 rounded text-xs border transition-colors ${
            cp.nodeNumber === currentNodeNumber
              ? 'bg-amber-900/30 text-amber-300 border-amber-700/30'
              : 'text-stone-400 border-transparent hover:border-stone-700/50'
          }`}
        >
          <button
            onClick={() => onNavigate(cp.nodeNumber)}
            className="flex items-center gap-1 px-2 py-1 hover:text-amber-300 transition-colors"
          >
            <span>🚩</span>
            <span>§{cp.nodeNumber}</span>
            {cp.title && <span className="text-stone-500 hidden sm:inline">{cp.title}</span>}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(cp.nodeNumber) }}
            className="pr-1.5 py-1 text-stone-600 hover:text-red-400 transition-colors"
            title="Supprimer ce checkpoint"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
