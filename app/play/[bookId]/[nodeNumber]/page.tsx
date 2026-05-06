import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import GameLayout from '@/components/game/GameLayout'
import { SettingsData } from '@/types'

interface Props {
  params: { bookId: string; nodeNumber: string }
}

export const dynamic = 'force-dynamic'

export default async function PlayPage({ params }: Props) {
  const nodeNum = parseInt(params.nodeNumber, 10)
  if (isNaN(nodeNum)) notFound()

  const book = await prisma.book.findUnique({ where: { id: params.bookId } })
  if (!book || book.status !== 'ready') notFound()

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })

  return (
    <GameLayout
      bookId={params.bookId}
      nodeNumber={nodeNum}
      bookTitle={book.title}
      settings={settings as unknown as SettingsData}
    />
  )
}
