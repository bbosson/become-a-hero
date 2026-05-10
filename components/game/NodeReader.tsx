import { useState, useEffect, useRef } from 'react'
import { Choice } from '@/types'

interface Props {
  content: string
  choices: Choice[]
  autoRead?: boolean
}

type ReadState = 'idle' | 'loading' | 'playing'

function buildText(content: string, choices: Choice[]): string {
  const parts = [content]
  if (choices.length > 0) {
    parts.push('')
    parts.push('Que faites-vous ?')
    choices.forEach(c => {
      parts.push(`${c.label} — Rendez-vous au paragraphe ${c.targetNodeNumber}.`)
    })
  }
  return parts.join('\n')
}

export default function NodeReader({ content, choices, autoRead }: Props) {
  const [state, setState] = useState<ReadState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setState('idle')
  }

  const read = async () => {
    if (state === 'playing') { stop(); return }
    if (state === 'loading') return
    setState('loading')
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: buildText(content, choices) }),
      })
      if (!resp.ok) { setState('idle'); return }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setState('idle')
      audio.play()
      setState('playing')
    } catch {
      setState('idle')
    }
  }

  useEffect(() => {
    if (autoRead) read()
    return stop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <button
      onClick={read}
      disabled={state === 'loading'}
      className="absolute top-0 right-0 text-stone-500 hover:text-amber-400 disabled:opacity-40 transition-colors p-1 text-lg leading-none"
      title={state === 'playing' ? 'Arrêter la lecture' : 'Lire le texte'}
    >
      {state === 'idle' && '🔊'}
      {state === 'loading' && <span className="inline-block animate-spin">↻</span>}
      {state === 'playing' && '⏹'}
    </button>
  )
}
