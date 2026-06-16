'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { CramoLernkontext } from '@/lib/types'

interface CramoContextValue {
  context: CramoLernkontext | null
  setContext: (context: CramoLernkontext) => void
  clearContext: () => void
  // Signal: increment to trigger the widget to open
  chatOpenSignal: number
  triggerChatOpen: () => void
  // Whether the current card is brand-new (fsrs_state === 0)
  isNewCard: boolean
  setIsNewCard: (v: boolean) => void
  // Timestamp (ms) when the current card was revealed, or null
  cardRevealedAt: number | null
  setCardRevealedAt: (ts: number | null) => void
}

const CramoContext = createContext<CramoContextValue | null>(null)

export function CramoContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<CramoLernkontext | null>(null)
  const [chatOpenSignal, setChatOpenSignal] = useState(0)
  const [isNewCard, setIsNewCardState] = useState(false)
  const [cardRevealedAt, setCardRevealedAtState] = useState<number | null>(null)

  const setContext = useCallback((next: CramoLernkontext) => setContextState(next), [])
  const clearContext = useCallback(() => setContextState(null), [])
  const triggerChatOpen = useCallback(() => setChatOpenSignal(s => s + 1), [])
  const setIsNewCard = useCallback((v: boolean) => setIsNewCardState(v), [])
  const setCardRevealedAt = useCallback((ts: number | null) => setCardRevealedAtState(ts), [])

  return (
    <CramoContext.Provider value={{
      context, setContext, clearContext,
      chatOpenSignal, triggerChatOpen,
      isNewCard, setIsNewCard,
      cardRevealedAt, setCardRevealedAt,
    }}>
      {children}
    </CramoContext.Provider>
  )
}

export function useCramoContext(): CramoContextValue {
  const ctx = useContext(CramoContext)
  if (!ctx) throw new Error('useCramoContext muss innerhalb von CramoContextProvider verwendet werden')
  return ctx
}
