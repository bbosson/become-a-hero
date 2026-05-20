import GameLayout from '@/components/game/GameLayout'
import { SettingsData } from '@/types'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

interface Book {
  id: string
  title: string
  status: string
  totalNodes: number
}

export default function Play() {
  const { bookId, nodeNumber } = useParams<{ bookId: string; nodeNumber: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const nodeNum = parseInt(nodeNumber!, 10)

  useEffect(() => {
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
  }, [bookId])

  if (!loading && isNaN(nodeNum)) return <Navigate to="/" />

  if (loading) return null
  if (notFound || !book || !settings) return <Navigate to="/" />

  return (
    <GameLayout
      bookId={book.id}
      nodeNumber={nodeNum}
      bookTitle={book.title}
      settings={settings}
      totalNodes={book.totalNodes}
    />
  )
}
