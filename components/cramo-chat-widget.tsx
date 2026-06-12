'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CramoChat } from '@/components/cramo-chat'
import { CramoIcon } from '@/components/cramo-icon'
import { cn } from '@/lib/utils'

const BUTTON_SIZE = 48
const MARGIN = 16
const CORNER_STORAGE_KEY = 'cramo-chat-corner'
const SIZE_STORAGE_KEY = 'cramo-chat-size'
const DRAG_THRESHOLD = 6
const DESKTOP_BREAKPOINT = 640
const DEFAULT_WIDTH = 384 // 24rem (entspricht sm:w-96)
const DEFAULT_HEIGHT = 480 // 30rem (entspricht sm:h-[30rem])
const MIN_WIDTH = 320
const MIN_HEIGHT = 360
const PANEL_RIGHT = 20 // sm:right-5
const PANEL_BOTTOM = 96 // sm:bottom-24

type Corner = 'left' | 'right'
type ChatSize = { width: number; height: number }

function cornerToLeft(corner: Corner): number {
  if (corner === 'left') return MARGIN
  return window.innerWidth - BUTTON_SIZE - MARGIN
}

function clampSize(size: ChatSize): ChatSize {
  const maxWidth = window.innerWidth - PANEL_RIGHT - MARGIN
  const maxHeight = window.innerHeight - PANEL_BOTTOM - MARGIN
  return {
    width: Math.min(Math.max(size.width, MIN_WIDTH), Math.max(maxWidth, MIN_WIDTH)),
    height: Math.min(Math.max(size.height, MIN_HEIGHT), Math.max(maxHeight, MIN_HEIGHT)),
  }
}

export function CramoChatWidget() {
  const [open, setOpen] = useState(false)
  const [corner, setCorner] = useState<Corner>('right')
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [dragLeft, setDragLeft] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [chatSize, setChatSize] = useState<ChatSize | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const dragState = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null)
  const wasDraggedRef = useRef(false)
  const resizeState = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CORNER_STORAGE_KEY)
    const initialCorner: Corner = stored === 'left' ? 'left' : 'right'
    setCorner(initialCorner)
    setRestLeft(cornerToLeft(initialCorner))
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)

    const storedSize = localStorage.getItem(SIZE_STORAGE_KEY)
    if (storedSize) {
      try {
        const parsed = JSON.parse(storedSize) as ChatSize
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          setChatSize(clampSize(parsed))
        }
      } catch {
        // ignore invalid stored size
      }
    }
  }, [])

  useEffect(() => {
    function onResize() {
      setRestLeft(cornerToLeft(corner))
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
      setChatSize((prev) => (prev ? clampSize(prev) : prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [corner])

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const current = chatSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
    resizeState.current = { startX: e.clientX, startY: e.clientY, startWidth: current.width, startHeight: current.height }
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rs = resizeState.current
    if (!rs) return
    // Panel ist unten rechts verankert -> nach links/oben ziehen vergrößert die Box.
    const dx = rs.startX - e.clientX
    const dy = rs.startY - e.clientY
    setChatSize(clampSize({ width: rs.startWidth + dx, height: rs.startHeight + dy }))
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeState.current) return
    resizeState.current = null
    setIsResizing(false)
    setChatSize((current) => {
      if (current) localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(current))
      return current
    })
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (open || window.innerWidth >= 640) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragState.current = { startX: e.clientX, startLeft: rect.left, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const ds = dragState.current
    if (!ds) return
    const dx = e.clientX - ds.startX
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      ds.moved = true
      wasDraggedRef.current = true
    }
    if (!ds.moved) return
    const newLeft = Math.min(
      window.innerWidth - BUTTON_SIZE - MARGIN,
      Math.max(MARGIN, ds.startLeft + dx)
    )
    setDragLeft(newLeft)
  }

  function handlePointerUp() {
    const ds = dragState.current
    if (!ds) return
    dragState.current = null
    if (!ds.moved) {
      setDragLeft(null)
      return
    }
    const center = (dragLeft ?? ds.startLeft) + BUTTON_SIZE / 2
    const newCorner: Corner = center < window.innerWidth / 2 ? 'left' : 'right'
    setCorner(newCorner)
    setRestLeft(cornerToLeft(newCorner))
    setDragLeft(null)
    localStorage.setItem(CORNER_STORAGE_KEY, newCorner)
  }

  function handleClick() {
    // Ein Tap mit Bewegung über dem Schwellenwert war ein Drag, kein Klick.
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    setOpen((v) => !v)
  }

  const left = dragLeft ?? restLeft
  const positioned = left !== null

  return (
    <>
      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl ease-out',
          isResizing ? 'transition-none' : 'transition-all duration-200',
          'inset-x-3 bottom-20 top-20 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-24 sm:h-[30rem] sm:w-96',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          ...(isDesktop && chatSize ? { width: chatSize.width, height: chatSize.height } : {}),
        }}
      >
        {/* Resize-Griff (nur Desktop): an der oberen linken Ecke ziehen, um die Box zu vergrößern/verkleinern */}
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          className="absolute -top-1.5 -left-1.5 z-10 hidden h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full touch-none sm:flex group"
          aria-label="Chat-Fenster Größe ändern"
          role="separator"
        >
          <div className="h-2.5 w-2.5 rounded-full border-2 border-border bg-card transition-colors group-hover:border-primary group-active:border-primary" />
        </div>
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <CramoIcon alt="Cramo" className="h-9 w-9 rounded-full object-cover" />
            <span className="text-sm font-semibold">Cramo fragen</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Chat schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-3 pb-3">
          <CramoChat
            mode="help"
            introMessage="Hey, ich bin Cramo. Frag mich was zur aktuellen Karte, zum Thema oder zur App."
            placeholder="Frag Cramo..."
          />
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-tour="cramo-widget"
        className={cn(
          'fixed z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg border border-border/50 overflow-hidden transition-transform hover:scale-105 active:scale-95 touch-none',
          'bottom-[max(1rem,env(safe-area-inset-bottom))]',
          !positioned && 'right-4'
        )}
        style={
          positioned
            ? {
                left: left ?? undefined,
                right: 'auto',
                transition: dragLeft !== null ? 'none' : 'left 0.3s ease-out, transform 0.15s ease-out',
              }
            : undefined
        }
        aria-label={open ? 'Cramo-Chat schließen' : 'Cramo-Chat öffnen'}
      >
        {open ? (
          <div className="flex h-full w-full items-center justify-center bg-card">
            <X className="h-5 w-5 text-foreground" />
          </div>
        ) : (
          <CramoIcon alt="Cramo-Chat öffnen" className="h-full w-full object-cover" />
        )}
      </button>
    </>
  )
}
