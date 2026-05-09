import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '../app/globals.css'

// Detect HA ingress path — same pattern as BonAp's basename detection.
// /api/hassio_ingress/<token>/ prefix is preserved in all navigation.
const ingressMatch = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/)
const basename = ingressMatch ? ingressMatch[1] : '/'

// Patch fetch + EventSource so all absolute /api/* requests include the ingress prefix.
// Without this, fetch('/api/books') → HA receives /api/books (no token) → 404.
if (ingressMatch) {
  const base = ingressMatch[1]

  const _fetch = window.fetch.bind(window)
  window.fetch = (input, ...args) => {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith(base)) {
      return _fetch(`${base}${input}`, ...args)
    }
    return _fetch(input, ...args)
  }

  const _EventSource = window.EventSource
  window.EventSource = class PatchedEventSource extends _EventSource {
    constructor(url: string | URL, init?: EventSourceInit) {
      const patched = typeof url === 'string' && url.startsWith('/') && !url.startsWith(base)
        ? `${base}${url}`
        : url
      super(patched, init)
    }
  } as typeof EventSource
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
