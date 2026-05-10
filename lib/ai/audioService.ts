import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { resolveUploadDir } from '@/lib/uploadDir'

export async function generateNodeAudio(bookId: string, nodeNumber: number): Promise<string | null> {
  const settings = await prisma.settings.findFirst()
  if (!settings?.audioEnabled) return null

  const node = await prisma.node.findUnique({
    where: { bookId_number: { bookId, number: nodeNumber } },
  })
  if (!node) return null
  if (node.audioUrl) return node.audioUrl

  const nodeDir = resolveUploadDir(bookId, 'nodes')
  fs.mkdirSync(nodeDir, { recursive: true })
  const audioPath = path.join(nodeDir, `${nodeNumber}.mp3`)

  const text = node.contentRaw.slice(0, 4000)

  try {
    if (settings.providerAudio === 'openai_tts' && process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai')
      const openai = new OpenAI()
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
      })
      const buffer = Buffer.from(await mp3.arrayBuffer())
      fs.writeFileSync(audioPath, buffer)
      const relPath = `/uploads/${bookId}/nodes/${nodeNumber}.mp3`
      await prisma.node.update({
        where: { bookId_number: { bookId, number: nodeNumber } },
        data: { audioUrl: relPath },
      })
      return relPath
    } else if (settings.providerAudio === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      // ElevenLabs placeholder
      return null
    }
  } catch (e) {
    console.error('Audio generation failed:', e)
  }

  return null
}
