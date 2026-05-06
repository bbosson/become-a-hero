import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Become a Hero',
  description: 'Plateforme de livres interactifs immersifs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
