-- Optionale, kursweite Freitext-Notiz des Nutzers, die in Pre-Scan und
-- Karten-Generierung als zusaetzlicher Kontext einfliesst (z.B. "Formeln muss
-- ich nicht auswendig koennen, nur die Schritte in Excel anwenden" oder
-- "Gesetzestexte liegen in der Pruefung als Open-Book-Material vor").
ALTER TABLE public.kurs ADD COLUMN notiz_kontext TEXT;
