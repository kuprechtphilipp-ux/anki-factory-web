import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { logApiUsage, getCreditStatus, CREDITS_EXHAUSTED_MESSAGE } from '@/lib/api-cost'
import type { CramoLernkontext } from '@/lib/types'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CRAMO_PERSONA = `Du bist Cramo, ein KI-Lerntutor in Form eines sympathischen, aber sichtlich übernächtigten Waschbären mit Kaffeeabhängigkeit und tiefen Augenringen. Du bist Spezialist fürs "Büffeln" (Cramming) in der Nachtschicht vor Prüfungen. Deine Persönlichkeit ist eine Mischung aus solidarischem "Ich fühle deinen Schmerz"-Kumpel und effizientem HSG-Elite-Lerner, der dem User dezent das Gefühl gibt, smarter als die Konkurrenz zu lernen.

Du verwendest niemals Emojis.`

const MODE_INSTRUCTIONS: Record<'help' | 'fun', string> = {
  help: `Modus: HILFE.
Sei sachlich, hilfsbereit und kurz angebunden, aber freundlich. Beantworte inhaltliche Fragen zum aktuellen Lernstoff (Karte/Thema) sowie Fragen zur App und zum Account. Halte Antworten knapp und konkret, schweife nicht ab.`,
  fun: `Modus: SPASS.
Hier darfst du deinen vollen Charakter zeigen: Erzähle (erfundene) Anekdoten aus deinen "Glory Days" durchgemachter Nächte vor Prüfungen, necke den User liebevoll und motiviere ihn auf lockere, augenzwinkernde Art. Hier darfst du ausführlicher und unterhaltsamer schreiben als im Hilfe-Modus.`,
}

function buildSystemPrompt(
  mode: 'help' | 'fun',
  profile: { fachbereich: string | null; lernziel: string | null; lernfenster: string | null } | null,
  context?: CramoLernkontext
): string {
  let prompt = `${CRAMO_PERSONA}\n\n${MODE_INSTRUCTIONS[mode]}`

  if (profile && (profile.fachbereich || profile.lernziel || profile.lernfenster)) {
    const teile: string[] = []
    if (profile.fachbereich) teile.push(`Fachbereich/Studienfach: ${profile.fachbereich}`)
    if (profile.lernziel) teile.push(`Lernziel: ${profile.lernziel}`)
    if (profile.lernfenster) {
      const label = { gestresst: 'sehr gestresst', normal: 'normal', entspannt: 'entspannt' }[profile.lernfenster] ?? profile.lernfenster
      teile.push(`Lernfenster/Stresslevel: ${label}`)
    }
    prompt += `\n\nPasse deinen Ton an folgende Angaben des Users an (beeinflusst nur die Kommunikation, nicht den Inhalt):\n${teile.join('\n')}`
  }

  if (context && (context.themaName || context.kursName || context.karteFrage)) {
    const teile: string[] = []
    if (context.kursName) teile.push(`Kurs: ${context.kursName}`)
    if (context.themaName) teile.push(`Thema: ${context.themaName}`)
    if (context.karteFrage) teile.push(`Aktuelle Karte – Frage: ${context.karteFrage}`)
    if (context.karteAntwort) teile.push(`Aktuelle Karte – Antwort: ${context.karteAntwort}`)
    if (context.karteKontext) teile.push(`Zusätzlicher Kontext zur Karte: ${context.karteKontext}`)
    prompt += `\n\nDer User befindet sich gerade hier:\n${teile.join('\n')}\nNutze das für konkrete Rückfragen, falls relevant.`
  }

  return prompt
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creditStatus = await getCreditStatus(supabase, user.id)
  if (creditStatus.exhausted) {
    return NextResponse.json({ error: 'credits_exhausted', message: CREDITS_EXHAUSTED_MESSAGE }, { status: 402 })
  }

  const body = await req.json() as {
    mode: 'help' | 'fun'
    message: string
    history?: { role: 'user' | 'assistant'; content: string }[]
    context?: CramoLernkontext
  }

  const { mode, message, history, context } = body
  if (mode !== 'help' && mode !== 'fun') {
    return NextResponse.json({ error: 'mode muss "help" oder "fun" sein' }, { status: 400 })
  }
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'message erforderlich' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('fachbereich, lernziel, lernfenster')
    .eq('id', user.id)
    .single()

  const system = buildSystemPrompt(mode, profile, context)

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages,
    })

    await logApiUsage(supabase, {
      feature: 'tutor',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      userId: user.id,
    })

    const reply = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[chat] Fehler:', err)
    return NextResponse.json({ error: 'Cramo ist gerade eingenickt. Versuch es nochmal.' }, { status: 500 })
  }
}
