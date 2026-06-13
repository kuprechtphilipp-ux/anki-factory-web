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

## Nächste Schritte

### Schritt 3: Bild-Einbettung
- `RawCard`-Interface in `/api/generieren/route.ts` (bzw. neuem Pfad) um
  `bild_relevant: boolean` erweitern + Prompt-Anweisung ergänzen (additiv, neues
  Feld im JSON-Schema — sollte bestehenden Output nicht verändern, da bestehender
  Prompt/Pfad davon unberührt bleibt)
- `pdfjs-dist` als Dependency hinzufügen
- Im Frontend: nach Erhalt der generierten Karten, für Karten mit
  `bild_relevant === true` und vorhandener `slide_nummer`, die entsprechende
  PDF-Seite rendern (Canvas → PNG, downscale auf ~800px Breite) → base64 → in
  `karte.image_b64` vor dem Speichern via `/api/karten` POST
- Whole-page-Bild als MVP (kein Crop auf Bildausschnitt — würde Bounding-Box-
  Koordinaten von Claude brauchen, mehr Prompt-Komplexität, Risiko für
  bestehenden Output)

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
