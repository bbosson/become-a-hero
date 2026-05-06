import { useMemo } from 'react'
import { SavegameData, NodeData } from '@/types'

export interface GraphNodeData {
  id: string
  number: number
  title: string | null
  state: 'current' | 'visited' | 'discovered'
}

export interface GraphEdgeData {
  id: string
  source: string
  target: string
  taken: boolean
}

export function useGraphData(
  savegame: SavegameData | null,
  currentNode: NodeData | null
) {
  return useMemo(() => {
    if (!savegame) return { nodes: [], edges: [] }

    const nodeMap = new Map<number, GraphNodeData>()
    const edgeSet = new Set<string>()
    const edges: GraphEdgeData[] = []
    const visitedSet = new Set(savegame.visitedNodes)

    // 1. Nœuds visités (+ courant)
    for (const n of savegame.visitedNodes) {
      nodeMap.set(n, {
        id: `n-${n}`,
        number: n,
        title: null,
        state: n === savegame.currentNodeNumber ? 'current' : 'visited',
      })
    }

    // 2. Arêtes des choix pris
    for (const [from, to] of Object.entries(savegame.choicesTaken)) {
      const fromNum = parseInt(from, 10)
      const toNum = to as number
      const edgeId = `e-${fromNum}-${toNum}`
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId)
        edges.push({ id: edgeId, source: `n-${fromNum}`, target: `n-${toNum}`, taken: true })
      }
    }

    // 3. Toutes les arêtes révélées (choix vus lors de visites précédentes)
    const revealed = savegame.revealedEdges || []
    for (const edge of revealed) {
      // Nœud cible non visité → état "discovered"
      if (!nodeMap.has(edge.to)) {
        nodeMap.set(edge.to, {
          id: `n-${edge.to}`,
          number: edge.to,
          title: null,
          state: 'discovered',
        })
      }
      const edgeId = `e-${edge.from}-${edge.to}`
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId)
        edges.push({
          id: edgeId,
          source: `n-${edge.from}`,
          target: `n-${edge.to}`,
          taken: visitedSet.has(edge.to),
        })
      }
    }

    // 4. Choix du nœud courant (pas encore dans revealedEdges — révélation immédiate)
    if (currentNode) {
      for (const choice of currentNode.choices) {
        const t = choice.targetNodeNumber
        if (!nodeMap.has(t)) {
          nodeMap.set(t, {
            id: `n-${t}`,
            number: t,
            title: null,
            state: visitedSet.has(t) ? 'visited' : 'discovered',
          })
        }
        const edgeId = `e-${currentNode.number}-${t}`
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId)
          edges.push({
            id: edgeId,
            source: `n-${currentNode.number}`,
            target: `n-${t}`,
            taken: visitedSet.has(t),
          })
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), edges }
  }, [savegame, currentNode])
}
