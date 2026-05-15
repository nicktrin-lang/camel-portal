# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory.
- **Always give Claude the full file tree** at the start of a new chat:
  - Portal: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
  - Customer: `find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.
- **Claude must always write full files** — no partial diffs, no "change X to Y" instructions.
- **When rebranding/restyling, never touch API call parameters or business logic — visual classes only.**
- **ChatWidget.tsx is identical in both repos** — always update both when changing it.
- **Always `git pull` before starting any session** — collaborator may have pushed.

---

## Project Overview
- **Name:** Camel Global
- **Legal entity:** NTUK Ltd, trading as Camel Global
- **Company number:** 08765474
- **Registered address:** Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub, Stripe Connect
- **Launching in Spain first, USD support ready for future US rollout**

### Repos
| Repo | Purpose | Local path |
|------|---------|------------|
| `nicktrin-lang/camel-portal` | Partner + Admin + Driver portal | `~/camel-portal` |
| `nicktrin-lang/camel-customer` | Customer site | `~/camel-customer` |

### Domains
| Domain | Project | Repo | Purpose |
|--------|---------|------|---------|
| `portal.camel-global.com` | `camel-portal-live` | `camel-portal` | Portal production |
| `test-portal.camel-global.com` | `camel-portal-live` | `camel-portal` | Portal staging |
| `camel-global.com` / `www.camel-global.com` | `camel-customer-live` | `camel-customer` | Customer production |
| `test.camel-global.com` | `camel-customer-live` | `camel-customer` | Customer staging |

### Vercel Projects
| Project | Repo | Domains |
|---------|------|---------|
| `camel-portal-live` | `nicktrin-lang/camel-portal` | `portal.camel-global.com`, `test-portal.camel-global.com` |
| `camel-customer-live` | `nicktrin-lang/camel-customer` | `camel-global.com`, `www.camel-global.com`, `test.camel-global.com` |

### Deploy Commands
```bash
# Portal
cd ~/camel-portal && git add . && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add . && git commit -m "message" && git push origin main
```

### Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `camel-global.com/` | End customers |
| Partner | `portal.camel-global.com/partner` | Car hire companies |
| Driver | `portal.camel-global.com/driver` | Delivery drivers |
| Admin | `portal.camel-global.com/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files — Portal (`~/camel-portal`)
| File | Purpose |
|------|---------|
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase/server.ts` | Supabase server client — exports `createRouteHandlerSupabaseClient()` and `createServiceRoleSupabaseClient()` |
| `lib/cities.ts` | Shared city list for Photon search bias |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/portal/completeBooking.ts` | Shared completion logic — Stripe fuel refund, payout_status=ready, emails |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator — builds A4 PDF via @react-pdf/renderer, uploads to Supabase Storage, inserts DB record, emails PDF to partner |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64) |
| `app/api/geocode/route.ts` | Photon forward search + Nominatim reverse geocode |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (portal side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to partner/admin |
| `app/api/cron/review-reminder/route.ts` | Daily cron — sends review reminder 7 days after completion |
| `app/api/partner/stripe/connect/route.ts` | Creates Stripe Express account + returns onboarding URL |
| `app/api/partner/stripe/status/route.ts` | Returns partner Stripe onboarding status |
| `app/api/partner/stripe/dashboard-link/route.ts` | Returns Stripe Express dashboard login link |
| `app/api/partner/bookings/[id]/complete/route.ts` | Manual trigger for completion flow (fuel refund) |
| `app/api/partner/invoices/route.ts` | GET — list partner's own invoices + signed download URLs |
| `app/api/partner/invoices/generate/route.ts` | POST — partner triggers on-demand invoice generation |
| `app/api/admin/invoices/route.ts` | GET list all invoices (filter by partner/month) + POST on-demand generation (admin) |
| `app/api/webhooks/stripe/route.ts` | Portal webhook — handles `account.updated` (partner onboarding) |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable (mouse + touch), streaming |
| `app/components/Footer.tsx` | Smart footer — partner/admin/driver/customer variants |
| `app/admin/approvals/page.tsx` | Partner approvals — country filter + approved partner map (react-leaflet) |
| `app/admin/approvals/PartnersMap.tsx` | Multi-marker react-leaflet map — green=live, orange=approved/not live |
| `app/partner/onboarding/page.tsx` | 7-step onboarding — Location, Currency, Billing, Fleet, Drivers, Payouts (Stripe), Go Live |
| `app/partner/settings/page.tsx` | Settings — payout management + Stripe Express link + delete account |
| `app/partner/dashboard/page.tsx` | Dashboard — Stripe payout status banner + checklist |
| `app/partner/reports/page.tsx` | Partner reports — revenue, commission, Stripe fees, fuel, payout status breakdown, commission invoices section |
| `app/admin/reports/page.tsx` | Admin reports — network-wide, partner breakdown, payout status drilldown, commission invoices section — **NEEDS CLEAN REWRITE IN CHAT 30** |
| `app/driver/jobs/page.tsx` | Driver jobs — light theme, expandable jobs, fuel recording, stat cards |
| `app/cron/monthly-payout/route.ts` | Monthly payout cron — Stripe transfers + generates commission invoice per partner |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/serverCurrency.ts` | Server-side currency conversion — fetches rates from frankfurter.app directly |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (customer side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to customer |
| `app/api/payments/create-intent/route.ts` | Creates Stripe PaymentIntent in customer's currency, converts bid amounts if currencies differ |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — stores bid currency on booking, charge currency on payment, captures Stripe fees |
| `app/api/test-booking/bookings/[id]/cancel/route.ts` | Customer booking cancellation |
| `app/checkout/[bid_id]/page.tsx` | Stripe Elements checkout page — card form, order summary, pay button |
| `app/components/ChatWidget.tsx` | **Identical to portal version** — always update both |
| `app/bookings/[id]/page.tsx` | Booking detail — shows charge_currency to customer, PDF receipt download on completed bookings |
| `app/login/page.tsx` | Customer login — supports `?next=` redirect param |
| `next.config.ts` | CSP headers — includes Stripe domains (js.stripe.com, *.stripe.com) |
| `app/ClientRootLayout.tsx` | Global nav — suppressed on `/checkout` pages only |

---

## Currency Architecture (CRITICAL)

### Two-currency model
Every booking with a currency mismatch has TWO currencies:
- `partner_bookings.currency` = **bid currency** — what the partner quoted in (EUR/GBP/USD). All amounts on `partner_bookings` (car_hire_price, fuel_price, amount) are in this currency. This is what the partner sees everywhere.
- `partner_bookings.charge_currency` = **charge currency** — what the customer actually paid in. Stored for reconciliation only.
- `partner_bookings.conversion_rate` = rate used at time of payment.
- `payments` table = always in charge currency (what Stripe processed).

### Commission calculation rule
**NEVER use `commission_amount` or `partner_payout_amount` from the DB for display.** These are stored in charge currency and will be wrong when currencies differ. Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const payout  = Math.max(0, car_hire_price - commAmt);
```
This pattern is used in: partner/bookings/page.tsx, partner/reports/page.tsx, admin/bookings/page.tsx, admin/reports/page.tsx, partner/bookings/[id]/page.tsx.

### Stripe settlement currencies
Camel's Stripe account settles in **EUR, GBP, and USD** — all three added. No unnecessary conversions when customer and partner use the same currency.

### Customer currency flow
1. Customer selects currency on homepage → saved to `localStorage` as `camel_currency_pref`
2. Saved into booking draft in sessionStorage
3. Passed to `POST /api/test-booking/requests` → stored as `customer_requests.currency`
4. `create-intent` reads `request.currency` → charges customer in that currency, converts bid amounts if needed
5. Webhook stores bid currency on `partner_bookings`, charge currency on `payments`

---

## Email Addresses
| Address | Type | Forwards to |
|---------|------|-------------|
| `info@camel-global.com` | Mailbox (Mail Lite, Fasthosts) | Gmail via POP — `mail.livemail.co.uk:995` |
| `contact@camel-global.com` | Forwarder | `artur@` + `info@` |
| `partners@camel-global.com` | Forwarder | `artur@` + `info@` |
| `press@camel-global.com` | Forwarder | `artur@` + `info@` |
| `email@camel-global.com` | Forwarder | `nicktrin@gmail.com` + `artur@` |

---

## Stripe Connect — Architecture

### Payment flow
```
Customer accepts bid → redirected to /checkout/[bid_id]
→ PaymentIntent created in customer's currency (request.currency)
→ Bid amounts converted from bid currency → charge currency if different
→ Commission calculated on converted car hire amount
→ Customer pays with card via Stripe Elements
→ payment_intent.succeeded webhook fires to www.camel-global.com/api/webhooks/stripe
→ partner_bookings created with bid currency amounts + charge_currency stored separately
→ payments record created in charge currency with Stripe fee captured
→ Customer redirected to /bookings/[request_id]?payment=success
```

### At booking completion (working ✅)
```
Booking marked completed (all fuel levels matched, driver confirmed both stages)
→ completeBooking() called inline from update route
→ Fuel used calculated (quarters)
→ Stripe partial refund issued for unused fuel deposit
→ payments.fuel_refund_amount + fuel_refund_stripe_id + fuel_refunded_at updated
→ partner_bookings.payout_status = 'ready'
→ Customer emailed with fuel summary + refund confirmation
→ Admin emailed with completion summary
```

### Monthly payout (working ✅)
```
1st of month cron job
→ Finds all partner_bookings where payout_status = 'ready'
→ Groups by partner
→ Triggers one Stripe payout per partner (manual payout schedule)
→ Calls generateCommissionInvoice() per partner → PDF generated, stored, emailed
→ Emails partner payout notification
→ Marks bookings payout_status = 'paid'
```

### Stripe webhook endpoints
| Endpoint | Webhook name | Event | Purpose |
|----------|-------------|-------|---------|
| `https://portal.camel-global.com/api/webhooks/stripe` | charming-victory | `account.updated` | Partner onboarding completion |
| `https://www.camel-global.com/api/webhooks/stripe` | sophisticated-triumph | `payment_intent.succeeded` | Creates booking after payment |

### Stripe env vars
| Var | Portal | Customer |
|-----|--------|----------|
| `STRIPE_SECRET_KEY` | ✅ | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | ✅ |
| `STRIPE_WEBHOOK_SECRET` | charming-victory secret | sophisticated-triumph secret |

---

## Payment Database Tables

### `payments`
| Column | Purpose |
|--------|---------|
| `stripe_payment_intent_id` | Stripe PI reference |
| `stripe_charge_id` | Stripe charge ID |
| `amount_total` | Total charged to customer (in charge currency) |
| `amount_car_hire` | Car hire portion (in charge currency) |
| `amount_fuel_deposit` | Fuel deposit held (in charge currency) |
| `amount_commission` | Camel commission (in charge currency) |
| `amount_partner_net` | Partner net amount (in charge currency) |
| `currency` | Charge currency (what customer paid in) |
| `stripe_fee` | Stripe processing fee |
| `stripe_fee_currency` | Currency of Stripe fee |
| `exchange_rate` | Conversion rate if currencies differed |
| `fuel_refund_amount` | Fuel refund issued |
| `fuel_refund_stripe_id` | Stripe refund ID |
| `fuel_refunded_at` | When refund was issued |
| `payout_status` | `held` / `ready` / `paid` / `cancelled` |

### `partner_bookings` key columns
| Column | Purpose |
|--------|---------|
| `currency` | Bid currency (partner's currency) |
| `charge_currency` | Customer's payment currency |
| `conversion_rate` | Rate used at payment time |
| `car_hire_price` | In bid currency |
| `fuel_price` | In bid currency |
| `amount` | Total in bid currency |
| `commission_amount` | Stored in charge currency — DO NOT USE FOR DISPLAY |
| `partner_payout_amount` | Stored in charge currency — DO NOT USE FOR DISPLAY |
| `fuel_used_quarters` | Quarters used (0-4) |
| `fuel_charge` | Fuel charge to customer |
| `fuel_refund` | Fuel refund issued |
| `payout_status` | `held` / `ready` / `paid` / `cancelled` |
| `payment_id` | FK to payments table |

### `commission_invoices` — real column names (CRITICAL)
| Column | Purpose |
|--------|---------|
| `id` | UUID PK |
| `invoice_number` | e.g. `NTUK-2026-05-001` |
| `partner_id` | Partner user UUID (also stored as `partner_user_id`) |
| `partner_user_id` | Partner user UUID (added col — used for RLS + joins) |
| `period_start` | First day of invoice period (date) e.g. `2026-05-01` |
| `period_end` | Last day of invoice period (date) e.g. `2026-05-31` |
| `currency` | Partner billing currency |
| `subtotal` | Commission total (no VAT) |
| `total` | Grand total (currently same as subtotal — VAT pending) |
| `vat_rate` | VAT rate (0 for now) |
| `vat_amount` | VAT amount (0 for now) |
| `booking_count` | Number of bookings on invoice (added col) |
| `storage_path` | Supabase Storage path to PDF (added col) |
| `issued_at` | When invoice was generated (added col) |
| `emailed_at` | When invoice was emailed (added col) |
| `status` | `issued` / `paid` |
| `partner_name` | Snapshot of partner company name |
| `partner_address` | Snapshot of partner address |
| `partner_tax_id` | Snapshot of partner VAT/NIF |
| `line_items` | JSON array of booking line items |

**Note:** When querying for display, map: `subtotal` → `total_commission`, `issued_at` → `generated_at`, `period_start.slice(0,7)` → `period_month`

---

## Commission Invoice System

### VAT treatment
- **Non-UK partners** (Spain etc.) — B2B reverse charge. Invoice shows 0% VAT with note: "No UK VAT charged — reverse charge applies"
- **UK partners** — 20% VAT once NTUK is VAT registered. Currently pending — shows 0% with note: "VAT registration pending"

### Invoice PDF
- Generated by `lib/portal/generateCommissionInvoice.tsx` using `@react-pdf/renderer`
- A4 format, orange top bar, NTUK Ltd header, partner address block, booking line items table, totals, VAT note, footer
- Logo loaded from `public/camel-logo.png`
- Stored in Supabase Storage bucket `commission-invoices` at path `{partner_user_id}/{period_month}/{invoice_number}.pdf`
- Emailed to partner as attachment via Resend

### Invoice number format
`NTUK-YYYY-MM-NNN` e.g. `NTUK-2026-05-001` — sequential per month

### Triggers
- Auto: monthly payout cron calls `generateCommissionInvoice()` after each partner payout
- On-demand admin: POST `/api/admin/invoices` with `{ partner_id, period_month }`
- On-demand partner: POST `/api/partner/invoices/generate` with `{ period_month }`

---

## Cancellation System

### Rules
| Who cancels | Car hire refund | Fuel refund |
|-------------|-----------------|-------------|
| Partner | Full | Full |
| Customer >48hrs before pickup | Full | Full |
| Customer <48hrs before pickup | None | Full |
| Admin | Full | Full |
| Cancellation (any) | Camel keeps commission | — |

---

## Commission & Payments Model
- Partner = supplier, issues VAT invoice to customer
- Camel = intermediary, earns commission (default 20%, min €10 floor), invoices partner
- Commission rate set per-partner in admin — stored on `partner_profiles.commission_rate`
- Rate stamped on each booking at acceptance — never changes after that
- Fuel charges pass through 100% to partner — no commission on fuel
- **Commission always recalculated from bid currency `car_hire_price` for display** — never from stored `commission_amount`

---

## Live Status System (7 checks)
1. Fleet base address set
2. Fleet base GPS set (lat + lng)
3. Service radius set
4. At least one active fleet vehicle
5. At least one active driver
6. Billing currency set
7. VAT / NIF number set

---

## Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Stripe settlement:** EUR, GBP, USD all added to Camel's Stripe account
- **Storage:** `partner_bookings` in bid currency, `payments` in charge currency
- **Commission invoices:** Issued in partner's billing currency

---

## Supabase Projects
| Project | URL | Used by |
|---------|-----|---------|
| `camel-global` | `https://guhcavvpuveiovspzxmg.supabase.co` | Portal + Customer (both) |

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat25` | Chat 25 — Stripe Connect partner onboarding, webhook, dashboard payout status, settings payout page |
| `v-stable-chat26` | Chat 26 — fuel refund on completion, commission recalc fix, admin/partner reports fixed |
| `v-stable-chat27` | Chat 27 — payout breakdown on reports, stripe fee fix in admin reports |
| `v-stable-chat28` | Chat 28 — admin financial dashboard, stripe fee conversion fixes, dual-currency P&L, reports CSV fixes |
| `v-stable-chat29b` | Chat 29 — payout drilldown, per-partner export, country filter, approvals map, commission invoice system |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat25` | Chat 25 — Stripe checkout, PaymentIntent split, CSP fix, booking confirmation flow, webhook booking creation |
| `v-stable-chat26` | Chat 26 — currency fix (customer pays in their currency), bid vs charge currency split, Stripe fees captured, serverCurrency lib |
| `v-stable-chat27` | Chat 27 — PDF receipts, booking confirmed emails, cancellation refunds |
| `v-stable-chat28` | Chat 28 — no customer changes |
| `v-stable-chat29b` | Chat 29 — no customer changes |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat29b
cd ~/camel-customer && git checkout v-stable-chat28
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget with currency selection
- Guest booking flow — draft survives login/signup redirect, currency preserved
- Partner bid submission and management
- Driver job portal — light theme, expandable history, fuel recording, stat cards
- Admin approval and account management
- Full EUR / GBP / USD currency support — customer pays in their currency, partner sees bid currency
- Full commission system — adjustable per partner, default 20%, min €10 floor, always recalculated from bid currency
- Fuel level recording, charge/refund calculation (to nearest ¼ tank)
- Fuel refund on completion — Stripe partial refund issued automatically, payout_status=ready
- Email notifications — all 6 (booking confirmed: customer/partner/admin; completion: customer/admin; review reminder)
- Live status system — 7 checks
- Partner onboarding — 7 steps including Stripe Express payout setup
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- Photon address search across all address inputs
- AI Chat Widget — both sites, logged-in only, draggable, streaming, transcript email
- Booking cancellation — customer/partner/admin, 48hr rule, financial breakdowns, Stripe refunds
- Portal homepage — full partner landing page
- Branding overhaul — all partner and admin static pages
- SEO — metadata, Open Graph, sitemaps, robots.txt
- Stripe Connect partner onboarding — Express account creation, hosted onboarding, webhook completion, dashboard link
- Partner dashboard — Stripe payout status banner, setup checklist includes payouts
- Partner settings — payout management section with Stripe Express link
- Customer checkout — Stripe Elements payment form at `/checkout/[bid_id]`
- PaymentIntent with destination charge — commission split to Camel, net to partner
- Stripe webhook — `payment_intent.succeeded` creates booking and payment record
- Stripe fees captured — `stripe_fee`, `stripe_fee_currency`, `exchange_rate` on payments table
- Bid vs charge currency — partner sees bid currency everywhere, customer sees charge currency
- Commission recalc — all pages recalculate from bid currency, never use stored DB commission
- Partner + admin bookings and reports pages — correct per-currency reconciliation + Excel export
- Stripe fee visibility in reports — correctly converted to bid currency, shown in partner and admin reports and CSV exports
- Payout status breakdown — partner and admin reports show held/ready/paid counts and totals
- Payout status drilldown — admin reports, click bucket to expand individual bookings, filterable by partner
- Per-partner Excel export — admin reports, date range + partner filter, filename includes partner name
- Partner country in CSV exports — `base_country` from `partner_profiles` included in all admin Excel exports
- Partner approvals — country filter dropdown + react-leaflet map of approved partners (green=live, orange=not live)
- Commission invoice PDF — `@react-pdf/renderer`, A4, stored in Supabase Storage, emailed on payout run
- Monthly payout cron — generates invoice per partner after Stripe transfer
- Partner reports — Commission Invoices section: list + on-demand generate + download
- Admin reports — Commission Invoices section: list + on-demand generate + filter (PARTIALLY BROKEN — needs rewrite in Chat 30)

---

## What Needs Finishing in Chat 30 (PRIORITY)

### 1. Admin reports page — clean rewrite (FIRST TASK)
`app/admin/reports/page.tsx` is corrupted from partial updates. Needs full clean rewrite.
Key issues to fix:
- `AdminInvoicesSection` should receive `partners` as a prop from `exportPartners` (already built from bookings) — not derive its own list from invoices
- `pickup_at` removed from booking select in invoice routes (already done via sed — verify)
- The `AdminInvoicesSection` loadInvoices function had a duplicate `async function` removed mid-edit — whole component needs rewriting cleanly
- Pass `partners={exportPartners}` to `<AdminInvoicesSection />` in the JSX

### 2. Test full invoice generation end to end
- Admin: select partner + month → Generate PDF → confirm PDF downloads correctly
- Partner: select month → Generate PDF → confirm PDF downloads correctly
- Check email is sent with PDF attached

### 3. Stable tag after Chat 30 fixes
```bash
cd ~/camel-portal && git tag -a v-stable-chat30 -m "Chat 30 — admin reports clean rewrite, invoice generation working" && git push origin v-stable-chat30
```

---

## What Still Needs Building (Lower Priority)
- Spanish translation — do absolutely last
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint — deferred
- DAC7 EU platform reporting — deferred
- Delete legacy `camel-customers` Supabase project
- Outreach: deduplicate prospect database
- Outreach: set up `e.camel-global.com` subdomain in Resend

---

## Collaborator Note
A collaborator works on the same `camel-portal` repo from a Windows machine (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). His changes are on `main`. Always `git pull` before starting. Key files he owns: `app/admin/outreach/page.tsx`, `app/api/admin/outreach/*`.

---

## Session Log

### Chat 29 (Completed)
**Payout drilldown, per-partner export, country filter, approvals map, commission invoice system**
1. Admin reports: payout status drilldown — `PayoutStatusSection` component, inline expand per bucket, partner filter dropdown, `PayoutDrilldownTable` shows Job, Partner, Pickup Date, Car Hire, Commission, Payout Amount, Payout Status
2. Admin reports: per-partner Excel export — `exportPartner` state, partner dropdown inline with date range controls, filename includes partner slug
3. Admin reports: partner country column added to Fuel Reconciliation and All Bookings CSV sheets
4. `app/api/partner/bookings/route.ts` — `base_country` added to partner_profiles select, returned as `partner_country`
5. `app/api/admin/applications/route.ts` — `base_country` added to partner_profiles select, returned as `partner_country`
6. Partner approvals page — country filter dropdown (4th filter), `CountryFilter` resets `expanded` state, `PayoutStatusSection` replaced old inline IIFE
7. `app/admin/approvals/PartnersMap.tsx` — new multi-marker react-leaflet map component, `BoundsUpdater` uses `useMap()` to auto-fit bounds, custom div icons (green=live, orange=approved/not live), popup shows company name + address + live status
8. Commission invoice system built:
   - `lib/portal/generateCommissionInvoice.tsx` — PDF generator, Supabase Storage upload, DB insert, Resend email with PDF attachment
   - `lib/email.ts` — added `attachments` support (base64 via Resend)
   - `app/api/partner/invoices/route.ts` — GET list with signed URLs
   - `app/api/partner/invoices/generate/route.ts` — POST on-demand generation
   - `app/api/admin/invoices/route.ts` — GET list all + POST on-demand (admin)
   - `app/cron/monthly-payout/route.ts` — calls `generateCommissionInvoice()` after each Stripe transfer
   - `app/partner/reports/page.tsx` — `PartnerInvoicesSection` added at bottom (working ✅)
   - `app/admin/reports/page.tsx` — `AdminInvoicesSection` added but CORRUPTED — needs clean rewrite in Chat 30
9. `commission_invoices` DB table exists with real schema (see table above) — added cols: `partner_user_id`, `booking_count`, `storage_path`, `issued_at`, `emailed_at`
10. Supabase Storage bucket `commission-invoices` created (private)
11. `@react-pdf/renderer` installed in camel-portal
12. Stable tags: `v-stable-chat29` (early), `v-stable-chat29b` (after invoice system)

### Chat 28 (Completed)
**Admin financial dashboard, Stripe fee conversion fixes, dual-currency P&L**
1. Admin financial dashboard added to admin reports page — P&L summary per currency + payments table with payout status and partner filters.
2. Stripe fee currency conversion fixed across all pages.
3. Admin booking detail `PaymentFeesCard` — full dual-currency P&L rewrite.
4. Partner booking detail `PaymentFeesCard` — charge currency fallback fix applied.
5. Admin reports "Net Camel" payments column — fixed to show commission only.
6. Partner + Admin reports CSV — Stripe Fee Currency column fixed to show bid currency.
7. Stable tags `v-stable-chat28` on both repos.

### Chat 27 (Completed)
**Payout status breakdown on reports, Stripe fee fixes**
1. `payout_status` confirmed in bookings API select and returned data.
2. Partner reports — payout status breakdown working.
3. Admin reports — payout status breakdown added + `stripeFeeInBidCurrency` function fixed.

### Chat 26 (Completed)
**Currency architecture, fuel refund, commission fixes**
1. Fuel refund on completion — `completeBooking()` extracted to shared lib.
2. Stripe fees captured on payments table.
3. Currency fix — customer pays in `request.currency`, bid amounts converted server-side.
4. Bid vs charge currency split implemented across all pages.

### Chat 25 (Completed)
Stripe Connect full payment flow — partner onboarding, checkout, PaymentIntent split, webhook booking creation.

### Chat 24c (Completed)
SEO overhaul — metadata, Open Graph, sitemaps, robots.txt, airport keywords, alt text.

### Chat 24b (Completed)
NTUK Ltd company details, email forwarders, driver footer fix, review email fix.

### Chat 24 (Completed)
Branding, portal homepage, driver fixes, chat widget touch drag.

### Chat 23 (Completed)
AI Chat Widget + Booking Cancellation System.

### Chats 20–22 (Completed)
Address search, commission fixes, bug fixes.

---

## Pre-Launch Build Plan

| # | Task | Status |
|---|------|--------|
| 1 | Security headers | ✅ Done |
| 2 | Code cleanup | ✅ Done |
| 3 | Rate limiting | ✅ Done |
| 4 | CAPTCHA at all sign-in points | ✅ Done |
| 5 | Cookie acceptance banner | ✅ Done |
| 6 | Partner & Admin finance pages | ✅ Done — reports correct, Stripe fees shown, payout breakdown shown |
| 7 | RLS audit | ✅ Done |
| 8 | GDPR data deletion | ✅ Done |
| 9 | Footer + policy pages | ✅ Done |
| 10 | Spanish translation | ⬜ Todo — do last |
| 11 | Customer booking site full UI overhaul | ✅ Done |
| 11b | Portal rebrand | ✅ Done |
| 11c | Repo split | ✅ Done |
| 11d | Google Analytics | ✅ Done |
| 12 | Stripe Connect integration | ✅ Done — core flow, fuel refund, cancellation refunds, monthly payout cron all done |
| 13 | Xero monthly commission endpoint | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | ⬜ Deferred |
| 15 | Partner outreach agent | ✅ Done (collaborator) |
| 16 | Commission invoice PDF | ✅ Done (needs admin reports page fix in Chat 30) |

---

## Useful Commands

```bash
# Always pull before starting
cd ~/camel-portal && git pull origin main
cd ~/camel-customer && git pull origin main

# Portal deploy
cd ~/camel-portal && git add . && git commit -m "message" && git push origin main

# Customer deploy
cd ~/camel-customer && git add . && git commit -m "message" && git push origin main

# Copy ChatWidget to both repos
cp ~/camel-portal/app/components/ChatWidget.tsx ~/camel-customer/app/components/ChatWidget.tsx

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Roll back
git checkout v-tag-name
```

---

*Last updated: Chat 29 — Commission invoice PDF system built. Partner approvals map + country filter. Admin reports payout drilldown + per-partner export. Admin reports page AdminInvoicesSection is corrupted and needs a clean rewrite as first task in Chat 30. Both repos tagged v-stable-chat29b.*