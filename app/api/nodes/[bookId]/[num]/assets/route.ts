import { NextRequest, NextResponse } from 'next/server'
import { generateNodeImage } from '@/lib/ai/imageService'
import { generateNodeAudio } from '@/lib/ai/audioService'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string; num: string } }
) {
  const { generate } = await request.json() as { generate: string[] }
  const nodeNumber = parseInt(params.num, 10)

  const results: Record<string, string | null> = {}

  if (generate.includes('image')) {
    results.imageUrl = await generateNodeImage(params.bookId, nodeNumber)
  }
  if (generate.includes('audio')) {
    results.audioUrl = await generateNodeAudio(params.bookId, nodeNumber)
  }

  return NextResponse.json(results)
}
