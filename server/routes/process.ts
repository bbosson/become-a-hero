import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/db'
import { runPipeline } from '../../lib/pipeline'

const router = Router()

router.get('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  let done = false

  const interval = setInterval(async () => {
    if (done) return

    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      include: { book: true },
    })

    if (!job) {
      send({ error: 'Job not found' })
      done = true
      clearInterval(interval)
      res.end()
      return
    }

    send({
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      errorMsg: job.errorMsg,
      bookId: job.bookId,
      bookStatus: job.book.status,
      totalNodes: job.book.totalNodes,
      validation: null,
    })

    if (job.status === 'done' || job.status === 'error') {
      done = true
      clearInterval(interval)
      res.end()
    }
  }, 500)

  req.on('close', () => {
    done = true
    clearInterval(interval)
  })
})

router.post('/:jobId/start', async (req: Request, res: Response) => {
  const { jobId } = req.params

  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: { book: true },
  })

  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.status === 'done') return res.json({ ok: true, already: true })

  const language = job.book.language as 'fr' | 'en'
  runPipeline(job.bookId, job.book.pdfPath, language).catch(e => {
    console.error('Pipeline error:', e)
  })

  res.json({ ok: true })
})

export default router
