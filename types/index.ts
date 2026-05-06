export interface Choice {
  label: string
  targetNodeNumber: number
  conditional?: boolean
}

export interface NodeData {
  id: string
  bookId: string
  number: number
  title: string | null
  icon: string | null
  summary: string | null
  contentRaw: string
  choices: Choice[]
  imageUrl: string | null
  audioUrl: string | null
  isTerminal: boolean
  endType: string | null
}

export interface BookData {
  id: string
  title: string
  language: string
  status: string
  totalNodes: number
  introRaw: string | null
  pdfPath: string
  createdAt: string
  savegame?: SavegameData | null
}

export interface RevealedEdge {
  from: number
  to: number
}

export interface SavegameData {
  id: string
  bookId: string
  currentNodeNumber: number
  resumeNodeNumber: number | null
  visitedNodes: number[]
  nodeOrder: number[]
  choicesTaken: Record<string, number>
  checkpoints: Checkpoint[]
  revealedEdges: RevealedEdge[]
  updatedAt: string
}

export interface Checkpoint {
  nodeNumber: number
  title: string
  savedAt: string
}

export interface ProcessingJobData {
  id: string
  bookId: string
  status: string
  progress: number
  currentStep: string | null
  errorMsg: string | null
}

export interface SettingsData {
  id: number
  providerText: string
  providerImage: string
  providerAudio: string
  imagesEnabled: boolean
  audioEnabled: boolean
}

export interface ValidationReport {
  totalNodes: number
  totalChoices: number
  uniqueTargets: number
  orphanTargets: number[]
  unreachableNodes: number[]
  terminalNodes: number[]
  validationStatus: 'ok' | 'warnings' | 'errors'
}
