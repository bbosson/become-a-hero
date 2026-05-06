interface Props {
  content: string
}

export default function NodeText({ content }: Props) {
  const paragraphs = content.split(/\n{2,}/).filter(p => p.trim())

  return (
    <div className="prose prose-invert prose-stone max-w-none">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-stone-200 leading-relaxed text-base mb-4 last:mb-0">
          {para.trim()}
        </p>
      ))}
    </div>
  )
}
