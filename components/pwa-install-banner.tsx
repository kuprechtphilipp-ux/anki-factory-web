'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

type Platform = 'ios' | 'android' | null

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 14
const READY_KEY = 'pwa-prompt-ready'
const READY_EVENT = 'pwa-prompt-ready'
const SHOW_DELAY_MS = 1500

// Dismiss check: mobile = once per browser session, desktop = cooldown across sessions
function isDismissed(isMobile: boolean): boolean {
  if (isMobile) return !!sessionStorage.getItem(DISMISS_KEY)
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const daysAgo = (Date.now() - Number(dismissed)) / 86_400_000
  return daysAgo < DISMISS_DAYS
}

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

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)
    const isMobile = isIos || isAndroid

    if (isDismissed(isMobile)) return

    const cleanupFns: Array<() => void> = []

    // Wait until shortly after onboarding before revealing the prompt
    function whenReady(cb: () => void) {
      if (localStorage.getItem(READY_KEY) === '1') {
        cb()
        return
      }
      const handler = () => cb()
      window.addEventListener(READY_EVENT, handler, { once: true })
      cleanupFns.push(() => window.removeEventListener(READY_EVENT, handler))
    }

    function reveal() {
      whenReady(() => {
        const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
        cleanupFns.push(() => clearTimeout(timer))
      })
    }

    if (isIos) {
      // iOS Safari: show manual instructions
      const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
      if (isSafari) {
        setPlatform('ios')
        reveal()
      }
    } else {
      // Android & Desktop: wait for beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault()
        // Chrome may re-fire this event later in the session; respect a dismiss in the meantime
        if (isDismissed(isMobile)) return
        setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
        setPlatform('android')
        reveal()
      }
      window.addEventListener('beforeinstallprompt', handler)
      cleanupFns.push(() => window.removeEventListener('beforeinstallprompt', handler))
    }

    return () => cleanupFns.forEach((fn) => fn())
  }, [])

  function dismiss() {
    setVisible(false)
    const ua = navigator.userAgent
    const isMobile = /iphone|ipad|ipod|android/i.test(ua)
    if (isMobile) {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
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
            <img src="/icons/icon-192.png" alt="Cramo Learning" className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Cramo Learning</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platform === 'ios'
                ? 'Zum Startbildschirm hinzufügen'
                : 'Als App installieren, ohne App Store'}
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
