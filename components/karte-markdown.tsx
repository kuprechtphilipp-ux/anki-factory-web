import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn } from '@/lib/utils'

const components = {
  p: ({ ...props }) => <p className="m-0" {...props} />,
  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
}

interface Props {
  content: string
  className?: string
}

// Rendert Karteninhalte als Markdown inkl. LaTeX-Formeln ($...$ / $$...$$) via KaTeX.
export function KarteMarkdown({ content, className }: Props) {
  return (
    <div className={cn('[&_p]:m-0 [&_p+p]:mt-2', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
