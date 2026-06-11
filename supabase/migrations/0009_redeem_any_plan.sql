-- Bugfix: redeem_invite_code erlaubte bisher nur Usern mit plan='basic'
-- einen Invite-Code einzuloesen. Damit war ein Upgrade-Pfad (z.B.
-- basic_plus -> ultra ueber einen Ultra-Invite-Code) blockiert, obwohl
-- Ultra jetzt ein regulaerer (vierter) bezahlter Plan ist, der ueber
-- Invite-Codes vom Owner vergeben wird.
--
-- Schutz vor Mehrfacheinloesung bleibt ueber "used_by IS NULL" bestehen.

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
  WHERE id = auth.uid();

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
