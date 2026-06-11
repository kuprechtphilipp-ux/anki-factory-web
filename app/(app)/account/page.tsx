'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import { PlanOverview } from '@/components/plan-overview'
import { RedeemInviteCode } from '@/components/redeem-invite-code'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { LERNFENSTER_OPTIONS, type Lernfenster, type Plan } from '@/lib/types'

interface ProfileData {
  fachbereich: string | null
  lernziel: string | null
  lernfenster: Lernfenster | null
  onboarding_completed: boolean
  plan: Plan
  credits_total: number
  credits_used: number
  email: string | null
  redeemed_code: string | null
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card space-y-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailProvider, setIsEmailProvider] = useState(false)

  // Profil-Felder
  const [fachbereich, setFachbereich] = useState('')
  const [lernziel, setLernziel] = useState('')
  const [lernfenster, setLernfenster] = useState<Lernfenster | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Passwort
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Account löschen
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileData | null) => {
        if (!data) return
        setProfile(data)
        setFachbereich(data.fachbereich ?? '')
        setLernziel(data.lernziel ?? '')
        setLernfenster(data.lernfenster ?? null)
      })
      .finally(() => setLoading(false))

    supabase.auth.getUser().then(({ data }) => {
      setIsEmailProvider(data.user?.app_metadata?.provider === 'email')
    })
  }, [])

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fachbereich: fachbereich.trim() || null,
          lernziel: lernziel.trim() || null,
          lernfenster,
        }),
      })
      if (!res.ok) {
        toast.error('Konnte Angaben nicht speichern.')
        return
      }
      toast.success('Profil gespeichert')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein.')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error('Passwort konnte nicht geändert werden.')
        return
      }
      toast.success('Passwort geändert')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Account konnte nicht gelöscht werden.')
        return
      }
      await supabase.auth.signOut()
      router.push('/login')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 text-muted-foreground py-20 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Lade Account…</span>
      </div>
    )
  }

  if (!profile) {
    return <div className="py-12 text-sm text-muted-foreground">Account konnte nicht geladen werden.</div>
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Einstellungen</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Account &amp; Profil</h1>
      </div>

      <Card title="Profil">
        <div className="space-y-1.5">
          <Label>E-Mail</Label>
          <Input value={profile.email ?? ''} readOnly disabled className="bg-muted/40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fachbereich">Fachbereich / Studienfach</Label>
          <Input
            id="fachbereich"
            placeholder="z. B. Betriebswirtschaft"
            value={fachbereich}
            onChange={(e) => setFachbereich(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lernziel">Was ist gerade dein wichtigstes Lernziel?</Label>
          <Input
            id="lernziel"
            placeholder="z. B. Prüfung in Statistik bestehen"
            value={lernziel}
            onChange={(e) => setLernziel(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Wie ist dein Lernfenster gerade?</Label>
          <div className="grid grid-cols-3 gap-2">
            {LERNFENSTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLernfenster(opt.value)}
                className={cn(
                  'rounded-lg border-2 px-2 py-2.5 text-xs font-medium text-center transition-all',
                  lernfenster === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Diese Angaben beeinflussen nur, wie Cramo mit dir spricht — nicht, wie deine Karteikarten erstellt werden.
        </p>
        <Button onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
        </Button>
      </Card>

      <Card title="Plan & Credits">
        <PlanOverview plan={profile.plan} />
        <p className="text-sm text-muted-foreground">
          {profile.credits_used} / {profile.credits_total} Credits verbraucht
        </p>
        <Separator />
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Einladungscode
          </p>
          <RedeemInviteCode
            redeemedCode={profile.redeemed_code}
            onRedeemed={(plan, credits) => {
              setProfile((prev) => prev ? { ...prev, plan, credits_total: credits, credits_used: 0, redeemed_code: prev.redeemed_code } : prev)
              fetch('/api/profile')
                .then((r) => (r.ok ? r.json() : null))
                .then((data: ProfileData | null) => { if (data) setProfile(data) })
                .catch(() => {})
            }}
          />
        </div>
      </Card>

      <Card title="Sicherheit">
        {isEmailProvider ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mind. 8 Zeichen"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Passwort ändern'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Du bist über Google angemeldet.</p>
        )}
      </Card>

      <Card title="Account löschen">
        <p className="text-sm text-muted-foreground">
          Löscht deinen Account und alle zugehörigen Daten unwiderruflich.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Account löschen</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Kurse, Karten und dein
                Lernfortschritt werden dauerhaft gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Account löschen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  )
}
