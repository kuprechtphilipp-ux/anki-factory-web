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

### ✅ Phase 1 — Next.js Projektsetup (abgeschlossen)
- Next.js 14 (App Router) initialisiert
- TypeScript + Tailwind v3 + shadcn/ui eingerichtet (slate base color, default style)
- shadcn Komponenten installiert: button, input, select, textarea, progress, badge, tabs, card, separator, toggle, slider, label, sonner
- ts-fsrs + @supabase/supabase-js installiert
- Vollständige Ordnerstruktur angelegt
- lib/supabase.ts — Supabase Client
- lib/types.ts — TypeScript Types (Kurs, Thema, Karte mit FSRS-Feldern)
- lib/fsrs.ts — ts-fsrs Wrapper
- .env.local angelegt
- Root Layout + App Layout mit Sidebar gebaut
- Sidebar: lädt Kurse + Themen aus Supabase, aufklappbar
- Placeholder-Seiten: /kurse, /[kurs]/[thema], /[kurs]/[thema]/lernen, /[kurs]/[thema]/alle
- Placeholder-API-Routes: /api/kurse, /api/themen, /api/karten, /api/karte/[id], /api/karte/[id]/review, /api/generieren
- Build: ✅ sauber (TypeScript + ESLint + Next.js Build)
- Hinweis: Tailwind v3 (nicht v4) — globals.css nutzt HSL-Variablen, kein Upgrade nötig
- pdf-parse noch NICHT installiert → wird am Anfang von Phase 2 nachgeholt

### ✅ Phase 2 — API Routes (abgeschlossen)
- GET/POST /api/kurse — alle Kurse laden, neuen Kurs anlegen
- DELETE /api/kurse/[id] — Kurs löschen (cascade via DB)
- GET/POST /api/themen?kurs_id=X — Themen laden, neues Thema
- DELETE /api/themen/[id] — Thema löschen (cascade via DB)
- GET /api/karten?thema_id=X&status=Y — Karten laden (optionaler status-Filter)
- POST /api/karten — Bulk-Insert (Array oder einzelnes Objekt)
- PATCH /api/karte/[id] — Karte editieren
- DELETE /api/karte/[id] — Karte löschen
- POST /api/karte/[id]/review — FSRS Review (Rating 1-4), ts-fsrs berechnet nächsten Termin
- POST /api/generieren — PDF (multipart/form-data: pdf, thema_id, lod) → pdf-parse v2 (PDFParse class) → Claude API → JSON-Array von Karten
- Abhängigkeiten installiert: pdf-parse@2.x, @anthropic-ai/sdk
- Neue Route-Files angelegt: /api/kurse/[id], /api/themen/[id]
- Build: ✅ sauber

### ✅ Phase 3 — UI: Generierung & Review (abgeschlossen)
- components/review-card.tsx — Karte im Review-Modus: alle Felder editierbar, Navigation, Buttons Übernehmen/Editieren & Übernehmen/Verwerfen
- components/karte-list-item.tsx — Expandierbarer Listeneintrag mit Status-Badge und Tag-Anzeige
- app/(app)/[kurs]/[thema]/page.tsx — 3 Tabs:
  - Generieren: PDF-Upload (Drag-Area), Detailgrad-Select (Gering/Mittel/Hoch), Batch-Size-Slider (1-10), Fortschrittsanzeige, "Zum Review"-Shortcut nach Generierung
  - Review: ReviewCard-Komponente, Karten-Navigation, Accept/Reject-Actions mit PATCH /api/karte/[id]
  - Alle Karten: Status-Filter, KarteListItem-Liste
- app/(app)/[kurs]/[thema]/alle/page.tsx — Standalone Alle-Karten-Seite mit Status-Filter
- app/api/generieren/route.ts — batch_size Parameter ergänzt (1-10, default 5)
- Build: ✅ sauber (nur img-Warnungen, keine Errors)

### ✅ Phase 4 — FSRS Lern-Modus (abgeschlossen)
- components/lern-card.tsx — Lernkarte: Frage (Basic/Cloze mit Masking), "Antwort zeigen", Rating-Buttons (Nochmal/Schwer/Gut/Einfach) mit Farbkodierung
- Cloze-Masking: {{c1::Antwort}} → [...] in der Frage, **Antwort** im Reveal
- app/(app)/[kurs]/[thema]/lernen/page.tsx — Vollständiger Lern-Modus:
  - Fällige Karten: status=reviewed AND fsrs_due <= NOW()
  - Glückwunsch-Screen mit nächstem Fälligkeitsdatum wenn keine fälligen Karten
  - Session-abgeschlossen-Screen nach letzter Karte (mit "Nochmal"-Option)
  - Fortschrittsbalken + Kartencount
  - POST /api/karte/[id]/review nach jedem Rating
- /api/karten — due=true Filter ergänzt (fsrs_due <= NOW())
- app/(app)/[kurs]/[thema]/page.tsx — Statistik-Widget:
  - Anzahl fälliger Karten heute anzeigen (blaues Banner)
  - Direkter "Lernen"-Button zum Lern-Modus
- Build: ✅ sauber (nur img-Warnungen wie zuvor, keine Errors)

### ✅ Phase 5 — Deployment (abgeschlossen)
- GitHub Repo: https://github.com/kuprechtphilipp-ux/anki-factory-web
- Vercel Projekt: https://anki-factory-web.vercel.app
- Vercel mit GitHub verknüpft (auto-deploy bei Push auf main)
- Umgebungsvariablen in Vercel gesetzt (production):
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - ANTHROPIC_API_KEY (server-only, nicht NEXT_PUBLIC_)
- .env.local nie committed (.gitignore: .env*.local)
- Build auf Vercel: ✅ sauber (nur img-Warnungen, keine Errors)

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
