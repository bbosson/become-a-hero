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

  const update: Record<string, unknown> = {}
  if (body.currentNodeNumber !== undefined) update.currentNodeNumber = body.currentNodeNumber
  if (body.resumeNodeNumber !== undefined) update.resumeNodeNumber = body.resumeNodeNumber
  if (body.visitedNodes !== undefined) update.visitedNodes = body.visitedNodes
  if (body.nodeOrder !== undefined) update.nodeOrder = body.nodeOrder
  if (body.choicesTaken !== undefined) update.choicesTaken = body.choicesTaken
  if (body.checkpoints !== undefined) update.checkpoints = body.checkpoints
  if (body.revealedEdges !== undefined) update.revealedEdges = body.revealedEdges
  if (body.stats !== undefined) update.stats = body.stats
  if (body.combatLog !== undefined) update.combatLog = body.combatLog

  const savegame = await prisma.savegame.upsert({
    where: { bookId: params.bookId },
    create: {
      bookId: params.bookId,
      currentNodeNumber: body.currentNodeNumber ?? 1,
      resumeNodeNumber: body.resumeNodeNumber ?? null,
      visitedNodes: body.visitedNodes ?? [],
      nodeOrder: body.nodeOrder ?? [],
      choicesTaken: body.choicesTaken ?? {},
      checkpoints: body.checkpoints ?? [],
      revealedEdges: body.revealedEdges ?? [],
      stats: body.stats ?? undefined,
      combatLog: body.combatLog ?? [],
    },
    update,
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
