import { Router } from 'express'
import { prisma } from '../../lib/db'

const router = Router()

router.get('/:bookId', async (req, res) => {
  const savegame = await prisma.savegame.findUnique({ where: { bookId: req.params.bookId } })
  res.json(savegame)
})

router.put('/:bookId', async (req, res) => {
  const body = req.body
  const bookId = req.params.bookId

  const update: Record<string, unknown> = {}
  if (body.currentNodeNumber !== undefined) update.currentNodeNumber = body.currentNodeNumber
  if (body.resumeNodeNumber !== undefined) update.resumeNodeNumber = body.resumeNodeNumber
  if (body.visitedNodes !== undefined) update.visitedNodes = body.visitedNodes
  if (body.nodeOrder !== undefined) update.nodeOrder = body.nodeOrder
  if (body.choicesTaken !== undefined) update.choicesTaken = body.choicesTaken
  if (body.checkpoints !== undefined) update.checkpoints = body.checkpoints
  if (body.revealedEdges !== undefined) update.revealedEdges = body.revealedEdges
  if (body.stats !== undefined) update.stats = body.stats
  if (body.combatLog !== undefined) update.combatLog = body.combatLog

  const create = {
    bookId,
    currentNodeNumber: body.currentNodeNumber ?? 1,
    resumeNodeNumber: body.resumeNodeNumber ?? null,
    visitedNodes: body.visitedNodes ?? [],
    nodeOrder: body.nodeOrder ?? [],
    choicesTaken: body.choicesTaken ?? {},
    checkpoints: body.checkpoints ?? [],
    revealedEdges: body.revealedEdges ?? [],
    stats: body.stats ?? null,
    combatLog: body.combatLog ?? [],
  }

  // Upsert with retry on MariaDB 1020 (concurrent modification race)
  let savegame
  try {
    savegame = await prisma.savegame.upsert({
      where: { bookId },
      create,
      update,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('1020') || msg.includes('Record has changed')) {
      savegame = await prisma.savegame.update({ where: { bookId }, data: update })
    } else {
      throw e
    }
  }

  res.json(savegame)
})

router.delete('/:bookId', async (req, res) => {
  await prisma.savegame.deleteMany({ where: { bookId: req.params.bookId } })
  res.json({ ok: true })
})

export default router
