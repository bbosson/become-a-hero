import { Link } from 'react-router-dom'
import UploadForm from '@/components/upload/UploadForm'

export default function Upload() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">
          ← Retour
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚔</span>
          <h1 className="text-lg font-semibold text-stone-100 tracking-wide">BECOME A HERO</h1>
        </div>
      </header>

      <main className="px-6 py-12 max-w-xl mx-auto flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-stone-100 mb-2">Importer un nouveau livre</h2>
          <p className="text-stone-500 text-sm">Télécharge un PDF de livre-jeu pour le transformer en aventure interactive</p>
        </div>
        <UploadForm />
      </main>
    </div>
  )
}
