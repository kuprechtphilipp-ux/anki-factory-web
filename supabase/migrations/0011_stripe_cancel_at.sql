-- Stripe Billing: geplante Kuendigung sichtbar machen
--
-- profiles.stripe_cancel_at speichert das Datum, zu dem ein gekuendigtes
-- Abo ausläuft (Stripe subscription.cancel_at). Wird vom Webhook
-- (customer.subscription.updated) synchron gehalten -- sowohl beim
-- Kuendigen als auch beim Reaktivieren ueber das Stripe-Portal.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_cancel_at TIMESTAMPTZ;

DROP VIEW IF EXISTS public.profiles_with_credits;

CREATE VIEW public.profiles_with_credits
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.email,
  p.plan,
  p.base_plan,
  p.plan_expires_at,
  p.stripe_customer_id,
  p.stripe_subscription_id,
  p.stripe_cancel_at,
  p.credits_total,
  p.credits_reset_at,
  p.is_admin,
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
