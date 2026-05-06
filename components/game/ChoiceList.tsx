'use client'

import { Choice } from '@/types'

interface Props {
  choices: Choice[]
  onChoose: (targetNodeNumber: number) => void
  disabled?: boolean
}

export default function ChoiceList({ choices, onChoose, disabled }: Props) {
  if (choices.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mt-6">
      <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Que faites-vous ?</p>
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onChoose(choice.targetNodeNumber)}
          disabled={disabled}
          className="choice-btn group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-amber-600 group-hover:text-amber-400 mr-2">›</span>
          <span>{choice.label}</span>
          <span className="float-right text-xs text-stone-600 group-hover:text-stone-400">
            → §{choice.targetNodeNumber}
          </span>
        </button>
      ))}
    </div>
  )
}
