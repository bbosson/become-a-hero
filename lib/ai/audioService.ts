import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { resolveUploadDir } from '@/lib/uploadDir'

export async function generateTTSBuffer(text: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[TTS] GEMINI_API_KEY not set')
    return null
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
          },
        },
      }),
    })

    if (!resp.ok) {
      console.warn('[TTS] Gemini TTS error:', await resp.text())
      return null
    }

    const json = await resp.json()
    const part = json.candidates?.[0]?.content?.parts?.[0]
    if (!part?.inlineData?.data) {
      console.warn('[TTS] Gemini TTS: no audio in response')
      return null
    }

    const mimeType: string = part.inlineData.mimeType || 'audio/wav'
    const buffer = Buffer.from(part.inlineData.data as string, 'base64')
    return { buffer, mimeType }
  } catch (e) {
    console.warn('[TTS] generateTTSBuffer failed:', e)
    return null
  }
}

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
