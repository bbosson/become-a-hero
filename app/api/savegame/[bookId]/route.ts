import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const savegame = await prisma.savegame.findUnique({
    where: { bookId: params.bookId },
  })
  return NextResponse.json(savegame)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const body = await request.json()

  const savegame = await prisma.savegame.upsert({
    where: { bookId: params.bookId },
    create: {
      bookId: params.bookId,
      currentNodeNumber: body.currentNodeNumber,
      resumeNodeNumber: body.resumeNodeNumber ?? null,
      visitedNodes: body.visitedNodes ?? [],
      nodeOrder: body.nodeOrder ?? [],
      choicesTaken: body.choicesTaken ?? {},
      checkpoints: body.checkpoints ?? [],
      revealedEdges: body.revealedEdges ?? [],
    },
    update: {
      currentNodeNumber: body.currentNodeNumber,
      resumeNodeNumber: body.resumeNodeNumber ?? null,
      visitedNodes: body.visitedNodes ?? [],
      nodeOrder: body.nodeOrder ?? [],
      choicesTaken: body.choicesTaken ?? {},
      checkpoints: body.checkpoints ?? [],
      revealedEdges: body.revealedEdges ?? [],
    },
  })

  return NextResponse.json(savegame)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  await prisma.savegame.deleteMany({ where: { bookId: params.bookId } })
  return NextResponse.json({ ok: true })
}
