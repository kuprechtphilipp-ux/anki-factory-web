'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useCramoContext } from '@/components/cramo-context'
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
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap">
              {introMessage}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' && 'justify-end')}>
            {m.role === 'assistant' && <CramoAvatar />}
            <div
              className={cn(
                'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap',
                m.role === 'user'
                  ? 'rounded-tr-sm bg-primary text-primary-foreground'
                  : 'rounded-tl-sm bg-muted text-foreground'
              )}
            >
              {m.content}
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
          className="min-h-9 max-h-32 resize-none text-sm"
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
  return (
    <img
      src="/icons/Cramo_Icons/Cramo_Fresh_Ai_Chat_Icon.png"
      alt="Cramo"
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  )
}
