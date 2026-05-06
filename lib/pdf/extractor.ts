import fs from 'fs'

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const buffer = fs.readFileSync(pdfPath)
  const data = await pdfParse(buffer)
  return data.text
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove repeated header/footer patterns (lines that appear 3+ times)
    .split('\n')
    .reduce((acc: string[], line) => {
      acc.push(line)
      return acc
    }, [])
    .join('\n')
    // Normalize excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
}
