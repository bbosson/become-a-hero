import { useState, useEffect } from 'react'
import { Choice } from '@/types'

interface Props {
  content: string
  choices: Choice[]
  autoRead?: boolean
}

type ReadState = 'idle' | 'speaking'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

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

  const stop = () => {
    if (supported) speechSynthesis.cancel()
    setState('idle')
  }

  const read = () => {
    if (!supported) return
    if (state === 'speaking') { stop(); return }
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(buildText(content, choices))
    utterance.lang = 'fr-FR'
    utterance.rate = 0.95
    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')
    speechSynthesis.speak(utterance)
    setState('speaking')
  }

  useEffect(() => {
    if (autoRead) read()
    return stop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!supported) {
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

  return (
    <button
      onClick={read}
      className="absolute top-0 right-0 text-stone-500 hover:text-amber-400 transition-colors p-1 text-lg leading-none"
      title={state === 'speaking' ? 'Arrêter la lecture' : 'Lire le texte'}
    >
      {state === 'idle' ? '🔊' : '⏹'}
    </button>
  )
}
