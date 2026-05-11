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
    if (settings.providerAudio === 'piper') {
      const piperBin = process.env.PIPER_BIN || 'piper'
      const voice = process.env.PIPER_VOICE
      if (!voice) return null

      const { spawn } = await import('child_process')
      const wavPath = audioPath.replace(/\.mp3$/, '.wav')

      await new Promise<void>((resolve, reject) => {
        const p = spawn(piperBin, ['--model', voice, '--output_file', wavPath])
        let stderr = ''
        p.stderr.on('data', d => { stderr += d.toString() })
        p.on('error', reject)
        p.on('close', (code, signal) => {
          if (code === 0) return resolve()
          console.error(`[piper] exit code=${code} signal=${signal} stderr=${stderr}`)
          reject(new Error(`piper exit code=${code} signal=${signal}: ${stderr.slice(0, 500)}`))
        })
        p.stdin.write(text)
        p.stdin.end()
      })

      await new Promise<void>((resolve, reject) => {
        const f = spawn('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', audioPath])
        let stderr = ''
        f.stderr.on('data', d => { stderr += d.toString() })
        f.on('error', reject)
        f.on('close', (code, signal) => {
          if (code === 0) return resolve()
          console.error(`[ffmpeg] exit code=${code} signal=${signal} stderr=${stderr}`)
          reject(new Error(`ffmpeg exit code=${code} signal=${signal}`))
        })
      })

      try { fs.unlinkSync(wavPath) } catch {}

      const relPath = `/uploads/${bookId}/nodes/${nodeNumber}.mp3`
      await prisma.node.update({
        where: { bookId_number: { bookId, number: nodeNumber } },
        data: { audioUrl: relPath },
      })
      return relPath
    } else if (settings.providerAudio === 'openai_tts' && process.env.OPENAI_API_KEY) {
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
