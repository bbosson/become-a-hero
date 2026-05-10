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

  const fields = {
    currentNodeNumber: body.currentNodeNumber,
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
      create: { bookId, ...fields },
      update: fields,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('1020') || msg.includes('Record has changed')) {
      savegame = await prisma.savegame.update({ where: { bookId }, data: fields })
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
