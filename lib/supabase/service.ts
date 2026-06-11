import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-Role Client: nur fuer Server-Code, der ohne eingeloggten User
// auf beliebige profiles-Zeilen schreiben muss (z.B. Stripe-Webhooks).
// Bypassed RLS -- niemals an den Browser durchreichen.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
