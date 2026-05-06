'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  NodeTypes,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import GraphNodeComponent from './GraphNode'
import { buildDag } from './dagBuilder'
import { GraphNodeData, GraphEdgeData } from '@/hooks/useGraphData'

interface Props {
  graphNodes: GraphNodeData[]
  graphEdges: GraphEdgeData[]
  bookId: string
  onNodeClick: (nodeNumber: number) => void
}

const nodeTypes: NodeTypes = {
  graphNode: GraphNodeComponent,
}

export default function GraphMap({ graphNodes, graphEdges, bookId, onNodeClick }: Props) {
  const [meta, setMeta] = useState<Map<number, { title: string | null; icon: string | null }>>(new Map())

  // Batch-fetch title+icon for all visible nodes not yet cached
  useEffect(() => {
    const missing = graphNodes.filter(n => !meta.has(n.number)).map(n => n.number)
    if (missing.length === 0) return

    fetch(`/api/nodes/${bookId}/meta?nums=${missing.join(',')}`)
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, { title: string | null; icon: string | null }>) => {
        setMeta(prev => {
          const next = new Map(prev)
          for (const [numStr, val] of Object.entries(data)) {
            next.set(parseInt(numStr, 10), val)
          }
          return next
        })
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, graphNodes.length])

  const enrichedNodes = useMemo(() =>
    graphNodes.map(n => {
      const cached = meta.get(n.number)
      return {
        ...n,
        title: cached?.title ?? n.title,
        icon: cached?.icon ?? n.icon,
      }
    }),
    [graphNodes, meta]
  )

  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => buildDag(enrichedNodes, graphEdges),
    [enrichedNodes, graphEdges]
  )

  const nodesWithClick = useMemo(() =>
    rfNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onClick: n.data.state === 'visited' ? onNodeClick : undefined,
      },
    })),
    [rfNodes, onNodeClick]
  )

  const [nodes, , onNodesChange] = useNodesState(nodesWithClick)
  const [edges, , onEdgesChange] = useEdgesState(rfEdges)

  useEffect(() => {
    onNodesChange(nodesWithClick.map(n => ({ type: 'reset' as const, item: n })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesWithClick])

  useEffect(() => {
    onEdgesChange(rfEdges.map(e => ({ type: 'reset' as const, item: e })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfEdges])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: { data: { number: number; state: string } }) => {
    if (node.data.state === 'visited') {
      onNodeClick(node.data.number)
    }
  }, [onNodeClick])

  return (
    <div className="w-full h-full" style={{ background: '#0f0e17' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick as never}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#2a2a4a" gap={20} size={1} />
        <Controls className="!bg-stone-900 !border-stone-700" />
      </ReactFlow>
    </div>
  )
}
