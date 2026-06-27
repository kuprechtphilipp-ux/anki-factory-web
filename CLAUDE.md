# Anki Factory Web — CLAUDE.md

Zentrale Referenz für alle Claude Code Sessions. Immer zuerst lesen, nie ignorieren.

---

## 💻 Hardware- & Pfad-Konfiguration (LOKALES SETUP)

Das Projekt wurde erfolgreich aus dem iCloud-Sync entfernt, um Filesystem-Hänger zu beheben.

- **Projektpfad:** `/Users/philippkuprecht/developer/anki-factory-web/` (rein lokal, KEIN iCloud/Cloud-Sync).
- **System:** MacBook Air M1 (8GB RAM).

---

## ⚠️ Vibe-Coding Workflow & Befehls-Regeln (STRENGSTENS BEACHTEN)

Der User ist ein Business-Student ("Vibe Coder") und steuert Claude ausschließlich über das IDE-Chat-Fenster, nicht über das manuelle Terminal.

1. **NIEMALS `npm run build` lokal ausführen:** Dieser Befehl überlastet den RAM des Laptops. Der Produktions-Build läuft ausschließlich vollautomatisch auf den Servern von Vercel nach einem Git-Push.
2. **Lokales Testen (`npm run dev`):** Wenn der User ein Feature live im Browser testen möchte, starte den lokalen Entwicklungs-Server im Hintergrund und gib ihm den lokalen Link (z. B. `http://localhost:3000`).
3. **Server stoppen:** Sobald der User im Chat signalisiert, dass er mit dem Testen fertig ist (oder eine neue Aufgabe beginnt), beende den Hintergrund-Prozess von `npm run dev` sofort eigenständig — nie mehrere Dev-Server parallel laufen lassen.
4. **Qualitäts-Check:** Nutze vor jedem Commit `npx tsc --noEmit` (+ ggf. `npx eslint <geänderte Dateien>`, da Vercel den Build bei ESLint-Errors abbricht). Wenn alles grün ist, committe und pushe direkt auf GitHub.
5. **Volle Build-Validierung** läuft ausschließlich über Vercel (Preview- oder Production-Deploy nach Push) — `npm run dev` ersetzt das nicht, es ist nur fürs visuelle Testen im Browser.

---

## Projektbeschreibung

Vollständige Neuimplementierung der lokalen Streamlit-App „Anki Factory" als cloud-gehostete Web-App.

**Kern-Features:**
- PDF hochladen → Flashcards automatisch mit Claude AI generieren
- Karten reviewen & editieren (Basic + Cloze-Typen, Tags, Kontext, Bilder)
- Kurse & Themen-Struktur zur Organisation
- Tägliches Lernen direkt im Browser mit echtem Spaced Repetition (FSRS-Algorithmus)
- Rating: Nochmal / Schwer / Gut / Einfach → App berechnet nächsten Wiederholtermin
- Multi-Tenant mit Supabase Auth, Plänen/Credits und Stripe-Billing (siehe Abschnitt unten)
- **General Feedback Channel:** Feedback-Kanal über die Sidebar (Bug/Idee/Sonstiges) mit Auswertung im Admin-Panel (`/admin`)

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
| PDF-Verarbeitung | pdf-parse / pdfjs-dist |
| SRS-Algorithmus | ts-fsrs (TypeScript FSRS Implementation) |
| Billing | Stripe |
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

## Auth & Multi-Tenant (aktueller Stand)

Die App ist **kein Single-User-Tool mehr** — vollständiger Multi-Tenant-Umbau ist abgeschlossen.

- **Auth:** Supabase Auth, Login via E-Mail/Passwort oder Google OAuth (`/login`, `/signup`, `/auth/callback`). Session-Handling über Cookies (SSR-Client in `lib/supabase/server.ts`, Browser-Client in `lib/supabase/client.ts`), Routing-Schutz über `middleware.ts`. Öffentliche Routen ohne Login: `/`, `/impressum`, `/datenschutz`, `/agb`.
- **Datenisolation:** `kurs`, `thema`, `karte` und weitere Tabellen (z. B. `session_results`, `lern_streak`) haben eine `user_id`-Spalte (→ `auth.users.id`). RLS-Policies erzwingen `user_id = auth.uid()` — jeder Nutzer sieht nur seine eigenen Daten. Admins haben **keinen** RLS-Bypass auf persönliche Nutzerdaten (Kurse/Karten), siehe Migration `0015_remove_admin_rls_bypass_user_data.sql`.
- **Profiles-Tabelle** (`profiles`): `id`, `email`, `plan`, `base_plan`, `plan_expires_at`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_cancel_at`, `credits_total`, `credits_used`, `credits_reset_at`, `is_admin`, `is_blocked`, `onboarding_completed`, `fachbereich`, `lernziel`, `lernfenster`, `created_at`.
- **Pläne/Credits:** Enums `basic` (Default), `basic_plus`, `premium`, `ultra`. Monatlicher Credit-Reset, Verbrauch pro API-Call über `increment_credits_used`.
- **Billing:** Volle Stripe-Subscription-Pipeline (siehe Migration `0010_*`).
- **Admin-Rolle:** Boolean-Spalte `is_admin` auf `profiles`, geprüft über `requireAdmin()` in `lib/admin.ts` (kein hardcoded Allowlist). Admins verwalten Nutzer, Plan-Configs, Invite-Codes, Kosten-Übersicht und das allgemeine Feedback — aber nicht die persönlichen Lerndaten anderer Nutzer.
- **Invite-Codes:** Tabelle `invite_codes` (`code`, `plan`, `credits`, `duration_months`, `used_by`, `used_at`, ...), Admin-Erstellung über `/app/api/admin/invite-codes/`, Einlösung bei Signup oder via `redeem_invite_code()` RPC. Befristete Codes fallen nach Ablauf auf `base_plan` zurück.
- Laufender Strang: siehe `docs/private_beta_roadmap.md` für geplante nächste Schritte (u. a. AI-Tutor-Chat "Cramo", Onboarding-Flow).

---

## Datenbankschema (Kernkarten-Tabelle)

```sql
-- karte: Flashcards mit FSRS-Feldern (gehört zu thema_id, thema gehört zu kurs_id, kurs gehört zu user_id)
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

Vollständiges, aktuelles Schema (inkl. `kurs`, `thema`, `profiles`, `invite_codes`, `general_feedback`, RLS-Policies etc.) liegt in `supabase/migrations/` — diese sind die Source of Truth, nicht dieses Dokument.

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
├── middleware.ts                # Auth-Routing-Schutz
├── app/
│   ├── layout.tsx              # Root Layout
│   ├── page.tsx                # Home → redirect zu /kurse
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── auth/callback/route.ts
│   ├── admin/page.tsx          # Admin-Panel
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
│   ├── admin/                  # Admin-Panel-Komponenten
│   └── ui/                     # shadcn/ui Komponenten
├── lib/
│   ├── supabase/
│   │   ├── server.ts            # Server/SSR Supabase Client
│   │   └── client.ts            # Browser Supabase Client
│   ├── admin.ts                 # requireAdmin()
│   ├── fsrs.ts                  # FSRS Wrapper (ts-fsrs)
│   ├── plans.ts                 # Plan-Konfiguration
│   └── types.ts                 # TypeScript Types
├── supabase/
│   └── migrations/              # Source of Truth für DB-Schema
└── app/api/
    ├── karten/route.ts          # GET/POST Karten
    ├── karte/[id]/
    │   ├── route.ts              # PATCH/DELETE einzelne Karte
    │   └── review/route.ts       # POST FSRS Review
    ├── kurse/route.ts
    ├── themen/route.ts
    ├── generieren/route.ts       # PDF → Flashcards (Claude API)
    ├── feedback-general/route.ts # User-Feedback einreichen
    └── admin/                    # Admin-only Routes (Nutzer, Invite-Codes, Feedback, Kosten)
```

---

## Umgebungsvariablen (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ovtpgwrrxscuvbprghhp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dHBnd3JyeHNjdXZicHJnaGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzEzNTUsImV4cCI6MjA5NjUwNzM1NX0.m-j9x6K9BMQwX4pzZioqzQa9LeJNoaU5MaCL1YRibWQ
ANTHROPIC_API_KEY=                # Aus bestehendem .env der Streamlit-App
FAL_KEY=                           # fal.ai API Key, für Bildgenerierung (siehe unten)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
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

Phasen 0–6 sind abgeschlossen (Supabase-Setup, Next.js-Grundgerüst, API Routes, Generierung & Review UI, FSRS Lern-Modus inkl. Drill-Mode, Deployment auf Vercel). Multi-Tenant-Umbau (Auth, RLS pro Nutzer, Pläne/Credits, Stripe-Billing, Invite-Codes, Admin-Panel) ist abgeschlossen. Detaillierte Phasen-Historie: siehe `docs/CHANGELOG.md`.

App ist live unter https://anki-factory-web.vercel.app, GitHub-Repo: https://github.com/kuprechtphilipp-ux/anki-factory-web (auto-deploy bei Push auf main).

Aktuell laufende Stränge: siehe `docs/private_beta_roadmap.md` (u. a. AI-Tutor-Chat "Cramo", Onboarding-Flow), kleinere UI-/Quiz-Bugfixes.

---

## Wichtige Hinweise für Claude Code

- Immer TypeScript, nie JavaScript
- Alle DB-Zugriffe über Supabase Client, nie direktes SQL im Frontend
- API Routes sind Server-only (kein "use client")
- PDF-Verarbeitung und Claude API calls nur in API Routes (nicht im Browser)
- FSRS-Berechnung passiert server-side in der review API Route
- Jede neue Tabelle/Datenänderung braucht eine RLS-Policy mit `user_id = auth.uid()` — niemals offene RLS ("erlaubt alles"), die App ist Multi-Tenant
- Admin-Routes immer über `requireAdmin()` (`lib/admin.ts`) absichern, nie eigene Admin-Checks erfinden
- shadcn/ui Komponenten via `npx shadcn@latest add [component]` installieren
- Bilder als base64 in der DB speichern (wie bisher in der Streamlit-App)
- **Finaler Schritt jeder Code-Änderung:** `npx tsc --noEmit` (+ ggf. `npx eslint <geänderte Dateien>`) ausführen, siehe Vibe-Coding-Regeln oben. Danach committen und pushen, siehe `docs/vercel_preview_workflow.md`.
