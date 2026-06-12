'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Copy, Wallet, Ban, ShieldOff, Trash2, XCircle } from 'lucide-react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditDonut } from '@/components/admin/credit-donut'
import { PlanBadge } from '@/components/plan-badge'
import { PLAN_ORDER, DEFAULT_PLAN_CONFIG, type PlanConfig } from '@/lib/plans'
import { getDisplayModelName } from '@/lib/model-names'
import type { Plan, InviteCode } from '@/lib/types'

interface AdminUser {
  id: string
  email: string | null
  plan: Plan
  credits_total: number
  credits_used: number
  created_at: string
  is_admin: boolean
  is_blocked: boolean
  stripe_subscription_id: string | null
  stripe_cancel_at: string | null
}

interface AdminInviteCode extends InviteCode {
  used_by_email: string | null
}

interface CostOverviewRow {
  feature: string
  model: string
  calls: number
  avgCostUsd: number
  avgCredits: number
  minCostUsd: number
  maxCostUsd: number
}

interface CostOverviewData {
  overview: CostOverviewRow[]
  pricing: Record<string, { input: number; output: number }>
}

interface PlanConfigForm {
  credits: string
  price_chf: string
  description: string
  stripe_price_id: string
}

function configToForm(config: PlanConfig): Record<Plan, PlanConfigForm> {
  return Object.fromEntries(
    PLAN_ORDER.map((p) => [
      p,
      {
        credits: String(config[p].credits),
        price_chf: config[p].price_chf === null ? '' : String(config[p].price_chf),
        description: config[p].description,
        stripe_price_id: config[p].stripe_price_id ?? '',
      },
    ])
  ) as Record<Plan, PlanConfigForm>
}

const FEATURE_LABELS: Record<string, string> = {
  generieren: 'Karten generieren',
  prescan: 'PDF-Prescan',
  quiz: 'Quiz',
  schriftlich: 'Schriftliche Antwort',
  tutor: 'Tutor-Chat',
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

  // Nutzer-Aktionen (sperren, Abo kuendigen, loeschen)
  const [actingUserId, setActingUserId] = useState<string | null>(null)

  // Invite code form
  const [newCodePlan, setNewCodePlan] = useState<Exclude<Plan, 'basic'>>('basic_plus')
  const [newCodeCredits, setNewCodeCredits] = useState('')
  const [newCodeDuration, setNewCodeDuration] = useState<string>('permanent')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [latestCode, setLatestCode] = useState<string | null>(null)

  // Pricing tab
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG)
  const [planForm, setPlanForm] = useState<Record<Plan, PlanConfigForm>>(configToForm(DEFAULT_PLAN_CONFIG))
  const [loadingPlanConfig, setLoadingPlanConfig] = useState(true)
  const [savingPlan, setSavingPlan] = useState<Plan | null>(null)
  const [costOverview, setCostOverview] = useState<CostOverviewData | null>(null)
  const [loadingCostOverview, setLoadingCostOverview] = useState(true)

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

  const loadPlanConfig = useCallback(async () => {
    setLoadingPlanConfig(true)
    try {
      const res = await fetch('/api/admin/plan-config')
      if (!res.ok) { toast.error('Pricing konnte nicht geladen werden'); return }
      const data = await res.json() as PlanConfig
      setPlanConfig(data)
      setPlanForm(configToForm(data))
    } finally {
      setLoadingPlanConfig(false)
    }
  }, [])

  const loadCostOverview = useCallback(async () => {
    setLoadingCostOverview(true)
    try {
      const res = await fetch('/api/admin/cost-overview')
      if (!res.ok) { toast.error('Kostenübersicht konnte nicht geladen werden'); return }
      setCostOverview(await res.json())
    } finally {
      setLoadingCostOverview(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { loadCodes() }, [loadCodes])
  useEffect(() => { loadPlanConfig() }, [loadPlanConfig])
  useEffect(() => { loadCostOverview() }, [loadCostOverview])

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

  async function handleToggleBlock(targetUser: AdminUser) {
    setActingUserId(targetUser.id)
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/block`, { method: 'POST' })
      const data = await res.json() as { is_blocked?: boolean; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Aktion fehlgeschlagen'); return }
      toast.success(data.is_blocked ? 'Nutzer gesperrt' : 'Nutzer entsperrt')
      await loadUsers()
    } finally {
      setActingUserId(null)
    }
  }

  async function handleCancelSubscription(targetUser: AdminUser) {
    setActingUserId(targetUser.id)
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/cancel-subscription`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Abo konnte nicht gekündigt werden'); return }
      toast.success('Abo gekündigt — läuft bis Ende der Periode')
      await loadUsers()
    } finally {
      setActingUserId(null)
    }
  }

  async function handleDeleteUser(targetUser: AdminUser) {
    setActingUserId(targetUser.id)
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, { method: 'DELETE' })
      const data = await res.json() as { error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Account konnte nicht gelöscht werden'); return }
      toast.success('Account gelöscht')
      await loadUsers()
    } finally {
      setActingUserId(null)
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true)
    try {
      const body: { plan: Exclude<Plan, 'basic'>; credits?: number; duration_months?: number } = { plan: newCodePlan }
      if (newCodeCredits.trim()) {
        const value = Number(newCodeCredits)
        if (!Number.isInteger(value) || value <= 0) {
          toast.error('Credits müssen eine positive Ganzzahl sein')
          return
        }
        body.credits = value
      }
      if (newCodeDuration !== 'permanent') {
        body.duration_months = Number(newCodeDuration)
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

  function setPlanField(plan: Plan, field: keyof PlanConfigForm, value: string) {
    setPlanForm((prev) => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }))
  }

  async function handleSavePlan(plan: Plan) {
    const form = planForm[plan]
    const credits = Number(form.credits)
    if (!Number.isInteger(credits) || credits < 0) {
      toast.error('Credits müssen eine positive Ganzzahl sein')
      return
    }
    let price_chf: number | null = null
    if (form.price_chf.trim()) {
      const value = Number(form.price_chf)
      if (!Number.isFinite(value) || value < 0) {
        toast.error('Preis muss eine positive Zahl sein (oder leer für kostenlos)')
        return
      }
      price_chf = value
    }
    if (!form.description.trim()) {
      toast.error('Beschreibung darf nicht leer sein')
      return
    }

    setSavingPlan(plan)
    try {
      const res = await fetch('/api/admin/plan-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          credits,
          price_chf,
          description: form.description.trim(),
          stripe_price_id: form.stripe_price_id.trim() || null,
        }),
      })
      if (!res.ok) { toast.error('Speichern fehlgeschlagen'); return }
      const data = await res.json() as PlanConfig
      setPlanConfig(data)
      setPlanForm(configToForm(data))
      toast.success('Pricing aktualisiert')
    } finally {
      setSavingPlan(null)
    }
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
        <TabsTrigger value="pricing" className="rounded-md px-3 text-xs h-7 data-[state=active]:bg-card data-[state=active]:shadow-sm">
          Pricing
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
            <div className="overflow-x-auto">
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
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {u.email ?? '—'}
                        {u.is_admin && <Badge variant="secondary">Admin</Badge>}
                        {u.is_blocked && <Badge variant="destructive">Gesperrt</Badge>}
                        {u.stripe_cancel_at && <Badge variant="outline">Gekündigt</Badge>}
                      </div>
                    </td>
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
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setCreditDialogUser(u); setCreditsToAdd('') }}
                        >
                          <Wallet className="h-3 w-3 mr-1.5" />
                          Credits
                        </Button>

                        {!u.is_admin && (
                          <>
                            {u.stripe_subscription_id && !u.stripe_cancel_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={actingUserId === u.id}
                                onClick={() => handleCancelSubscription(u)}
                              >
                                {actingUserId === u.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <XCircle className="h-3 w-3 mr-1.5" />}
                                Abo kündigen
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={actingUserId === u.id}
                              onClick={() => handleToggleBlock(u)}
                            >
                              {actingUserId === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                              ) : u.is_blocked ? (
                                <ShieldOff className="h-3 w-3 mr-1.5" />
                              ) : (
                                <Ban className="h-3 w-3 mr-1.5" />
                              )}
                              {u.is_blocked ? 'Entsperren' : 'Sperren'}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={actingUserId === u.id}>
                                  <Trash2 className="h-3 w-3 mr-1.5" />
                                  Löschen
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {u.email ?? 'Dieser Account'} sowie alle Kurse, Karten und der Lernfortschritt
                                    werden unwiderruflich gelöscht. Ein bestehendes Stripe-Abo wird ebenfalls gekündigt.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(u)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Account löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
                <SelectItem value="basic_plus">Basic+ ({planConfig.basic_plus.credits} Credits)</SelectItem>
                <SelectItem value="premium">Premium ({planConfig.premium.credits} Credits)</SelectItem>
                <SelectItem value="ultra">Ultra ({planConfig.ultra.credits} Credits)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newCodeDuration} onValueChange={setNewCodeDuration}>
              <SelectTrigger className="w-full sm:w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="1">1 Monat</SelectItem>
                <SelectItem value="2">2 Monate</SelectItem>
                <SelectItem value="3">3 Monate</SelectItem>
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
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Plan</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Credits</th>
                  <th className="px-4 py-2.5 font-semibold">Dauer</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expiresAt = c.used_at && c.duration_months
                    ? new Date(new Date(c.used_at).setMonth(new Date(c.used_at).getMonth() + c.duration_months))
                    : null
                  return (
                    <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono tracking-widest">{c.code}</td>
                      <td className="px-4 py-2.5">
                        <PlanBadge plan={c.plan} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.credits}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {c.duration_months ? `${c.duration_months} Monate${expiresAt ? ` (bis ${fmtDate(expiresAt.toISOString())})` : ''}` : 'permanent'}
                      </td>
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
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ------------------------------ Pricing ------------------------------ */}
      <TabsContent value="pricing" className="mt-6 space-y-6">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Pläne & Preise</p>
          {loadingPlanConfig ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Lade Pricing…</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    <th className="px-4 py-2.5 font-semibold">Plan</th>
                    <th className="px-4 py-2.5 font-semibold">Credits / Monat</th>
                    <th className="px-4 py-2.5 font-semibold">Preis (CHF)</th>
                    <th className="px-4 py-2.5 font-semibold">Beschreibung</th>
                    <th className="px-4 py-2.5 font-semibold">Stripe Price ID</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ORDER.map((p) => (
                    <tr key={p} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <PlanBadge plan={p} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={0}
                          value={planForm[p].credits}
                          onChange={(e) => setPlanField(p, 'credits', e.target.value)}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.10"
                          placeholder="kostenlos"
                          value={planForm[p].price_chf}
                          onChange={(e) => setPlanField(p, 'price_chf', e.target.value)}
                          className="h-8 w-28"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          value={planForm[p].description}
                          onChange={(e) => setPlanField(p, 'description', e.target.value)}
                          className="h-8 min-w-56"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          value={planForm[p].stripe_price_id}
                          onChange={(e) => setPlanField(p, 'stripe_price_id', e.target.value)}
                          placeholder={p === 'basic' ? '—' : 'price_...'}
                          disabled={p === 'basic'}
                          className="h-8 min-w-44 font-mono text-xs"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleSavePlan(p)}
                          disabled={savingPlan === p}
                        >
                          {savingPlan === p ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                          Speichern
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Kosten pro AI-Aktion</p>
          {loadingCostOverview ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Lade Kostenübersicht…</span>
            </div>
          ) : !costOverview || costOverview.overview.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Noch keine API-Aufrufe erfasst.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    <th className="px-4 py-2.5 font-semibold">Feature</th>
                    <th className="px-4 py-2.5 font-semibold">Modell</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Calls</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Ø Credits / Aktion</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Range (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {costOverview.overview.map((row) => (
                    <tr key={`${row.feature}::${row.model}`} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">{FEATURE_LABELS[row.feature] ?? row.feature}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{getDisplayModelName(row.model)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.calls}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{row.avgCredits.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        ${row.minCostUsd.toFixed(4)} – ${row.maxCostUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {costOverview && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Token-Preise (Referenz)</p>
            <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    <th className="px-4 py-2.5 font-semibold">Modell</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Input ($/1M Tokens)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Output ($/1M Tokens)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(costOverview.pricing).map(([model, p]) => (
                    <tr key={model} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">{getDisplayModelName(model)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${p.input.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${p.output.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
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
