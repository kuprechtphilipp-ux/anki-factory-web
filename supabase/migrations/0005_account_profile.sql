-- Account & Profil: Account-Loeschung + Abfrage des eingeloesten Invite-Codes
--
-- delete_my_account(): loescht den eingeloggten User aus auth.users.
-- Die zugehoerige profiles-Zeile faellt per ON DELETE CASCADE weg.
--
-- get_my_redeemed_code(): invite_codes hat keine SELECT-Policy fuer normale
-- User (nur "admin manage invite codes"). Diese Funktion liefert dem
-- eingeloggten User den Code, den er selbst eingeloest hat.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_redeemed_code()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT code FROM public.invite_codes WHERE used_by = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_redeemed_code() TO authenticated;
