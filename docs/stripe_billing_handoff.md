# Stripe Billing — Handoff für Folge-Agent

Stand: 2026-06-12. Dieses Dokument fasst zusammen, was am Stripe-Billing fertig ist,
was beim Testen gefunden+gefixt wurde, und was als Nächstes ansteht (vor allem
Stripe-Dashboard-Konfiguration für Twint/PayPal + Live-Mode).

---

## 1. Was bereits implementiert & getestet ist

Self-Service Plan-Management ist vollständig (Test-Mode):

- **Neuer Subscriber** → Stripe Checkout Session (`app/api/billing/checkout/route.ts`,
  Branch ohne `stripe_customer_id`/`stripe_subscription_id`). `allow_promotion_codes: true`.
- **Bestehender Subscriber, Plan-Wechsel** → Price-Swap via
  `stripe.subscriptions.update(..., proration_behavior: 'create_prorations', cancel_at_period_end: false)`,
  kein neuer Checkout (verhindert parallele Subscriptions).
- **Proration-Vorschau** (neu, `app/api/billing/preview/route.ts` +
  `components/upgrade-dialog.tsx`): Vor dem Bestätigen eines Upgrades/Downgrades
  wird via `stripe.invoices.createPreview()` der exakte anteilige Betrag
  (Belastung oder Gutschrift auf der nächsten Rechnung) angezeigt. Bei
  Erstabschluss (kein Stripe-Customer) wird die Vorschau übersprungen → generischer
  Checkout-Hinweistext.
- **Kündigen** (`app/api/billing/cancel/route.ts` POST/DELETE): setzt
  `cancel_at_period_end`, speichert `profiles.stripe_cancel_at`. UI zeigt
  persistenten Hinweis "Gekündigt — läuft bis ..." mit "Reaktivieren"-Button
  (`components/plan-overview.tsx`). "Kündigen"-Button auf der Basic-Zeile wird
  ausgeblendet, solange `stripe_cancel_at` gesetzt ist (sonst mehrfach klickbar).
- **Cross-Component-Sync**: globales `PLAN_UPDATED_EVENT` (`lib/plans.ts`) — wird
  nach jedem Billing-Vorgang dispatcht, `PlanBanner` (Header) hört darauf und
  refetcht `/api/profile`, damit der Plan überall sofort aktualisiert ist (kein
  manueller Reload nötig).
- **Webhook** (`app/api/webhooks/stripe/route.ts`): `checkout.session.completed`,
  `customer.subscription.updated/deleted`, `invoice.paid`. Idempotenz-Check:
  mutiert nur, wenn die Subscription-ID der aktuell verknüpften des Users
  entspricht (oder noch keine verknüpft ist).
- **Toast-Position**: `components/ui/sonner.tsx` auf `position="top-center"`
  gestellt — vorher erschienen Erfolgs-Toasts unten rechts genau hinter dem
  Cramo-Chat-Button (`components/cramo-chat-widget.tsx`, `right-4 bottom-...`,
  `z-50`) und wurden leicht übersehen.

### DB-Fix (Migration 0012, bereits angewendet + committed)

`delete_my_account()` (Account-löschen-Feature) schlug für **jeden Account mit
echten Nutzungsdaten** fehl, weil `kurs.user_id`, `api_usage.user_id`,
`generier_profil.user_id`, `lern_streak.user_id`, `deck_feedback.user_id`,
`session_results.user_id`, `invite_codes.used_by`/`created_by` auf
`auth.users(id)` ohne `ON DELETE CASCADE` zeigten. Migration
`supabase/migrations/0012_fix_account_deletion_cascades.sql` setzt die
Daten-Tabellen auf `CASCADE`, `invite_codes`-Verweise auf `SET NULL`. Verifiziert:
Account löschen + neu registrieren funktioniert jetzt sauber (neue `auth.users`-ID,
frischer `profiles`-Eintrag mit `plan=basic`).

---

## 2. Offene Stripe-Dashboard-Konfiguration (kein Code nötig)

Der User hat Twint/PayPal beim Checkout noch nicht gesehen. Das ist
**Dashboard-Konfiguration, nicht Code**:

1. **Settings → Payment methods** (Test-Mode UND später separat Live-Mode):
   - Twint aktivieren (CH-Account mit CHF-Settlement vorausgesetzt — sollte
     gegeben sein, Preise sind in CHF).
   - PayPal aktivieren (separater Onboarding-Flow, ggf. Wartezeit auf
     Freischaltung durch Stripe).
2. Nach Aktivierung: einfach erneut einen Checkout-Flow testen (Schritt 1 unten),
   prüfen ob Twint/PayPal als Zahlungsmethode in der Stripe-Checkout-Seite
   erscheinen. Kein Code-Change erwartet — Checkout-Session-Erstellung
   (`app/api/billing/checkout/route.ts`) setzt bereits keine
   `payment_method_types`-Einschränkung, Stripe zeigt automatisch alle im
   Dashboard aktivierten Methoden an, die für Land/Währung passen.

---

## 3. Go-Live-Checkliste (Live-Mode)

1. Twint/PayPal wie oben, diesmal im **Live-Mode** des Dashboards.
2. Stripe-Konto-Aktivierung/KYC abschliessen (Bankkonto + Geschäftsangaben) —
   Voraussetzung für echte Payouts.
3. Live-Mode Produkte/Preise in Stripe anlegen (entsprechen den 3 Plänen:
   Basic+ CHF 4.90, Premium CHF 9.90, Ultra CHF 16.90 — aktuelle **Test-Mode**
   Price-IDs stehen in `plan_config`:
   `basic_plus=price_1ThAaCCmjQuQmmZUFO38MWgp`,
   `premium=price_1ThAavCmjQuQmmZUbAgacH1d`,
   `ultra=price_1ThAfZCmjQuQmmZUGut2Gmas`).
4. `plan_config.stripe_price_id` für alle 3 Pläne auf die neuen Live-Price-IDs
   umstellen (Tabelle ist laut CLAUDE.md admin-editierbar — Pricing-Admin-UI
   nutzen, oder direkt per SQL).
5. Vercel Production Env-Vars: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` auf
   Live-Werte umstellen (separat von Test-Keys).
6. Neuen Live-Webhook-Endpoint in Stripe Dashboard registrieren (gleiche Events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`), neuen Signing Secret in
   Vercel eintragen.
7. MWST/Steuer kurz prüfen (Stripe Tax aktivieren oder Swiss-Kleinunternehmer-
   Status klären) — niedrige Priorität bei aktuellem Umsatzvolumen.

---

## 4. Noch offene Punkte aus früherem User-Feedback (nicht dringend)

- "Sorry to see you go"-Rückkehr-Flow nach Kündigung über "Abo verwalten"
  (Stripe Customer Portal) — aktuell kein spezielles Re-Entry-Messaging.
- Cramo-Sprechblasen-Toast mit custom #studying-Bild (Idee, nicht spezifiziert).

---

## 5. Test-Accounts (Supabase-Projekt `ovtpgwrrxscuvbprghhp`)

- `kuprechtphilipp@gmail.com` — Admin-Account (`is_admin=true`, `base_plan=ultra`,
  kein Stripe-Customer).
- `philipp.kuprecht@student.unisg.ch` — frisch zurückgesetzt (gelöscht +
  neu registriert 2026-06-11), `plan=basic`, `onboarding_completed=true`, kein
  Stripe-Customer. Invite-Code `GDMYTSNC` (Ultra, 500 Credits, permanent) ist
  wieder frei (`used_by=NULL`).
- `innovationtrophy.hsg@gmail.com` — Test-Account für Billing-Flows, Plan/Billing
  zuvor zurückgesetzt (`plan=basic`, kein Stripe-Customer).

Für den nächsten Test-Durchlauf des kompletten Billing-Lifecycle (neuer
Subscriber → Checkout, Upgrade/Downgrade mit Proration-Vorschau, Kündigen,
Reaktivieren) eignet sich `innovationtrophy.hsg@gmail.com` oder
`philipp.kuprecht@student.unisg.ch` am besten, da beide ohne Stripe-Verknüpfung
starten.
