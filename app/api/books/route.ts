import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const books = await prisma.book.findMany({
    where: { status: { in: ['ready', 'processing', 'error'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      savegame: {
        select: {
          currentNodeNumber: true,
          resumeNodeNumber: true,
          visitedNodes: true,
        },
      },
    },
  })
  return NextResponse.json(books)
}
