'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Plan } from '@/lib/types'

interface RedeemInviteCodeProps {
  redeemedCode: string | null
  onRedeemed: (plan: Plan, credits: number, expiresAt: string | null) => void
}

export function RedeemInviteCode({ redeemedCode, onRedeemed }: RedeemInviteCodeProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  if (redeemedCode) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm">
        <Ticket className="h-4 w-4 text-primary shrink-0" />
        <span className="text-muted-foreground">
          Code eingelöst: <span className="font-medium text-foreground">{redeemedCode}</span>
        </span>
      </div>
    )
  }

  async function handleRedeem() {
    const trimmed = code.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: trimmed })
      if (error || !data || data.length === 0) {
        toast.error('Code ungültig oder bereits verwendet')
        return
      }
      const result = data[0] as { plan: Plan; credits: number; expires_at: string | null }
      toast.success(`Code eingelöst — du bist jetzt auf Plan ${result.plan} mit ${result.credits} Credits`)
      setCode('')
      onRedeemed(result.plan, result.credits, result.expires_at)
    } catch {
      toast.error('Code ungültig oder bereits verwendet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Einladungscode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem() }}
        className="text-base md:text-sm"
        disabled={loading}
      />
      <Button onClick={handleRedeem} disabled={loading || !code.trim()} className="shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Einlösen'}
      </Button>
    </div>
  )
}
