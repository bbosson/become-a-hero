'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  bookId: string
  nodeNumber: number
  audioUrl: string | null
  audioEnabled: boolean
}

export default function NodeAudio({ bookId, nodeNumber, audioUrl: initialUrl, audioEnabled }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setUrl(initialUrl)
    if (!initialUrl && audioEnabled) {
      setLoading(true)
      fetch(`/api/nodes/${bookId}/${nodeNumber}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate: ['audio'] }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.audioUrl) setUrl(data.audioUrl)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [bookId, nodeNumber, initialUrl, audioEnabled])

  if (!audioEnabled) return null
  if (loading) return <p className="text-xs text-stone-600 italic">♪ Narration en cours de génération...</p>
  if (!url) return null

  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <span>♪ Narration</span>
      <audio ref={audioRef} src={url.startsWith('/uploads/') ? `/api${url}` : url} controls className="h-6 flex-1" />
    </div>
  )
}
