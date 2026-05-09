import fs from 'fs'
import path from 'path'

type NodeImageMap = Map<number, string>

const ImageKind = { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 }

export async function extractPdfImages(
  pdfPath: string,
  bookId: string,
  validNodeNumbers: Set<number>
): Promise<NodeImageMap> {
  const result: NodeImageMap = new Map()

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''

    const data = new Uint8Array(fs.readFileSync(pdfPath))
    const doc = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0,
    }).promise

    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const nodesDir = path.join(process.cwd(), uploadDir.replace('./', ''), bookId, 'nodes')
    fs.mkdirSync(nodesDir, { recursive: true })

    // Pass 1 — collect node numbers per page (text only, fast)
    const pageNodeMap = new Map<number, number[]>()
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const tc = await page.getTextContent()
      const nodes: number[] = []
      for (const item of tc.items as Array<{ str?: string }>) {
        const s = (item.str || '').trim()
        if (/^\d{1,3}$/.test(s)) {
          const n = parseInt(s, 10)
          if (validNodeNumbers.has(n)) nodes.push(n)
        }
      }
      pageNodeMap.set(p, nodes)
      page.cleanup()
    }

    // Pass 2 — extract images, strictly between two identified nodes
    const OPS = pdfjsLib.OPS
    console.log('[imageExtractor] OPS.paintImageXObject =', OPS.paintImageXObject,
      '| OPS.paintJpegXObject =', OPS.paintJpegXObject,
      '| OPS.paintInlineImageXObject =', OPS.paintInlineImageXObject)

    let prevNode: number | null = null
    let totalImgOpsFound = 0

    // Diagnostic: scan first 10 pages with images and log all unique OPS found
    const diagPage = await doc.getPage(34) // page 34 cited by user
    const diagOps = await diagPage.getOperatorList()
    const uniqueOps = new Set(diagOps.fnArray)
    console.log(`[imageExtractor] page 34 ops count=${diagOps.fnArray.length} unique ops=`, [...uniqueOps].sort())
    const imgOpsOnDiag = diagOps.fnArray.filter((op: number) =>
      op === OPS.paintImageXObject || op === OPS.paintJpegXObject || op === OPS.paintInlineImageXObject
    )
    console.log(`[imageExtractor] page 34 image-related ops count=`, imgOpsOnDiag.length)
    diagPage.cleanup()

    for (let p = 1; p <= doc.numPages; p++) {
      const nodesOnPage = pageNodeMap.get(p) || []

      const page = await doc.getPage(p)
      const opList = await page.getOperatorList()

      const imageNames: string[] = []
      for (let i = 0; i < opList.fnArray.length; i++) {
        // Check paintImageXObject AND paintJpegXObject (JPEG-specific in some pdfjs versions)
        if (opList.fnArray[i] === OPS.paintImageXObject ||
            opList.fnArray[i] === OPS.paintJpegXObject) {
          const name = opList.argsArray[i][0]
          if (typeof name === 'string' && !imageNames.includes(name)) {
            imageNames.push(name)
            totalImgOpsFound++
          }
        }
      }

      if (imageNames.length > 0) {
        const targetNode = nodesOnPage.length > 0
          ? nodesOnPage[nodesOnPage.length - 1]
          : prevNode

        const hasNodeAfter = nodesOnPage.length >= 2 ||
          Array.from({ length: doc.numPages - p }, (_, i) => p + 1 + i)
            .some(pp => (pageNodeMap.get(pp) || []).length > 0)

        console.log(`[imageExtractor] page ${p}: images=${imageNames.length} targetNode=${targetNode} hasNodeAfter=${hasNodeAfter} prevNode=${prevNode}`)

        if (targetNode !== null && hasNodeAfter && !result.has(targetNode)) {
          for (const imgName of imageNames) {
            console.log(`[imageExtractor] trying to extract ${imgName} for node ${targetNode}...`)
            const saved = await Promise.race([
              tryExtractAndSave(page, imgName, nodesDir, bookId, targetNode),
              new Promise<null>(resolve => setTimeout(() => { console.warn(`[imageExtractor] timeout on ${imgName}`); resolve(null) }, 8000)),
            ])
            if (saved) {
              result.set(targetNode, saved)
              console.log(`[imageExtractor] saved image for node ${targetNode}: ${saved}`)
              break
            } else {
              console.log(`[imageExtractor] tryExtractAndSave returned null for ${imgName}`)
            }
          }
        }
      }

      if (nodesOnPage.length > 0) prevNode = nodesOnPage[nodesOnPage.length - 1]
      page.cleanup()
    }

    console.log(`[imageExtractor] total paintImageXObject ops found across all pages: ${totalImgOpsFound}`)

    console.log(`[imageExtractor] extracted ${result.size} images from PDF`)
  } catch (e) {
    console.warn('[imageExtractor] PDF image extraction failed:', e instanceof Error ? e.message : e)
  }

  return result
}

async function tryExtractAndSave(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  imgName: string,
  nodesDir: string,
  bookId: string,
  nodeNumber: number
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.objs.get(imgName, async (imgData: any) => {
        if (!imgData || !imgData.data || !imgData.width || !imgData.height) {
          resolve(null)
          return
        }

        const { width, height, data, kind } = imgData

        let channels: number
        if (kind === ImageKind.RGBA_32BPP || data.length === width * height * 4) channels = 4
        else if (kind === ImageKind.RGB_24BPP || data.length === width * height * 3) channels = 3
        else {
          resolve(null)
          return
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sharp = require('sharp')
          const imgPath = path.join(nodesDir, `${nodeNumber}.jpg`)
          await sharp(Buffer.from(data), { raw: { width, height, channels } })
            .jpeg({ quality: 85 })
            .toFile(imgPath)
          resolve(`/uploads/${bookId}/nodes/${nodeNumber}.jpg`)
        } catch (e) {
          console.warn(`[imageExtractor] save failed node ${nodeNumber}:`, e instanceof Error ? e.message : e)
          resolve(null)
        }
      })
    } catch {
      resolve(null)
    }
  })
}
