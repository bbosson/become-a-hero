import { NextRequest, NextResponse } from 'next/server'
import { generateSingleTitle } from '@/lib/ai/router'
import { prisma } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: { bookId: string; num: string } }
) {
  const nodeNumber = parseInt(params.num, 10)
  const book = await prisma.book.findUnique({ where: { id: params.bookId } })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const title = await generateSingleTitle(params.bookId, nodeNumber, book.language as 'fr' | 'en')

  if (!title) {
    return NextResponse.json({ error: 'No LLM configured' }, { status: 503 })
  }

  return NextResponse.json({ title })
}
