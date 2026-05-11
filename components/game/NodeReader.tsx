import { useState, useEffect, useRef } from 'react'
import { Choice } from '@/types'
import { getIngressBasename } from '@/lib/ingressBasename'

interface Props {
  bookId: string
  nodeNumber: number
  content: string
  choices: Choice[]
  audioUrl: string | null
  audioEnabled: boolean
  autoRead?: boolean
}

type ReadState = 'idle' | 'loading' | 'speaking'

const webSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

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

export default function NodeReader({ bookId, nodeNumber, content, choices, audioUrl, audioEnabled, autoRead }: Props) {
  const [state, setState] = useState<ReadState>('idle')
  const [serverUrl, setServerUrl] = useState<string | null>(audioUrl)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setServerUrl(audioUrl)
  }, [audioUrl])

  const stopAll = () => {
    if (webSpeechSupported) speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setState('idle')
  }

  const playUrl = (url: string) => {
    const a = new Audio(`${getIngressBasename()}${url}`)
    audioRef.current = a
    a.onended = () => setState('idle')
    a.onerror = () => setState('idle')
    a.play().then(() => setState('speaking')).catch(() => setState('idle'))
  }

  const readServer = async () => {
    if (state === 'speaking' || state === 'loading') { stopAll(); return }
    if (serverUrl) { playUrl(serverUrl); return }
    setState('loading')
    try {
      const r = await fetch(`/api/nodes/${bookId}/${nodeNumber}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate: ['audio'] }),
      })
      const data = await r.json()
      if (data.audioUrl) {
        setServerUrl(data.audioUrl)
        playUrl(data.audioUrl)
      } else {
        setState('idle')
      }
    } catch {
      setState('idle')
    }
  }

  const readWebSpeech = () => {
    if (!webSpeechSupported) return
    if (state === 'speaking') { stopAll(); return }
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(buildText(content, choices))
    utterance.lang = 'fr-FR'
    utterance.rate = 0.95
    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')
    speechSynthesis.speak(utterance)
    setState('speaking')
  }

  const read = () => {
    if (audioEnabled) readServer()
    else readWebSpeech()
  }

  useEffect(() => {
    if (autoRead) read()
    return stopAll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const available = audioEnabled || webSpeechSupported

  if (!available) {
    return (
      <button
        disabled
        title="Synthèse vocale non disponible sur cet appareil"
        className="absolute top-0 right-0 p-1 text-lg leading-none opacity-30 cursor-not-allowed"
      >
        🔊
      </button>
    )
  }

  const icon = state === 'loading' ? '⏳' : state === 'speaking' ? '⏹' : '🔊'
  const title = state === 'loading'
    ? 'Génération de la narration...'
    : state === 'speaking'
      ? 'Arrêter la lecture'
      : 'Lire le texte'

  return (
    <button
      onClick={read}
      disabled={state === 'loading'}
      className="absolute top-0 right-0 text-stone-500 hover:text-amber-400 transition-colors p-1 text-lg leading-none disabled:opacity-60"
      title={title}
    >
      {icon}
    </button>
  )
}
