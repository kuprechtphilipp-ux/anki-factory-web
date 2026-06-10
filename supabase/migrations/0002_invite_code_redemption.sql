-- Invite-Code-Redemption + Credit-Helper-Funktionen (Schritt 4A)
--
-- Angewendet auf Supabase-Projekt ovtpgwrrxscuvbprghhp am 2026-06-10.
--
-- Umfasst:
--   - handle_new_user(): liest optionalen invite_code aus raw_user_meta_data,
--     loest ihn ein (plan/credits aus invite_codes, Code wird als verwendet markiert)
--     oder faellt auf das bisherige Default-Verhalten zurueck (plan='basic', credits_total=50)
--   - check_invite_code(p_code): Pre-Signup-Check ob ein Code gueltig & unbenutzt ist
--   - increment_credits_used(p_user_id, p_amount): erhoeht profiles.credits_used

-- 1. handle_new_user(): Invite-Code-Redemption beim Signup
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
    INSERT INTO public.profiles (id, email, plan, credits_total, credits_used)
    VALUES (NEW.id, NEW.email, v_invite.plan, v_invite.credits, 0);

    UPDATE public.invite_codes
    SET used_by = NEW.id, used_at = NOW()
    WHERE id = v_invite.id;
  ELSE
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

-- 2. check_invite_code(): Pre-Signup-Check (User ist noch nicht eingeloggt -> anon + authenticated)
CREATE OR REPLACE FUNCTION public.check_invite_code(p_code TEXT)
RETURNS TABLE(plan TEXT, credits INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan, credits
  FROM public.invite_codes
  WHERE code = p_code AND used_by IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.check_invite_code(TEXT) TO anon, authenticated;

-- 3. increment_credits_used(): wird nach jedem Claude-Call aufgerufen
CREATE OR REPLACE FUNCTION public.increment_credits_used(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET credits_used = credits_used + p_amount
  WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_credits_used(UUID, INTEGER) TO authenticated;
