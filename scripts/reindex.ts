import { prisma } from '../lib/db'
import { extractChoices } from '../lib/pdf/choiceExtractor'

async function main() {
  const args = process.argv.slice(2)
  const bookIdIndex = args.indexOf('--bookId')
  const bookId = bookIdIndex !== -1 ? args[bookIdIndex + 1] : null

  const books = bookId
    ? await prisma.book.findMany({ where: { id: bookId } })
    : await prisma.book.findMany({ where: { status: 'ready' } })

  if (books.length === 0) {
    console.error('No books found.')
    process.exit(1)
  }

  for (const book of books) {
    console.log(`\nReindexing "${book.title}" (${book.id})...`)
    const language = book.language as 'fr' | 'en'

    const nodes = await prisma.node.findMany({
      where: { bookId: book.id },
      orderBy: { number: 'asc' },
    })

    let updated = 0
    let nowTerminal = 0
    let wasTerminal = 0

    for (const node of nodes) {
      const choices = extractChoices(node.contentRaw, language)
      const isTerminal = choices.length === 0

      if (
        JSON.stringify(node.choices) !== JSON.stringify(choices) ||
        node.isTerminal !== isTerminal
      ) {
        await prisma.node.update({
          where: { id: node.id },
          data: { choices: choices as never, isTerminal },
        })
        updated++

        if (node.isTerminal && !isTerminal) {
          console.log(`  §${node.number}: était terminal → ${choices.length} choix détectés`)
          wasTerminal++
        }
        if (!node.isTerminal && isTerminal) {
          nowTerminal++
        }
      }
    }

    console.log(`  ${updated} nodes mis à jour (${wasTerminal} faux terminaux corrigés, ${nowTerminal} nouveaux terminaux)`)

    // Recompute totalChoices stats
    const allNodes = await prisma.node.findMany({ where: { bookId: book.id } })
    const totalChoices = allNodes.reduce((sum, n) => sum + (n.choices as unknown[]).length, 0)
    const terminalNodes = allNodes.filter(n => n.isTerminal).length
    console.log(`  Bilan: ${allNodes.length} paragraphes, ${totalChoices} choix, ${terminalNodes} fins narratives`)
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
