import { useState, useEffect, useCallback } from 'react'
import { SavegameData, Checkpoint, Choice, RevealedEdge } from '@/types'

export function useSaveGame(bookId: string) {
  const [savegame, setSavegame] = useState<SavegameData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/savegame/${bookId}`)
      .then(res => res.json())
      .then(data => {
        setSavegame(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [bookId])

  const save = useCallback(async (data: Partial<SavegameData>) => {
    const updated = { ...savegame, ...data }
    setSavegame(updated as SavegameData)

    const res = await fetch(`/api/savegame/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    const saved = await res.json()
    setSavegame(saved)
    return saved
  }, [bookId, savegame])

  // choices = les choix du nœud courant, enregistrés comme arêtes révélées
  const navigateTo = useCallback(async (
    nodeNumber: number,
    fromNode?: number,
    fromChoices?: Choice[]
  ) => {
    if (!savegame) {
      await save({
        bookId,
        currentNodeNumber: nodeNumber,
        visitedNodes: [nodeNumber],
        nodeOrder: [nodeNumber],
        choicesTaken: {},
        checkpoints: [],
        revealedEdges: [],
      })
      return
    }

    const visitedNodes = savegame.visitedNodes.includes(nodeNumber)
      ? savegame.visitedNodes
      : [...savegame.visitedNodes, nodeNumber]

    const nodeOrder = [...savegame.nodeOrder, nodeNumber]

    const choicesTaken = fromNode !== undefined
      ? { ...savegame.choicesTaken, [fromNode]: nodeNumber }
      : savegame.choicesTaken

    // Merge new revealed edges (choix visibles au moment de naviguer)
    let revealedEdges: RevealedEdge[] = savegame.revealedEdges || []
    if (fromNode !== undefined && fromChoices) {
      const existingKeys = new Set(revealedEdges.map(e => `${e.from}-${e.to}`))
      for (const choice of fromChoices) {
        const key = `${fromNode}-${choice.targetNodeNumber}`
        if (!existingKeys.has(key)) {
          revealedEdges = [...revealedEdges, { from: fromNode, to: choice.targetNodeNumber }]
          existingKeys.add(key)
        }
      }
    }

    await save({
      currentNodeNumber: nodeNumber,
      visitedNodes,
      nodeOrder,
      choicesTaken,
      revealedEdges,
    })
  }, [bookId, savegame, save])

  const pinResumeHere = useCallback(async (nodeNumber: number) => {
    await save({ resumeNodeNumber: nodeNumber })
  }, [save])

  const addCheckpoint = useCallback(async (nodeNumber: number, title: string) => {
    if (!savegame) return
    const existing = savegame.checkpoints.find(c => c.nodeNumber === nodeNumber)
    if (existing) return
    const checkpoints: Checkpoint[] = [
      ...savegame.checkpoints,
      { nodeNumber, title, savedAt: new Date().toISOString() },
    ]
    await save({ checkpoints })
  }, [savegame, save])

  const removeCheckpoint = useCallback(async (nodeNumber: number) => {
    if (!savegame) return
    const checkpoints = savegame.checkpoints.filter(c => c.nodeNumber !== nodeNumber)
    await save({ checkpoints })
  }, [savegame, save])

  const restart = useCallback(async () => {
    if (!savegame) return
    await save({
      currentNodeNumber: 1,
      resumeNodeNumber: null,
      visitedNodes: [],
      nodeOrder: [],
      choicesTaken: {},
      revealedEdges: [],
      // checkpoints survive restart
    })
  }, [savegame, save])

  return { savegame, loading, navigateTo, pinResumeHere, addCheckpoint, removeCheckpoint, restart }
}
