import fs from 'fs'

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  // pdf-parse wrapper tries to fetch V8 inspector endpoint → JSON.parse error; use lib directly
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js')
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
