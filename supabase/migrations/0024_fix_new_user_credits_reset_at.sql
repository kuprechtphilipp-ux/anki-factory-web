-- Bugfix: credits_reset_at bekam bei der Profil-Erstellung (handle_new_user)
-- keinen expliziten Wert und fiel damit auf den Spalten-Default DEFAULT NOW()
-- zurueck -- also den Signup-Zeitpunkt statt "Signup + 1 Monat".
--
-- Folge: Der taegliche pg_cron-Job reset_expired_credits() (laeuft 03:00 UTC,
-- siehe 0006_credits_monthly_reset.sql) sah "credits_reset_at <= NOW()" fuer
-- JEDEN frisch registrierten User bereits am naechsten Tag als erfuellt an
-- und setzte credits_used faelschlich auf 0 -- typischerweise binnen
-- 12-36 Stunden nach Signup, statt nach einem Monat. Beobachtet bei zwei
-- Testern (mistermrcc027@gmail.com, fabrizio.kaufmann@gmail.com), die nach
-- < 1 Tag wieder "0 / 50 Credits" zeigten, obwohl sie schon Credits
-- verbraucht hatten. Kein Sicherheitsproblem, kein Account-Loeschen/Neuanlegen
-- -- reines Datums-Bug. Der Fehler tritt pro User nur einmal auf (danach ist
-- credits_reset_at korrekt auf den naechsten Monat vorgerueckt), behebt sich
-- also nicht von selbst fuer kuenftige Signups, ohne diesen Fix.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_invite public.invite_codes%ROWTYPE;
  v_found BOOLEAN := false;
BEGIN
  v_code := NEW.raw_user_meta_data->>'invite_code';

  IF v_code IS NOT NULL THEN
    SELECT * INTO v_invite
    FROM public.invite_codes
    WHERE code = v_code AND used_by IS NULL
    FOR UPDATE;
    v_found := FOUND;
  END IF;

  IF v_found THEN
    INSERT INTO public.profiles (id, email, plan, credits_total, credits_used, credits_reset_at, credits_period_start)
    VALUES (NEW.id, NEW.email, v_invite.plan, v_invite.credits, 0, NOW() + INTERVAL '1 month', NOW());

    UPDATE public.invite_codes
    SET used_by = NEW.id, used_at = NOW()
    WHERE id = v_invite.id;
  ELSE
    INSERT INTO public.profiles (id, email, credits_reset_at, credits_period_start)
    VALUES (NEW.id, NEW.email, NOW() + INTERVAL '1 month', NOW());
  END IF;

  RETURN NEW;
END;
$$;

-- Einmaliger Backfill: nur User, deren credits_reset_at noch nie vom Cron
-- vorgerueckt wurde (== created_at, der fehlerhafte Default), bekommen das
-- korrekte erste Reset-Datum (Signup + 1 Monat). Beruehrt ausschliesslich
-- credits_reset_at -- keine Aenderung an credits_used/credits_total/plan.
UPDATE public.profiles
SET credits_reset_at = created_at + INTERVAL '1 month'
WHERE credits_reset_at = created_at;
