import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let done = false

      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      while (!done) {
        const job = await prisma.processingJob.findUnique({
          where: { id: jobId },
          include: { book: true },
        })

        if (!job) {
          send({ error: 'Job not found' })
          controller.close()
          return
        }

        send({
          status: job.status,
          progress: job.progress,
          currentStep: job.currentStep,
          errorMsg: job.errorMsg,
          bookId: job.bookId,
          bookStatus: job.book.status,
          totalNodes: job.book.totalNodes,
          validation: null,
        })

        if (job.status === 'done' || job.status === 'error') {
          done = true
          controller.close()
          return
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
