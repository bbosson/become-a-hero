'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 Mo)')
      return
    }
    setError('')
    setFile(f)
    if (!title) {
      setTitle(f.name.replace(/\.pdf$/i, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) return

    setUploading(true)
    setError('')
    setProgress(10)

    const formData = new FormData()
    formData.append('pdf', file)
    formData.append('title', title.trim())
    formData.append('language', language)

    try {
      setProgress(30)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      setProgress(70)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload échoué')
      }

      const { jobId } = await res.json()
      setProgress(100)

      // Start pipeline
      await fetch(`/api/process/${jobId}/start`, { method: 'POST' })

      router.push(`/processing/${jobId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md">
      {/* File input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-300">Fichier PDF</label>
        <div
          className="border border-amber-800/30 rounded-lg p-4 bg-stone-900/50 cursor-pointer hover:border-amber-600/40 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              {file ? (
                <p className="text-sm text-emerald-400">{file.name} ✓</p>
              ) : (
                <p className="text-sm text-stone-400">Choisir un fichier PDF</p>
              )}
              <p className="text-xs text-stone-600">Formats acceptés : PDF — Max 50 Mo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-300">Titre de l&apos;aventure</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: La Citadelle du Chaos"
          className="px-4 py-2 rounded-lg bg-stone-900/80 border border-amber-800/30 focus:border-amber-600/50 focus:outline-none text-stone-100 placeholder-stone-600"
        />
      </div>

      {/* Language */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-300">Langue du livre</label>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value as 'fr' | 'en')}
          className="px-4 py-2 rounded-lg bg-stone-900/80 border border-amber-800/30 focus:border-amber-600/50 focus:outline-none text-stone-100"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {uploading && (
        <div className="w-full bg-stone-800 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!file || !title.trim() || uploading}
        className="py-3 px-6 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {uploading ? 'Upload en cours...' : 'Analyser →'}
      </button>
    </form>
  )
}
