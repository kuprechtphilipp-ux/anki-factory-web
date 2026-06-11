'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { CommandPalette } from '@/components/command-palette'
import { CramoContextProvider } from '@/components/cramo-context'
import { CramoChatWidget } from '@/components/cramo-chat-widget'
import { OnboardingModal } from '@/components/onboarding-modal'
import { OnboardingTour } from '@/components/onboarding-tour'
import { PlanBanner } from '@/components/plan-banner'
import { Button } from '@/components/ui/button'
import { Menu, Search, Lightbulb } from 'lucide-react'
import type { Lernfenster } from '@/lib/types'
import { CRAMO_TOUR_STEPS } from '@/lib/tour-steps'

const DEFAULT_WIDTH = 256
const MIN_WIDTH = 180
const MAX_WIDTH = 400

function markPwaPromptReady() {
  if (localStorage.getItem('pwa-prompt-ready') === '1') return
  localStorage.setItem('pwa-prompt-ready', '1')
  window.dispatchEvent(new Event('pwa-prompt-ready'))
}

interface ProfileData {
  fachbereich: string | null
  lernziel: string | null
  lernfenster: Lernfenster | null
  onboarding_completed: boolean
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-width')
    if (saved) {
      const w = Number(saved)
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w)
    }
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileData | null) => {
        if (!data) return
        setProfile(data)
        if (!data.onboarding_completed) {
          setOnboardingOpen(true)
        } else {
          markPwaPromptReady()
        }
      })
      .catch(() => {})
  }, [])

  // Lock body scroll on iOS when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  function handleWidthChange(w: number) {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))
    setSidebarWidth(clamped)
    localStorage.setItem('sidebar-width', String(clamped))
  }

  return (
    <CramoContextProvider>
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header: extends behind iOS status bar via padding-top safe-area-inset-top */}
        <header
          className="shrink-0 border-b border-border/50 bg-card/60 backdrop-blur-sm"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-14 items-center px-4">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 hover:bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors mr-2"
              title="Suche (⌘K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Suche</span>
              <kbd className="ml-1 rounded border border-border/60 bg-card px-1 text-[10px] font-mono">⌘K</kbd>
            </button>
            <PlanBanner />
            <button
              onClick={() => setOnboardingOpen(true)}
              data-tour="lightbulb-button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Cramo-Einstellungen"
              aria-label="Cramo-Einstellungen öffnen"
            >
              <Lightbulb className="h-[18px] w-[18px]" />
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          style={{ paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))' }}
        >{children}</main>
        <CommandPalette />
      </div>

      <CramoChatWidget />

      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        initial={profile ?? undefined}
        onSaved={() => {
          fetch('/api/profile')
            .then((r) => (r.ok ? r.json() : null))
            .then((data: ProfileData | null) => { if (data) setProfile(data) })
            .catch(() => {})
          setTourOpen(true)
        }}
      />

      <OnboardingTour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false)
          markPwaPromptReady()
        }}
        steps={CRAMO_TOUR_STEPS}
        onRequestSidebarOpen={() => setSidebarOpen(true)}
        onRequestSidebarClose={() => setSidebarOpen(false)}
      />
    </div>
    </CramoContextProvider>
  )
}
