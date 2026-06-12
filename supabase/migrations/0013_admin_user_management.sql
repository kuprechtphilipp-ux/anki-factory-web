-- Admin-Funktionen: Nutzer sperren/entsperren, Abo kuendigen, Account loeschen.
--
-- is_blocked steuert zusaetzlich zum Supabase-Auth-Ban (verhindert neue
-- Logins/Sessions sofort) eine UI-sichtbare Markierung im Admin-Panel.

ALTER TABLE public.profiles ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.profiles_with_credits
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.email,
  p.plan,
  p.credits_total,
  p.credits_reset_at,
  p.is_admin,
  p.is_blocked,
  p.stripe_subscription_id,
  p.stripe_cancel_at,
  p.onboarding_completed,
  p.fachbereich,
  p.lernziel,
  p.lernfenster,
  p.created_at,
  COALESCE((
    SELECT SUM(CEIL(a.cost_usd * 100))
    FROM public.api_usage a
    WHERE a.user_id = p.id AND a.created_at >= p.credits_reset_at
  ), 0)::INTEGER AS credits_used
FROM public.profiles p;

GRANT SELECT ON public.profiles_with_credits TO authenticated;
