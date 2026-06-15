-- Kurs-weite Altklausuren/Pruefungen als KI-Kontext fuer Generierung, Quiz und
-- Schriftlich-Bewertung in ALLEN Themen eines Kurses (nicht nur dem Thema, bei
-- dem die Altklausur urspruenglich hochgeladen wurde). Loest die thema-lokale
-- altklausur_kontext-Spalte aus Migration 0018 ab.
CREATE TABLE public.kurs_altklausur (
  id          SERIAL PRIMARY KEY,
  kurs_id     INTEGER NOT NULL REFERENCES public.kurs(id) ON DELETE CASCADE,
  dateiname   TEXT NOT NULL,
  inhalt_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kurs_altklausur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own kurs_altklausur" ON public.kurs_altklausur
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.kurs
    WHERE kurs.id = kurs_altklausur.kurs_id AND kurs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kurs
    WHERE kurs.id = kurs_altklausur.kurs_id AND kurs.user_id = auth.uid()
  ));

-- Bestehende thema-lokale Altklausur-Texte als Kurs-Kontext uebernehmen, damit
-- sie ab sofort in ALLEN Themen des jeweiligen Kurses als Stil-Referenz dienen.
INSERT INTO public.kurs_altklausur (kurs_id, dateiname, inhalt_text)
SELECT thema.kurs_id, 'Altklausur (' || thema.name || ')', thema.altklausur_kontext
FROM public.thema
WHERE thema.altklausur_kontext IS NOT NULL AND length(trim(thema.altklausur_kontext)) > 0;
