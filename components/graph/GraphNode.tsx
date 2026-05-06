'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'

interface Props {
  data: {
    number: number
    title: string | null
    icon: string | null
    isCheckpoint: boolean
    state: 'current' | 'visited' | 'discovered'
    onClick?: (number: number) => void
  }
}

const stateStyles = {
  current: 'border-amber-500 bg-amber-900/40 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]',
  visited: 'border-stone-600 bg-stone-800/60 text-stone-400 cursor-pointer hover:border-stone-400',
  discovered: 'border-stone-700/50 bg-stone-900/40 text-stone-600 border-dashed',
}

function GraphNodeComponent({ data }: Props) {
  const style = stateStyles[data.state]
  const clickable = data.state === 'visited'

  return (
    <div
      className={`rounded-lg border px-2 py-1.5 text-center w-[120px] transition-all relative ${style}`}
      onClick={clickable && data.onClick ? () => data.onClick!(data.number) : undefined}
    >
      {data.isCheckpoint && (
        <span className="absolute -top-2 -right-2 text-sm leading-none" title="Checkpoint">🚩</span>
      )}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center justify-center gap-1">
        {data.icon && <span className="text-sm leading-none">{data.icon}</span>}
        <span className="text-xs font-mono font-bold">§{data.number}</span>
      </div>
      {data.title && (
        <div className="text-[10px] leading-tight mt-0.5 truncate opacity-80">
          {data.title}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

export default memo(GraphNodeComponent)
