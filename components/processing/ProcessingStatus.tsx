'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface JobState {
  status: string
  progress: number
  currentStep: string | null
  errorMsg: string | null
  bookId: string | null
  totalNodes: number
}

const STEPS = [
  { key: 'intro', label: "Détection de l'introduction..." },
  { key: 'extracting', label: 'Extraction du texte brut...' },
  { key: 'parsing', label: 'Détection des paragraphes...' },
  { key: 'choices', label: 'Extraction des choix de navigation...' },
  { key: 'validating', label: 'Validation des références...' },
  { key: 'analyzing', label: 'Analyse IA – génération des titres...' },
  { key: 'done', label: 'Finalisation...' },
]

interface Props {
  jobId: string
}

export default function ProcessingStatus({ jobId }: Props) {
  const [state, setState] = useState<JobState>({
    status: 'pending',
    progress: 0,
    currentStep: 'Démarrage...',
    errorMsg: null,
    bookId: null,
    totalNodes: 0,
  })
  const router = useRouter()

  useEffect(() => {
    const es = new EventSource(`/api/process/${jobId}`)

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setState(data)

      if (data.status === 'done') {
        es.close()
      }
      if (data.status === 'error') {
        es.close()
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [jobId])

  const isDone = state.status === 'done'
  const isError = state.status === 'error'

  const completedStepIndex = STEPS.findIndex(s => state.currentStep?.includes(s.label.slice(0, 15)))

  return (
    <div className="flex flex-col gap-8 w-full max-w-lg">
      <div className="text-center">
        <p className="text-stone-400 text-sm italic">
          {isDone ? '✨ Prêt !' : isError ? '⚠ Erreur' : 'Le Maître du Jeu prépare ton aventure...'}
        </p>
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const isActive = state.currentStep?.toLowerCase().includes(step.label.slice(0, 10).toLowerCase())
          const isCompleted = isDone || (i < completedStepIndex)

          return (
            <div key={step.key} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center flex-shrink-0">
                {isCompleted ? (
                  <span className="text-emerald-400">✓</span>
                ) : isActive ? (
                  <span className="text-amber-400 animate-pulse">◉</span>
                ) : (
                  <span className="text-stone-600">○</span>
                )}
              </span>
              <span className={isActive ? 'text-amber-300' : isCompleted ? 'text-stone-400' : 'text-stone-600'}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      {!isDone && !isError && (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-stone-500 text-right">{state.progress}%</div>
          <div className="w-full bg-stone-800 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          {state.currentStep && (
            <p className="text-xs text-stone-500 mt-1">{state.currentStep}</p>
          )}
        </div>
      )}

      {/* Done state */}
      {isDone && (
        <div className="flex flex-col gap-4 border border-emerald-800/30 rounded-xl p-6 bg-emerald-900/10">
          <div className="text-center">
            <p className="text-emerald-400 text-lg font-medium">✅ Analyse réussie !</p>
            {state.totalNodes > 0 && (
              <p className="text-stone-400 text-sm mt-1">{state.totalNodes} paragraphes détectés</p>
            )}
          </div>
          <div className="flex gap-3">
            {state.bookId && (
              <button
                onClick={() => router.push(`/play/${state.bookId}/intro`)}
                className="flex-1 py-2 px-4 rounded-lg border border-amber-700/50 text-amber-400 hover:bg-amber-900/20 text-sm transition-colors"
              >
                Lire l&apos;introduction
              </button>
            )}
            {state.bookId && (
              <button
                onClick={() => router.push(`/play/${state.bookId}/1`)}
                className="flex-1 py-2 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
              >
                Lancer la partie !
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col gap-4 border border-red-800/30 rounded-xl p-6 bg-red-900/10">
          <p className="text-red-400">❌ Analyse incomplète</p>
          {state.errorMsg && (
            <p className="text-sm text-red-300/70">{state.errorMsg}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-2 px-4 rounded-lg border border-stone-700 text-stone-300 text-sm hover:bg-stone-800 transition-colors"
            >
              Retour
            </button>
            {state.bookId && (
              <button
                onClick={() => router.push(`/play/${state.bookId}/1`)}
                className="flex-1 py-2 px-4 rounded-lg border border-amber-800/50 text-amber-400 text-sm hover:bg-amber-900/20 transition-colors"
              >
                Forcer le lancement
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
