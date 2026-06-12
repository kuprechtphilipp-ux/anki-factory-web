-- Migration 0013 (admin_user_management) replaced profiles_with_credits but
-- accidentally dropped base_plan, plan_expires_at and stripe_customer_id,
-- which /api/profile selects. This broke /api/profile (500), making the
-- PlanBanner and other plan-dependent UI disappear. Restore them alongside
-- is_blocked.

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
  p.is_blocked,
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
