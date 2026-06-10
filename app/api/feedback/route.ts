import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { thema_id, rating, detailgrad_feedback, kartenmenge_feedback, kartentyp_feedback, freitext, karten_count, lod_used } = body

    // Save feedback
    const { error: fbError } = await supabase.from('deck_feedback').insert({
      thema_id: thema_id ?? null,
      rating: rating ?? null,
      detailgrad_feedback: detailgrad_feedback ?? null,
      kartenmenge_feedback: kartenmenge_feedback ?? null,
      kartentyp_feedback: kartentyp_feedback ?? null,
      freitext: freitext ?? null,
      karten_count: karten_count ?? null,
      lod_used: lod_used ?? null,
      user_id: user.id,
    })

    if (fbError) {
      console.error('[feedback] insert error:', fbError)
      return NextResponse.json({ error: fbError.message }, { status: 500 })
    }

    // Update aggregated profile from all feedback
    const { data: allFeedback } = await supabase
      .from('deck_feedback')
      .select('detailgrad_feedback, kartenmenge_feedback, kartentyp_feedback, freitext, lod_used')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (allFeedback && allFeedback.length > 0) {
      // Aggregate detailgrad preference
      const detailCounts: Record<string, number> = {}
      const mengeMap: Record<string, number> = { 'zu wenig': 5, 'passt': 0, 'zu viel': -5 }
      const typCounts: Record<string, number> = {}
      const notizen: string[] = []
      let mengeAdjustment = 0

      for (const fb of allFeedback) {
        if (fb.detailgrad_feedback === 'zu wenig') detailCounts['Hoch'] = (detailCounts['Hoch'] ?? 0) + 1
        else if (fb.detailgrad_feedback === 'zu viel') detailCounts['Gering'] = (detailCounts['Gering'] ?? 0) + 1
        else if (fb.detailgrad_feedback === 'passt' && fb.lod_used) detailCounts[fb.lod_used] = (detailCounts[fb.lod_used] ?? 0) + 1

        if (fb.kartenmenge_feedback && mengeMap[fb.kartenmenge_feedback] !== undefined) {
          mengeAdjustment += mengeMap[fb.kartenmenge_feedback]
        }

        if (fb.kartentyp_feedback === 'mehr Basic') typCounts['basic'] = (typCounts['basic'] ?? 0) + 1
        else if (fb.kartentyp_feedback === 'mehr Cloze') typCounts['cloze'] = (typCounts['cloze'] ?? 0) + 1

        if (fb.freitext?.trim()) notizen.push(fb.freitext.trim())
      }

      const { data: profil } = await supabase.from('generier_profil').select('bevorzugte_kartenmenge').eq('user_id', user.id).maybeSingle()
      const baseMenge = profil?.bevorzugte_kartenmenge ?? 20

      const bestDetail = Object.entries(detailCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Mittel'
      const bestTyp = Object.entries(typCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'gemischt'
      const newMenge = Math.max(10, Math.min(50, baseMenge + Math.round(mengeAdjustment / allFeedback.length)))

      await supabase.from('generier_profil').upsert({
        user_id: user.id,
        bevorzugter_detailgrad: bestDetail,
        bevorzugte_kartenmenge: newMenge,
        bevorzugter_kartentyp: bestTyp,
        feedback_count: allFeedback.length,
        notizen: notizen.slice(-5),
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[feedback]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
