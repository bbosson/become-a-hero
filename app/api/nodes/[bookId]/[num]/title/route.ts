import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookId: string; num: string } }
) {
  const { title } = await request.json()
  const nodeNumber = parseInt(params.num, 10)

  await prisma.node.update({
    where: { bookId_number: { bookId: params.bookId, number: nodeNumber } },
    data: { title },
  })

  return NextResponse.json({ ok: true })
}
