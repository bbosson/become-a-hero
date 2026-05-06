export interface ParsedIntro {
  introRaw: string
  body: string
}

export function splitIntroAndBody(text: string): ParsedIntro {
  // Phase 0: detect intro end via strong textual marker
  const markerPatterns = [
    /et maintenant[,.]?\s+tournez\s+la\s+page[!.]?/i,
    /tournez\s+(?:la\s+)?page\s*[!.]/i,
    /now turn to paragraph 1/i,
    /turn to\s+(?:paragraph\s+)?1\b/i,
  ]

  for (const pattern of markerPatterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      const endIdx = match.index + match[0].length
      return {
        introRaw: text.slice(0, endIdx).trim(),
        body: text.slice(endIdx).trim(),
      }
    }
  }

  // Fallback: find first isolated paragraph number "1" on its own line
  const fallbackMatch = text.match(/\n\s*1\s*\n(?!\d)/)
  if (fallbackMatch && fallbackMatch.index !== undefined) {
    return {
      introRaw: text.slice(0, fallbackMatch.index).trim(),
      body: text.slice(fallbackMatch.index).trim(),
    }
  }

  return { introRaw: '', body: text }
}

export function parseNodes(body: string): Map<number, string> {
  const nodes = new Map<number, string>()

  // Match paragraph numbers on their own line (1-3 digits), not preceded by stats patterns
  // The number must appear alone on a line
  const boundaryRegex = /^\s*(\d{1,3})\s*$/gm
  const matches: Array<{ index: number; number: number }> = []

  let m: RegExpExecArray | null
  while ((m = boundaryRegex.exec(body)) !== null) {
    const num = parseInt(m[1], 10)
    // Skip numbers that look like stats (preceded by : or letter on same line context)
    // Check the character before the match
    const before = body.slice(Math.max(0, m.index - 50), m.index)
    const lastLine = before.split('\n').pop() || ''
    if (/[:\w]/.test(lastLine.trim())) continue

    matches.push({ index: m.index + m[0].length, number: num })
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].number.toString().length - 2 : body.length
    const content = body.slice(start, end).trim()
    if (content.length > 5) {
      nodes.set(matches[i].number, content)
    }
  }

  return nodes
}
