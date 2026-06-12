'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CramoChat } from '@/components/cramo-chat'
import { CramoIcon } from '@/components/cramo-icon'
import { cn } from '@/lib/utils'

const BUTTON_SIZE = 48
const MARGIN = 16
const CORNER_STORAGE_KEY = 'cramo-chat-corner'
const DRAG_THRESHOLD = 6

type Corner = 'left' | 'right'

function cornerToLeft(corner: Corner): number {
  if (corner === 'left') return MARGIN
  return window.innerWidth - BUTTON_SIZE - MARGIN
}

export function CramoChatWidget() {
  const [open, setOpen] = useState(false)
  const [corner, setCorner] = useState<Corner>('right')
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [dragLeft, setDragLeft] = useState<number | null>(null)
  const dragState = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null)
  const wasDraggedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(CORNER_STORAGE_KEY)
    const initialCorner: Corner = stored === 'left' ? 'left' : 'right'
    setCorner(initialCorner)
    setRestLeft(cornerToLeft(initialCorner))
  }, [])

  useEffect(() => {
    function onResize() {
      setRestLeft(cornerToLeft(corner))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [corner])

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
          'fixed z-50 flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl transition-all duration-200 ease-out',
          'inset-x-3 bottom-20 top-20 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-24 sm:h-[30rem] sm:w-96',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
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
