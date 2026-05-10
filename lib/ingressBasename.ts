/**
 * Returns the HA ingress path prefix (e.g. "/api/hassio_ingress/abc123") when
 * the app is served through HA Supervisor, or "" in all other environments.
 * Use this to prefix absolute asset/API URLs so the browser sends them through
 * the ingress proxy instead of resolving them against the HA host root.
 */
export function getIngressBasename(): string {
  if (typeof window === 'undefined') return ''
  const match = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/)
  return match ? match[1] : ''
}
