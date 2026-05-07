'use client'

interface Props {
  onPinResume: () => void
  onAddCheckpoint: () => void
  onGoBack: () => void
  onGoBackAndForget: () => void
  pinned?: boolean
  canGoBack?: boolean
}

export default function SaveBar({ onPinResume, onAddCheckpoint, onGoBack, onGoBackAndForget, pinned, canGoBack }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-stone-800">
      <button
        onClick={onPinResume}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
          pinned
            ? 'border-blue-700/50 text-blue-400 bg-blue-900/20'
            : 'border-stone-700/50 text-stone-400 hover:text-blue-400 hover:border-blue-700/50'
        }`}
        title="Épingler ce node comme point de reprise"
      >
        <span>💾</span>
        <span>Reprendre ici</span>
      </button>

      <button
        onClick={onAddCheckpoint}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-stone-700/50 text-stone-400 hover:text-amber-400 hover:border-amber-700/50 transition-colors"
        title="Ajouter un checkpoint"
      >
        <span>🚩</span>
        <span>Checkpoint</span>
      </button>

      <button
        onClick={onGoBack}
        disabled={!canGoBack}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-stone-700/50 text-stone-400 hover:text-emerald-400 hover:border-emerald-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Revenir au nœud précédent (la visite de cette scène est conservée)"
      >
        <span>⬅️</span>
        <span>Revenir en arrière</span>
      </button>

      <button
        onClick={onGoBackAndForget}
        disabled={!canGoBack}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-stone-700/50 text-stone-400 hover:text-rose-400 hover:border-rose-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Revenir au nœud précédent et marquer cette scène comme non visitée"
      >
        <span>🧹</span>
        <span>Oublier cette scène</span>
      </button>
    </div>
  )
}
