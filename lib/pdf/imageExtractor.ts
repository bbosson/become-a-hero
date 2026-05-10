import fs from 'fs'
import path from 'path'
import { resolveUploadDir } from '../uploadDir'

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

    const nodesDir = resolveUploadDir(bookId, 'nodes')
    console.log(`[imageExtractor] UPLOAD_DIR=${process.env.UPLOAD_DIR || '(not set, fallback ./uploads)'} → nodesDir=${nodesDir}`)
    fs.mkdirSync(nodesDir, { recursive: true })
    console.log(`[imageExtractor] directory created: ${nodesDir}`)

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
    let prevNode: number | null = null

    for (let p = 1; p <= doc.numPages; p++) {
      const nodesOnPage = pageNodeMap.get(p) || []

      const page = await doc.getPage(p)
      const opList = await page.getOperatorList()

      const imageNames: string[] = []
      for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] === OPS.paintImageXObject) {
          const name = opList.argsArray[i][0]
          // Skip Form XObjects (g_* prefix) — they wrap images but can't be decoded
          // without canvas in Node.js; only direct Image XObjects work
          if (typeof name === 'string' && !name.startsWith('g_') && !imageNames.includes(name)) {
            imageNames.push(name)
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

        console.log(`[imageExtractor] page ${p}: images=${imageNames.join(',')} targetNode=${targetNode} hasNodeAfter=${hasNodeAfter} alreadySaved=${targetNode !== null && result.has(targetNode)}`)

        if (targetNode !== null && hasNodeAfter && !result.has(targetNode)) {
          for (const imgName of imageNames) {
            const saved = await extractWithTimeout(page, imgName, nodesDir, bookId, targetNode)
            if (saved) {
              console.log(`[imageExtractor] ✓ saved node ${targetNode} → ${saved}`)
              result.set(targetNode, saved)
              break
            } else {
              console.warn(`[imageExtractor] ✗ failed/timeout for ${imgName} node ${targetNode}`)
            }
          }
        }
      }

      if (nodesOnPage.length > 0) prevNode = nodesOnPage[nodesOnPage.length - 1]
      page.cleanup()
    }

    console.log(`[imageExtractor] extracted ${result.size} images from PDF`)
  } catch (e) {
    console.warn('[imageExtractor] PDF image extraction failed:', e instanceof Error ? e.message : e)
  }

  return result
}

function extractWithTimeout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  imgName: string,
  nodesDir: string,
  bookId: string,
  nodeNumber: number
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        console.warn(`[imageExtractor] timeout extracting ${imgName} for node ${nodeNumber}`)
        resolve(null)
      }
    }, 8000)

    tryExtractAndSave(page, imgName, nodesDir, bookId, nodeNumber).then((res) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(res)
      }
    })
  })
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
        console.log(`[imageExtractor] img ${imgName} node ${nodeNumber}: ${width}x${height} kind=${kind} dataLen=${data.length}`)

        let channels: number
        if (kind === ImageKind.RGBA_32BPP || data.length === width * height * 4) channels = 4
        else if (kind === ImageKind.RGB_24BPP || data.length === width * height * 3) channels = 3
        else {
          console.warn(`[imageExtractor] unsupported format node ${nodeNumber}: kind=${kind} dataLen=${data.length} expected=${width * height * 3} or ${width * height * 4}`)
          resolve(null)
          return
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sharp = require('sharp')
          const imgPath = path.join(nodesDir, `${nodeNumber}.jpg`)
          console.log(`[imageExtractor] writing ${imgPath} (${channels}ch ${width}x${height})`)
          await sharp(Buffer.from(data), { raw: { width, height, channels } })
            .jpeg({ quality: 85 })
            .toFile(imgPath)
          console.log(`[imageExtractor] write OK: ${imgPath}`)
          resolve(`/uploads/${bookId}/nodes/${nodeNumber}.jpg`)
        } catch (e) {
          console.warn(`[imageExtractor] sharp failed node ${nodeNumber}: ${e instanceof Error ? e.message : e}`)
          resolve(null)
        }
      })
    } catch {
      resolve(null)
    }
  })
}
