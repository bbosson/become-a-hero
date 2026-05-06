'use client'

import { useState } from 'react'
import GraphMap from './GraphMap'
import { GraphNodeData, GraphEdgeData } from '@/hooks/useGraphData'

interface Props {
  graphNodes: GraphNodeData[]
  graphEdges: GraphEdgeData[]
  bookId: string
  onNodeClick: (nodeNumber: number) => void
}

export default function GraphDrawer({ graphNodes, graphEdges, bookId, onNodeClick }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-amber-700 hover:bg-amber-600 flex items-center justify-center shadow-lg text-white"
        aria-label="Ouvrir la carte"
      >
        📍
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="h-3/4 bg-stone-900 border-t border-stone-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <h3 className="text-sm font-medium text-stone-200">Carte de navigation</h3>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-200">✕</button>
            </div>
            <div className="flex-1">
              <GraphMap
                graphNodes={graphNodes}
                graphEdges={graphEdges}
                bookId={bookId}
                onNodeClick={(num) => { onNodeClick(num); setOpen(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
