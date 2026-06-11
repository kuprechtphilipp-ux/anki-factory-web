-- Admin-editierbare Plan-Konfiguration (Credits, Preis, Beschreibung)
--
-- Bisher waren PLAN_CREDITS/PLAN_PRICES/PLAN_DESCRIPTIONS in lib/plans.ts
-- hartcodiert. Mit plan_config kann der Owner diese Werte im /admin-Bereich
-- ohne Code-Deploy anpassen. lib/plans.ts behaelt die bisherigen Werte als
-- Fallback/Defaults, falls der DB-Fetch fehlschlaegt.

CREATE TABLE public.plan_config (
  plan        TEXT PRIMARY KEY CHECK (plan IN ('basic','basic_plus','premium','ultra')),
  credits     INTEGER NOT NULL,
  price_chf   NUMERIC(6,2),
  description TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plan_config ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Nutzer sehen das aktuelle Pricing
CREATE POLICY "select plan config" ON public.plan_config
  FOR SELECT TO authenticated USING (true);

-- Nur Admins duerfen Pricing/Tiers anpassen
CREATE POLICY "admin manage plan config" ON public.plan_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.plan_config (plan, credits, price_chf, description) VALUES
  ('basic',      50,   NULL,  'Zum Ausprobieren'),
  ('basic_plus', 300,  4.90,  'Für einen Kurs'),
  ('premium',    600,  9.90,  'Für mehrere Kurse parallel'),
  ('ultra',      1100, 16.90, 'Für Power-User — Zugang über Einladungscode');
