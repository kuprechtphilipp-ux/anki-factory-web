-- Invite-Code-Redemption fuer OAuth-Signups (Google), Schritt 5B
--
-- handle_new_user() kann bei OAuth-Signups kein invite_code aus den
-- Metadaten lesen (Supabase legt die auth.users-Zeile selbst an, ohne
-- unsere Metadaten). Stattdessen wird der Code als Query-Param durch den
-- OAuth-Redirect geschleust und nach dem Login client-seitig per RPC
-- eingeloest.
--
-- redeem_invite_code(p_code): laeuft als auth.uid() (eingeloggter User),
-- aktualisiert dessen profiles-Zeile auf plan/credits des Codes -- nur
-- wenn der User noch auf dem Default-Plan 'basic' ist (kein Downgrade
-- bestehender Plaene moeglich).

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
  SET plan = v_invite.plan, credits_total = v_invite.credits, credits_used = 0
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
