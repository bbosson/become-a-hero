import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import GameLayout from '@/components/game/GameLayout'
import { SettingsData } from '@/types'

interface Book {
  id: string
  title: string
  status: string
}

export default function Play() {
  const { bookId, nodeNumber } = useParams<{ bookId: string; nodeNumber: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const nodeNum = parseInt(nodeNumber!, 10)

  useEffect(() => {
    if (isNaN(nodeNum)) { setNotFound(true); setLoading(false); return }

    Promise.all([
      fetch('/api/books').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ])
      .then(([books, s]) => {
        const b = (books as Book[]).find(b => b.id === bookId)
        if (!b || b.status !== 'ready') {
          setNotFound(true)
        } else {
          setBook(b)
          setSettings(s)
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [bookId, nodeNum])

  if (loading) return null
  if (notFound || !book || !settings) return <Navigate to="/" />

  return (
    <GameLayout
      bookId={book.id}
      nodeNumber={nodeNum}
      bookTitle={book.title}
      settings={settings}
    />
  )
}
