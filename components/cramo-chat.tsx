'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useCramoContext } from '@/components/cramo-context'
import { CramoIcon } from '@/components/cramo-icon'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CramoChatProps {
  mode: 'help' | 'fun'
  placeholder?: string
  introMessage?: string
  className?: string
}

const markdownComponents = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => <ul className="mb-2 last:mb-0 list-disc pl-5 space-y-1" {...props} />,
  ol: ({ ...props }) => <ol className="mb-2 last:mb-0 list-decimal pl-5 space-y-1" {...props} />,
  li: ({ ...props }) => <li {...props} />,
  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
  a: ({ ...props }) => <a className="underline underline-offset-2 hover:text-primary" target="_blank" rel="noopener noreferrer" {...props} />,
  code: ({ ...props }) => <code className="rounded bg-background/60 px-1 py-0.5 text-xs" {...props} />,
  pre: ({ ...props }) => <pre className="mb-2 last:mb-0 overflow-x-auto rounded-lg bg-background/60 p-2 text-xs" {...props} />,
  blockquote: ({ ...props }) => <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground" {...props} />,
  h1: ({ ...props }) => <p className="mb-1 font-semibold" {...props} />,
  h2: ({ ...props }) => <p className="mb-1 font-semibold" {...props} />,
  h3: ({ ...props }) => <p className="mb-1 font-semibold" {...props} />,
}

function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  )
}

export function CramoChat({ mode, placeholder, introMessage, className }: CramoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { context } = useCramoContext()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          message: text,
          history: messages,
          ...(mode === 'help' && context ? { context } : {}),
        }),
      })

      if (res.status === 402) {
        const data = await res.json()
        toast.error(data.message)
        setMessages(messages)
        return
      }

      if (!res.ok) {
        toast.error('Cramo antwortet gerade nicht. Versuch es nochmal.')
        setMessages(messages)
        return
      }

      const { reply } = await res.json() as { reply: string }
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch {
      toast.error('Verbindung zu Cramo fehlgeschlagen.')
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 px-1 py-2">
        {messages.length === 0 && introMessage && (
          <div className="flex gap-2.5">
            <CramoAvatar />
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]">
              <MessageContent content={introMessage} />
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' && 'justify-end')}>
            {m.role === 'assistant' && <CramoAvatar />}
            <div
              className={cn(
                'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]',
                m.role === 'user'
                  ? 'rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap'
                  : 'rounded-tl-sm bg-muted text-foreground'
              )}
            >
              {m.role === 'assistant' ? <MessageContent content={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <CramoAvatar />
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm flex items-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border/50 pt-3 mt-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Schreib Cramo eine Nachricht...'}
          rows={1}
          className="min-h-9 max-h-32 resize-none text-base md:text-sm"
          disabled={loading}
        />
        <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

function CramoAvatar() {
  return <CramoIcon alt="Cramo" className="h-10 w-10 shrink-0 rounded-full object-cover" />
}
