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

export interface PlayerStats {
  habilite: number
  habiliteInit: number
  endurance: number
  enduranceInit: number
  chance: number
  chanceInit: number
  magie?: number
  magieInit?: number
  provisions: number
  gold: number
  spellsUsed?: Record<string, number>
}

export interface CombatRound {
  heroRoll: [number, number]
  monsterRoll: [number, number]
  heroAttack: number
  monsterAttack: number
  result: 'hero_hit' | 'monster_hit' | 'tie'
  heroEnduranceAfter: number
  monsterEnduranceAfter: number
  luckTest?: { roll: number; lucky: boolean; damageModifier: number }
}

export interface CombatEntry {
  id: string
  nodeNumber: number
  monsterName: string
  monsterHabiliteInit: number
  monsterEnduranceInit: number
  rounds: CombatRound[]
  outcome: 'victory' | 'defeat' | 'escaped' | 'ongoing'
  heroEnduranceStart: number
  heroEnduranceEnd?: number
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
  stats: PlayerStats | null
  combatLog: CombatEntry[]
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
  autoRead: boolean
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
