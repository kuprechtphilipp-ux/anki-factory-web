# Anki Factory Web — CLAUDE.md

Zentrale Referenz für alle Claude Code Sessions. Immer zuerst lesen, nie ignorieren.

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
```

---

## Phasen-Tracking

### ✅ Phase 0 — Supabase Setup (abgeschlossen)
- Supabase Projekt angelegt (eu-central-1)
- Vollständiges Schema mit FSRS-Feldern migriert
- CLAUDE.md erstellt
- Projektordner angelegt: `/Users/philippkuprecht/Desktop/anki-factory-web/`

### ⏳ Phase 1 — Next.js Projektsetup
- Next.js 14 (App Router) initialisieren
- TypeScript + Tailwind + shadcn/ui einrichten
- Ordnerstruktur anlegen
- Supabase Client einrichten (lib/supabase.ts)
- TypeScript Types definieren (lib/types.ts)
- .env.local anlegen
- Basis-Layout mit Sidebar bauen

### ⏳ Phase 2 — API Routes
- GET/POST /api/kurse
- GET/POST /api/themen
- GET/POST /api/karten
- PATCH/DELETE /api/karte/[id]
- POST /api/karte/[id]/review (FSRS Update)
- POST /api/generieren (PDF → Claude → Karten)

### ⏳ Phase 3 — UI: Generierung & Review
- Sidebar (Kurs/Thema Auswahl, neu anlegen, löschen)
- PDF Upload + Fortschrittsanzeige
- Review-Tab (eine Karte nach der anderen, Status-Buttons)
- Alle Karten-Tab (Liste + Filter)

### ⏳ Phase 4 — FSRS Lern-Modus
- ts-fsrs einbinden
- Lern-Session: fällige Karten anzeigen
- Rating-Buttons: Nochmal / Schwer / Gut / Einfach
- FSRS-Berechnung + Supabase Update
- Statistiken: fällige Karten heute, Streak

### ⏳ Phase 5 — Deployment
- GitHub Repo anlegen + Code pushen
- Vercel Projekt anlegen + mit GitHub verbinden
- Umgebungsvariablen in Vercel setzen
- Produktions-Test

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
