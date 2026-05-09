import { Router } from 'express'
import fs from 'fs'
import path from 'path'
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

router.delete('/:bookId', async (req, res) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.bookId } })
    if (!book) return res.status(404).json({ error: 'Book not found' })

    // Delete DB record — cascade handles nodes, savegame, processingJob
    await prisma.book.delete({ where: { id: req.params.bookId } })

    // Delete uploads directory (images, audio, PDF)
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const bookDir = path.join(process.cwd(), uploadDir.replace('./', ''), req.params.bookId)
    if (fs.existsSync(bookDir)) {
      fs.rmSync(bookDir, { recursive: true, force: true })
    }

    res.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: msg })
  }
})

export default router
