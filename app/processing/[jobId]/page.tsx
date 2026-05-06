import ProcessingStatus from '@/components/processing/ProcessingStatus'

interface Props {
  params: { jobId: string }
}

export default function ProcessingPage({ params }: Props) {
  return (
    <div className="min-h-screen" style={{ background: '#0f0e17' }}>
      <header className="border-b border-amber-900/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚔</span>
          <h1 className="text-lg font-semibold text-stone-100 tracking-wide">BECOME A HERO</h1>
        </div>
      </header>

      <main className="px-6 py-12 max-w-xl mx-auto flex flex-col items-center">
        <ProcessingStatus jobId={params.jobId} />
      </main>
    </div>
  )
}
