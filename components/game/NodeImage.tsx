'use client'

import { useState, useEffect } from 'react'

interface Props {
  bookId: string
  nodeNumber: number
  imageUrl: string | null
  imagesEnabled: boolean
}

export default function NodeImage({ bookId, nodeNumber, imageUrl: initialUrl, imagesEnabled }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUrl(initialUrl)
    if (!initialUrl && imagesEnabled) {
      setLoading(true)
      fetch(`/api/nodes/${bookId}/${nodeNumber}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate: ['image'] }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.imageUrl) setUrl(data.imageUrl)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [bookId, nodeNumber, initialUrl, imagesEnabled])

  if (!imagesEnabled) return null

  if (loading) {
    return (
      <div className="w-full h-48 bg-stone-800 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-stone-600 text-sm italic">Le maître du jeu illustre la scène...</span>
      </div>
    )
  }

  if (!url) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url.startsWith('/uploads/') ? `/api${url}` : url}
      alt={`Illustration du paragraphe ${nodeNumber}`}
      className="w-full rounded-xl object-cover max-h-64"
    />
  )
}
