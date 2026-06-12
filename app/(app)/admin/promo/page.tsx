import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PromoPreview } from '@/components/admin/promo-preview'

export default async function PromoPage() {
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
    <div className="max-w-5xl space-y-8 animate-fade-in">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Marketing</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Social-Media Vorschau</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mockup für LinkedIn & WhatsApp – nicht öffentlich verlinkt.
        </p>
      </div>
      <PromoPreview />
    </div>
  )
}
