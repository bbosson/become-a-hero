import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import LayoutPicker, { LayoutConfig, DEFAULT_LAYOUT, LAYOUT_KEY } from './LayoutPicker'
import { SettingsData } from '@/types'
import { Link } from 'react-router-dom'

interface Props {
  bookId: string
  nodeNumber: number
  bookTitle: string
  settings: SettingsData
}

export default function GameLayout({ bookId, nodeNumber, bookTitle, settings }: Props) {
  const navigate = useNavigate()
  const { node, loading, error, updateTitle, updateIcon, generateTitle } = useNode(bookId, nodeNumber)
  const { savegame, saveLoading, navigateTo, markCurrent, pinResumeHere, addCheckpoint, removeCheckpoint, restart, isVisited, goBack, goBackAndForget } = useSaveGame(bookId)
  const { nodes: graphNodes, edges: graphEdges } = useGraphData(savegame, node)
  const [navigating, setNavigating] = useState(false)
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT)
  const [jumpNode, setJumpNode] = useState('')

  useEffect(() => {
    setNavigating(false)
  }, [nodeNumber])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_KEY)
      if (stored) setLayout(JSON.parse(stored))
    } catch {}
  }, [])

  const updateLayout = useCallback((l: LayoutConfig) => {
    setLayout(l)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(l))
  }, [])

  // Attend que savegame soit chargé avant de vérifier : évite d'écraser la progression
  // si node arrive avant la réponse API savegame (race condition)
  useEffect(() => {
    if (!node || saveLoading) return
    if (!isVisited(nodeNumber)) {
      navigateTo(nodeNumber, undefined, undefined)
    } else {
      markCurrent(nodeNumber)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.number, saveLoading])

  const handleChoose = useCallback(async (targetNodeNumber: number) => {
    if (navigating) return
    setNavigating(true)
    // Passe les choix du nœud courant pour les enregistrer comme arêtes révélées
    await navigateTo(targetNodeNumber, nodeNumber, node?.choices)
    navigate(`/play/${bookId}/${targetNodeNumber}`)
  }, [navigating, navigateTo, nodeNumber, node, navigate, bookId])

  const handleGraphNodeClick = useCallback((num: number) => {
    if (navigating) return
    navigateTo(num)
    navigate(`/play/${bookId}/${num}`)
  }, [navigating, navigateTo, navigate, bookId])

  const handleCheckpointClick = useCallback((num: number) => {
    if (navigating) return
    navigateTo(num)
    navigate(`/play/${bookId}/${num}`)
  }, [navigating, navigateTo, navigate, bookId])

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
    navigate(`/play/${bookId}/1`)
  }, [restart, navigate, bookId])

  const handleGoBack = useCallback(async () => {
    if (navigating) return
    setNavigating(true)
    const prev = await goBack()
    if (prev !== null) navigate(`/play/${bookId}/${prev}`)
    else setNavigating(false)
  }, [navigating, goBack, navigate, bookId])

  const handleGoBackAndForget = useCallback(async () => {
    if (navigating) return
    setNavigating(true)
    const prev = await goBackAndForget(nodeNumber)
    if (prev !== null) navigate(`/play/${bookId}/${prev}`)
    else setNavigating(false)
  }, [navigating, goBackAndForget, nodeNumber, navigate, bookId])

  const handleJumpToNode = () => {
    const num = parseInt(jumpNode, 10)
    if (!isNaN(num) && num > 0) {
      navigate(`/play/${bookId}/${num}`)
      setJumpNode('')
    }
  }

  const canGoBack = !!savegame && savegame.nodeOrder.some(n => n !== savegame.currentNodeNumber)
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
        <Link to={`/play/${bookId}/1`} className="text-amber-400 underline text-sm">
          Retour au paragraphe 1
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0f0e17' }}>
      {/* Header */}
      <header className="border-b border-amber-900/20 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors" title="Bibliothèque">
            <span className="text-lg">⚔</span>
            <span className="text-xs text-stone-500 hover:text-stone-400 hidden sm:inline">← Bibliothèque</span>
          </Link>
          <span className="text-stone-700 hidden sm:block">|</span>
          <span className="text-stone-300 text-sm hidden sm:block truncate max-w-48">{bookTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={jumpNode}
              onChange={e => setJumpNode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJumpToNode()}
              placeholder="§…"
              className="w-14 bg-stone-800 text-stone-300 text-xs rounded px-2 py-1 border border-stone-700 focus:outline-none focus:border-amber-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={handleJumpToNode}
              className="text-xs text-stone-500 hover:text-amber-400 transition-colors px-1"
              title="Aller au paragraphe"
            >
              →
            </button>
          </div>
          <LayoutPicker layout={layout} onChange={updateLayout} />
          <SettingsDrawer />
        </div>
      </header>

      {/* Main layout — direction + split driven by layout state */}
      <div className={`flex flex-1 overflow-hidden ${layout.direction === 'right' || layout.direction === 'left' ? 'flex-row' : 'flex-col'}`}>
        {/* Graph pane — rendered first when map is on left or top */}
        {(layout.direction === 'left' || layout.direction === 'top') && (
          <div
            className={`hidden md:flex flex-shrink-0 ${layout.direction === 'top' ? 'border-b' : 'border-r'} border-stone-800/50 flex-col min-h-0`}
            style={{ flex: layout.split === '1-2' ? 2 : 1 }}
          >
            <div className="px-4 py-3 border-b border-stone-800/50 flex-shrink-0">
              <h3 className="text-xs text-stone-500 uppercase tracking-widest">Carte de navigation</h3>
            </div>
            <div className="flex-1 min-h-0">
              <GraphMap graphNodes={graphNodes} graphEdges={graphEdges} bookId={bookId} onNodeClick={handleGraphNodeClick} />
            </div>
          </div>
        )}

        {/* Content pane */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0" style={{ flex: layout.split === '2-1' ? 2 : 1 }}>
          <div className="flex flex-col flex-1 px-4 sm:px-6 py-5 max-w-2xl w-full mx-auto">
            <NodeHeader
              number={node.number}
              title={node.title}
              icon={node.icon}
              onSave={updateTitle}
              onGenerateAI={generateTitle}
              onSaveIcon={updateIcon}
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
              onGoBack={handleGoBack}
              onGoBackAndForget={handleGoBackAndForget}
              pinned={isPinned}
              canGoBack={canGoBack}
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

        {/* Graph pane — right or bottom */}
        {(layout.direction === 'right' || layout.direction === 'bottom') && (
          <div
            className={`hidden md:flex flex-shrink-0 ${layout.direction === 'bottom' ? 'border-t' : 'border-l'} border-stone-800/50 flex-col min-h-0`}
            style={{ flex: layout.split === '1-2' ? 2 : 1 }}
          >
            <div className="px-4 py-3 border-b border-stone-800/50 flex-shrink-0">
              <h3 className="text-xs text-stone-500 uppercase tracking-widest">Carte de navigation</h3>
            </div>
            <div className="flex-1 min-h-0">
              <GraphMap graphNodes={graphNodes} graphEdges={graphEdges} bookId={bookId} onNodeClick={handleGraphNodeClick} />
            </div>
          </div>
        )}
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
