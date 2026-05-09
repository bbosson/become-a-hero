import { Router } from 'express'
import { prisma } from '../../lib/db'
import { generateSingleTitle } from '../../lib/ai/router'
import { generateNodeImage } from '../../lib/ai/imageService'
import { generateNodeAudio } from '../../lib/ai/audioService'

const router = Router()

router.get('/:bookId/meta', async (req, res) => {
  const numsParam = req.query.nums as string | undefined
  if (!numsParam) return res.json({})

  const numbers = numsParam.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n))
  if (numbers.length === 0) return res.json({})

  const nodes = await prisma.node.findMany({
    where: { bookId: req.params.bookId, number: { in: numbers } },
    select: { number: true, title: true, icon: true },
  })

  const result: Record<number, { title: string | null; icon: string | null }> = {}
  for (const n of nodes) result[n.number] = { title: n.title, icon: n.icon }
  res.json(result)
})

router.get('/:bookId/:num', async (req, res) => {
  const nodeNumber = parseInt(req.params.num, 10)
  const node = await prisma.node.findUnique({
    where: { bookId_number: { bookId: req.params.bookId, number: nodeNumber } },
  })
  if (!node) return res.status(404).json({ error: 'Node not found' })
  res.json(node)
})

router.put('/:bookId/:num/title', async (req, res) => {
  const { title } = req.body
  const nodeNumber = parseInt(req.params.num, 10)
  await prisma.node.update({
    where: { bookId_number: { bookId: req.params.bookId, number: nodeNumber } },
    data: { title },
  })
  res.json({ ok: true })
})

router.put('/:bookId/:num/icon', async (req, res) => {
  const { icon } = req.body
  const nodeNumber = parseInt(req.params.num, 10)
  await prisma.node.update({
    where: { bookId_number: { bookId: req.params.bookId, number: nodeNumber } },
    data: { icon: icon ?? null },
  })
  res.json({ ok: true })
})

router.post('/:bookId/:num/generate-title', async (req, res) => {
  const nodeNumber = parseInt(req.params.num, 10)
  const book = await prisma.book.findUnique({ where: { id: req.params.bookId } })
  if (!book) return res.status(404).json({ error: 'Book not found' })

  const title = await generateSingleTitle(req.params.bookId, nodeNumber, book.language as 'fr' | 'en')
  if (!title) return res.status(503).json({ error: 'No LLM configured' })
  res.json({ title })
})

router.post('/:bookId/:num/assets', async (req, res) => {
  const { generate } = req.body as { generate: string[] }
  const nodeNumber = parseInt(req.params.num, 10)
  const results: Record<string, string | null> = {}

  if (generate.includes('image')) results.imageUrl = await generateNodeImage(req.params.bookId, nodeNumber)
  if (generate.includes('audio')) results.audioUrl = await generateNodeAudio(req.params.bookId, nodeNumber)

  res.json(results)
})

export default router
