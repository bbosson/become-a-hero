import dagre from 'dagre'
import { GraphNodeData, GraphEdgeData } from '@/hooks/useGraphData'

export interface RFNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: { number: number; title: string | null; state: string }
}

export interface RFEdge {
  id: string
  source: string
  target: string
  type: string
  animated: boolean
  style: Record<string, string | number>
}

const NODE_WIDTH = 120
const NODE_HEIGHT = 50

export function buildDag(graphNodes: GraphNodeData[], graphEdges: GraphEdgeData[]): { nodes: RFNode[]; edges: RFEdge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 50 })

  for (const n of graphNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const e of graphEdges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const rfNodes: RFNode[] = graphNodes.map(n => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: 'graphNode',
      position: {
        x: pos ? pos.x - NODE_WIDTH / 2 : 0,
        y: pos ? pos.y - NODE_HEIGHT / 2 : 0,
      },
      data: { number: n.number, title: n.title, state: n.state },
    }
  })

  const rfEdges: RFEdge[] = graphEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated: !e.taken,
    style: {
      stroke: e.taken ? '#78716c' : '#d97706',
      strokeWidth: e.taken ? 1.5 : 1,
      strokeDasharray: e.taken ? 'none' : '4 2',
    },
  }))

  return { nodes: rfNodes, edges: rfEdges }
}
