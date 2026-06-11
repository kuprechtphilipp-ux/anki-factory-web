# Anki Factory Web — CLAUDE.md

Zentrale Referenz für alle Claude Code Sessions. Immer zuerst lesen, nie ignorieren.

---

## ⚠️ Hardware-Constraint (gilt für ALLE Branches/Worktrees)

User arbeitet auf einem MacBook Air M1 mit nur 8GB RAM.

- **NIEMALS** `npm run build` oder `npm run dev` ausführen — schlägt lokal fehl (Node/Next-Inkompatibilität) und kann den Rechner überlasten/zum Absturz bringen.
- Stattdessen: `npx tsc --noEmit` (+ ggf. `npx eslint <geänderte Dateien>`) für Compile-/Lint-Checks.
- Volle Build-Validierung läuft ausschließlich über Vercel (Preview- oder Production-Deploy nach Push).

---

## Projektbeschreibung

Vollständige Neuimplementierung der lokalen Streamlit-App „Anki Factory" als cloud-gehostete Web-App.

**Kern-Features:**
- PDF hochladen → Flashcards automatisch mit Claude AI generieren
- Karten reviewen & editieren (Basic + Cloze-Typen, Tags, Kontext, Bilder)
- Kurse & Themen-Struktur zur Organisation
- Tägliches Lernen direkt im Browser mit echtem Spaced Repetition (FSRS-Algorithmus)
- Rating: Nochmal / Schwer / Gut / Einfach → App berechnet nächsten Wiederholtermin

**Kein Anki, kein AnkiConnect, kein lokales Setup nötig.**

Die originale Streamlit-App liegt unter `/Users/philippkuprecht/Desktop/Anki_Factory/` — sie bleibt unberührt.

---

## Tech Stack

| Teil | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS |
| UI Komponenten | shadcn/ui |
| Datenbank | Supabase (PostgreSQL) |
| Supabase Client | @supabase/supabase-js |
| KI | Anthropic Claude API (claude-sonnet-4-6) |
| PDF-Verarbeitung | pdf-parse (Node.js) oder via API Route |
| SRS-Algorithmus | ts-fsrs (TypeScript FSRS Implementation) |
| Hosting | Vercel |

---

## Supabase

- **Projekt:** anki-factory
- **Projekt-ID:** ovtpgwrrxscuvbprghhp
- **URL:** https://ovtpgwrrxscuvbprghhp.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dHBnd3JyeHNjdXZicHJnaGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzEzNTUsImV4cCI6MjA5NjUwNzM1NX0.m-j9x6K9BMQwX4pzZioqzQa9LeJNoaU5MaCL1YRibWQ
- **Publishable Key:** sb_publishable_-iFivTK9RU8hrqCi2759mQ_Gs6qf4tj
- **Region:** eu-central-1 (Frankfurt)

---

## Datenbankschema

```sql
-- kurs: Kurse / Fächer
CREATE TABLE kurs (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- thema: Themen innerhalb eines Kurses
CREATE TABLE thema (
  id         SERIAL PRIMARY KEY,
  kurs_id    INTEGER NOT NULL REFERENCES kurs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kurs_id, name)
);

-- karte: Flashcards mit FSRS-Feldern
CREATE TABLE karte (
  id           SERIAL PRIMARY KEY,
  guid         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  thema_id     INTEGER NOT NULL REFERENCES thema(id) ON DELETE CASCADE,

  -- Inhalt
  frage        TEXT NOT NULL DEFAULT '',
  antwort      TEXT NOT NULL DEFAULT '',
  kontext      TEXT,
  slide_nr     INTEGER,
  tags         JSONB DEFAULT '[]',
  typ          TEXT NOT NULL DEFAULT 'basic' CHECK(typ IN ('basic','cloze')),
  cloze_text   TEXT,
  image_b64    TEXT,

  -- Review-Status (Erstellungs-Workflow)
  status       TEXT NOT NULL DEFAULT 'neu'
               CHECK(status IN ('neu','reviewed','exportiert','verworfen')),

  -- FSRS Spaced Repetition
  fsrs_due            TIMESTAMPTZ DEFAULT NOW(),
  fsrs_stability      FLOAT DEFAULT 0,
  fsrs_difficulty     FLOAT DEFAULT 0,
  fsrs_elapsed_days   INTEGER DEFAULT 0,
  fsrs_scheduled_days INTEGER DEFAULT 0,
  fsrs_reps           INTEGER DEFAULT 0,
  fsrs_lapses         INTEGER DEFAULT 0,
  fsrs_state          SMALLINT DEFAULT 0,
  -- 0=New, 1=Learning, 2=Review, 3=Relearning
  fsrs_last_review    TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Ordnerstruktur (Ziel)

```
anki-factory-web/
├── CLAUDE.md
├── .env.local                  # Secrets (nie committen)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── app/
│   ├── layout.tsx              # Root Layout
│   ├── page.tsx                # Home → redirect zu /kurse
│   ├── globals.css
│   └── (app)/
│       ├── layout.tsx          # App-Layout mit Sidebar
│       ├── kurse/
│       │   └── page.tsx        # Kurs-Übersicht
│       └── [kurs]/
│           └── [thema]/
│               ├── page.tsx            # Generierung + Review
│               ├── lernen/
│               │   └── page.tsx        # FSRS Lern-Modus
│               └── alle/
│                   └── page.tsx        # Alle Karten
├── components/
│   ├── sidebar.tsx
│   ├── karte-card.tsx
│   ├── review-card.tsx
│   ├── lern-card.tsx
│   └── ui/                     # shadcn/ui Komponenten
├── lib/
│   ├── supabase.ts             # Supabase Client
│   ├── fsrs.ts                 # FSRS Wrapper (ts-fsrs)
│   └── types.ts                # TypeScript Types
└── app/api/
    ├── karten/
    │   └── route.ts            # GET/POST Karten
    ├── karte/
    │   └── [id]/
    │       ├── route.ts        # PATCH/DELETE einzelne Karte
    │       └── review/
    │           └── route.ts    # POST FSRS Review
    ├── kurse/
    │   └── route.ts
    ├── themen/
    │   └── route.ts
    └── generieren/
        └── route.ts            # PDF → Flashcards (Claude API)
```

---

## Umgebungsvariablen (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ovtpgwrrxscuvbprghhp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dHBnd3JyeHNjdXZicHJnaGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzEzNTUsImV4cCI6MjA5NjUwNzM1NX0.m-j9x6K9BMQwX4pzZioqzQa9LeJNoaU5MaCL1YRibWQ
ANTHROPIC_API_KEY=                # Aus bestehendem .env der Streamlit-App
FAL_KEY=                           # fal.ai API Key, für Bildgenerierung (siehe unten)
```

---

## Bildgenerierung (fal.ai)

Für die Landing Page und andere visuelle Inhalte steht ein Skript zur KI-Bildgenerierung über fal.ai (FLUX) zur Verfügung.

### Befehl
```bash
npm run generate-image -- "<PROMPT>" "<DATEINAME>"
```

### Regeln für Claude Code
1. Wenn der User ein Bild, Icon, Hintergrund oder eine Grafik für die Website verlangt (z. B. für die Landing Page), nutze eigenständig diesen Befehl, um es zu generieren.
2. Formuliere den Prompt auf Englisch für beste Ergebnisse (z. B. `"modern tech startup hero section illustration, isometric, blue and neon colors"`).
3. Das Skript speichert das Ergebnis automatisch unter `public/images/<DATEINAME>` (z. B. `.png`).
4. Binde das Bild danach direkt mit dem Pfad `/images/<dateiname>` in den JSX/CSS-Code ein.
5. Voraussetzung: `FAL_KEY` muss in `.env.local` gesetzt sein (Account auf fal.ai, kleines Guthaben aufladen).

---

## Aktueller Stand

Phasen 0–6 sind abgeschlossen (Supabase-Setup, Next.js-Grundgerüst, API Routes, Generierung & Review UI, FSRS Lern-Modus inkl. Drill-Mode, Deployment auf Vercel). Detaillierte Phasen-Historie: siehe `docs/CHANGELOG.md`.

App ist live unter https://anki-factory-web.vercel.app, GitHub-Repo: https://github.com/kuprechtphilipp-ux/anki-factory-web (auto-deploy bei Push auf main).

Aktuell laufende Stränge: Multi-Tenant/Auth-Umbau (siehe `docs/private_beta_roadmap.md`), kleinere UI-/Quiz-Bugfixes.

---

## Wichtige Hinweise für Claude Code

- Immer TypeScript, nie JavaScript
- Alle DB-Zugriffe über Supabase Client, nie direktes SQL im Frontend
- API Routes sind Server-only (kein "use client")
- PDF-Verarbeitung und Claude API calls nur in API Routes (nicht im Browser)
- FSRS-Berechnung passiert server-side in der review API Route
- Keine Auth nötig (Single-User App) — RLS Policy erlaubt alles
- shadcn/ui Komponenten via `npx shadcn@latest add [component]` installieren
- Bilder als base64 in der DB speichern (wie bisher in der Streamlit-App)
- **Finaler Schritt jeder Code-Änderung:** `npx tsc --noEmit` (+ ggf. `npx eslint <geänderte Dateien>`) ausführen, siehe Hardware-Constraint oben. Danach committen und pushen (User testet via Vercel-Preview/-Production), siehe `docs/vercel_preview_workflow.md`.
