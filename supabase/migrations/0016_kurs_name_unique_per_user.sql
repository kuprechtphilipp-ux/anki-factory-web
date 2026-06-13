-- Die globale UNIQUE(name)-Constraint auf kurs stammt aus der Single-User-Zeit
-- und verhindert im Multi-Tenant-Setup, dass zwei User einen Kurs mit
-- demselben Namen anlegen (z.B. beide "OC"). Ersetzt durch UNIQUE(user_id, name).

ALTER TABLE public.kurs DROP CONSTRAINT IF EXISTS kurs_name_key;
ALTER TABLE public.kurs ADD CONSTRAINT kurs_user_id_name_key UNIQUE (user_id, name);
