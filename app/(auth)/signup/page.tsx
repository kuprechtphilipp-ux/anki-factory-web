'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const code = inviteCode.trim()
    let plan: string | null = null

    if (code) {
      const { data: inviteRows, error: inviteError } = await supabase.rpc('check_invite_code', { p_code: code })
      const invite = Array.isArray(inviteRows) ? inviteRows[0] : null
      if (inviteError || !invite) {
        toast.error('Code ungültig oder bereits verwendet')
        setLoading(false)
        return
      }
      plan = invite.plan
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(code ? { options: { data: { invite_code: code } } } : {}),
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      toast.success(
        plan
          ? `Account erstellt — Plan: ${plan}. Bitte bestätige deine E-Mail-Adresse, um dich anzumelden.`
          : 'Konto erstellt. Bitte bestätige deine E-Mail-Adresse, um dich anzumelden.'
      )
      setLoading(false)
      return
    }

    router.push('/kurse')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Registrieren</CardTitle>
        <CardDescription>Erstelle ein neues Konto.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Einladungscode (optional)</Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="z. B. ABC-123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konto erstellen
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Bereits ein Konto?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Anmelden
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
