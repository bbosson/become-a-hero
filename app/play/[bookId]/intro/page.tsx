import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StatsSetup from '@/components/intro/StatsSetup'

interface Props {
  params: { bookId: string }
}

export const dynamic = 'force-dynamic'

export default async function IntroPage({ params }: Props) {
  const book = await prisma.book.findUnique({ where: { id: params.bookId } })
  if (!book || book.status !== 'ready') notFound()

  const paragraphs = book.introRaw?.split(/\n{2,}/).filter(p => p.trim()) || []

  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-stone-400 hover:text-stone-200 text-sm">← Bibliothèque</Link>
        <div className="flex items-center gap-3">
          <span className="text-amber-500">⚔</span>
          <span className="text-stone-200 font-semibold">{book.title}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8">
        <div className="text-center">
          <span className="text-6xl text-amber-800/40">⚔</span>
          <h1 className="text-2xl font-semibold text-stone-100 mt-4">{book.title}</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest mt-2">Introduction</p>
        </div>

        {paragraphs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-stone-300 leading-relaxed">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 italic text-center">Aucune introduction détectée pour ce livre.</p>
        )}

        <StatsSetup bookId={book.id} />
      </main>
    </div>
  )
}
