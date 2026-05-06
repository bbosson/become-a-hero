import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('pdf') as File | null
  const title = formData.get('title') as string | null
  const language = (formData.get('language') as 'fr' | 'en') || 'fr'

  if (!file || !title) {
    return NextResponse.json({ error: 'Missing pdf or title' }, { status: 400 })
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
  }

  if (!file.name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })
  }

  const book = await prisma.book.create({
    data: { title, language, status: 'processing', pdfPath: '' },
  })

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const bookDir = path.join(process.cwd(), uploadDir.replace('./', ''), book.id)
  fs.mkdirSync(bookDir, { recursive: true })

  const pdfPath = path.join(bookDir, 'book.pdf')
  const bytes = await file.arrayBuffer()
  fs.writeFileSync(pdfPath, Buffer.from(bytes))

  await prisma.book.update({
    where: { id: book.id },
    data: { pdfPath },
  })

  const job = await prisma.processingJob.create({
    data: { bookId: book.id, status: 'pending', progress: 0 },
  })

  return NextResponse.json({ bookId: book.id, jobId: job.id })
}
