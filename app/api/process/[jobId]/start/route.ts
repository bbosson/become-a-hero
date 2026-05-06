import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runPipeline } from '@/lib/pipeline'

export const maxDuration = 300

export async function POST(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: { book: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status === 'done') {
    return NextResponse.json({ ok: true, already: true })
  }

  // Run pipeline async (don't await — respond immediately, SSE tracks progress)
  const language = job.book.language as 'fr' | 'en'
  runPipeline(job.bookId, job.book.pdfPath, language).catch(e => {
    console.error('Pipeline error:', e)
  })

  return NextResponse.json({ ok: true })
}
