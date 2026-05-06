import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import https from 'https'

async function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', reject)
  })
}

export async function generateNodeImage(bookId: string, nodeNumber: number): Promise<string | null> {
  const settings = await prisma.settings.findFirst()
  if (!settings?.imagesEnabled) return null

  const node = await prisma.node.findUnique({
    where: { bookId_number: { bookId, number: nodeNumber } },
  })
  if (!node || !node.summary) return null
  if (node.imageUrl) return node.imageUrl

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const nodeDir = path.join(uploadDir, bookId, 'nodes')
  fs.mkdirSync(nodeDir, { recursive: true })
  const imagePath = path.join(nodeDir, `${nodeNumber}.jpg`)

  const prompt = `Fantasy gamebook illustration: ${node.summary}. Dark fantasy style, atmospheric lighting.`

  try {
    if (settings.providerImage === 'dalle3' && process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai')
      const openai = new OpenAI()
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
      })
      const imageUrl = response.data?.[0]?.url
      if (imageUrl) {
        await downloadImage(imageUrl, imagePath)
        const relPath = `/uploads/${bookId}/nodes/${nodeNumber}.jpg`
        await prisma.node.update({
          where: { bookId_number: { bookId, number: nodeNumber } },
          data: { imageUrl: relPath },
        })
        return relPath
      }
    } else if (settings.providerImage === 'gemini' && process.env.GEMINI_API_KEY) {
      // Gemini image generation placeholder
      return null
    }
  } catch (e) {
    console.error('Image generation failed:', e)
  }

  return null
}
