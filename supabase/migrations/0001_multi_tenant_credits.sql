-- Multi-Tenancy & Credits/Plan-System: Fundament (Schritt 2 von 4)
--
-- Angewendet auf Supabase-Projekt ovtpgwrrxscuvbprghhp am 2026-06-10.
--
-- Umfasst: profiles-Tabelle + Trigger fuer auto-Anlage bei Registrierung,
-- invite_codes-Tabelle, sowie user_id-Spalten auf bestehenden Tabellen.
--
-- BEWUSST NICHT enthalten (folgt in spaeteren Schritten):
--   - RLS-Policies (Schritt 5) -- aktuelle Live-App nutzt noch "Allow all"
--     Policies und den alten Code ohne Auth; RLS wuerde sie sofort brechen.
--     Wird aktiviert, sobald Auth-Code deployed und Schritt 3+4 fertig sind.
--   - Daten-Migration bestehender Zeilen auf einen User (Schritt 4) --
--     zum Zeitpunkt dieser Migration existierte noch kein auth.users-Eintrag.
--   - NOT NULL auf kurs.user_id / session_results.user_id (Teil von Schritt 4).
--
-- Bekannter Folge-Punkt fuer Schritt 3: Die DB-Funktion
-- public.upsert_lern_streak(p_datum date) nutzt
-- "ON CONFLICT (datum) DO UPDATE ...". Der alte UNIQUE(datum)-Constraint
-- wurde unten durch UNIQUE(user_id, datum) ersetzt -- die Funktion muss
-- in Schritt 3 auf p_user_id + ON CONFLICT (user_id, datum) umgestellt
-- werden, sonst schlaegt der RPC-Call aus app/api/karte/[id]/review fehl.

-- 1. profiles table
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT,
  plan                 TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','basic_plus','premium','ultra')),
  credits_total        INTEGER NOT NULL DEFAULT 50,
  credits_used         INTEGER NOT NULL DEFAULT 0,
  is_admin             BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: lege bei jeder neuen Registrierung automatisch eine profiles-Zeile an
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. invite_codes table
CREATE TABLE public.invite_codes (
  id         SERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  plan       TEXT NOT NULL CHECK (plan IN ('basic_plus','premium','ultra')),
  credits    INTEGER NOT NULL,
  used_by    UUID REFERENCES auth.users(id),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. user_id Spalten auf bestehenden Tabellen
ALTER TABLE public.kurs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.api_usage ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.generier_profil ADD COLUMN user_id UUID REFERENCES auth.users(id) UNIQUE;
ALTER TABLE public.lern_streak ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.deck_feedback ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.session_results ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- lern_streak: datum allein war UNIQUE -> jetzt zusammengesetzt mit user_id
ALTER TABLE public.lern_streak DROP CONSTRAINT lern_streak_datum_key;
ALTER TABLE public.lern_streak ADD CONSTRAINT lern_streak_user_datum_key UNIQUE (user_id, datum);
