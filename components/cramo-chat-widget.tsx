'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { CramoChat } from '@/components/cramo-chat'
import { CramoIcon } from '@/components/cramo-icon'
import { useCramoContext } from '@/components/cramo-context'
import { isTypingInField } from '@/lib/utils'
import { cn } from '@/lib/utils'

const BUTTON_SIZE = 48
const MARGIN = 16
const CORNER_STORAGE_KEY = 'cramo-chat-corner'
const SIZE_STORAGE_KEY = 'cramo-chat-size'
const ONBOARDING_KEY = 'cramo-nudge-seen'
const DRAG_THRESHOLD = 6
const DESKTOP_BREAKPOINT = 640
const DEFAULT_WIDTH = 384
const DEFAULT_HEIGHT = 480
const MIN_WIDTH = 320
const MIN_HEIGHT = 360
const PANEL_RIGHT = 20
const PANEL_BOTTOM = 96
// Pixels of panel left edge kept visible in peek mode
const PEEK_STRIP = 72
// Minimum drag distance to snap into peek
const PEEK_SNAP_THRESHOLD = 60

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

  // ── Peek mode ──
  const panelRef = useRef<HTMLDivElement>(null)
  const [isPeeking, setIsPeeking] = useState(false)
  // Tracks whether a header drag is in progress (to suppress click in header)
  const headerDragMovedRef = useRef(false)

  function getPeekOffset() {
    const w = chatSize?.width ?? DEFAULT_WIDTH
    // translateX so that only PEEK_STRIP px of the panel's left edge remain on-screen
    return w + PANEL_RIGHT - PEEK_STRIP
  }

  function restoreFromPeek() {
    setIsPeeking(false)
    if (panelRef.current) {
      panelRef.current.style.transform = ''
    }
  }

  // Reset peek when panel closes
  useEffect(() => {
    if (!open) restoreFromPeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ─── Imperative header drag for peek mode ───
  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDesktop) return
    e.preventDefault()

    if (!panelRef.current) return

    headerDragMovedRef.current = false
    const startX = e.clientX
    const startOffset = isPeeking ? getPeekOffset() : 0

    // Disable CSS transition for fluid drag
    panelRef.current.style.transition = 'none'

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX
      if (Math.abs(dx) > 3) headerDragMovedRef.current = true
      const newOffset = Math.max(0, startOffset + dx)
      if (panelRef.current) panelRef.current.style.transform = `translateX(${newOffset}px)`
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)

      const p = panelRef.current
      if (!p) return

      // Re-enable transition for snap animation
      p.style.transition = ''

      const match = p.style.transform.match(/translateX\(([^p]+)px\)/)
      const currentOffset = match ? parseFloat(match[1]) : 0

      if (currentOffset > PEEK_SNAP_THRESHOLD) {
        const peekOff = getPeekOffset()
        p.style.transform = `translateX(${peekOff}px)`
        setIsPeeking(true)
      } else {
        p.style.transform = ''
        setIsPeeking(false)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Context signals ──
  const { chatOpenSignal, isNewCard, cardRevealedAt } = useCramoContext()

  // Open when triggered externally (2x Nochmal, inline link)
  useEffect(() => {
    if (chatOpenSignal > 0) {
      restoreFromPeek()
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpenSignal])

  // Keyboard shortcut: C to toggle chat / restore from peek
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'c' && e.key !== 'C') return
      if (isTypingInField(e.target)) return
      if (isPeeking) {
        restoreFromPeek()
      } else {
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeeking])

  // Feature 2: pulse ring for 10s when a brand-new card appears
  const [showPulse, setShowPulse] = useState(false)
  useEffect(() => {
    if (!isNewCard || open) { setShowPulse(false); return }
    setShowPulse(true)
    const t = setTimeout(() => setShowPulse(false), 10_000)
    return () => { clearTimeout(t); setShowPulse(false) }
  }, [isNewCard, open])

  // Feature 1: nudge tooltip 30s after the card was revealed
  const [showNudge, setShowNudge] = useState(false)
  useEffect(() => {
    setShowNudge(false)
    if (!cardRevealedAt || open) return
    const delay = Math.max(0, 30_000 - (Date.now() - cardRevealedAt))
    const t1 = setTimeout(() => setShowNudge(true), delay)
    const t2 = setTimeout(() => setShowNudge(false), delay + 4_000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [cardRevealedAt, open])

  // Feature 5: one-time onboarding bubble — triggers the first time a card is revealed
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (!cardRevealedAt) return
    if (open) return
    if (localStorage.getItem(ONBOARDING_KEY)) return
    const t1 = setTimeout(() => setShowOnboarding(true), 1_000)
    const t2 = setTimeout(() => {
      setShowOnboarding(false)
      localStorage.setItem(ONBOARDING_KEY, '1')
    }, 7_000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [cardRevealedAt, open])

  function dismissOnboarding() {
    setShowOnboarding(false)
    localStorage.setItem(ONBOARDING_KEY, '1')
  }

  // ── Positioning / sizing setup ──
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
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    if (showOnboarding) dismissOnboarding()
    setOpen((v) => !v)
  }

  const left = dragLeft ?? restLeft
  const positioned = left !== null

  // Tooltip/pulse positioning helpers
  const tooltipBottom = `calc(max(1rem, env(safe-area-inset-bottom)) + ${BUTTON_SIZE + 12}px)`
  const tooltipPositionStyle = positioned && corner === 'left'
    ? { left: left ?? 0 }
    : { right: MARGIN }
  const tailPositionStyle = corner === 'left' ? { left: 12 } : { right: 20 }

  const pulseLeft = positioned ? (left ?? 0) - 8 : undefined
  const pulseRight = !positioned ? 8 : undefined

  const showTooltip = (showOnboarding || showNudge) && !open

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
        ref={panelRef}
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
        {/* Resize handle (desktop only) */}
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

        {/* Header — left portion draggable for peek mode on desktop */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0">
          <div
            className={cn(
              'flex items-center gap-2 select-none min-w-0',
              isDesktop && 'cursor-grab active:cursor-grabbing'
            )}
            title={isDesktop ? 'Nach rechts ziehen → Karte freigeben  ·  C = Chat öffnen/schließen' : undefined}
            onPointerDown={handleHeaderPointerDown}
          >
            <CramoIcon alt="Cramo" className="h-9 w-9 rounded-full object-cover shrink-0" />
            {!isPeeking && <span className="text-sm font-semibold truncate">Cramo fragen</span>}
            {isPeeking && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={restoreFromPeek}
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                aria-label="Chat wiederherstellen"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 ml-2"
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

      {/* Feature 2: Pulse ring for new cards */}
      {showPulse && (
        <div
          aria-hidden
          className="fixed z-[49] pointer-events-none rounded-full border-2 border-primary/40 animate-ping"
          style={{
            width: BUTTON_SIZE + 16,
            height: BUTTON_SIZE + 16,
            bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) - 8px)',
            ...(pulseLeft !== undefined ? { left: pulseLeft, right: 'auto' } : { right: pulseRight }),
          }}
        />
      )}

      {/* Features 1 + 5: Nudge / Onboarding tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="fixed z-[51] max-w-[190px] rounded-xl bg-card border border-border/50 shadow-lg px-3 py-2.5 text-xs text-foreground cursor-pointer animate-fade-in"
          style={{ bottom: tooltipBottom, ...tooltipPositionStyle }}
          onClick={() => {
            if (showOnboarding) dismissOnboarding()
            else { setShowNudge(false); setOpen(true) }
          }}
        >
          {showOnboarding
            ? 'Hey! Ich bin Cramo — frag mich zu jeder Karte 🦝'
            : 'Brauchst du eine Erklärung? →'}
          <div
            className="absolute -bottom-[5px] w-2.5 h-2.5 rotate-45 bg-card border-b border-r border-border/50"
            style={tailPositionStyle}
          />
        </div>
      )}

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
