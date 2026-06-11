-- Onboarding-Profilfelder fuer Cramo-Tonalitaet (Schritt 1+2 Private Beta Roadmap)
--
-- Diese Felder beeinflussen NUR Cramos Kommunikationsstil (help + fun Modus),
-- NICHT die Karten-Generierung (siehe generier_profil fuer Generierungs-Parameter).

ALTER TABLE public.profiles
  ADD COLUMN fachbereich TEXT,
  ADD COLUMN lernziel TEXT,
  ADD COLUMN lernfenster TEXT CHECK (lernfenster IN ('gestresst', 'normal', 'entspannt'));
