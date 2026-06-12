'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CramoIcon } from '@/components/cramo-icon'
import type { TourStep } from '@/lib/tour-steps'

interface OnboardingTourProps {
  open: boolean
  onClose: () => void
  steps: TourStep[]
  onRequestSidebarOpen?: () => void
  onRequestSidebarClose?: () => void
}

const SPOTLIGHT_PADDING = 8
const BUBBLE_WIDTH = 320
const BUBBLE_HEIGHT_ESTIMATE = 220
const GAP = 12
const LG_BREAKPOINT = 1024

function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.left < window.innerWidth &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight
  )
}

function getBubblePosition(rect: DOMRect, placement: TourStep['placement'] = 'bottom') {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(BUBBLE_WIDTH, vw - 24)

  // Side placements need room for the bubble next to the target. On narrow
  // screens (e.g. wide sidebar nav items), that room isn't there — fall
  // back to top/bottom so the bubble doesn't end up covering its target.
  let effectivePlacement = placement
  if (placement === 'right' && rect.right + GAP + width > vw) {
    effectivePlacement = rect.bottom + GAP + BUBBLE_HEIGHT_ESTIMATE <= vh ? 'bottom' : 'top'
  } else if (placement === 'left' && rect.left - GAP - width < 0) {
    effectivePlacement = rect.bottom + GAP + BUBBLE_HEIGHT_ESTIMATE <= vh ? 'bottom' : 'top'
  }

  let top: number
  let left: number

  switch (effectivePlacement) {
    case 'top':
      top = rect.top - GAP - BUBBLE_HEIGHT_ESTIMATE
      left = rect.left + rect.width / 2 - width / 2
      break
    case 'left':
      top = rect.top + rect.height / 2 - BUBBLE_HEIGHT_ESTIMATE / 2
      left = rect.left - GAP - width
      break
    case 'right':
      top = rect.top + rect.height / 2 - BUBBLE_HEIGHT_ESTIMATE / 2
      left = rect.right + GAP
      break
    case 'bottom':
    default:
      top = rect.bottom + GAP
      left = rect.left + rect.width / 2 - width / 2
      break
  }

  top = Math.min(Math.max(top, 12), vh - BUBBLE_HEIGHT_ESTIMATE - 12)
  left = Math.min(Math.max(left, 12), vw - width - 12)

  return { top, left, width }
}

export function OnboardingTour({ open, onClose, steps, onRequestSidebarOpen, onRequestSidebarClose }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const sidebarOpenedByTourRef = useRef(false)

  const step = steps[stepIndex]

  function finish() {
    if (sidebarOpenedByTourRef.current) {
      onRequestSidebarClose?.()
      sidebarOpenedByTourRef.current = false
    }
    onClose()
  }

  const finishRef = useRef(finish)
  finishRef.current = finish

  function goNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      finish()
    }
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  // Reset to first step whenever the tour is (re-)opened
  useEffect(() => {
    if (open) setStepIndex(0)
  }, [open])

  // Locate and measure the target element for the current step, skipping
  // steps whose target never becomes visible (e.g. collapsed sidebar)
  useEffect(() => {
    if (!open || !step) return

    let cancelled = false
    const isNavStep = step.target.startsWith('nav-')
    const isMobile = window.innerWidth < LG_BREAKPOINT

    if (isNavStep && isMobile) {
      onRequestSidebarOpen?.()
      sidebarOpenedByTourRef.current = true
    } else if (sidebarOpenedByTourRef.current) {
      onRequestSidebarClose?.()
      sidebarOpenedByTourRef.current = false
    }

    setRect(null)

    let attempts = 0
    const maxAttempts = isNavStep && isMobile ? 20 : 10

    function tryMeasure() {
      if (cancelled) return
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        if (isVisible(r)) {
          setRect(r)
          return
        }
      }
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(tryMeasure, 50)
      } else if (stepIndex < steps.length - 1) {
        setStepIndex((i) => i + 1)
      } else {
        finishRef.current()
      }
    }

    tryMeasure()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex])

  // Keep the spotlight in sync with layout changes
  useEffect(() => {
    if (!open || !step) return
    function update() {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      if (isVisible(r)) setRect(r)
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, step])

  // ESC closes the tour
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') finishRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open || !step) return null

  const bubble = rect ? getBubblePosition(rect, step.placement) : null

  return (
    <AnimatePresence>
      {rect && bubble && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Spotlight */}
          <motion.div
            className="fixed pointer-events-none rounded-xl"
            style={{
              top: rect.top - SPOTLIGHT_PADDING,
              left: rect.left - SPOTLIGHT_PADDING,
              width: rect.width + SPOTLIGHT_PADDING * 2,
              height: rect.height + SPOTLIGHT_PADDING * 2,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 2px hsl(var(--primary))',
            }}
            initial={false}
            animate={{
              top: rect.top - SPOTLIGHT_PADDING,
              left: rect.left - SPOTLIGHT_PADDING,
              width: rect.width + SPOTLIGHT_PADDING * 2,
              height: rect.height + SPOTLIGHT_PADDING * 2,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />

          {/* Speech bubble */}
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed rounded-2xl border border-border/50 bg-card shadow-xl p-4"
            style={{ top: bubble.top, left: bubble.left, width: bubble.width }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Schritt {stepIndex + 1} von {steps.length}
              </span>
              <button
                onClick={finish}
                className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Tour überspringen
              </button>
            </div>

            <div className="flex items-start gap-3">
              <CramoIcon alt="Cramo" className="h-9 w-9 rounded-full object-cover shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              {stepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={goBack}>
                  Zurück
                </Button>
              )}
              <Button size="sm" onClick={goNext}>
                {stepIndex === steps.length - 1 ? 'Fertig' : 'Weiter'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
