import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../lib/db'
import { resolveUploadDir } from '../../lib/uploadDir'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

router.post('/', upload.single('pdf'), async (req, res) => {
  const file = req.file
  const title = req.body.title as string | undefined
  const language = (req.body.language as 'fr' | 'en') || 'fr'

  if (!file || !title) return res.status(400).json({ error: 'Missing pdf or title' })
  if (!file.originalname.endsWith('.pdf')) return res.status(400).json({ error: 'Only PDF files accepted' })

  const book = await prisma.book.create({
    data: { title, language, status: 'processing', pdfPath: '' },
  })

  const bookDir = resolveUploadDir(book.id)
  fs.mkdirSync(bookDir, { recursive: true })

  const pdfPath = path.join(bookDir, 'book.pdf')
  fs.writeFileSync(pdfPath, file.buffer)

  await prisma.book.update({ where: { id: book.id }, data: { pdfPath } })

  const job = await prisma.processingJob.create({
    data: { bookId: book.id, status: 'pending', progress: 0 },
  })

  res.json({ bookId: book.id, jobId: job.id })
})

export default router
