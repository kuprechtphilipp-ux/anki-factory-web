import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Einmalige Migration: durchsucht bestehende Karten nach Formeln in Klartext/Unicode
// und schreibt sie via Claude in LaTeX-Syntax ($...$ / $$...$$) um, damit sie im
// Frontend (KaTeX) korrekt gerendert werden. Felder ohne Formel bleiben unverändert.
//
// Verwendung: node --env-file=.env.local scripts/migrate-formulas-to-latex.mjs [--dry-run]

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 15
const MODEL = 'claude-sonnet-4-6'
const PRICING = { input: 3, output: 15 } // USD pro 1M Tokens

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen in .env.local')
  process.exit(1)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Grobe Vorauswahl: Karten, die mathematische Zeichen enthalten und noch kein "$" haben.
const FORMULA_CHARS = /[=≈≤≥±×÷√∑∏∫∂∆πθλμσΩαβγ^_]/
function isCandidate(text) {
  if (!text) return false
  if (text.includes('$')) return false
  return FORMULA_CHARS.test(text)
}

const SYSTEM_PROMPT = `Du bekommst ein JSON-Array von Lernkarten mit den Feldern id, frage, antwort, kontext, cloze_text.

AUFGABE: Für jede Karte prüfst du frage, antwort, kontext und cloze_text auf mathematische
Formeln oder Variablen, die als Klartext/Unicode geschrieben sind (z.B. "1 + r_nominal = (1 + r_real) · (1 + i)",
"x^2", "σ²", "ΔG = ΔH - TΔS").

Falls eine Formel gefunden wird: schreibe NUR den Formel-Teil in LaTeX-Syntax um, eingebettet
in $...$ (inline) oder $$...$$ (eigene Zeile/abgesetzt). Nutze Subscripts (_{...}), Superscripts
(^{...}), \\frac{}{}, griechische Buchstaben (\\Delta, \\sigma, ...) etc. Der restliche Text
(Fragetext, Erklärungen) bleibt WORTWÖRTLICH unverändert.

Falls KEINE Formel im Feld vorkommt: gib das Feld exakt unverändert zurück.

Gib ausschliesslich ein JSON-Array zurück (keine Markdown-Codeblöcke), mit GENAU den Feldern
id, frage, antwort, kontext, cloze_text in derselben Reihenfolge wie die Eingabe. Achte auf
gültiges JSON — Backslashes in LaTeX-Befehlen müssen als \\\\ escaped werden.`

function parseJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

// Die Cloze-Marker {{cN::...}} werden im Frontend mit /\{\{c\d+::([^}]+)\}\}/g geparst.
// LaTeX mit "{" oder "}" innerhalb eines Markers (z.B. \sigma_{ij}) würde dieses Regex
// brechen — prüfe, ob die Anzahl korrekt erkannter Marker unverändert bleibt.
function clozeMarkersIntact(original, updated) {
  const count = (s) => (s.match(/\{\{c\d+::[^}]+\}\}/g) ?? []).length
  const expected = (original.match(/\{\{c\d+::/g) ?? []).length
  return count(updated) === expected && count(original) === expected
}

async function main() {
  const { data: karten, error } = await supabase
    .from('karte')
    .select('id, frage, antwort, kontext, cloze_text')
    .order('id')

  if (error) {
    console.error('Fehler beim Laden der Karten:', error.message)
    process.exit(1)
  }

  const candidates = karten.filter(
    (k) => isCandidate(k.frage) || isCandidate(k.antwort) || isCandidate(k.kontext) || isCandidate(k.cloze_text)
  )

  console.log(`${karten.length} Karten total, ${candidates.length} Kandidaten mit möglichen Formeln.`)
  if (candidates.length === 0) return

  let totalIn = 0
  let totalOut = 0
  let updated = 0

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)
    const input = batch.map((k) => ({
      id: k.id,
      frage: k.frage ?? '',
      antwort: k.antwort ?? '',
      kontext: k.kontext ?? '',
      cloze_text: k.cloze_text ?? '',
    }))

    console.log(`\nBatch ${i / BATCH_SIZE + 1}/${Math.ceil(candidates.length / BATCH_SIZE)} (${batch.length} Karten)...`)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    })

    totalIn += message.usage.input_tokens
    totalOut += message.usage.output_tokens

    const raw = message.content[0].text
    let results
    try {
      results = parseJson(raw)
    } catch (e) {
      console.error('  JSON-Parse-Fehler, Batch wird übersprungen:', e.message)
      console.error('  Raw:', raw.slice(0, 300))
      continue
    }

    for (const r of results) {
      const original = batch.find((k) => k.id === r.id)
      if (!original) continue

      const changes = {}
      if ((r.frage ?? '') !== (original.frage ?? '')) changes.frage = r.frage
      if ((r.antwort ?? '') !== (original.antwort ?? '')) changes.antwort = r.antwort
      if ((r.kontext ?? '') !== (original.kontext ?? '')) changes.kontext = r.kontext || null
      if ((r.cloze_text ?? '') !== (original.cloze_text ?? '')) {
        if (clozeMarkersIntact(original.cloze_text ?? '', r.cloze_text ?? '')) {
          changes.cloze_text = r.cloze_text || null
        } else {
          console.log(`  Karte ${r.id}: cloze_text-Änderung verworfen (würde {{cN::...}}-Marker brechen)`)
        }
      }

      if (Object.keys(changes).length === 0) continue

      console.log(`  Karte ${r.id}: ${Object.keys(changes).join(', ')} geändert`)
      for (const [field, val] of Object.entries(changes)) {
        console.log(`    ${field}: "${original[field] ?? ''}" -> "${val}"`)
      }

      if (!DRY_RUN) {
        const { error: updateError } = await supabase.from('karte').update(changes).eq('id', r.id)
        if (updateError) console.error(`  Update-Fehler bei Karte ${r.id}:`, updateError.message)
        else updated++
      } else {
        updated++
      }
    }
  }

  const cost = (totalIn / 1_000_000) * PRICING.input + (totalOut / 1_000_000) * PRICING.output
  console.log(`\n${DRY_RUN ? '[DRY RUN] Würde' : ''} ${updated} Karten ${DRY_RUN ? 'aktualisieren' : 'aktualisiert'}.`)
  console.log(`Tokens: ${totalIn} input, ${totalOut} output. Kosten: ~$${cost.toFixed(4)}`)
}

main()
