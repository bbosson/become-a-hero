import { useState } from 'react'
import { BookData, Checkpoint } from '@/types'
import { useNavigate } from 'react-router-dom'

interface Props {
  book: BookData
  onRefresh?: () => void
}

function getBookStatus(book: BookData): 'new' | 'in_progress' | 'finished' {
  if (!book.savegame) return 'new'
  const visited = (book.savegame.visitedNodes as number[]) || []
  if (book.totalNodes > 0 && visited.length >= book.totalNodes) return 'finished'
  if (visited.length > 0) return 'in_progress'
  return 'new'
}

export default function BookCard({ book, onRefresh }: Props) {
  const navigate = useNavigate()
  const status = getBookStatus(book)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const resumeNode = book.savegame?.resumeNodeNumber || book.savegame?.currentNodeNumber || 1
  const checkpoints: Checkpoint[] = (book.savegame?.checkpoints as Checkpoint[]) || []
  const visitedCount = (book.savegame?.visitedNodes as number[])?.length || 0

  const statusBadge = {
    new: { label: '○ Nouveau', color: 'text-stone-400' },
    in_progress: { label: '● En cours', color: 'text-amber-400' },
    finished: { label: '✓ Terminé', color: 'text-emerald-400' },
  }[status]

  const handlePlay = () => {
    if (book.status !== 'ready') return
    if (status === 'in_progress' && book.savegame) {
      navigate(`/play/${book.id}/${resumeNode}`)
    } else {
      navigate(`/play/${book.id}/intro`)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    await fetch(`/api/savegame/${book.id}`, { method: 'DELETE' })
    onRefresh?.()
    setResetting(false)
    setConfirmReset(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/books/${book.id}`, { method: 'DELETE' })
    onRefresh?.()
    setDeleting(false)
    setConfirmDelete(false)
  }

  const DeleteButton = () => confirmDelete ? (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-stone-400 flex-1">Supprimer définitivement ?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 border border-red-800/50 transition-colors disabled:opacity-40"
      >
        {deleting ? '...' : 'Supprimer'}
      </button>
      <button
        onClick={() => setConfirmDelete(false)}
        className="text-xs px-2 py-1 rounded text-stone-500 hover:text-stone-300 transition-colors"
      >
        Annuler
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirmDelete(true)}
      className="text-xs text-stone-600 hover:text-red-400 transition-colors"
    >
      🗑 Supprimer l&apos;histoire
    </button>
  )

  if (book.status === 'processing') {
    return (
      <div className="rounded-xl border border-amber-800/20 bg-stone-900/40 p-5 flex flex-col gap-3 opacity-70">
        <div className="h-32 bg-stone-800 rounded-lg flex items-center justify-center">
          <div className="animate-spin text-2xl">⚙</div>
        </div>
        <h3 className="font-semibold text-stone-200 truncate">{book.title}</h3>
        <span className="text-xs text-amber-400">Analyse en cours...</span>
        <div className="flex items-center justify-end"><DeleteButton /></div>
      </div>
    )
  }

  if (book.status === 'error') {
    return (
      <div className="rounded-xl border border-red-800/30 bg-stone-900/40 p-5 flex flex-col gap-3">
        <div className="h-32 bg-stone-800 rounded-lg flex items-center justify-center text-red-400 text-2xl">✗</div>
        <h3 className="font-semibold text-stone-200 truncate">{book.title}</h3>
        <span className="text-xs text-red-400">Erreur d&apos;analyse</span>
        <div className="flex items-center justify-end"><DeleteButton /></div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-800/20 bg-stone-900/40 hover:border-amber-600/40 transition-all duration-200 flex flex-col overflow-hidden group">
      <div className="h-36 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center relative">
        <span className="text-5xl opacity-20 group-hover:opacity-30 transition-opacity">⚔</span>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="font-semibold text-stone-100 leading-tight">{book.title}</h3>

        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{book.totalNodes} paragraphes</span>
          <span className={statusBadge.color}>{statusBadge.label}</span>
        </div>

        {status === 'in_progress' && (
          <div className="w-full bg-stone-800 rounded-full h-1">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all"
              style={{ width: `${Math.round(visitedCount / Math.max(book.totalNodes, 1) * 100)}%` }}
            />
          </div>
        )}

        {/* Bouton principal */}
        <button
          onClick={handlePlay}
          className="w-full py-2 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
        >
          {status === 'in_progress' ? `Reprendre (§${resumeNode})` : status === 'finished' ? 'Rejouer' : 'Jouer'}
        </button>

        {/* Reset */}
        {(status === 'in_progress' || status === 'finished') && (
          <div className="flex items-center justify-end">
            {confirmReset ? (
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-stone-400 flex-1">Effacer toute la progression ?</span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 border border-red-800/50 transition-colors disabled:opacity-40"
                >
                  {resetting ? '...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs px-2 py-1 rounded text-stone-500 hover:text-stone-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs text-stone-600 hover:text-red-400 transition-colors"
              >
                ↺ Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* Delete book */}
        <div className="flex items-center justify-end pt-1 border-t border-stone-800/60">
          <DeleteButton />
        </div>

        {/* Checkpoints */}
        {checkpoints.length > 0 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-stone-800/60">
            <span className="text-xs text-stone-600">Checkpoints</span>
            <div className="flex flex-col gap-0.5">
              {checkpoints.map((cp) => (
                <button
                  key={cp.nodeNumber}
                  onClick={() => navigate(`/play/${book.id}/${cp.nodeNumber}`)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-stone-400 hover:text-amber-300 hover:bg-stone-800/60 transition-colors text-left"
                >
                  <span>🚩</span>
                  <span className="font-mono text-stone-500">§{cp.nodeNumber}</span>
                  <span className="truncate">{cp.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
