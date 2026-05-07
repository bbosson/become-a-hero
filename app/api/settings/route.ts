export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...body },
    update: body,
  })

  return NextResponse.json(settings)
}
