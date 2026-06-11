-- Stripe Billing: Self-Serve-Abos fuer basic_plus/premium/ultra
--
-- Bisher liefen Plan-Upgrades ausschliesslich ueber Invite-Codes
-- (redeem_invite_code), die profiles.plan dauerhaft ueberschreiben.
-- Mit echtem Payment kommt eine zweite, persistente "Wahrheit" dazu:
-- der via Stripe-Subscription bezahlte Plan.
--
-- Modell: profiles.base_plan = der Plan, fuer den der User aktuell
-- bezahlt (oder 'basic' ohne aktive Subscription). profiles.plan = der
-- *effektive* Plan (zaehlt fuer Credits/Features). Ein zeitlich
-- begrenzter Invite-Code setzt nur `plan` + `plan_expires_at`, laesst
-- `base_plan` unangetastet -- nach Ablauf faellt der User auf seinen
-- bezahlten base_plan zurueck (nicht auf 'basic'), siehe
-- reset_expired_credits().
--
-- Bestandsdaten: base_plan wird auf den aktuellen plan gesetzt -- ein
-- bisher per (dauerhaftem) Invite-Code gewaehrter Plan gilt also als
-- "Basis" ohne Ablaufdatum, wie bisher.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS base_plan TEXT NOT NULL DEFAULT 'basic'
    CHECK (base_plan IN ('basic','basic_plus','premium','ultra')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

UPDATE public.profiles SET base_plan = plan;

-- Stripe Price IDs pro Plan (basic bleibt NULL -- kein Checkout)
ALTER TABLE public.plan_config
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Zeitlich begrenzte Invite-Codes (z.B. "2 Monate Ultra testen")
ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS duration_months INTEGER CHECK (duration_months IS NULL OR duration_months > 0);

-- profiles_with_credits: neue Felder fuer Frontend (Account-Seite, Plan-Overview)
-- DROP statt CREATE OR REPLACE, da neue Spalten vor bestehenden eingefuegt
-- werden und Postgres die Spaltenreihenfolge eines View nicht per REPLACE
-- aendern kann (keine anderen Views/Funktionen haengen von dieser View ab).
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

-- redeem_invite_code: unterstuetzt jetzt zeitlich begrenzte Codes.
-- duration_months IS NULL  -> dauerhaft, wird neuer base_plan (wie bisher)
-- duration_months gesetzt  -> temporaerer Boost ueber dem base_plan,
--                              faellt nach Ablauf automatisch zurueck
DROP FUNCTION IF EXISTS public.redeem_invite_code(TEXT);

CREATE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS TABLE(plan TEXT, credits INTEGER, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invite_codes%ROWTYPE;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_invite
  FROM public.invite_codes
  WHERE code = p_code AND used_by IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_expires := CASE WHEN v_invite.duration_months IS NOT NULL
    THEN NOW() + (v_invite.duration_months || ' months')::INTERVAL
    ELSE NULL END;

  UPDATE public.profiles
  SET plan = v_invite.plan,
      base_plan = CASE WHEN v_invite.duration_months IS NULL THEN v_invite.plan ELSE base_plan END,
      credits_total = v_invite.credits,
      credits_used = 0,
      credits_reset_at = NOW(),
      plan_expires_at = v_expires
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.invite_codes
  SET used_by = auth.uid(), used_at = NOW()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.plan, v_invite.credits, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;

-- reset_expired_credits: zusaetzlich zum monatlichen Credit-Reset jetzt
-- auch Rueckfall auf base_plan, wenn ein zeitlich begrenzter
-- Invite-Code-Boost (plan_expires_at) abgelaufen ist.
CREATE OR REPLACE FUNCTION public.reset_expired_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_next TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id, credits_reset_at FROM public.profiles WHERE credits_reset_at <= NOW()
  LOOP
    v_next := v_row.credits_reset_at;
    WHILE v_next <= NOW() LOOP
      v_next := v_next + INTERVAL '1 month';
    END LOOP;

    UPDATE public.profiles
    SET credits_used = 0, credits_reset_at = v_next
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  -- Abgelaufene zeitlich begrenzte Plan-Boosts zuruecksetzen
  UPDATE public.profiles p
  SET plan = p.base_plan,
      credits_total = COALESCE((SELECT pc.credits FROM public.plan_config pc WHERE pc.plan = p.base_plan), p.credits_total),
      credits_used = 0,
      credits_reset_at = NOW(),
      plan_expires_at = NULL
  WHERE p.plan_expires_at IS NOT NULL AND p.plan_expires_at <= NOW();

  RETURN v_count;
END;
$$;

-- apply_stripe_subscription: neue/geaenderte Subscription (checkout.session.completed,
-- customer.subscription.updated). Aktualisiert immer base_plan + Stripe-IDs;
-- den effektiven `plan` nur, wenn kein zeitlich begrenzter Invite-Code-Boost
-- aktiv ist (sonst bleibt der Boost bis zum Ablauf bestehen).
CREATE OR REPLACE FUNCTION public.apply_stripe_subscription(
  p_user_id UUID,
  p_plan TEXT,
  p_credits INTEGER,
  p_customer_id TEXT,
  p_subscription_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET base_plan = p_plan,
      stripe_customer_id = p_customer_id,
      stripe_subscription_id = p_subscription_id,
      plan = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN p_plan ELSE plan END,
      credits_total = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN p_credits ELSE credits_total END,
      credits_used = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN 0 ELSE credits_used END,
      credits_reset_at = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN NOW() ELSE credits_reset_at END
  WHERE id = p_user_id;
END;
$$;

-- cancel_stripe_subscription: Subscription gekuendigt/abgelaufen
-- (customer.subscription.deleted). base_plan faellt auf 'basic' zurueck;
-- effektiver `plan` nur, wenn kein Invite-Code-Boost aktiv ist.
CREATE OR REPLACE FUNCTION public.cancel_stripe_subscription(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_basic_credits INTEGER;
BEGIN
  SELECT credits INTO v_basic_credits FROM public.plan_config WHERE plan = 'basic';

  UPDATE public.profiles
  SET base_plan = 'basic',
      stripe_subscription_id = NULL,
      plan = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN 'basic' ELSE plan END,
      credits_total = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN COALESCE(v_basic_credits, 50) ELSE credits_total END,
      credits_used = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN 0 ELSE credits_used END,
      credits_reset_at = CASE WHEN plan_expires_at IS NULL OR plan_expires_at <= NOW() THEN NOW() ELSE credits_reset_at END
  WHERE id = p_user_id;
END;
$$;

-- renew_stripe_credits: monatliche Verlaengerung (invoice.paid). Setzt den
-- Credits-Zaehler fuer den naechsten Abrechnungszyklus zurueck -- nur wenn
-- kein Invite-Code-Boost aktiv ist (der hat seinen eigenen Reset-Zyklus).
CREATE OR REPLACE FUNCTION public.renew_stripe_credits(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_used = 0, credits_reset_at = NOW()
  WHERE id = p_user_id AND (plan_expires_at IS NULL OR plan_expires_at <= NOW());
END;
$$;
