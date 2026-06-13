# Handoff: "Komplexe visuelle Folien" Test-Pipeline

Kontext für eine neue Claude Code Session. Ausgangspunkt: Freundin des Users konnte
aus einer 84-seitigen Chemie-PDF (OC I, Funktionelle Gruppen/Nomenklatur) keine
Flashcards generieren — Pre-Scan lief in einen 60s-Timeout (Vercel Hobby, kein
Pro-Upgrade gewünscht).

## Entschiedener Ansatz

Statt den bestehenden Generierungsprozess umzubauen (Risiko für Output-Qualität),
wird ein **komplett separater, paralleler Pfad** aufgebaut, der per UI-Toggle
"Komplexe visuelle Folien (Beta)" aktiviert werden kann. Default = aus, bestehender
Prozess bleibt für alle unverändert, bis der User (selbst + Freundin, auch mit
BWL-Decks) den neuen Pfad als gleichwertig zuverlässig validiert hat.

**Harte Vorgabe des Users:** Output-Qualität der bestehenden Karten darf sich
durch keine Änderung verschlechtern. Deshalb additiv bauen, nichts Bestehendes
umbiegen.

### Architektur des neuen Pfads (Zielbild)

| Schritt | Bestehender Prozess (unverändert) | Neuer "Visual Deck"-Pfad |
|---|---|---|
| Pre-Scan | `/api/prescan` — ganzes PDF als Vision-Dokument an Haiku (60s-Timeout-Risiko bei vielen Seiten) | `/api/prescan-text` — nur extrahierter Text (pdf-parse) an Haiku, kein Timeout-Risiko |
| Generierung | `/api/generieren`, Vision-Toggle default AUS | Vision soll default AN sein, **und** PDF muss vor dem Senden auf den Batch-Seitenbereich zugeschnitten werden (sonst gleiches Timeout-Risiko wie alter Pre-Scan, da Vision jetzt Standard ist) |
| Bild-Einbettung | nicht vorhanden | Claude liefert pro Karte `bild_relevant: boolean`; Frontend rendert die entsprechende PDF-Seite clientseitig (pdfjs-dist) zu einem base64-Bild und speichert es in `karte.image_b64` |

**Wichtige Erkenntnisse aus Tests (siehe Conversation-History, nicht erneut testen nötig):**
- Side-by-side-Test (4 Chemie-Folien, sonnet-4-6): Text-only vs. Vision lieferte
  fast gleichwertige Karten (5 vs. 6 Karten, gleiche Kernfakten). Grund: Die
  Folien haben fast alle prüfungsrelevanten Fakten als Text-Labels (Zahlen,
  Namen, IUPAC-Begriffe), die pdf-parse zuverlässig extrahiert.
- Bild-Einbettung sollte **clientseitig** (Browser, pdfjs-dist) passieren, NICHT
  serverseitig — kein zusätzlicher Claude-Call, kein Vercel-Timeout-Risiko, keine
  API-Mehrkosten. PDF liegt eh schon im Browser (User-Upload).
- Pre-Scan braucht praktisch nie Vision — Ausnahme: eingescannte PDFs ohne
  Text-Layer (pdf-parse liefert dann fast nichts). Dafür könnte man später eine
  automatische Heuristik einbauen (avg. Zeichen/Seite < ~50 → Fallback auf
  Vision-Pre-Scan), ist aber NICHT Teil des aktuellen Scopes.

## Bereits umgesetzt (Schritt 1 — fertig, tsc + eslint clean)

1. **Neue Route** [`app/api/prescan-text/route.ts`](../app/api/prescan-text/route.ts)
   — eigenständige Kopie von `/api/prescan`, aber:
   - extrahiert Text via `pdf-parse` (`extractPageTexts`, gleiche Logik wie in
     `app/api/generieren/route.ts`, bewusst dupliziert statt geteilt, um den
     bestehenden Pfad nicht anzufassen)
   - schickt `--- Seite N ---\n<text>`-Block statt PDF-Base64 an
     `claude-haiku-4-5-20251001`
   - gleiches Output-JSON-Schema wie `/api/prescan` (`PrescanResult` aus
     `lib/types.ts`, keine Änderung nötig)
   - loggt Kosten unter neuem Feature-Namen `'prescan-text'`

2. **`lib/api-cost.ts`**: `feature`-Union um `'prescan-text'` erweitert (1 Zeile).

3. **UI** in [`app/(app)/[kurs]/[thema]/page.tsx`](../app/(app)/%5Bkurs%5D/%5Bthema%5D/page.tsx):
   - neuer State `visualDeckMode` (default `false`), direkt nach `visionMode`
     deklariert (~Zeile 110)
   - neuer Toggle "Komplexe visuelle Folien (Beta)" direkt unter der
     PDF-Upload-Box (vor "Pre-Scan: Scanning state")
   - `handlePrescan` ruft `/api/prescan-text` statt `/api/prescan`, wenn
     `visualDeckMode === true` — sonst identischer Ablauf (Batches,
     Konzepte-Checkboxen, etc. unverändert)

## Bereits umgesetzt (Schritt 2 — fertig, tsc + eslint clean)

1. **`lib/types.ts`/`package.json`**: neue Dependency `pdf-lib` hinzugefügt
   (reines JS, kein Native-Code, kein Build-Risiko).

2. **`app/api/generieren/route.ts`**:
   - neues FormData-Feld `visual_deck` ausgewertet:
     `const visualDeckMode = (formData.get('visual_deck') as string) === 'true'`
   - `useVision` wird zu `visualDeckMode || vision === 'true'` — Visual-Deck-Modus
     erzwingt Vision serverseitig, unabhängig vom `visionMode`-Toggle des
     Standardpfads (der bleibt unverändert)
   - neue Helper-Funktion `cropPdfToPages(buffer, fromPage, toPage)` (via
     `pdf-lib`, 1-indexiert/inklusiv) schneidet das PDF auf den
     Batch-Seitenbereich zu
   - im `useVision`-Branch: wenn `visualDeckMode && pageFrom && pageTo`, wird
     `pdfBuffer` vor dem Base64-Encoding via `cropPdfToPages` zugeschnitten
     (mit Fallback auf das komplette PDF bei Crop-Fehler, geloggt)
   - bestehender Vision-Branch ohne `visual_deck` (manueller Toggle) bleibt
     unverändert — kein Crop, identisches Verhalten wie zuvor

3. **UI** in [`app/(app)/[kurs]/[thema]/page.tsx`](../app/(app)/%5Bkurs%5D/%5Bthema%5D/page.tsx):
   - `runGenerieren` sendet zusätzlich `form.append('visual_deck', visualDeckMode ? 'true' : 'false')`

**Status:** Toggle "Komplexe visuelle Folien (Beta)" steuert jetzt Pre-Scan
UND Generierung (Vision erzwungen + Batch-Crop). Noch nicht getestet —
Validierung mit Test-PDF steht aus.

## Bereits umgesetzt (Schritt 3 — fertig, tsc + eslint clean, noch NICHT getestet)

1. **`package.json`**: `pdfjs-dist` (v6) als neue Dependency hinzugefügt.

2. **`app/api/generieren/route.ts`**:
   - `RawCard`-Interface um `bild_relevant?: boolean` erweitert
   - `SYSTEM_PROMPT_BASE` um Abschnitt "BILD-RELEVANZ" ergänzt + beide
     JSON-Schema-Beispiele um `"bild_relevant": false` erweitert — additiv,
     gilt für BEIDE Pfade (Standard + Visual-Deck), da nur ein gemeinsamer
     Prompt existiert. Erwartung: kaum Einfluss auf bestehenden Output, da
     Anweisung klar auf "Minderheit der Karten" abzielt.
   - `kartenInsert` enthält jetzt zusätzlich `bild_relevant: card.bild_relevant ?? false`
     — **transientes Feld, KEINE DB-Spalte**, wird vom Frontend vor dem
     Speichern wieder entfernt (siehe unten)

3. **Neue Datei `lib/pdf-render.ts`** (clientseitig, pdfjs-dist):
   - `loadPdfDocument(pdfBytes)` — lädt das PDF einmal
   - `renderPageToBase64(pdf, pageNumber)` — rendert eine 1-indexierte Seite
     auf Canvas, downscaled auf max. 800px Breite, Export als **JPEG** (Qualität
     0.85, weisser Hintergrund statt Transparenz) — JPEG bewusst gewählt, weil
     `lern-card.tsx`/`review-card.tsx`/`karte-list-item.tsx` bereits
     `data:image/jpeg;base64,${karte.image_b64}` hart-codiert erwarten
   - Worker via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`

4. **UI** in [`app/(app)/[kurs]/[thema]/page.tsx`](../app/(app)/%5Bkurs%5D/%5Bthema%5D/page.tsx),
   `runGenerieren`:
   - wenn `visualDeckMode`: für alle Karten mit `bild_relevant && slide_nr`
     wird einmal `loadPdfDocument` aufgerufen, dann pro Karte
     `renderPageToBase64` → Ergebnis in `karte.image_b64`
   - `bild_relevant` wird aus jeder Karte entfernt (`delete`), bevor das Array
     an `/api/karten` POST geht (sonst Supabase-Insert-Fehler, da keine
     DB-Spalte)
   - Whole-page-Bild als MVP (kein Crop auf Bildausschnitt — würde
     Bounding-Box-Koordinaten von Claude brauchen)

5. **`components/lern-card.tsx`**: Bild (`karte.image_b64`) wird nicht mehr
   permanent oben angezeigt, sondern erst im `revealed`-Block nach
   Antwort/Kontext — dient als zusätzlicher visueller Kontext zur Antwort,
   ohne die Frage zu spoilern. Review-Tab (`review-card.tsx`) und Karten-Liste
   (`karte-list-item.tsx`) unverändert (Bild weiterhin permanent sichtbar —
   dort geht's um Review/Editieren, kein Spoiler-Risiko).

**Noch zu tun:**
- Mit Chemie-PDF testen: erzeugt Claude sinnvolle `bild_relevant: true`
  Markierungen? Werden Bilder korrekt gerendert und angezeigt
  (Review-Tab + Lern-Modus)?
- Prüfen, ob bestehender Standardpfad (ohne Visual-Deck-Toggle) durch die
  Prompt-Änderung (neues `bild_relevant`-Feld im Schema) unverändert bleibt
  (Output-Qualität/Kartenmenge gleich wie vorher)
- `npx tsc --noEmit` + `npx eslint` bereits clean, aber noch nicht committed/gepusht

### Validierung
- Test-PDF liegt unter `/Users/philippkuprecht/Downloads/OC1_25_PPP_05_Funktionelle_Gr_Nomenklatur (1).pdf`
  (84 Seiten, 3.3 MB) — gut geeignet zum Testen von Schritt 1+2
- User will zusätzlich eigene BWL-Decks testen, um zu prüfen, ob der neue Pfad
  auch für textbasierte Fächer gleichwertig ist
- Nach jedem Schritt: `npx tsc --noEmit` (+ `npx eslint <geänderte Dateien>`),
  dann committen/pushen für Vercel-Preview-Test (siehe
  `docs/vercel_preview_workflow.md`)

## Separat besprochene, noch nicht umgesetzte Punkte (niedrige Priorität)
- JSON-Parsing in `/api/generieren` robuster machen (bei `max_tokens`-Abbruch
  aktuell Totalverlust des Batches) — Null-Risiko-Fix, unabhängig vom
  Visual-Deck-Feature, kann jederzeit separat gemacht werden
