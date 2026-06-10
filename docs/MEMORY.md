# MEMORY.md — Private Beta / Multi-User Sprint

Stand: 2026-06-10. Lies dies zusammen mit CLAUDE.md, bevor du weiterarbeitest.

---

## ✅ Abgeschlossen & LIVE auf Production (https://anki-factory-web.vercel.app)

### Schritt 1 — Auth-Grundgerüst
- Supabase Auth via `@supabase/ssr`
- `lib/supabase/client.ts` (Browser-Client), `lib/supabase/server.ts` (Server-Client, cookie-basiert)
- `middleware.ts` schützt alle Routen außer `/login`, `/signup`, `/api`, statische Assets
- `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` (E-Mail/Passwort, noch ohne Code-Feld)
- Logout-Button in `components/sidebar.tsx`
- `lib/supabase.ts` (alter Anon-Client) ist NICHT mehr in Verwendung — alle API-Routen nutzen jetzt `lib/supabase/server.ts`

### Schritt 2 — DB-Schema-Fundament (Migration: `supabase/migrations/0001_multi_tenant_credits.sql`)
- **`profiles`**: `id` (=auth.users.id, PK), `email`, `plan` ('basic'|'basic_plus'|'premium'|'ultra'), `credits_total`, `credits_used`, `is_admin`, `onboarding_completed`, `created_at`
  - Trigger `on_auth_user_created` → `handle_new_user()`: legt bei jedem Signup automatisch eine Zeile an (Default `plan='basic'`, `credits_total=50`, `credits_used=0`)
- **`invite_codes`**: `id`, `code` (UNIQUE), `plan`, `credits`, `used_by`, `used_at`, `created_at`, `created_by` — Tabelle existiert, ist aber LEER. Redemption-Logik fehlt noch (Schritt 4).
- `user_id UUID REFERENCES auth.users(id)` ergänzt auf: `kurs` (NOT NULL), `api_usage`, `generier_profil` (UNIQUE), `lern_streak` (+ UNIQUE(user_id, datum) ersetzt altes UNIQUE(datum)), `deck_feedback`, `session_results` (NOT NULL)
- `lib/types.ts`: `Kurs.user_id`, neue Interfaces `Profile`, `InviteCode`, `Plan`-Type, beide neuen Tabellen in `Database.Tables`

### Schritt 3 — API-Routen-Ownership (22 Dateien, Commit `1a3d24e`)
- Alle Routen unter `app/api/` nutzen `lib/supabase/server.ts`, rufen `auth.getUser()` auf, geben **401** zurück wenn nicht eingeloggt
- Queries gefiltert nach `user_id = user.id` bzw. Ownership-Chain (thema→kurs, karte→thema→kurs)

### Schritt 5 — RLS (live in Supabase-Projekt ovtpgwrrxscuvbprghhp)
- RLS aktiv auf allen 11 Tabellen
- Helper `is_admin()` (SECURITY DEFINER, prüft `profiles.is_admin`)
- Ownership-Policies: `kurs`/`api_usage`/`generier_profil`/`deck_feedback`/`lern_streak`/`session_results` → `user_id = auth.uid() OR is_admin()`; `thema`/`karte`/`review_log` → via Join-Chain zu `kurs.user_id`; `profiles` → eigene Zeile oder admin; `invite_codes` → admin-only

### Mein Account
- `kuprechtphilipp@gmail.com`: `is_admin=true`, `plan='ultra'`, `credits_total=100000`
- Bestehende 2 Kurse / 13 Themen / 79 Karten korrekt auf meine `user_id` migriert

### Nachtrag zu Schritt 3 (Fix nach RLS-Aktivierung, bereits deployed)
- `lib/supabase.ts` (von 9 Client-Components genutzt, u.a. `app/(app)/kurse/page.tsx`, `components/sidebar.tsx`) war noch ein reiner Anon-Client (`createClient` aus `@supabase/supabase-js`) ohne Session-Kontext → mit aktivem RLS lieferten diese Client-seitigen Reads leere Ergebnisse (Kurse verschwanden im Frontend), obwohl die DB-Daten korrekt waren.
- **Fix (deployed):** `lib/supabase.ts` nutzt jetzt `createBrowserClient` aus `@supabase/ssr` (session-bewusst), gleicher Export-Name `supabase` → keine Änderung an den 9 Aufrufstellen nötig. Verifiziert: Kurse wieder sichtbar.

---

## 🔴 Offen — Schritt 4

### Credit-Konvention (gilt für beide Teilschritte!)
- 1 Credit = 1 Cent
- `basic` (Default ohne Code): 50 Credits = 0,50€
- `basic_plus` (Code): 100 Credits = 1€
- `premium` (Code): 300 Credits = 3€
- `ultra` (Code): 500 Credits = 5€
- Bei Credits aufgebraucht: Meldung + Kontakt-Hinweis `philipp.kuprecht@student.unisg.ch`

### ✅ 4A — Credits/Codes-System (abgeschlossen)
- Migration `supabase/migrations/0002_invite_code_redemption.sql` (live in Supabase ovtpgwrrxscuvbprghhp):
  - `handle_new_user()`: liest `raw_user_meta_data->>'invite_code'`, löst gültigen/unbenutzten Code via `FOR UPDATE` ein (setzt `plan`/`credits_total` aus `invite_codes`, markiert Code als `used_by`/`used_at`), sonst Default wie bisher
  - `check_invite_code(p_code)`: Pre-Signup-Check (RPC, `anon`+`authenticated`)
  - `increment_credits_used(p_user_id, p_amount)`: erhöht `profiles.credits_used` (RPC, `authenticated`)
- `lib/api-cost.ts`: `logApiUsage()` gibt jetzt `cost_usd` zurück; neue Helper `getCreditStatus()` und `incrementCreditsUsed()` (1 Credit = 1 Cent, `Math.ceil(costUsd * 100)`); `CREDITS_EXHAUSTED_MESSAGE`-Konstante
- Alle 4 Claude-Call-Routen (`generieren`, `prescan`, `quiz-generieren`, `antwort-pruefen`): Credit-Check direkt nach `auth.getUser()` → 402 `{error: 'credits_exhausted', message: ...}` wenn aufgebraucht; nach `logApiUsage` → `incrementCreditsUsed`
- Signup (`app/(auth)/signup/page.tsx`): optionales Einladungscode-Feld, `check_invite_code` vor `signUp()`, bei gültigem Code `signUp({ options: { data: { invite_code } } })`, Erfolgsmeldung zeigt Plan
- Frontend-402-Handling: `app/(app)/[kurs]/[thema]/page.tsx` (Generieren+Prescan), `.../quiz/page.tsx`, `.../schriftlich/page.tsx` zeigen `data.message` (inkl. Mailto-Hinweis) statt generischer Fehlermeldung
- `/kosten`: `app/api/kosten/route.ts` liefert zusätzlich `credits: {plan, total, used, remaining}`; `app/(app)/kosten/page.tsx` zeigt SVG-Donut (Warnfarbe + Mailto-Link bei aufgebraucht)
- `npx tsc --noEmit`: ✅ sauber

### ✅ 4B — Admin-Panel v1 (abgeschlossen)
- `lib/admin.ts`: `requireAdmin()` Helper (401/403, kein Service-Role-Key, RLS via `is_admin()`)
- Neue Seite `app/(app)/admin/page.tsx` (Server Component, redirect zu `/kurse` für Nicht-Admins)
- `app/api/admin/users/route.ts` (GET), `app/api/admin/users/[id]/credits/route.ts` (PATCH, addiert auf `credits_total`), `app/api/admin/invite-codes/route.ts` (GET inkl. `used_by_email`, POST mit Default-Credits pro Plan + Kollisions-Retry, Code-Alphabet ohne 0/O/1/I)
- `components/admin/admin-panel.tsx` + `components/admin/credit-donut.tsx`: Tabs "Nutzer" (Tabelle + Donut + "Credits aufladen"-Dialog) und "Invite-Codes" (Generator + Übersicht eingelöst/offen)
- `components/sidebar.tsx`: "Admin"-Link (ShieldCheck-Icon) nur für `is_admin=true`
- `npx tsc --noEmit`: ✅ sauber
- **Status:** beide Teilschritte committed + gepusht (Commit `1f59770`), live auf Vercel verifiziert (Screenshot `/admin` mit Invite-Codes-Tab funktioniert, Code-Generator sichtbar)

---

## ⚠️ Bekannte Stolpersteine für neue Builder-Chats

- **`npm run build` schlägt LOKAL fehl** (next/font/css-loader Fehler, Node 26 vs Next 14.2 Inkompatibilität). NICHT verwenden — stattdessen `npx tsc --noEmit`. Auf Vercel (Production) funktioniert der Build einwandfrei.
- **`git push` kann mit "pack-objects died of signal 10" (SIGBUS) fehlschlagen** (Sandbox-Memory-Limit auf 8GB M1). Fix: `git config --local pack.windowMemory 10m` + `git config --local pack.threads 1`, im Notfall `dangerouslyDisableSandbox: true` für den Push.
- Offene, nicht-blockierende Supabase-Advisor-Warnungen (optional): `upsert_lern_streak` search_path mutable, `is_admin()`/`handle_new_user()` SECURITY DEFINER via RPC erreichbar (erwartet/notwendig für RLS), Leaked Password Protection deaktiviert.

---

## Nächster Schritt — Schritt 4 fertig, vor Versand an Freunde noch testen:
1. Echten Test-Account anlegen (Inkognito, NICHT dein Admin-Account):
   - In `/admin` → Invite-Codes → Code generieren (z. B. Basic+)
   - Mit diesem Code auf `/signup` registrieren
   - Prüfen: `profiles.plan`/`credits_total` korrekt gesetzt, Code in `/admin` als "eingelöst" markiert
2. Email-Bestätigung prüfen — kommt die Supabase-Bestätigungsmail beim Test-Account an
   (nicht im Spam)? Falls nicht: Supabase Auth Email-Settings/Rate-Limits checken.
3. Credit-Flow testen: mit Test-Account ein paar Karten generieren → `credits_used` steigt,
   bei Erreichen von `credits_total` erscheint die 402-Meldung mit Mailto-Link
   (philipp.kuprecht@student.unisg.ch).
4. RLS-Sichtkontrolle: Test-Account sieht nur leere/eigene Kurse, keine Daten von dir.
5. Erst danach: echten Code für den jeweiligen Plan in `/admin` generieren und an Freunde schicken.

**Schritt 4 (4A+4B) ist fachlich abgeschlossen** — alle Punkte oben sind nur noch
Verifikation vor dem ersten echten Versand, keine offenen Implementierungs-Schritte.
