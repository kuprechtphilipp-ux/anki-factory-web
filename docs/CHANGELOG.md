# Anki Factory Web — Changelog / Phasen-Historie

Detaillierte Historie der abgeschlossenen Phasen. Für den aktuellen Stand siehe `CLAUDE.md` ("Aktueller Stand").

---

## ✅ Phase 0 — Supabase Setup (abgeschlossen)
- Supabase Projekt angelegt (eu-central-1)
- Vollständiges Schema mit FSRS-Feldern migriert
- CLAUDE.md erstellt
- Projektordner angelegt: `/Users/philippkuprecht/Desktop/anki-factory-web/`

## ✅ Phase 1 — Next.js Projektsetup (abgeschlossen)
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

## ✅ Phase 2 — API Routes (abgeschlossen)
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

## ✅ Phase 3 — UI: Generierung & Review (abgeschlossen)
- components/review-card.tsx — Karte im Review-Modus: alle Felder editierbar, Navigation, Buttons Übernehmen/Editieren & Übernehmen/Verwerfen
- components/karte-list-item.tsx — Expandierbarer Listeneintrag mit Status-Badge und Tag-Anzeige
- app/(app)/[kurs]/[thema]/page.tsx — 3 Tabs:
  - Generieren: PDF-Upload (Drag-Area), Detailgrad-Select (Gering/Mittel/Hoch), Batch-Size-Slider (1-10), Fortschrittsanzeige, "Zum Review"-Shortcut nach Generierung
  - Review: ReviewCard-Komponente, Karten-Navigation, Accept/Reject-Actions mit PATCH /api/karte/[id]
  - Alle Karten: Status-Filter, KarteListItem-Liste
- app/(app)/[kurs]/[thema]/alle/page.tsx — Standalone Alle-Karten-Seite mit Status-Filter
- app/api/generieren/route.ts — batch_size Parameter ergänzt (1-10, default 5)
- Build: ✅ sauber (nur img-Warnungen, keine Errors)

## ✅ Phase 4 — FSRS Lern-Modus (abgeschlossen)
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

## ✅ Phase 5 — Deployment (abgeschlossen)
- GitHub Repo: https://github.com/kuprechtphilipp-ux/anki-factory-web
- Vercel Projekt: https://anki-factory-web.vercel.app
- Vercel mit GitHub verknüpft (auto-deploy bei Push auf main)
- Umgebungsvariablen in Vercel gesetzt (production):
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - ANTHROPIC_API_KEY (server-only, nicht NEXT_PUBLIC_)
- .env.local nie committed (.gitignore: .env*.local)
- Build auf Vercel: ✅ sauber (nur img-Warnungen, keine Errors)

## ✅ Phase 6 — Lernsystem-Verbesserungen (abgeschlossen)
- app/api/karte/[id]/review/route.ts — Learning Steps + mode=srs|drill:
  - State 0/1: Rating 1→+1Min, 2→+6Min, 3→+10Min+Graduate, 4→FSRS Easy
  - State 2: Rating 1→+10Min+Relearning, 2/3/4→FSRS normal
  - State 3: Rating 1→+10Min stay, 3/4→FSRS normal
  - Drill-Mode: Gewusst=FSRS ohne Verkürzung, NichtGewusst=+1h
  - Response enthält nextIntervals für UI-Hints über Buttons
- app/api/karten/route.ts — mode=srs: strukturierte Queue {learning, reviews, neue, total}, mode=drill: alle reviewed Karten
- app/(app)/[kurs]/[thema]/lernen/page.tsx — Kompletter Umbau:
  - ts-fsrs client-seitig für Intervall-Vorschau ohne API-Round-Trip
  - 3 Pills (Lernen/Reviews/Neu) mit aktuellen Counts
  - Anki-style Card: 9px Label, text-xl Frage, text-lg Antwort in text-primary, Kontext mit linker Border, Foliennummer
  - Reveal-Animation (animate-fade-in), "Kommt zurück"-Badge, fade-out/in Transition
  - Tastatur: Leertaste=Reveal, 1-4=Rating
  - Session-Ende mit Metriken (neu gelernt, Reviews, Min. gelernt)
- app/(app)/[kurs]/[thema]/drill/page.tsx — NEU:
  - Alle reviewed Karten, zufällige Reihenfolge, kein FSRS-Stress
  - Binär: Gewusst [4] / Nicht gewusst [1], falsche ans Ende der Queue
  - Score: Prozentzahl + "X / Y gewusst", "Nochmal (nur falsche)" Option
  - Kreis-Progress, "X zum Wiederholen"-Badge
- app/(app)/[kurs]/[thema]/page.tsx — Banner: zwei Buttons "Lernen" + "Drill"
- app/(app)/kurse/page.tsx — Lernstand-Tabelle unter Kurs-Cards:
  - Thema | Neu | Lernen | Fällig | Icon-Buttons
  - Farbkodierung: 0=gedimmt, >0 Fällig=emerald, >50=rose
  - Async-Loading nach Haupt-Inhalt
- Build: ✅ sauber (nur img-Warnungen wie zuvor)
