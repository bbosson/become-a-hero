import { Router } from 'express'
import { prisma } from '../../lib/db'

const router = Router()

router.get('/', async (_req, res) => {
  const books = await prisma.book.findMany({
    where: { status: { in: ['ready', 'processing', 'error'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      savegame: {
        select: { currentNodeNumber: true, resumeNodeNumber: true, visitedNodes: true },
      },
    },
  })
  res.json(books)
})

router.get('/:bookId', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.bookId } })
  if (!book) return res.status(404).json({ error: 'Book not found' })
  res.json(book)
})

export default router
