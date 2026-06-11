-- Monatlicher Credits-Reset pro User
--
-- Jeder User bekommt eine eigene "Reset-Uhr" (credits_reset_at), die bei
-- Signup mit NOW() startet und bei jeder Code-Einloesung neu gestartet wird.
-- Ein taeglicher pg_cron-Job prueft alle Profile, deren credits_reset_at
-- in der Vergangenheit liegt, setzt credits_used auf 0 und springt das
-- Reset-Datum (in 1-Monats-Schritten, falls der User laenger inaktiv war)
-- auf den naechsten Termin in der Zukunft.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

  RETURN v_count;
END;
$$;

-- redeem_invite_code: Code-Einloesung startet die Reset-Uhr ebenfalls neu,
-- damit der User die vollen frischen Credits einen Monat lang behaelt.
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
  SET plan = v_invite.plan, credits_total = v_invite.credits, credits_used = 0, credits_reset_at = NOW()
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

-- pg_cron: taeglich um 03:00 UTC den Reset-Job laufen lassen
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'reset-expired-credits',
  '0 3 * * *',
  $$ SELECT public.reset_expired_credits(); $$
);
