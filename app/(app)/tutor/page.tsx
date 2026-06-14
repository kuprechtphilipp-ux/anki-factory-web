'use client'

import { useState, useEffect } from 'react'
import { Flame, BookOpen, HelpCircle, PartyPopper } from 'lucide-react'
import { CramoChat } from '@/components/cramo-chat'
import { CramoIcon } from '@/components/cramo-icon'

interface StreakData {
  streak: number
  learnedToday: boolean
  dueCount: number
}

export default function TutorPage() {
  const [streak, setStreak] = useState<StreakData | null>(null)

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then(setStreak)
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center gap-3">
        <CramoIcon alt="Cramo" className="h-12 w-12 rounded-full object-cover shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
          <p className="text-sm text-muted-foreground">Cramo hilft dir beim Büffeln, ganz sachlich oder mit vollem Charakter.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
        {/* Hilfe & Fragen */}
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-card p-4 sm:p-5 h-[32rem] lg:h-auto lg:min-h-[32rem]">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="font-semibold">Hilfe & Fragen</h2>
          </div>
          <CramoChat
            mode="help"
            introMessage="Was kann ich für dich tun? Frag mich zu deinem Lernstoff, einer Karte oder zur App."
            placeholder="Frag Cramo etwas..."
            className="flex-1 min-h-0"
          />
        </div>

        {/* Spaß mit Cramo */}
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-card p-4 sm:p-5 h-[32rem] lg:h-auto lg:min-h-[32rem]">
          <div className="flex items-center justify-between mb-3 shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <PartyPopper className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="font-semibold">Spaß mit Cramo</h2>
            </div>
            {streak && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {streak.streak} Tage Streak
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {streak.dueCount} fällig
                </span>
              </div>
            )}
          </div>
          <CramoChat
            mode="fun"
            introMessage="Na, schon wieder am Büffeln? Erzähl mir, was ansteht. Ich hab da auch ein paar Geschichten aus meinen besten Nächten auf Lager."
            placeholder="Schreib Cramo..."
            className="flex-1 min-h-0"
          />
        </div>
      </div>
    </div>
  )
}
