import { prisma } from '@/lib/db'

const BATCH_SIZE = 20

export async function generateTitlesWithGemini(bookId: string, language: 'fr' | 'en') {
  if (!process.env.GEMINI_API_KEY) return

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const nodes = await prisma.node.findMany({
    where: { bookId, title: null },
    orderBy: { number: 'asc' },
  })

  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = nodes.slice(i, i + BATCH_SIZE)
    const nodesText = batch.map(n =>
      `Paragraphe ${n.number}:\n${n.contentRaw.slice(0, 400)}`
    ).join('\n\n---\n\n')

    const prompt = language === 'fr'
      ? `Pour chaque paragraphe suivant d'un livre-jeu, génère un titre court (3-5 mots: lieu, scène ou étape). Réponds en JSON valide uniquement, format: {"results": [{"number": N, "title": "...", "summary": "Une phrase résumant la scène."}]}\n\n${nodesText}`
      : `For each gamebook paragraph below, generate a short title (3-5 words: location, scene, step). Reply in valid JSON only, format: {"results": [{"number": N, "title": "...", "summary": "One sentence summarizing the scene."}]}\n\n${nodesText}`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      const json = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(json) as { results: Array<{ number: number; title: string; summary: string }> }

      await prisma.$transaction(
        parsed.results.map(r =>
          prisma.node.update({
            where: { bookId_number: { bookId, number: r.number } },
            data: { title: r.title, summary: r.summary },
          })
        )
      )
    } catch (e) {
      console.error(`Gemini batch ${i}-${i + BATCH_SIZE} failed:`, e)
    }
  }
}
