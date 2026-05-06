'use client'

import { useRef, useState, useEffect } from 'react'

export type LayoutSplit = '2-1' | '1-1' | '1-2'
export type LayoutDirection = 'right' | 'left' | 'bottom' | 'top'
export interface LayoutConfig {
  split: LayoutSplit
  direction: LayoutDirection
}

export const DEFAULT_LAYOUT: LayoutConfig = { split: '2-1', direction: 'right' }
export const LAYOUT_KEY = 'bah-layout'

const DIRECTIONS: { value: LayoutDirection; label: string }[] = [
  { value: 'right', label: 'Carte à droite' },
  { value: 'left',  label: 'Carte à gauche' },
  { value: 'bottom', label: 'Carte en bas' },
  { value: 'top',   label: 'Carte en haut' },
]

const SPLITS: { value: LayoutSplit; label: string }[] = [
  { value: '2-1', label: '2/3 – 1/3' },
  { value: '1-1', label: '1/2 – 1/2' },
  { value: '1-2', label: '1/3 – 2/3' },
]

function MiniPreview({ direction, split }: { direction: LayoutDirection; split: LayoutSplit }) {
  const isH = direction === 'right' || direction === 'left'
  const mapFirst = direction === 'left' || direction === 'top'

  const storyRatio = split === '2-1' ? 2 : 1
  const mapRatio   = split === '1-2' ? 2 : 1

  const story = (
    <div
      key="story"
      style={{ flex: storyRatio }}
      className="rounded-[2px] bg-stone-500/60"
    />
  )
  const map = (
    <div
      key="map"
      style={{ flex: mapRatio }}
      className="rounded-[2px] bg-amber-600/70"
    />
  )

  return (
    <div className={`flex ${isH ? 'flex-row' : 'flex-col'} gap-0.5 w-full h-full p-0.5`}>
      {mapFirst ? [map, story] : [story, map]}
    </div>
  )
}

interface Props {
  layout: LayoutConfig
  onChange: (l: LayoutConfig) => void
}

export default function LayoutPicker({ layout, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs border transition-colors ${
          open
            ? 'border-amber-700/50 text-amber-400 bg-amber-900/20'
            : 'border-stone-700/50 text-stone-400 hover:text-stone-200 hover:border-stone-600'
        }`}
        title="Disposition de l'écran"
      >
        <span>⊞</span>
        <span className="hidden sm:inline">Layout</span>
      </button>

      {open && (
        <div className="absolute top-10 right-0 z-50 bg-stone-900 border border-stone-700 rounded-xl p-4 shadow-2xl w-64">

          {/* Direction */}
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">Disposition</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {DIRECTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onChange({ ...layout, direction: value })}
                title={label}
                className={`h-12 rounded-lg border transition-colors overflow-hidden p-1 ${
                  layout.direction === value
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-stone-700 bg-stone-800/60 hover:border-stone-500'
                }`}
              >
                <MiniPreview direction={value} split={layout.split} />
              </button>
            ))}
          </div>

          {/* Split */}
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">Proportions</p>
          <div className="flex flex-col gap-1">
            {SPLITS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onChange({ ...layout, split: value })}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs border transition-colors ${
                  layout.split === value
                    ? 'border-amber-500 text-amber-300 bg-amber-900/20'
                    : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                }`}
              >
                <div className={`flex ${layout.direction === 'bottom' || layout.direction === 'top' ? 'flex-col' : 'flex-row'} gap-0.5 w-10 h-5 flex-shrink-0`}>
                  <div
                    className="rounded-[2px] bg-stone-500/60"
                    style={{ flex: value === '2-1' ? 2 : 1 }}
                  />
                  <div
                    className="rounded-[2px] bg-amber-600/70"
                    style={{ flex: value === '1-2' ? 2 : 1 }}
                  />
                </div>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
