import { prisma } from './db'
import { extractTextFromPdf, cleanText } from './pdf/extractor'
import { splitIntroAndBody, parseNodes } from './pdf/nodeParser'
import { extractChoices } from './pdf/choiceExtractor'
import { ValidationReport } from '@/types'
import { generateNodeTitles } from './ai/router'

async function updateJob(bookId: string, status: string, progress: number, currentStep: string, errorMsg?: string) {
  await prisma.processingJob.update({
    where: { bookId },
    data: { status, progress, currentStep, errorMsg: errorMsg || null, updatedAt: new Date() },
  })
}

export async function runPipeline(bookId: string, pdfPath: string, language: 'fr' | 'en') {
  try {
    await updateJob(bookId, 'extracting', 5, 'Détection de l\'introduction...')

    // Phase 1 — Extract raw text
    const rawText = await extractTextFromPdf(pdfPath)
    const cleanedText = cleanText(rawText)

    await updateJob(bookId, 'extracting', 15, 'Extraction du texte brut...')

    // Phase 0 — Split intro and body
    const { introRaw, body } = splitIntroAndBody(cleanedText)

    await prisma.book.update({
      where: { id: bookId },
      data: { introRaw },
    })

    await updateJob(bookId, 'parsing', 25, 'Détection des paragraphes...')

    // Phase 2 — Detect nodes
    const nodesMap = parseNodes(body)
    const nodeCount = nodesMap.size

    await updateJob(bookId, 'parsing', 45, `Détection des paragraphes (${nodeCount} trouvés)...`)

    // Phase 3 — Extract choices
    await updateJob(bookId, 'parsing', 50, 'Extraction des choix de navigation...')

    const nodesWithChoices: Array<{
      number: number
      contentRaw: string
      choices: Array<{ label: string; targetNodeNumber: number }>
      isTerminal: boolean
      icon: string | null
    }> = []

    for (const [number, contentRaw] of Array.from(nodesMap.entries())) {
      const choices = extractChoices(contentRaw, language)
      const isTerminal = choices.length === 0
      const icon = isTerminal && contentRaw.includes('Fin de l\'aventure') ? '💀' : null
      nodesWithChoices.push({
        number,
        contentRaw,
        choices,
        isTerminal,
        icon,
      })
    }

    const totalChoices = nodesWithChoices.reduce((sum, n) => sum + n.choices.length, 0)

    await updateJob(bookId, 'validating', 60, `Validation des références (${nodeCount} nodes, ${totalChoices} choix)...`)

    // Phase 4 — Validate references
    const nodeNumbers = new Set(nodesMap.keys())
    const orphanTargets: number[] = []
    const terminalNodes: number[] = []
    const reachable = new Set<number>()

    // Find all referenced targets
    const allTargets = new Set<number>()
    for (const node of nodesWithChoices) {
      for (const choice of node.choices) {
        allTargets.add(choice.targetNodeNumber)
        if (!nodeNumbers.has(choice.targetNodeNumber)) {
          if (!orphanTargets.includes(choice.targetNodeNumber)) {
            orphanTargets.push(choice.targetNodeNumber)
          }
        }
      }
      if (node.isTerminal) terminalNodes.push(node.number)
    }

    // BFS from node 1 to find unreachable nodes
    if (nodeNumbers.has(1)) {
      const queue = [1]
      reachable.add(1)
      const adjacency = new Map<number, number[]>()
      for (const node of nodesWithChoices) {
        adjacency.set(node.number, node.choices.map(c => c.targetNodeNumber))
      }
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const next of (adjacency.get(current) || [])) {
          if (!reachable.has(next) && nodeNumbers.has(next)) {
            reachable.add(next)
            queue.push(next)
          }
        }
      }
    }

    const unreachableNodes = Array.from(nodeNumbers).filter(n => !reachable.has(n))

    const validation: ValidationReport = {
      totalNodes: nodeCount,
      totalChoices,
      uniqueTargets: allTargets.size,
      orphanTargets,
      unreachableNodes,
      terminalNodes,
      validationStatus: orphanTargets.length > 0 ? 'errors' : unreachableNodes.length > 0 ? 'warnings' : 'ok',
    }

    if (orphanTargets.length > 0) {
      const msg = `Cibles introuvables: ${orphanTargets.slice(0, 7).join(', ')}`
      await updateJob(bookId, 'error', 60, 'Validation échouée', msg)
      await prisma.book.update({ where: { id: bookId }, data: { status: 'error' } })
      return { success: false, validation }
    }

    // Save nodes to DB
    await updateJob(bookId, 'analyzing', 65, 'Sauvegarde des paragraphes...')

    // Batch insert nodes
    const batchSize = 50
    for (let i = 0; i < nodesWithChoices.length; i += batchSize) {
      const batch = nodesWithChoices.slice(i, i + batchSize)
      await prisma.$transaction(
        batch.map(node =>
          prisma.node.upsert({
            where: { bookId_number: { bookId, number: node.number } },
            create: {
              bookId,
              number: node.number,
              contentRaw: node.contentRaw,
              choices: node.choices,
              isTerminal: node.isTerminal,
              icon: node.icon,
            },
            update: {
              contentRaw: node.contentRaw,
              choices: node.choices,
              isTerminal: node.isTerminal,
              icon: node.icon,
            },
          })
        )
      )
      const progress = 65 + Math.floor(((i + batch.length) / nodesWithChoices.length) * 15)
      await updateJob(bookId, 'analyzing', progress, `Sauvegarde paragraphes (${i + batch.length}/${nodeCount})...`)
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { totalNodes: nodeCount },
    })

    // Phase 5 — LLM analysis (optional)
    const settings = await prisma.settings.findFirst()
    const hasLLM = settings?.providerText === 'gemini'
      ? !!process.env.GEMINI_API_KEY
      : !!process.env.ANTHROPIC_API_KEY

    if (hasLLM) {
      await updateJob(bookId, 'analyzing', 80, 'Analyse IA – génération des titres...')
      try {
        await generateNodeTitles(bookId, language)
      } catch (e) {
        console.error('LLM title generation failed (non-blocking):', e)
      }
    }

    await updateJob(bookId, 'done', 100, 'Finalisation...')
    await prisma.book.update({ where: { id: bookId }, data: { status: 'ready' } })

    return { success: true, validation }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await updateJob(bookId, 'error', 0, 'Erreur pipeline', msg).catch(() => {})
    await prisma.book.update({ where: { id: bookId }, data: { status: 'error' } }).catch(() => {})
    throw error
  }
}
