import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const numsParam = request.nextUrl.searchParams.get('nums')
  if (!numsParam) return NextResponse.json({})

  const numbers = numsParam
    .split(',')
    .map(n => parseInt(n, 10))
    .filter(n => !isNaN(n))

  if (numbers.length === 0) return NextResponse.json({})

  const nodes = await prisma.node.findMany({
    where: { bookId: params.bookId, number: { in: numbers } },
    select: { number: true, title: true, icon: true },
  })

  const result: Record<number, { title: string | null; icon: string | null }> = {}
  for (const n of nodes) {
    result[n.number] = { title: n.title, icon: n.icon }
  }

  return NextResponse.json(result)
}
