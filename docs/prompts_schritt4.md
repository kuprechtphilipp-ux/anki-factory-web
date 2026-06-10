# Schritt 4 — Builder-Prompts (4A + 4B)

Erstellt: 2026-06-10. Zwei unabhängige Prompts für zwei separate Claude-Code-Fenster (parallel ausführbar).
Beide Builder-Agents lesen zuerst `CLAUDE.md` und `docs/MEMORY.md` im Repo-Root.

---

## Prompt 4A — Credits/Codes-System

```text
[Sprint-Schritt 4A]: Credits/Codes-System (Invite-Code-Redemption + Credit-Check vor Claude-Calls + Donut im /kosten-Tab)

KONTEXT:
- Lies zuerst CLAUDE.md und docs/MEMORY.md im Repo-Root für den Gesamtkontext.
- profiles-Tabelle existiert bereits (id, email, plan, credits_total, credits_used, is_admin, onboarding_completed).
  Default bei Signup (via Trigger handle_new_user in supabase/migrations/0001_multi_tenant_credits.sql): plan='basic', credits_total=50, credits_used=0.
- invite_codes-Tabelle existiert bereits (id, code UNIQUE, plan CHECK IN ('basic_plus','premium','ultra'), credits, used_by, used_at, created_at, created_by).
  Tabelle ist aktuell LEER, RLS erlaubt Zugriff nur für Admins (is_admin()).
- Credit-Konvention: 1 Credit = 1 Cent.
  - basic (Default ohne Code): 50 Credits = 0,50€
  - basic_plus (Code): 100 Credits = 1€
  - premium (Code): 300 Credits = 3€
  - ultra (Code): 500 Credits = 5€
  - Bei aufgebrauchten Credits: Meldung + Kontakt-Hinweis "philipp.kuprecht@student.unisg.ch"
- Signup-UI: app/(auth)/signup/page.tsx — aktuell nur Email + Passwort, Client-Component, ruft
  supabase.auth.signUp({ email, password }) direkt auf (createClient aus lib/supabase/client).
- Die 4 Claude-Call-Routen loggen bereits Usage über lib/api-cost.ts -> logApiUsage() (Tabelle api_usage,
  Spalte cost_usd in USD):
  - app/api/generieren/route.ts (Anthropic-Call ~Zeile 269-274, logApiUsage ~276-283)
  - app/api/prescan/route.ts (Anthropic-Call ~Zeile 137-156, logApiUsage ~158-165)
  - app/api/quiz-generieren/route.ts (Anthropic-Call ~Zeile 139-144, logApiUsage ~146-153)
  - app/api/antwort-pruefen/route.ts (Anthropic-Call ~Zeile 47-51, logApiUsage ~53-59)
  Alle vier holen den User bereits via `const { data: { user } } = await supabase.auth.getUser()`.
- /kosten-Tab: app/(app)/kosten/page.tsx (Client-Component) holt Daten von app/api/kosten/route.ts
  (gibt heute/woche/monat/gesamt in USD, proFeature, proTag, letzteAufrufe zurück). Kein Chart-Paket
  installiert -> bisherige Bar-Charts sind handgebaute SVGs.

CONSTRAINTS (EINSCHRÄNKUNGEN):
- Verändere NICHT die Kartengenerierung, Prompt-Logik, FSRS-Algorithmus oder die bestehende
  USD-Kostenanzeige in /kosten — du ergänzt nur Credits zusätzlich.
- Keine neuen npm-Pakete für Charts — nutze handgebautes SVG (wie bei den bestehenden Bar-Charts).
- Alle DB-Schreibzugriffe weiterhin über lib/supabase/server.ts (Server-Client), nichts client-seitig
  mit Service-Role-Key.
- `npm run build` läuft lokal NICHT (bekanntes Problem, siehe docs/MEMORY.md) -> nutze
  `npx tsc --noEmit` zur Verifikation.
- Falls dir ein Supabase-MCP-Tool zur Verfügung steht: wende die Migration direkt auf das
  Supabase-Projekt (ovtpgwrrxscuvbprghhp) an. Falls nicht: lege die Migrationsdatei im Repo an
  UND gib am Ende der Session das vollständige SQL aus, damit der User es manuell im
  Supabase SQL-Editor ausführen kann.

AUFGABEN:

1. Migration `supabase/migrations/0002_invite_code_redemption.sql` anlegen mit:
   a) Update der bestehenden Funktion `public.handle_new_user()`:
      - Liest `NEW.raw_user_meta_data->>'invite_code'`.
      - Falls vorhanden: sucht in `invite_codes` nach `code = <wert> AND used_by IS NULL`
        (mit `FOR UPDATE` gegen Race Conditions).
      - Falls gefunden: legt die `profiles`-Zeile mit `plan` und `credits_total` aus dem
        Invite-Code an (credits_used=0) und markiert den Code als eingelöst
        (`used_by = NEW.id, used_at = NOW()`).
      - Falls kein/ungültiger Code: Verhalten wie bisher (Default plan='basic', credits_total=50).
      - Funktion bleibt SECURITY DEFINER mit SET search_path = public.
   b) Neue Funktion `public.check_invite_code(p_code TEXT) RETURNS TABLE(plan TEXT, credits INTEGER)`,
      SECURITY DEFINER, liest `invite_codes WHERE code = p_code AND used_by IS NULL`.
      `GRANT EXECUTE ... TO anon, authenticated` (wird vor dem Signup aufgerufen, User ist
      ggf. noch nicht eingeloggt).
   c) Neue Funktion `public.increment_credits_used(p_user_id UUID, p_amount INTEGER) RETURNS VOID`,
      SECURITY DEFINER, `UPDATE profiles SET credits_used = credits_used + p_amount WHERE id = p_user_id`.
      `GRANT EXECUTE ... TO authenticated`.

2. Signup-Flow erweitern (app/(auth)/signup/page.tsx):
   - Optionales Eingabefeld "Einladungscode" (Label klar als optional kennzeichnen).
   - Bei Eingabe eines Codes vor dem `signUp()`-Call: `supabase.rpc('check_invite_code', { p_code: code })`
     aufrufen. Ist der Code ungültig/leer-Ergebnis -> Fehlermeldung anzeigen ("Code ungültig oder
     bereits verwendet"), Signup nicht durchführen.
   - Ist der Code gültig: `supabase.auth.signUp({ email, password, options: { data: { invite_code: code } } })`.
     Ohne Code: wie bisher ohne `data`.
   - Erfolgsmeldung anpassen, falls ein Plan via Code aktiviert wurde (z. B. "Account erstellt — Plan: premium").

3. Credit-Check + Increment in den 4 Claude-Call-Routen ergänzen. Lege dafür in lib/api-cost.ts
   zwei Helper an:
   - `async function getCreditStatus(supabase, userId): Promise<{ creditsTotal: number; creditsUsed: number; exhausted: boolean }>`
     (liest profiles credits_total/credits_used für userId).
   - `async function incrementCreditsUsed(supabase, userId, costUsd): Promise<void>`
     (rechnet `Math.ceil(costUsd * 100)` Credits, ruft `supabase.rpc('increment_credits_used', { p_user_id: userId, p_amount: <credits> })`).
   In jeder der 4 Routen (generieren, prescan, quiz-generieren, antwort-pruefen):
   - Direkt nach `auth.getUser()`: `getCreditStatus` aufrufen. Falls `exhausted` -> sofort
     `NextResponse.json({ error: 'credits_exhausted', message: 'Deine Credits sind aufgebraucht. Kontaktiere philipp.kuprecht@student.unisg.ch für mehr Credits.' }, { status: 402 })`
     zurückgeben, BEVOR der Anthropic-Call gemacht wird.
   - Direkt nach dem bestehenden `logApiUsage(...)`-Aufruf: `incrementCreditsUsed(supabase, user.id, cost_usd)`
     aufrufen (cost_usd kommt aus `calcCost(...)`, das logApiUsage bereits intern berechnet —
     prüfe, ob du `calcCost` separat aufrufen musst oder ob du logApiUsage so erweiterst, dass es
     den berechneten cost_usd zurückgibt; wähle die sauberere Variante und halte sie in allen
     4 Routen konsistent).

4. "Credits aufgebraucht"-UI: In den Frontend-Stellen, die diese 4 APIs aufrufen
   (z. B. app/(app)/[kurs]/[thema]/page.tsx für generieren/prescan, sowie die Quiz-/
   Schriftlich-Komponenten — finde sie via grep auf die jeweiligen API-Pfade), den Fall
   `response.status === 402` abfangen und statt der generischen Fehlermeldung einen Hinweis
   mit Mailto-Link anzeigen: "Deine Credits sind aufgebraucht. Schreib mir für mehr Credits:
   philipp.kuprecht@student.unisg.ch" (als Toast via sonner UND/ODER als Inline-Banner,
   je nachdem was im jeweiligen UI-Kontext besser passt — bestehendes Error-Handling-Pattern
   der jeweiligen Datei beibehalten).

5. /kosten-Tab erweitern:
   - app/api/kosten/route.ts: zusätzlich `profiles`-Zeile des eingeloggten Users laden
     (plan, credits_total, credits_used) und im Response-JSON unter einem neuen Key
     `credits: { plan, total, used, remaining }` zurückgeben.
   - app/(app)/kosten/page.tsx: neue Karte/Sektion mit Donut-Chart (SVG, `stroke-dasharray`
     basierend auf `used/total`), zeigt "X / Y Credits verbraucht" + aktuellen Plan-Namen.
     Bei `used >= total`: Donut in Warnfarbe (z. B. `text-rose-500`) + Hinweistext mit
     Mailto-Link wie in Aufgabe 4.

VERIFIKATION:
- `npx tsc --noEmit` fehlerfrei.
- Liste am Ende alle neu erstellten und geänderten Dateien auf (inkl. der Migration).
- Falls die Migration NICHT via MCP angewendet werden konnte: gib das vollständige SQL der
  Migration 0002 noch einmal im Klartext aus.
```

---

## Prompt 4B — Admin-Panel v1

```text
[Sprint-Schritt 4B]: Admin-Panel v1 unter /admin (User-Übersicht, Invite-Code-Generator, manuelles Credit-Aufladen)

KONTEXT:
- Lies zuerst CLAUDE.md und docs/MEMORY.md im Repo-Root für den Gesamtkontext.
- profiles-Tabelle (id=auth.users.id, email, plan, credits_total, credits_used, is_admin,
  onboarding_completed, created_at) und invite_codes-Tabelle (id, code UNIQUE, plan CHECK IN
  ('basic_plus','premium','ultra'), credits, used_by, used_at, created_at, created_by) existieren
  bereits (supabase/migrations/0001_multi_tenant_credits.sql).
- RLS ist auf allen Tabellen aktiv. Helper `is_admin()` (SECURITY DEFINER) prüft `profiles.is_admin`.
  Policies: `profiles` -> eigene Zeile ODER admin (voller Zugriff); `invite_codes` -> admin-only
  (voller Zugriff). D.h. ein eingeloggter Admin-User kann über den normalen Server-Client
  (lib/supabase/server.ts createClient()) bereits ALLE profiles- und invite_codes-Zeilen lesen
  und schreiben — keine zusätzliche RLS-Änderung nötig.
- Mein Account kuprechtphilipp@gmail.com hat bereits `is_admin=true`, `plan='ultra'`.
- Credit-Konvention: 1 Credit = 1 Cent.
  - basic (Default ohne Code): 50 Credits = 0,50€
  - basic_plus (Code): 100 Credits = 1€
  - premium (Code): 300 Credits = 3€
  - ultra (Code): 500 Credits = 5€
- lib/types.ts enthält bereits: `Plan = 'basic' | 'basic_plus' | 'premium' | 'ultra'`,
  `Profile { id, email, plan, credits_total, credits_used, is_admin, onboarding_completed, created_at }`,
  `InviteCode { id, code, plan, credits, used_by, used_at, created_at, created_by }`.
- components/sidebar.tsx: Nav-Items sind `Link`-Komponenten mit `cn(...)` für aktive/inaktive
  Styles, Icons aus lucide-react. Aktuelle Items: /kurse, /statistik, /kosten.
- Verfügbare shadcn/ui-Komponenten (components/ui/): button, input, label, card, dialog, select,
  tabs, progress, slider, badge, separator, toggle, textarea. Bei Bedarf weitere via
  `npx shadcn@latest add [component]` installieren (z. B. table, alert-dialog) — npx-Befehle
  sind ok, kein vollständiger `npm run build` nötig.
- Server-Client: `lib/supabase/server.ts` -> `await createClient()` (cookie-basiert, async).

CONSTRAINTS (EINSCHRÄNKUNGEN):
- Verändere NICHT die bestehenden RLS-Policies, die Kartengenerierung, FSRS-Logik oder
  bestehende API-Routen außer components/sidebar.tsx (für den Nav-Link).
- Kein Service-Role-Key verwenden — alle Admin-Zugriffe laufen über den normalen
  Server-Client + RLS via is_admin().
- Keine neuen Chart-Pakete — Donut als handgebautes SVG (analog zu Schritt 4A, falls dieser
  bereits gemerged ist; falls nicht, eigenständiges kleines SVG, keine Abhängigkeit zu 4A).
- `npm run build` läuft lokal NICHT (bekanntes Problem) -> nutze `npx tsc --noEmit`.

AUFGABEN:

1. Server-seitiger Zugriffsschutz für /admin:
   - Neue Seite `app/(app)/admin/page.tsx` (Server Component): lädt eingeloggten User via
     `supabase.auth.getUser()`, lädt dessen `profiles`-Zeile (`is_admin`). Falls kein User oder
     `is_admin !== true` -> `redirect('/kurse')` (next/navigation).
   - Falls Admin: rendere die Admin-UI (siehe Aufgabe 3), ggf. als separate Client-Components
     unter `components/admin/` ausgelagert.

2. API-Routen unter app/api/admin/:
   - `GET /api/admin/users` (route.ts): Auth-Check (401 falls kein User), Admin-Check
     (403 falls `is_admin !== true`), dann `SELECT id, email, plan, credits_total, credits_used,
     created_at FROM profiles ORDER BY created_at DESC` (RLS erlaubt Admin alles).
   - `GET /api/admin/invite-codes`: Auth+Admin-Check, dann alle `invite_codes` laden
     (inkl. `used_by` -> optional gejoint mit profiles.email für Anzeige, sonst nur UUID).
   - `POST /api/admin/invite-codes`: Body `{ plan: 'basic_plus'|'premium'|'ultra', credits: number }`
     (credits serverseitig auf den Standardwert für den Plan setzen, falls nicht mitgeschickt:
     basic_plus=100, premium=300, ultra=500). Generiere einen zufälligen, gut lesbaren Code
     (z. B. 8-stelliger alphanumerischer String, uppercase, ohne verwechselbare Zeichen wie
     0/O/1/I). Insert mit `created_by = <admin user id>`. Gib den neuen Code zurück.
   - `PATCH /api/admin/users/[id]/credits`: Body `{ creditsToAdd: number }` (positive Ganzzahl).
     Auth+Admin-Check, dann `UPDATE profiles SET credits_total = credits_total + creditsToAdd
     WHERE id = <id>`. Gib die aktualisierte Zeile zurück.

3. Admin-UI (app/(app)/admin/page.tsx + ggf. components/admin/*):
   - Tab oder zwei Sektionen: "Nutzer" und "Invite-Codes" (z. B. mit der bereits installierten
     `tabs`-Komponente).
   - **Nutzer-Tabelle**: Spalten Email, Plan (Badge), Credits (Donut-SVG `used/total` + Text
     "X / Y"), Aktion-Button "Credits aufladen" (öffnet `dialog` mit Zahlen-Input
     "Credits hinzufügen", ruft PATCH /api/admin/users/[id]/credits, danach Tabelle neu laden).
   - **Invite-Codes-Sektion**: Formular zum Erstellen (Plan-`select`: basic_plus/premium/ultra,
     optional Credits-Override-Input), Button "Code generieren" -> POST /api/admin/invite-codes,
     zeigt neuen Code prominent an (mit Copy-to-Clipboard). Darunter Tabelle aller bestehenden
     Codes: Code, Plan, Credits, Status (Badge "offen" / "eingelöst von <email> am <datum>").
   - Lade-/Fehlerzustände wie in app/(app)/kosten/page.tsx (gleiches Muster: useEffect + fetch,
     sonner-Toasts für Fehler).

4. Sidebar-Link (components/sidebar.tsx):
   - Beim Laden der Sidebar zusätzlich `is_admin` des eingeloggten Users laden (z. B. über
     bestehenden Supabase-Client-Aufruf in dieser Komponente erweitern).
   - Nur wenn `is_admin === true`: zusätzlichen Nav-Link "Admin" zu `/admin` rendern
     (gleiches Styling-Pattern wie bestehende Links, passendes lucide-react-Icon, z. B.
     `ShieldCheck` oder `Settings`).

VERIFIKATION:
- `npx tsc --noEmit` fehlerfrei.
- Liste am Ende alle neu erstellten und geänderten Dateien auf.
- Stelle sicher, dass /admin für nicht-Admin-User zu /kurse redirected (Code-Review der
  redirect-Logik genügt, kein Live-Test nötig).
```
