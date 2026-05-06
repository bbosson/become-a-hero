import { prisma } from '../lib/db'
import { runPipeline } from '../lib/pipeline'
import fs from 'fs'
import path from 'path'

async function main() {
  const args = process.argv.slice(2)
  const pdfIndex = args.indexOf('--pdf')
  const titleIndex = args.indexOf('--title')
  const langIndex = args.indexOf('--language')

  if (pdfIndex === -1 || titleIndex === -1) {
    console.error('Usage: npx tsx scripts/seed.ts --pdf <path> --title <title> [--language fr|en]')
    process.exit(1)
  }

  const pdfPath = args[pdfIndex + 1]
  const title = args[titleIndex + 1]
  const language = (args[langIndex + 1] as 'fr' | 'en') || 'fr'

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`)
    process.exit(1)
  }

  console.log(`Seeding: "${title}" (${language}) from ${pdfPath}`)

  const book = await prisma.book.create({
    data: { title, language, status: 'processing', pdfPath: '' },
  })

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const bookDir = path.join(uploadDir, book.id)
  fs.mkdirSync(bookDir, { recursive: true })

  const destPath = path.join(bookDir, 'book.pdf')
  fs.copyFileSync(pdfPath, destPath)

  await prisma.book.update({
    where: { id: book.id },
    data: { pdfPath: destPath },
  })

  await prisma.processingJob.create({
    data: { bookId: book.id, status: 'pending', progress: 0 },
  })

  console.log(`Book created: ${book.id}`)
  console.log('Running pipeline...')

  const result = await runPipeline(book.id, destPath, language)

  if (result.success) {
    console.log(`✅ Done! ${result.validation.totalNodes} paragraphes, ${result.validation.totalChoices} choix`)
    console.log(`   Status: ${result.validation.validationStatus}`)
    if (result.validation.terminalNodes.length > 0) {
      console.log(`   Fins narratives: §${result.validation.terminalNodes.join(', §')}`)
    }
  } else {
    console.error('❌ Pipeline failed')
    console.error('   Orphan targets:', result.validation?.orphanTargets)
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
