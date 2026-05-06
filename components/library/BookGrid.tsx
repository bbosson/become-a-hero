'use client'

import { BookData } from '@/types'
import BookCard from './BookCard'
import Link from 'next/link'

interface Props {
  books: BookData[]
}

export default function BookGrid({ books }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {books.map(book => (
        <BookCard key={book.id} book={book} />
      ))}
      <Link
        href="/upload"
        className="rounded-xl border-2 border-dashed border-amber-800/30 hover:border-amber-600/50 bg-stone-900/20 hover:bg-amber-900/10 flex flex-col items-center justify-center gap-2 p-6 min-h-[200px] transition-all duration-200 group"
      >
        <span className="text-3xl text-amber-700 group-hover:text-amber-500 transition-colors">+</span>
        <span className="text-sm text-stone-400 group-hover:text-stone-300 text-center">Uploader un PDF</span>
      </Link>
    </div>
  )
}
