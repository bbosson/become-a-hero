import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'

interface Book {
  id: string
  title: string
  status: string
  introRaw: string | null
}

export default function Intro() {
  const { bookId } = useParams<{ bookId: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then((books: Book[]) => {
        const b = books.find(b => b.id === bookId)
        setBook(b || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [bookId])

  if (loading) return null
  if (!book || book.status !== 'ready') return <Navigate to="/" />

  const paragraphs = book.introRaw?.split(/\n{2,}/).filter(p => p.trim()) || []

  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm">← Bibliothèque</Link>
        <div className="flex items-center gap-3">
          <span className="text-amber-500">⚔</span>
          <span className="text-stone-200 font-semibold">{book.title}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8">
        <div className="text-center">
          <span className="text-6xl text-amber-800/40">⚔</span>
          <h1 className="text-2xl font-semibold text-stone-100 mt-4">{book.title}</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest mt-2">Introduction</p>
        </div>

        {paragraphs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-stone-300 leading-relaxed">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 italic text-center">Aucune introduction détectée pour ce livre.</p>
        )}

        <div className="flex justify-center pt-6">
          <Link
            to={`/play/${book.id}/1`}
            className="py-3 px-8 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-medium text-lg transition-colors"
          >
            Commencer l&apos;aventure →
          </Link>
        </div>
      </main>
    </div>
  )
}
