import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const MAX_CHARS_PER_DOC = 6000
const MAX_DOCS = 3

/**
 * Liefert die Texte aller im Kurs hinterlegten Altklausuren (kurs_altklausur),
 * je Dokument auf MAX_CHARS_PER_DOC begrenzt. Wird in Generierung, Quiz und
 * Schriftlich-Bewertung als gemeinsamer Stil-/Format-Kontext genutzt.
 */
export async function getKursAltklausurDocs(supabase: SupabaseServerClient, kursId: number): Promise<string[]> {
  const { data } = await supabase
    .from('kurs_altklausur')
    .select('inhalt_text')
    .eq('kurs_id', kursId)
    .order('created_at', { ascending: true })
    .limit(MAX_DOCS)

  return (data ?? [])
    .map((row: { inhalt_text: string }) => row.inhalt_text?.trim().slice(0, MAX_CHARS_PER_DOC))
    .filter((text): text is string => Boolean(text))
}
