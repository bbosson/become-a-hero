import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import BookGrid from '@/components/library/BookGrid'
import SettingsDrawer from '@/components/game/SettingsDrawer'
import { BookData } from '@/types'

export default function Home() {
  const [books, setBooks] = useState<BookData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBooks = useCallback(() => {
    setLoading(true)
    fetch('/api/books')
      .then(r => r.json())
      .then(data => { setBooks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚔</span>
          <h1 className="text-lg font-semibold text-stone-100 tracking-wide">BECOME A HERO</h1>
        </div>
        <SettingsDrawer />
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto">
        <h2 className="text-stone-300 text-sm font-medium uppercase tracking-widest mb-6">
          Tes aventures
        </h2>

        {loading ? (
          <div className="text-center py-16 text-stone-600 animate-pulse">Chargement...</div>
        ) : books.length === 0 ? (
          <div className="text-center py-16 text-stone-600">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-lg">Aucune aventure pour l&apos;instant.</p>
            <p className="text-sm mt-2">
              <Link to="/upload" className="text-amber-500 hover:text-amber-400 underline">
                Importe ton premier PDF
              </Link>{' '}
              pour commencer.
            </p>
          </div>
        ) : (
          <BookGrid books={books} onRefresh={fetchBooks} />
        )}
      </main>
    </div>
  )
}
