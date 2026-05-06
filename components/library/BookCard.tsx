'use client'

import { BookData } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  book: BookData
}

function getBookStatus(book: BookData): 'new' | 'in_progress' | 'finished' {
  if (!book.savegame) return 'new'
  const visited = (book.savegame.visitedNodes as number[]) || []
  if (book.totalNodes > 0 && visited.length >= book.totalNodes) return 'finished'
  if (visited.length > 0) return 'in_progress'
  return 'new'
}

export default function BookCard({ book }: Props) {
  const router = useRouter()
  const status = getBookStatus(book)

  const resumeNode = book.savegame?.resumeNodeNumber || book.savegame?.currentNodeNumber || 1

  const statusBadge = {
    new: { label: '○ Nouveau', color: 'text-stone-400' },
    in_progress: { label: '● En cours', color: 'text-amber-400' },
    finished: { label: '✓ Terminé', color: 'text-emerald-400' },
  }[status]

  const handlePlay = () => {
    if (book.status !== 'ready') return
    if (status === 'in_progress' && book.savegame) {
      router.push(`/play/${book.id}/${resumeNode}`)
    } else {
      router.push(`/play/${book.id}/intro`)
    }
  }

  if (book.status === 'processing') {
    return (
      <div className="rounded-xl border border-amber-800/20 bg-stone-900/40 p-5 flex flex-col gap-3 opacity-70">
        <div className="h-32 bg-stone-800 rounded-lg flex items-center justify-center">
          <div className="animate-spin text-2xl">⚙</div>
        </div>
        <h3 className="font-semibold text-stone-200 truncate">{book.title}</h3>
        <span className="text-xs text-amber-400">Analyse en cours...</span>
      </div>
    )
  }

  if (book.status === 'error') {
    return (
      <div className="rounded-xl border border-red-800/30 bg-stone-900/40 p-5 flex flex-col gap-3">
        <div className="h-32 bg-stone-800 rounded-lg flex items-center justify-center text-red-400 text-2xl">✗</div>
        <h3 className="font-semibold text-stone-200 truncate">{book.title}</h3>
        <span className="text-xs text-red-400">Erreur d&apos;analyse</span>
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
              style={{
                width: `${Math.round(((book.savegame?.visitedNodes as number[])?.length || 0) / Math.max(book.totalNodes, 1) * 100)}%`
              }}
            />
          </div>
        )}

        <button
          onClick={handlePlay}
          className="mt-auto w-full py-2 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
        >
          {status === 'in_progress' ? 'Reprendre' : status === 'finished' ? 'Rejouer' : 'Jouer'}
        </button>
      </div>
    </div>
  )
}
