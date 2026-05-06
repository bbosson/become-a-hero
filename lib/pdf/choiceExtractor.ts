import { Choice } from '@/types'

// \s* après le tiret : PDF parfois coupe "Rendez-\n vous" → "Rendez- vous"
// \s+ entre mots : doubles espaces fréquents dans l'extraction PDF
const PATTERNS_FR = [
  /[Rr]endez-\s*vous\s+dans\s+ce\s+cas\s+au\s+(\d+)/g,
  /[Rr]endez-\s*vous\s+alors\s+au\s+(\d+)/g,
  /[Rr]endez-\s*vous\s+ensuite\s+au\s+(\d+)/g,
  /[Rr]endez-\s*vous\s+au\s+(\d+)/g,
  /[Aa]llez\s+au\s+(\d+)/g,
  // "vous rendre au X" — infinitif (ex: "et vous rendre au 288")
  /[Vv]ous\s+rendre\s+au\s+(\d+)/g,
  // "se rendre au X"
  /[Ss]e\s+rendre\s+au\s+(\d+)/g,
  /[Pp]assez\s+(?:au|à)\s+(?:paragraphe\s+)?(\d+)/g,
  /[Tt]ournez-\s*vous\s+vers\s+(?:le\s+)?(\d+)/g,
]

const PATTERNS_EN = [
  /[Tt]urn\s+to\s+(\d+)/g,
  /[Gg]o\s+to\s+(\d+)/g,
  /[Pp]roceed\s+to\s+(\d+)/g,
]

function extractLabel(text: string, matchIndex: number): string {
  const before = text.slice(0, matchIndex)
  const sentences = before.split(/(?<=[.!?])\s+/)
  const lastSentence = sentences[sentences.length - 1]?.trim() || ''

  const label = lastSentence
    .replace(/^[-–•›»]\s*/, '')
    .replace(/\s*[?!.]\s*$/, '')
    // Normalise les doubles espaces dans le label
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (label.length > 3 && label.length < 200) return label
  return 'Continuer'
}

export function extractChoices(content: string, language: 'fr' | 'en'): Choice[] {
  const patterns = language === 'fr' ? PATTERNS_FR : PATTERNS_EN
  const choices: Choice[] = []
  const seen = new Set<number>()

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, 'g')
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      const targetNodeNumber = parseInt(m[1], 10)
      if (seen.has(targetNodeNumber)) continue
      seen.add(targetNodeNumber)

      const label = extractLabel(content, m.index)
      choices.push({ label, targetNodeNumber })
    }
  }

  return choices
}
