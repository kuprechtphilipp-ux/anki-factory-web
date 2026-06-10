'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Copy, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditDonut } from '@/components/admin/credit-donut'
import { PlanBadge } from '@/components/plan-badge'
import type { Plan, InviteCode } from '@/lib/types'

interface AdminUser {
  id: string
  email: string | null
  plan: Plan
  credits_total: number
  credits_used: number
  created_at: string
}

interface AdminInviteCode extends InviteCode {
  used_by_email: string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [codes, setCodes] = useState<AdminInviteCode[] | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingCodes, setLoadingCodes] = useState(true)

  // Credit dialog
  const [creditDialogUser, setCreditDialogUser] = useState<AdminUser | null>(null)
  const [creditsToAdd, setCreditsToAdd] = useState('')
  const [savingCredits, setSavingCredits] = useState(false)

  // Invite code form
  const [newCodePlan, setNewCodePlan] = useState<Exclude<Plan, 'basic'>>('basic_plus')
  const [newCodeCredits, setNewCodeCredits] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [latestCode, setLatestCode] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) { toast.error('Nutzer konnten nicht geladen werden'); return }
      setUsers(await res.json())
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const loadCodes = useCallback(async () => {
    setLoadingCodes(true)
    try {
      const res = await fetch('/api/admin/invite-codes')
      if (!res.ok) { toast.error('Invite-Codes konnten nicht geladen werden'); return }
      setCodes(await res.json())
    } finally {
      setLoadingCodes(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { loadCodes() }, [loadCodes])

  async function handleAddCredits() {
    if (!creditDialogUser) return
    const value = Number(creditsToAdd)
    if (!Number.isInteger(value) || value <= 0) {
      toast.error('Bitte eine positive Ganzzahl eingeben')
      return
    }
    setSavingCredits(true)
    try {
      const res = await fetch(`/api/admin/users/${creditDialogUser.id}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditsToAdd: value }),
      })
      if (!res.ok) { toast.error('Aufladen fehlgeschlagen'); return }
      toast.success(`${value} Credits aufgeladen`)
      setCreditDialogUser(null)
      setCreditsToAdd('')
      await loadUsers()
    } finally {
      setSavingCredits(false)
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true)
    try {
      const body: { plan: Exclude<Plan, 'basic'>; credits?: number } = { plan: newCodePlan }
      if (newCodeCredits.trim()) {
        const value = Number(newCodeCredits)
        if (!Number.isInteger(value) || value <= 0) {
          toast.error('Credits müssen eine positive Ganzzahl sein')
          return
        }
        body.credits = value
      }
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Code konnte nicht generiert werden'); return }
      const created = await res.json() as InviteCode
      setLatestCode(created.code)
      setNewCodeCredits('')
      await loadCodes()
    } finally {
      setGeneratingCode(false)
    }
  }

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    toast.success('Code kopiert')
  }

  return (
    <Tabs defaultValue="nutzer">
      <TabsList className="h-9 rounded-lg bg-muted p-1 gap-0.5 mb-0 inline-flex w-auto">
        <TabsTrigger value="nutzer" className="rounded-md px-3 text-xs h-7 data-[state=active]:bg-card data-[state=active]:shadow-sm">
          Nutzer
        </TabsTrigger>
        <TabsTrigger value="invites" className="rounded-md px-3 text-xs h-7 data-[state=active]:bg-card data-[state=active]:shadow-sm">
          Invite-Codes
        </TabsTrigger>
      </TabsList>

      {/* ------------------------------ Nutzer ------------------------------ */}
      <TabsContent value="nutzer" className="mt-6 space-y-3">
        {loadingUsers ? (
          <div className="flex items-center gap-2.5 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Lade Nutzer…</span>
          </div>
        ) : !users || users.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Keine Nutzer gefunden.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Plan</th>
                  <th className="px-4 py-2.5 font-semibold">Credits</th>
                  <th className="px-4 py-2.5 font-semibold">Seit</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">{u.email ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <CreditDonut used={u.credits_used} total={u.credits_total} />
                        <span className="tabular-nums text-muted-foreground">
                          {u.credits_used} / {u.credits_total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setCreditDialogUser(u); setCreditsToAdd('') }}
                      >
                        <Wallet className="h-3 w-3 mr-1.5" />
                        Credits aufladen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* --------------------------- Invite-Codes ---------------------------- */}
      <TabsContent value="invites" className="mt-6 space-y-6">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Neuen Code generieren</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={newCodePlan} onValueChange={(v) => setNewCodePlan(v as Exclude<Plan, 'basic'>)}>
              <SelectTrigger className="w-full sm:w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic_plus">Basic+ (100 Credits)</SelectItem>
                <SelectItem value="premium">Premium (300 Credits)</SelectItem>
                <SelectItem value="ultra">Ultra (500 Credits)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              placeholder="Credits (optional, überschreibt Standard)"
              value={newCodeCredits}
              onChange={(e) => setNewCodeCredits(e.target.value)}
              className="h-9 sm:max-w-72"
            />
            <Button onClick={handleGenerateCode} disabled={generatingCode} className="h-9">
              {generatingCode ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Code generieren
            </Button>
          </div>

          {latestCode && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 animate-fade-in">
              <span className="font-mono text-lg font-semibold tracking-widest">{latestCode}</span>
              <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={() => handleCopyCode(latestCode)}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Kopieren
              </Button>
            </div>
          )}
        </div>

        {loadingCodes ? (
          <div className="flex items-center gap-2.5 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Lade Invite-Codes…</span>
          </div>
        ) : !codes || codes.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Noch keine Invite-Codes erstellt.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Plan</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Credits</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono tracking-widest">{c.code}</td>
                    <td className="px-4 py-2.5">
                      <PlanBadge plan={c.plan} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.credits}</td>
                    <td className="px-4 py-2.5">
                      {c.used_by ? (
                        <Badge variant="secondary">
                          eingelöst von {c.used_by_email ?? c.used_by} am {c.used_at ? fmtDate(c.used_at) : '—'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">offen</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* ----------------------------- Dialog -------------------------------- */}
      <Dialog open={!!creditDialogUser} onOpenChange={(o) => { if (!o) setCreditDialogUser(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Credits aufladen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {creditDialogUser?.email ?? 'Nutzer'} — aktuell {creditDialogUser?.credits_total ?? 0} Credits
            </p>
            <Input
              type="number"
              min={1}
              placeholder="Credits hinzufügen"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogUser(null)}>Abbrechen</Button>
            <Button onClick={handleAddCredits} disabled={savingCredits}>
              {savingCredits ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Aufladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
