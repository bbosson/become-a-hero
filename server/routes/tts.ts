import { Router } from 'express'
import { generateTTSBuffer } from '../../lib/ai/audioService'

const router = Router()

router.post('/', async (req, res) => {
  const { text } = req.body as { text?: string }
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })
  const result = await generateTTSBuffer(text.slice(0, 5000))
  if (!result) return res.status(503).json({ error: 'TTS unavailable' })
  res.set('Content-Type', result.mimeType)
  res.send(result.buffer)
})

export default router
