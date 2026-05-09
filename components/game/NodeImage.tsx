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
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setUrl(initialUrl)
    // AI generation only if no URL exists and AI images are enabled
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

  if (loading) {
    return (
      <div className="w-24 h-24 mx-auto bg-stone-800 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-stone-600 text-xs italic">...</span>
      </div>
    )
  }

  if (!url) return null

  const src = url.startsWith('/uploads/') ? `/api${url}` : url

  return (
    <>
      <div className="flex justify-center my-2">
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg overflow-hidden border border-stone-700 hover:border-amber-600/50 transition-colors cursor-zoom-in"
          title="Cliquer pour agrandir"
        >
          <img
            src={src}
            alt={`Illustration §${nodeNumber}`}
            className="w-24 h-24 object-cover"
          />
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <img
            src={src}
            alt={`Illustration §${nodeNumber}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-stone-400 hover:text-white text-2xl leading-none"
            onClick={() => setModalOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
