import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { bookId: string; num: string } }
) {
  const nodeNumber = parseInt(params.num, 10)

  const node = await prisma.node.findUnique({
    where: {
      bookId_number: { bookId: params.bookId, number: nodeNumber },
    },
  })

  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  return NextResponse.json(node)
}
