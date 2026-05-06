'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNode } from '@/hooks/useNode'
import { useSaveGame } from '@/hooks/useSaveGame'
import { useGraphData } from '@/hooks/useGraphData'
import NodeHeader from './NodeHeader'
import NodeText from './NodeText'
import NodeImage from './NodeImage'
import NodeAudio from './NodeAudio'
import ChoiceList from './ChoiceList'
import SaveBar from './SaveBar'
import CheckpointBar from './CheckpointBar'
import EndScreen from './EndScreen'
import GraphMap from '@/components/graph/GraphMap'
import GraphDrawer from '@/components/graph/GraphDrawer'
import SettingsDrawer from './SettingsDrawer'
import { SettingsData } from '@/types'
import Link from 'next/link'

interface Props {
  bookId: string
  nodeNumber: number
  bookTitle: string
  settings: SettingsData
}

export default function GameLayout({ bookId, nodeNumber, bookTitle, settings }: Props) {
  const router = useRouter()
  const { node, loading, error, updateTitle, generateTitle } = useNode(bookId, nodeNumber)
  const { savegame, navigateTo, pinResumeHere, addCheckpoint, removeCheckpoint, restart } = useSaveGame(bookId)
  const { nodes: graphNodes, edges: graphEdges } = useGraphData(savegame, node)
  const [navigating, setNavigating] = useState(false)

  // Premier chargement : enregistre ce nœud + ses choix comme révélés
  useEffect(() => {
    if (node && savegame && !savegame.visitedNodes.includes(nodeNumber)) {
      navigateTo(nodeNumber, undefined, undefined)
    } else if (!savegame && node) {
      navigateTo(nodeNumber)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.number, !!savegame])

  const handleChoose = useCallback(async (targetNodeNumber: number) => {
    if (navigating) return
    setNavigating(true)
    // Passe les choix du nœud courant pour les enregistrer comme arêtes révélées
    await navigateTo(targetNodeNumber, nodeNumber, node?.choices)
    router.push(`/play/${bookId}/${targetNodeNumber}`)
  }, [navigating, navigateTo, nodeNumber, node, router, bookId])

  const handleGraphNodeClick = useCallback((num: number) => {
    if (navigating) return
    navigateTo(num)
    router.push(`/play/${bookId}/${num}`)
  }, [navigating, navigateTo, router, bookId])

  const handleCheckpointClick = useCallback((num: number) => {
    if (navigating) return
    navigateTo(num)
    router.push(`/play/${bookId}/${num}`)
  }, [navigating, navigateTo, router, bookId])

  const handleRemoveCheckpoint = useCallback((num: number) => {
    removeCheckpoint(num)
  }, [removeCheckpoint])

  const handlePinResume = useCallback(() => {
    pinResumeHere(nodeNumber)
  }, [pinResumeHere, nodeNumber])

  const handleAddCheckpoint = useCallback(() => {
    const title = node?.title || `Paragraphe ${nodeNumber}`
    addCheckpoint(nodeNumber, title)
  }, [addCheckpoint, nodeNumber, node])

  const handleRestart = useCallback(async () => {
    await restart()
    router.push(`/play/${bookId}/1`)
  }, [restart, router, bookId])

  const isPinned = savegame?.resumeNodeNumber === nodeNumber

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500 animate-pulse">Le maître du jeu prépare...</div>
      </div>
    )
  }

  if (error || !node) {
    return (
      <div className="flex flex-col items-center gap-4 h-64 justify-center">
        <p className="text-red-400">Paragraphe introuvable</p>
        <Link href={`/play/${bookId}/1`} className="text-amber-400 underline text-sm">
          Retour au paragraphe 1
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0e17' }}>
      {/* Header */}
      <header className="border-b border-amber-900/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-amber-500 text-lg">⚔</Link>
          <span className="text-stone-400 text-sm hidden sm:block">—</span>
          <span className="text-stone-300 text-sm hidden sm:block truncate max-w-48">{bookTitle}</span>
        </div>
        <SettingsDrawer />
      </header>

      {/* Main layout: 2/3 content + 1/3 graph (desktop) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content pane */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex flex-col flex-1 px-4 sm:px-6 py-5 max-w-2xl w-full mx-auto">
            <NodeHeader
              number={node.number}
              title={node.title}
              onSave={updateTitle}
              onGenerateAI={generateTitle}
            />

            <div className="mt-4 flex flex-col gap-4">
              <NodeImage
                bookId={bookId}
                nodeNumber={nodeNumber}
                imageUrl={node.imageUrl}
                imagesEnabled={settings.imagesEnabled}
              />

              <NodeAudio
                bookId={bookId}
                nodeNumber={nodeNumber}
                audioUrl={node.audioUrl}
                audioEnabled={settings.audioEnabled}
              />

              <NodeText content={node.contentRaw} />
            </div>

            {node.isTerminal ? (
              <EndScreen
                node={node}
                savegame={savegame}
                bookId={bookId}
                onRestart={handleRestart}
                onReviewGraph={() => {}}
              />
            ) : (
              <ChoiceList
                choices={node.choices as never}
                onChoose={handleChoose}
                disabled={navigating}
              />
            )}

            <SaveBar
              onPinResume={handlePinResume}
              onAddCheckpoint={handleAddCheckpoint}
              pinned={isPinned}
            />
          </div>

          {/* Checkpoint bar */}
          <CheckpointBar
            checkpoints={savegame?.checkpoints || []}
            currentNodeNumber={nodeNumber}
            onNavigate={handleCheckpointClick}
            onRemove={handleRemoveCheckpoint}
          />
        </div>

        {/* Graph sidebar — desktop only */}
        <div className="hidden md:flex w-[340px] flex-shrink-0 border-l border-stone-800/50 flex-col">
          <div className="px-4 py-3 border-b border-stone-800/50">
            <h3 className="text-xs text-stone-500 uppercase tracking-widest">Carte de navigation</h3>
          </div>
          <div className="flex-1">
            <GraphMap
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              bookId={bookId}
              onNodeClick={handleGraphNodeClick}
            />
          </div>
        </div>
      </div>

      {/* Mobile graph drawer */}
      <GraphDrawer
        graphNodes={graphNodes}
        graphEdges={graphEdges}
        bookId={bookId}
        onNodeClick={handleGraphNodeClick}
      />
    </div>
  )
}
