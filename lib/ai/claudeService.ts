import { prisma } from '@/lib/db'

const BATCH_SIZE = 20

export async function generateTitlesWithClaude(bookId: string, language: 'fr' | 'en') {
  if (!process.env.ANTHROPIC_API_KEY) return

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

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
      ? `Pour chaque paragraphe suivant d'un livre-jeu, génère un titre court (3-5 mots). Réponds en JSON valide uniquement: {"results": [{"number": N, "title": "...", "summary": "Une phrase."}]}\n\n${nodesText}`
      : `For each gamebook paragraph, generate a short title (3-5 words). Reply in valid JSON only: {"results": [{"number": N, "title": "...", "summary": "One sentence."}]}\n\n${nodesText}`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = (msg.content[0] as { text: string }).text.trim()
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
      console.error(`Claude batch ${i}-${i + BATCH_SIZE} failed:`, e)
    }
  }
}
