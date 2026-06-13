-- Fix: "Credits verbraucht" zeigte immer 0, egal wie viel tatsächlich
-- verbraucht wurde.
--
-- profiles_with_credits berechnete credits_used als
--   SUM(api_usage.cost) WHERE api_usage.created_at >= profiles.credits_reset_at
--
-- credits_reset_at ist aber das naechste (zukuenftige) Reset-Datum
-- (Periodenende), nicht der Periodenbeginn. Die Bedingung
-- "created_at >= credits_reset_at" ist daher fuer die aktuelle Periode
-- praktisch immer leer -> credits_used = 0.
--
-- Neue Spalte credits_period_start markiert den tatsaechlichen Beginn der
-- aktuellen Abrechnungsperiode und wird bei jedem Reset (cron) bzw. bei
-- Code-Einloesung auf NOW() gesetzt. credits_used wird ab jetzt relativ zu
-- credits_period_start berechnet.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: Periodenbeginn = (naechstes Reset-Datum) - 1 Monat
UPDATE public.profiles
SET credits_period_start = credits_reset_at - INTERVAL '1 month';

-- reset_expired_credits: zusaetzlich credits_period_start = NOW() setzen
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
    SET credits_used = 0, credits_reset_at = v_next, credits_period_start = NOW()
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- redeem_invite_code: Periodenbeginn ebenfalls neu starten
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS TABLE(plan TEXT, credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.invite_codes
  WHERE code = p_code AND used_by IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET plan = v_invite.plan, credits_total = v_invite.credits, credits_used = 0,
      credits_reset_at = NOW() + INTERVAL '1 month', credits_period_start = NOW()
  WHERE id = auth.uid() AND profiles.plan = 'basic';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.invite_codes
  SET used_by = auth.uid(), used_at = NOW()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.plan, v_invite.credits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;

-- profiles_with_credits: credits_used relativ zu credits_period_start
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
  p.credits_period_start,
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
    WHERE a.user_id = p.id AND a.created_at >= p.credits_period_start
  ), 0)::INTEGER AS credits_used
FROM public.profiles p;

GRANT SELECT ON public.profiles_with_credits TO authenticated;
