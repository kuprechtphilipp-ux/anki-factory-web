-- Privater Storage-Bucket fuer temporaer hochgeladene PDFs. Client laedt die
-- Datei direkt hier hoch (umgeht das 4.5MB Body-Limit von Vercel Serverless
-- Functions), API-Routes laden sie von hier statt per multipart FormData.
-- Pfadkonvention: {user_id}/{uuid}.pdf -- RLS stellt sicher, dass jeder User
-- nur auf Dateien im eigenen Ordner zugreifen kann.
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-pdfs', 'temp-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own temp-pdfs select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'temp-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own temp-pdfs insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'temp-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own temp-pdfs delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'temp-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
