'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { CramoLernkontext } from '@/lib/types'

interface CramoContextValue {
  context: CramoLernkontext | null
  setContext: (context: CramoLernkontext) => void
  clearContext: () => void
}

const CramoContext = createContext<CramoContextValue | null>(null)

export function CramoContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<CramoLernkontext | null>(null)

  const setContext = useCallback((next: CramoLernkontext) => setContextState(next), [])
  const clearContext = useCallback(() => setContextState(null), [])

  return (
    <CramoContext.Provider value={{ context, setContext, clearContext }}>
      {children}
    </CramoContext.Provider>
  )
}

export function useCramoContext(): CramoContextValue {
  const ctx = useContext(CramoContext)
  if (!ctx) throw new Error('useCramoContext muss innerhalb von CramoContextProvider verwendet werden')
  return ctx
}
