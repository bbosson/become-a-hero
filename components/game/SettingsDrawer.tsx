'use client'

import { useState, useEffect } from 'react'
import { SettingsData } from '@/types'

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open && !settings) {
      fetch('/api/settings').then(r => r.json()).then(setSettings)
    }
  }, [open, settings])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-stone-400 hover:text-stone-200 text-xl transition-colors"
        aria-label="Paramètres"
      >
        ⚙
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
          <div className="w-80 bg-stone-900 border-l border-stone-700 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
              <h2 className="font-medium text-stone-100">⚙ Paramètres</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-200">✕</button>
            </div>

            {settings && (
              <div className="flex flex-col gap-6 px-5 py-6">
                {/* General */}
                <section>
                  <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-3">Général</h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-stone-300">Images activées</span>
                      <input
                        type="checkbox"
                        checked={settings.imagesEnabled}
                        onChange={e => setSettings({ ...settings, imagesEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-stone-300">Audio activé</span>
                      <input
                        type="checkbox"
                        checked={settings.audioEnabled}
                        onChange={e => setSettings({ ...settings, audioEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </label>
                  </div>
                </section>

                {/* Text provider */}
                <section>
                  <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-3">Provider — Texte & Analyse</h3>
                  <select
                    value={settings.providerText}
                    onChange={e => setSettings({ ...settings, providerText: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-600"
                  >
                    <option value="gemini">Gemini Flash 2.5</option>
                    <option value="claude">Claude Sonnet</option>
                  </select>
                </section>

                {/* Image provider */}
                {settings.imagesEnabled && (
                  <section>
                    <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-3">Provider — Images</h3>
                    <select
                      value={settings.providerImage}
                      onChange={e => setSettings({ ...settings, providerImage: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-600"
                    >
                      <option value="gemini">Gemini Image</option>
                      <option value="dalle3">DALL-E 3</option>
                    </select>
                  </section>
                )}

                {/* Audio provider */}
                {settings.audioEnabled && (
                  <section>
                    <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-3">Provider — Audio</h3>
                    <select
                      value={settings.providerAudio}
                      onChange={e => setSettings({ ...settings, providerAudio: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-600"
                    >
                      <option value="openai_tts">OpenAI TTS-1</option>
                      <option value="elevenlabs">ElevenLabs</option>
                    </select>
                  </section>
                )}

                {/* Keys info */}
                <section className="text-xs text-stone-600">
                  <p>Clés API configurées via <code className="text-stone-500">.env</code></p>
                  <p className="mt-1">Feature désactivée si clé absente.</p>
                </section>

                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="w-full py-2 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  >
                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                  {saved && <p className="text-center text-xs text-emerald-400">✓ Paramètres sauvegardés</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
