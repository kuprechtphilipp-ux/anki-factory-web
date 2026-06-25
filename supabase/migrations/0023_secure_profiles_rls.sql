-- Schliesst eine Luecke in der bestehenden RLS-Policy "update own profile" auf
-- public.profiles: Diese Policy ist nur Zeilen-, nicht Spalten-scoped (id =
-- auth.uid() OR is_admin()). Ein eingeloggter User konnte dadurch sein eigenes
-- profiles-Row per direktem PostgREST/Supabase-Client-Call beliebig
-- veraendern -- inkl. credits_used/credits_total/plan/is_admin etc. -- ohne
-- ueber die App-Routen zu gehen. Vermutlich der Mechanismus, ueber den ein
-- Tester sein Credits-Limit selbst zurueckgesetzt hat (0/50 nach < 1 Tag,
-- ohne dass Monats-Cron oder Invite-Code-Einloesung das erklaeren konnten).
--
-- Fix: BEFORE UPDATE Trigger, der Aenderungen an sensiblen Spalten blockiert,
-- ausser der Schreibzugriff kommt von:
--   - einem Admin (is_admin() = true) -- z.B. der "Credits"-Button im
--     Admin-Dashboard (app/api/admin/users/[id]/credits/route.ts), der ueber
--     den anon-key/Session-Client der eingeloggten Admin-Person laeuft.
--   - service_role oder dem Tabellenbesitzer-Kontext (current_user NOT IN
--     ('authenticated','anon')) -- deckt ab: Stripe-Webhook (service-role
--     Client), monatlicher Cron-Reset (reset_expired_credits) und
--     Invite-Code-Einloesung (redeem_invite_code), die beide als
--     SECURITY DEFINER mit current_user = Funktionsbesitzer (postgres)
--     laufen und damit ohnehin schon BYPASSRLS=true haben.
--
-- Normale Self-Service-Updates (Fachbereich/Lernziel/Lernfenster/
-- Onboarding ueber /api/profile) bleiben unberuehrt, da sie keine der
-- gesperrten Spalten anfassen.

-- WICHTIG: Diese Funktion ist bewusst NICHT SECURITY DEFINER. Mit
-- SECURITY DEFINER waere current_user innerhalb der Funktion immer der
-- Funktionsbesitzer (postgres) -- der current_user-Bypass-Check unten wuerde
-- dann fuer JEDEN Aufruf greifen und die Sperre vollstaendig wirkungslos
-- machen (so geschehen bei der ersten Version dieser Migration, durch einen
-- Live-Test mit SET LOCAL ROLE authenticated direkt nach dem Deploy entdeckt
-- und sofort korrigiert).
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- service_role, Stripe-Webhook, Cron-Reset, Invite-Code-Einloesung etc.
  -- laufen nicht als 'authenticated'/'anon' und sind damit vertrauenswuerdig.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Admin-Dashboard darf Profile (auch fremde) bewusst aendern.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.credits_total IS DISTINCT FROM OLD.credits_total
     OR NEW.credits_used IS DISTINCT FROM OLD.credits_used
     OR NEW.credits_reset_at IS DISTINCT FROM OLD.credits_reset_at
     OR NEW.credits_period_start IS DISTINCT FROM OLD.credits_period_start
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.base_plan IS DISTINCT FROM OLD.base_plan
     OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_cancel_at IS DISTINCT FROM OLD.stripe_cancel_at
  THEN
    RAISE EXCEPTION 'Aenderung an geschuetzten Profil-Feldern ist nicht erlaubt';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trigger ON public.profiles;

CREATE TRIGGER protect_profile_sensitive_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();
