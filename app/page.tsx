import { prisma } from '@/lib/db'
import BookGrid from '@/components/library/BookGrid'
import SettingsDrawer from '@/components/game/SettingsDrawer'
import { BookData } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      savegame: {
        select: {
          currentNodeNumber: true,
          resumeNodeNumber: true,
          visitedNodes: true,
          checkpoints: true,
        },
      },
    },
  })

  const booksData = books.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    savegame: b.savegame
      ? {
          ...b.savegame,
          id: '',
          bookId: b.id,
          nodeOrder: [],
          choicesTaken: {},
          updatedAt: '',
        }
      : null,
  })) as unknown as BookData[]

  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚔</span>
          <h1 className="text-lg font-semibold text-stone-100 tracking-wide">BECOME A HERO</h1>
        </div>
        <SettingsDrawer />
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto">
        <h2 className="text-stone-300 text-sm font-medium uppercase tracking-widest mb-6">
          Tes aventures
        </h2>

        {booksData.length === 0 ? (
          <div className="text-center py-16 text-stone-600">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-lg">Aucune aventure pour l&apos;instant.</p>
            <p className="text-sm mt-2">
              <a href="/upload" className="text-amber-500 hover:text-amber-400 underline">
                Importe ton premier PDF
              </a>{' '}
              pour commencer.
            </p>
          </div>
        ) : (
          <BookGrid books={booksData} />
        )}
      </main>
    </div>
  )
}
