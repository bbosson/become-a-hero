import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Become a Hero',
  description: 'Plateforme de livres interactifs immersifs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Patch browser history API so Next.js navigation stays inside HA ingress path.
            Runs before any framework code — same pattern as BonAp's basename detection. */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var m = window.location.pathname.match(/^\\/api\\/hassio_ingress\\/[^\\/]+/);
  if (!m) return;
  var base = m[0];
  function patch(fn) {
    return function(s, t, u) {
      if (typeof u === 'string' && u.charAt(0) === '/' && u.indexOf('/api/hassio_ingress') !== 0)
        u = base + u;
      return fn.call(history, s, t, u);
    };
  }
  history.pushState    = patch(history.pushState);
  history.replaceState = patch(history.replaceState);
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.charAt(0) === '/' && input.indexOf('/api/hassio_ingress') !== 0)
      input = base + input;
    return origFetch.call(this, input, init);
  };
})();
        `}} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
