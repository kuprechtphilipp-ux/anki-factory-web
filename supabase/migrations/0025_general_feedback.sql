-- Allgemeiner Feedback-Kanal (Bugs, Ideen, Anliegen) -- getrennt von
-- deck_feedback, das ausschliesslich die Deck-Qualitaet nach der Generierung
-- bewertet (Rating + Chips, fliesst in generier_profil ein).
--
-- Schreibzugriff: jeder eingeloggte User darf eigene Einträge anlegen.
-- Lesezugriff: nur Admins (Anzeige im Admin-Panel).

CREATE TABLE public.general_feedback (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL DEFAULT 'sonstiges' CHECK (category IN ('bug', 'idee', 'sonstiges')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.general_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert own general_feedback" ON public.general_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin manage general_feedback" ON public.general_feedback
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
