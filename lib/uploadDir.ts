import path from 'path'

export function resolveUploadDir(...segments: string[]): string {
  const base = process.env.UPLOAD_DIR || './uploads'
  const abs = path.isAbsolute(base) ? base : path.join(process.cwd(), base)
  return segments.length ? path.join(abs, ...segments) : abs
}
