import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPanel } from '@/components/admin/admin-panel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/kurse')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/kurse')

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Verwaltung</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Admin-Panel</h1>
      </div>
      <AdminPanel />
    </div>
  )
}
