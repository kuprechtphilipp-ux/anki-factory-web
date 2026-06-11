-- Credits-Tracking: credits_used aus api_usage ableiten statt separat zu zaehlen
--
-- Bisher wurde profiles.credits_used bei jedem Claude-Call separat per
-- increment_credits_used()-RPC hochgezaehlt -- ein zweiter Schreibvorgang
-- neben dem api_usage-Insert. Schlaegt einer der beiden fehl (Netzwerk,
-- Fehler), laufen api_usage und profiles.credits_used dauerhaft auseinander
-- (beobachtete Diskrepanz: credits_used ~29 vs. tatsaechliche
-- api_usage-Summe ~63).
--
-- Neu: profiles_with_credits-View berechnet credits_used live aus
-- SUM(CEIL(cost_usd * 100)) ueber api_usage seit credits_reset_at.
-- api_usage ist damit die einzige Quelle der Wahrheit.

CREATE OR REPLACE VIEW public.profiles_with_credits
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.email,
  p.plan,
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

-- increment_credits_used() wird nicht mehr gebraucht -- credits_used ist
-- jetzt abgeleitet, kein separater Counter mehr.
DROP FUNCTION IF EXISTS public.increment_credits_used(UUID, INTEGER);
