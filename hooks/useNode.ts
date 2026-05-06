import { useState, useEffect } from 'react'
import { NodeData } from '@/types'

export function useNode(bookId: string, nodeNumber: number) {
  const [node, setNode] = useState<NodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch(`/api/nodes/${bookId}/${nodeNumber}`)
      .then(res => {
        if (!res.ok) throw new Error('Node not found')
        return res.json()
      })
      .then(data => {
        setNode(data)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [bookId, nodeNumber])

  const updateTitle = async (title: string) => {
    await fetch(`/api/nodes/${bookId}/${nodeNumber}/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setNode(prev => prev ? { ...prev, title } : null)
  }

  const updateIcon = async (icon: string | null) => {
    await fetch(`/api/nodes/${bookId}/${nodeNumber}/icon`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icon }),
    })
    setNode(prev => prev ? { ...prev, icon } : null)
  }

  const generateTitle = async (): Promise<string | null> => {
    const res = await fetch(`/api/nodes/${bookId}/${nodeNumber}/generate-title`, {
      method: 'POST',
    })
    if (!res.ok) return null
    const { title } = await res.json()
    setNode(prev => prev ? { ...prev, title } : null)
    return title
  }

  return { node, loading, error, updateTitle, updateIcon, generateTitle }
}
