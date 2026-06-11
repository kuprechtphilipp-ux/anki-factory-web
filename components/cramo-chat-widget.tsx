'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CramoChat } from '@/components/cramo-chat'
import { cn } from '@/lib/utils'

export function CramoChatWidget() {
  const [open, setOpen] = useState(false)

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
            <img
              src="/icons/Cramo_Icons/Cramo_Ai-Chat_Icon.jpeg"
              alt="Cramo"
              className="h-9 w-9 rounded-full object-cover"
            />
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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg border border-border/50 overflow-hidden transition-transform hover:scale-105 active:scale-95',
          'right-4 bottom-[max(1rem,env(safe-area-inset-bottom))]'
        )}
        aria-label={open ? 'Cramo-Chat schließen' : 'Cramo-Chat öffnen'}
      >
        {open ? (
          <div className="flex h-full w-full items-center justify-center bg-card">
            <X className="h-5 w-5 text-foreground" />
          </div>
        ) : (
          <img
            src="/icons/Cramo_Icons/Cramo_Ai-Chat_Icon.jpeg"
            alt="Cramo-Chat öffnen"
            className="h-full w-full object-cover"
          />
        )}
      </button>
    </>
  )
}
