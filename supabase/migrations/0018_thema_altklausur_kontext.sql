-- Speichert den extrahierten Text einer optional hochgeladenen Altklausur pro Thema.
-- Wird beim Generieren befuellt (siehe app/api/generieren/route.ts) und von
-- Quiz-Generierung sowie Schriftlich-Bewertung als Zusatzkontext genutzt,
-- um Fragen/Bewertung naeher am tatsaechlichen Pruefungsstil auszurichten.
ALTER TABLE public.thema
  ADD COLUMN IF NOT EXISTS altklausur_kontext TEXT;
