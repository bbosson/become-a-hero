import { useState, useEffect, useCallback, useRef } from 'react'
import { SavegameData, Checkpoint, Choice, RevealedEdge } from '@/types'

export function useSaveGame(bookId: string) {
  const [savegame, setSavegame] = useState<SavegameData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<SavegameData | null>(null)

  useEffect(() => {
    fetch(`/api/savegame/${bookId}`)
      .then(res => res.json())
      .then(data => {
        ref.current = data
        setSavegame(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [bookId])

  const save = useCallback(async (data: Partial<SavegameData>) => {
    const updated = { ...ref.current, ...data }
    ref.current = updated as SavegameData
    setSavegame(updated as SavegameData)

    const res = await fetch(`/api/savegame/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    const saved = await res.json()
    ref.current = saved
    setSavegame(saved)
    return saved
  }, [bookId])

  const navigateTo = useCallback(async (
    nodeNumber: number,
    fromNode?: number,
    fromChoices?: Choice[]
  ) => {
    const sg = ref.current
    if (!sg) {
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

    const visitedNodes = sg.visitedNodes.includes(nodeNumber)
      ? sg.visitedNodes
      : [...sg.visitedNodes, nodeNumber]

    const lastInOrder = sg.nodeOrder[sg.nodeOrder.length - 1]
    const nodeOrder = lastInOrder === nodeNumber
      ? sg.nodeOrder
      : [...sg.nodeOrder, nodeNumber]

    const choicesTaken = fromNode !== undefined
      ? { ...sg.choicesTaken, [fromNode]: nodeNumber }
      : sg.choicesTaken

    let revealedEdges: RevealedEdge[] = sg.revealedEdges || []
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
  }, [bookId, save])

  const pinResumeHere = useCallback(async (nodeNumber: number) => {
    await save({ resumeNodeNumber: nodeNumber })
  }, [save])

  const addCheckpoint = useCallback(async (nodeNumber: number, title: string) => {
    const sg = ref.current
    if (!sg) return
    const existing = sg.checkpoints.find(c => c.nodeNumber === nodeNumber)
    if (existing) return
    const checkpoints: Checkpoint[] = [
      ...sg.checkpoints,
      { nodeNumber, title, savedAt: new Date().toISOString() },
    ]
    await save({ checkpoints })
  }, [save])

  const removeCheckpoint = useCallback(async (nodeNumber: number) => {
    const sg = ref.current
    if (!sg) return
    const checkpoints = sg.checkpoints.filter(c => c.nodeNumber !== nodeNumber)
    await save({ checkpoints })
  }, [save])

  const restart = useCallback(async () => {
    if (!ref.current) return
    await save({
      currentNodeNumber: 1,
      resumeNodeNumber: null,
      visitedNodes: [],
      nodeOrder: [],
      choicesTaken: {},
      revealedEdges: [],
    })
  }, [save])

  const isVisited = useCallback((nodeNumber: number) =>
    (ref.current?.visitedNodes || []).includes(nodeNumber)
  , [])

  const markCurrent = useCallback(async (nodeNumber: number) => {
    if (ref.current?.currentNodeNumber === nodeNumber) return
    await save({ currentNodeNumber: nodeNumber })
  }, [save])

  const findPrevIndex = (sg: SavegameData): number => {
    const current = sg.currentNodeNumber
    let i = sg.nodeOrder.length - 1
    while (i >= 0 && sg.nodeOrder[i] === current) i--
    return i
  }

  const goBack = useCallback(async (): Promise<number | null> => {
    const sg = ref.current
    if (!sg) return null
    const prevIndex = findPrevIndex(sg)
    if (prevIndex < 0) return null
    const prevNodeNumber = sg.nodeOrder[prevIndex]
    const nodeOrder = sg.nodeOrder.slice(0, prevIndex + 1)
    await save({ currentNodeNumber: prevNodeNumber, nodeOrder })
    return prevNodeNumber
  }, [save])

  const goBackAndForget = useCallback(async (currentNodeNumber: number): Promise<number | null> => {
    const sg = ref.current
    if (!sg) return null
    const prevIndex = findPrevIndex(sg)
    if (prevIndex < 0) return null
    const prevNodeNumber = sg.nodeOrder[prevIndex]
    const nodeOrder = sg.nodeOrder.slice(0, prevIndex + 1)
    const visitedNodes = sg.visitedNodes.filter(n => n !== currentNodeNumber)
    const revealedEdges = (sg.revealedEdges || []).filter(e => e.from !== currentNodeNumber)
    await save({ currentNodeNumber: prevNodeNumber, nodeOrder, visitedNodes, revealedEdges })
    return prevNodeNumber
  }, [save])

  return { savegame, saveLoading: loading, navigateTo, markCurrent, pinResumeHere, addCheckpoint, removeCheckpoint, restart, isVisited, goBack, goBackAndForget }
}
