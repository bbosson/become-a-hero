import { prisma } from '@/lib/db'
import { generateTitlesWithGemini } from './geminiService'
import { generateTitlesWithClaude } from './claudeService'

export async function generateNodeTitles(bookId: string, language: 'fr' | 'en') {
  const settings = await prisma.settings.findFirst()
  const provider = settings?.providerText || 'gemini'

  if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) return
    await generateTitlesWithGemini(bookId, language)
  } else {
    if (!process.env.ANTHROPIC_API_KEY) return
    await generateTitlesWithClaude(bookId, language)
  }
}

export async function generateSingleTitle(bookId: string, nodeNumber: number, language: 'fr' | 'en'): Promise<string | null> {
  const settings = await prisma.settings.findFirst()
  const provider = settings?.providerText || 'gemini'

  const node = await prisma.node.findUnique({
    where: { bookId_number: { bookId, number: nodeNumber } },
  })
  if (!node) return null

  const prompt = language === 'fr'
    ? `Génère un titre court (3-5 mots) pour ce paragraphe d'un livre-jeu. Réponds uniquement avec le titre, sans ponctuation finale.\n\nTexte:\n${node.contentRaw.slice(0, 500)}`
    : `Generate a short title (3-5 words) for this gamebook paragraph. Reply only with the title, no final punctuation.\n\nText:\n${node.contentRaw.slice(0, 500)}`

  try {
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      const title = result.response.text().trim()
      await prisma.node.update({
        where: { bookId_number: { bookId, number: nodeNumber } },
        data: { title },
      })
      return title
    } else if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic()
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }],
      })
      const title = (msg.content[0] as { text: string }).text.trim()
      await prisma.node.update({
        where: { bookId_number: { bookId, number: nodeNumber } },
        data: { title },
      })
      return title
    }
  } catch (e) {
    console.error('Single title generation failed:', e)
  }

  return null
}
