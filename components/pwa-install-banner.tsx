'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

type Platform = 'ios' | 'android' | null

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 14

export function PwaInstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Already installed as standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // Check dismiss cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const daysAgo = (Date.now() - Number(dismissed)) / 86_400_000
      if (daysAgo < DISMISS_DAYS) return
    }

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)

    if (isIos) {
      // iOS Safari: show manual instructions
      const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
      if (isSafari) {
        setPlatform('ios')
        setVisible(true)
      }
      return
    }

    if (isAndroid) {
      // Android: wait for beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
        setPlatform('android')
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    // Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
      setPlatform('android')
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  async function install() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      dismiss()
    } finally {
      setInstalling(false)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {/* App icon */}
          <div className="shrink-0 h-12 w-12 rounded-2xl overflow-hidden shadow-sm border border-border/40">
            <img src="/icons/icon-192.png" alt="Anki Factory" className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Anki Factory</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platform === 'ios'
                ? 'Zum Startbildschirm hinzufügen'
                : 'Als App installieren — ohne App Store'}
            </p>

            {platform === 'ios' ? (
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                Tippe unten auf{' '}
                <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                  <Share className="h-3 w-3" /> Teilen
                </span>
                {' '}und dann <span className="font-semibold text-foreground">&#8222;Zum Home-Bildschirm&#8220;</span>
              </p>
            ) : (
              <button
                onClick={install}
                disabled={installing}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Download className="h-3 w-3" />
                {installing ? 'Installiere…' : 'Installieren'}
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
            aria-label="Schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
