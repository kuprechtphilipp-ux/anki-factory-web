-- Entfernt den "OR is_admin()"-Bypass aus den RLS-Policies für Tabellen mit
-- persönlichen Nutzerdaten (Kurse, Themen, Karten, Lernfortschritt etc.).
--
-- Hintergrund: Admin-User (profiles.is_admin = true) konnten über normale
-- Supabase-Client-Queries (User-JWT, keine Service-Role) ALLE Zeilen ALLER
-- User in diesen Tabellen sehen, weil RLS via "OR is_admin()" für sie
-- praktisch deaktiviert war. Das verletzt die Mandantentrennung
-- (z.B. fremde Kurse erschienen in der eigenen Kursübersicht).
--
-- Kein Admin-Feature greift für diese Tabellen auf den is_admin()-Bypass zu
-- (geprüft: app/(app)/admin/**, app/api/admin/**). Admin-Features, die
-- bewusst auf is_admin() angewiesen sind (profiles, api_usage für
-- Kosten-Übersicht), bleiben unverändert.

-- kurs
DROP POLICY IF EXISTS "own kurs" ON public.kurs;
CREATE POLICY "own kurs" ON public.kurs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- thema
DROP POLICY IF EXISTS "own thema" ON public.thema;
CREATE POLICY "own thema" ON public.thema
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.kurs
    WHERE kurs.id = thema.kurs_id AND kurs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kurs
    WHERE kurs.id = thema.kurs_id AND kurs.user_id = auth.uid()
  ));

-- karte
DROP POLICY IF EXISTS "own karte" ON public.karte;
CREATE POLICY "own karte" ON public.karte
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.thema
    JOIN public.kurs ON kurs.id = thema.kurs_id
    WHERE thema.id = karte.thema_id AND kurs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.thema
    JOIN public.kurs ON kurs.id = thema.kurs_id
    WHERE thema.id = karte.thema_id AND kurs.user_id = auth.uid()
  ));

-- deck_feedback
DROP POLICY IF EXISTS "own deck_feedback" ON public.deck_feedback;
CREATE POLICY "own deck_feedback" ON public.deck_feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- generier_profil
DROP POLICY IF EXISTS "own generier_profil" ON public.generier_profil;
CREATE POLICY "own generier_profil" ON public.generier_profil
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- lern_streak
DROP POLICY IF EXISTS "own lern_streak" ON public.lern_streak;
CREATE POLICY "own lern_streak" ON public.lern_streak
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- review_log
DROP POLICY IF EXISTS "own review_log" ON public.review_log;
CREATE POLICY "own review_log" ON public.review_log
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.karte
    JOIN public.thema ON thema.id = karte.thema_id
    JOIN public.kurs ON kurs.id = thema.kurs_id
    WHERE karte.id = review_log.karte_id AND kurs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.karte
    JOIN public.thema ON thema.id = karte.thema_id
    JOIN public.kurs ON kurs.id = thema.kurs_id
    WHERE karte.id = review_log.karte_id AND kurs.user_id = auth.uid()
  ));

-- session_results
DROP POLICY IF EXISTS "own session_results" ON public.session_results;
CREATE POLICY "own session_results" ON public.session_results
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
