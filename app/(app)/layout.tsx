'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { CommandPalette } from '@/components/command-palette'
import { Button } from '@/components/ui/button'
import { Menu, Search } from 'lucide-react'

const DEFAULT_WIDTH = 256
const MIN_WIDTH = 180
const MAX_WIDTH = 400

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-width')
    if (saved) {
      const w = Number(saved)
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w)
    }
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
            <ThemeToggle />
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          style={{ paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))' }}
        >{children}</main>
        <CommandPalette />
      </div>
    </div>
  )
}
