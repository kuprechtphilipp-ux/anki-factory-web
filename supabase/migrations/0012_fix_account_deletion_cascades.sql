-- delete_my_account() loescht aus auth.users; mehrere Tabellen referenzierten
-- auth.users(id) bisher ohne ON DELETE CASCADE (confdeltype='a'/NO ACTION),
-- wodurch die Loeschung fuer jeden Account mit Nutzungsdaten mit einem
-- FK-Constraint-Fehler fehlschlug. Datentabellen -> CASCADE (entspricht dem
-- im UI versprochenen "alle deine Kurse, Karten und Lernfortschritt werden
-- geloescht"), invite_codes-Verweise -> SET NULL (Code-Historie bleibt).

ALTER TABLE public.kurs DROP CONSTRAINT kurs_user_id_fkey;
ALTER TABLE public.kurs ADD CONSTRAINT kurs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.api_usage DROP CONSTRAINT api_usage_user_id_fkey;
ALTER TABLE public.api_usage ADD CONSTRAINT api_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.generier_profil DROP CONSTRAINT generier_profil_user_id_fkey;
ALTER TABLE public.generier_profil ADD CONSTRAINT generier_profil_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.lern_streak DROP CONSTRAINT lern_streak_user_id_fkey;
ALTER TABLE public.lern_streak ADD CONSTRAINT lern_streak_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.deck_feedback DROP CONSTRAINT deck_feedback_user_id_fkey;
ALTER TABLE public.deck_feedback ADD CONSTRAINT deck_feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.session_results DROP CONSTRAINT session_results_user_id_fkey;
ALTER TABLE public.session_results ADD CONSTRAINT session_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.invite_codes DROP CONSTRAINT invite_codes_used_by_fkey;
ALTER TABLE public.invite_codes ADD CONSTRAINT invite_codes_used_by_fkey
  FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invite_codes DROP CONSTRAINT invite_codes_created_by_fkey;
ALTER TABLE public.invite_codes ADD CONSTRAINT invite_codes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
