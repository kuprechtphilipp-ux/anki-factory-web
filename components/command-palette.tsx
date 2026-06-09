'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Loader2, X, ChevronRight } from 'lucide-react'

interface SucheResult {
  id: number
  frage: string
  antwort: string
  cloze_text: string | null
  typ: string
  status: string
  thema: {
    id: number
    name: string
    kurs: {
      id: number
      name: string
    }
  }
}

const STATUS_COLORS: Record<string, string> = {
  neu: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  reviewed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  verworfen: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  exportiert: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

const STATUS_LABELS: Record<string, string> = {
  neu: 'Neu',
  reviewed: 'Überprüft',
  verworfen: 'Verworfen',
  exportiert: 'Exportiert',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SucheResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSelected(0)
  }, [])

  // ⌘K / Ctrl+K global handler
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => {
          if (o) close()
          return !o
        })
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suche?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setSelected(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function navigateTo(r: SucheResult) {
    const kurs = encodeURIComponent(r.thema.kurs.name)
    const thema = encodeURIComponent(r.thema.name)
    router.push(`/${kurs}/${thema}?tab=alle&highlight=${r.id}`)
    close()
  }

  // Arrow key navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      navigateTo(results[selected])
    }
  }

  function preview(r: SucheResult): string {
    const text = r.typ === 'cloze'
      ? (r.cloze_text ?? r.frage)
      : r.frage
    return text.length > 72 ? text.slice(0, 72) + '…' : text
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Karten durchsuchen…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
            <button onClick={close} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="py-1.5 max-h-[380px] overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  onClick={() => navigateTo(r)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                    selected === i ? 'bg-primary/8 dark:bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground line-clamp-1">
                      {preview(r)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground/70">{r.thema.kurs.name}</span>
                      <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />
                      <span className="text-[10px] text-muted-foreground/70">{r.thema.name}</span>
                      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_COLORS[r.status] ?? ''}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 mt-1 transition-opacity ${selected === i ? 'opacity-60' : 'opacity-0'}`} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty / hint state */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Keine Karten für &bdquo;{query}&ldquo; gefunden
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="py-6 px-4 text-center">
            <p className="text-xs text-muted-foreground/60">
              Mindestens 2 Zeichen eingeben um zu suchen
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted px-1 font-mono">↑↓</kbd>
            Navigieren
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted px-1 font-mono">↵</kbd>
            Öffnen
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted px-1 font-mono">⌘K</kbd>
            Schließen
          </span>
        </div>
      </div>
    </div>
  )
}
