-- thema.altklausur_kontext (Migration 0018) ist durch die kurs-weite Tabelle
-- kurs_altklausur (Migration 0019, inkl. Daten-Migration) abgeloest und wird
-- im Anwendungscode nicht mehr gelesen oder geschrieben.
ALTER TABLE public.thema
  DROP COLUMN IF EXISTS altklausur_kontext;
