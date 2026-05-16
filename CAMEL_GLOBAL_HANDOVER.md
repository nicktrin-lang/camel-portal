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
| `app/api/partner/suggestions/route.ts` | GET list own suggestions, POST submit new suggestion |
| `app/api/admin/invoices/route.ts` | GET list all invoices (filter by partner/month) + POST on-demand generation (admin) |
| `app/api/admin/suggestions/route.ts` | GET all suggestions (filter by status/category), PATCH update status/notes |
| `app/api/webhooks/stripe/route.ts` | Portal webhook — handles `account.updated` (partner onboarding) |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable (mouse + touch), streaming |
| `app/components/Footer.tsx` | Smart footer — partner/admin/driver/customer variants |
| `app/components/portal/PortalSidebar.tsx` | **Main sidebar used by all portal pages** — partner + admin nav, includes Suggestions |
| `app/admin/approvals/page.tsx` | Partner approvals — country filter + approved partner map (react-leaflet) |
| `app/admin/approvals/PartnersMap.tsx` | Multi-marker react-leaflet map — green=live, orange=approved/not live |
| `app/admin/suggestions/page.tsx` | Admin suggestions — list all, filter by status/category, expand to update status + add notes |
| `app/partner/onboarding/page.tsx` | 7-step onboarding — Location, Currency, Billing, Fleet, Drivers, Payouts (Stripe), Go Live |
| `app/partner/settings/page.tsx` | Settings — payout management + Stripe Express link + delete account |
| `app/partner/dashboard/page.tsx` | Dashboard — Stripe payout status banner + checklist |
| `app/partner/reports/page.tsx` | Partner reports — revenue, commission, Stripe fees, fuel, payout status breakdown, commission invoices section |
| `app/partner/suggestions/page.tsx` | Partner suggestions — submit form (title, category, description), view own submissions + status |
| `app/admin/reports/page.tsx` | Admin reports — network-wide, partner breakdown, payout status drilldown, commission invoices section |
| `app/driver/jobs/page.tsx` | Driver jobs — light theme, expandable jobs, fuel recording, stat cards |
| `app/cron/monthly-payout/route.ts` | Monthly payout cron — Stripe transfers + generates commission invoice per partner |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/serverCurrency.ts` | Server-side currency conversion — fetches rates from frankfurter.app directly |
| `lib/email.ts` | Resend email sender — supports `attachments` array (base64) — same pattern as portal |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking receipt PDF generator — @react-pdf/renderer, A4, charge_currency, logo, driving licence note, uploads to `booking-receipts` Supabase Storage bucket, emails to customer |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (customer side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to customer |
| `app/api/payments/create-intent/route.ts` | Creates Stripe PaymentIntent in customer's currency, converts bid amounts if currencies differ |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates + emails booking receipt PDF, sends confirmation emails |
| `app/api/test-booking/bookings/[id]/receipt/route.ts` | GET — returns signed URL for booking receipt PDF (Bearer token auth, uses customer DB client) |
| `app/api/test-booking/bookings/[id]/cancel/route.ts` | Customer booking cancellation |
| `app/checkout/[bid_id]/page.tsx` | Stripe Elements checkout page — card form, order summary, pay button |
| `app/components/ChatWidget.tsx` | **Identical to portal version** — always update both |
| `app/bookings/[id]/page.tsx` | Booking detail — receipt download button (all statuses), completion statement download (completed only), charge_currency throughout |
| `app/login/page.tsx` | Customer login — supports `?next=` redirect param |
| `next.config.ts` | CSP headers — includes Stripe domains (js.stripe.com, *.stripe.com) |
| `app/ClientRootLayout.tsx` | Global nav — suppressed on `/checkout` pages only |

---

## Sidebar Architecture (CRITICAL)
The portal uses **`PortalSidebar.tsx`** (`app/components/portal/PortalSidebar.tsx`) as the main sidebar for both partner and admin — NOT `PartnerSidebar.tsx` or `AdminSidebar.tsx`. Always edit `PortalSidebar.tsx` to add/change nav items. The other two sidebar files exist but are not actively used.

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

### Stripe settlement currencies
Camel's Stripe account settles in **EUR, GBP, and USD** — all three added.

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
→ Booking receipt PDF generated + emailed to customer as attachment
→ Customer redirected to /bookings/[request_id]?payment=success
```

### At booking completion (working ✅)
```
Booking marked completed
→ completeBooking() called
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
→ Triggers one Stripe payout per partner
→ Calls generateCommissionInvoice() per partner → PDF generated, stored, emailed
→ Emails partner payout notification
→ Marks bookings payout_status = 'paid'
```

### Stripe webhook endpoints
| Endpoint | Webhook name | Event | Purpose |
|----------|-------------|-------|---------|
| `https://portal.camel-global.com/api/webhooks/stripe` | charming-victory | `account.updated` | Partner onboarding completion |
| `https://www.camel-global.com/api/webhooks/stripe` | sophisticated-triumph | `payment_intent.succeeded` | Creates booking after payment |

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
| `receipt_storage_path` | Path to booking receipt PDF in `booking-receipts` bucket |

### `commission_invoices` — real column names (CRITICAL)
| Column | Purpose |
|--------|---------|
| `id` | UUID PK |
| `invoice_number` | e.g. `NTUK-2026-05-001` |
| `partner_id` | Partner user UUID |
| `partner_user_id` | Partner user UUID (used for RLS + joins) |
| `period_start` | First day of invoice period |
| `period_end` | Last day of invoice period |
| `currency` | Partner billing currency |
| `subtotal` | Commission total (no VAT) |
| `total` | Grand total |
| `vat_rate` | VAT rate (0 for now) |
| `vat_amount` | VAT amount (0 for now) |
| `booking_count` | Number of bookings on invoice |
| `storage_path` | Supabase Storage path to PDF |
| `issued_at` | When invoice was generated |
| `emailed_at` | When invoice was emailed |
| `status` | `issued` / `paid` |
| `partner_name` | Snapshot of partner company name |
| `partner_address` | Snapshot of partner address |
| `partner_tax_id` | Snapshot of partner VAT/NIF |
| `line_items` | JSON array of booking line items |

### `partner_suggestions`
| Column | Purpose |
|--------|---------|
| `id` | UUID PK |
| `partner_user_id` | FK to auth.users |
| `partner_name` | Snapshot of partner company name |
| `title` | Suggestion title |
| `category` | `feature` / `bug` / `improvement` |
| `description` | Full description |
| `status` | `submitted` / `reviewing` / `planned` / `done` |
| `admin_notes` | Admin response (visible to partner) |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

---

## Supabase Storage Buckets
| Bucket | Purpose |
|--------|---------|
| `commission-invoices` | Commission invoice PDFs — path: `{partner_user_id}/{period_month}/{invoice_number}.pdf` |
| `booking-receipts` | Customer booking receipt PDFs — path: `{request_id}/booking-receipt-{job_number}.pdf` |

---

## Commission Invoice System

### VAT treatment
- **Non-UK partners** (Spain etc.) — B2B reverse charge. Invoice shows 0% VAT with note: "No UK VAT charged — reverse charge applies"
- **UK partners** — 20% VAT once NTUK is VAT registered. Currently pending — shows 0% with note: "VAT registration pending"

### Invoice PDF
- Generated by `lib/portal/generateCommissionInvoice.tsx` using `@react-pdf/renderer`
- A4 format, orange top bar, NTUK Ltd header, partner address block, booking line items table, totals, VAT note, footer
- Logo loaded from `public/camel-logo.png`
- Stored in Supabase Storage bucket `commission-invoices`
- Emailed to partner as attachment via Resend

### Invoice number format
`NTUK-YYYY-MM-NNN` e.g. `NTUK-2026-05-001` — sequential per month

---

## Booking Receipt PDF System

### What it is
- Generated server-side in the Stripe webhook after payment succeeds
- Uses `@react-pdf/renderer` in `lib/portal/generateBookingReceiptPDF.tsx` (camel-customer)
- Shows: Camel logo (`camel-invoice-logo.png`), booking ref, pickup/dropoff, vehicle, partner company, amount paid in **charge_currency**, fuel deposit, driving licence reminder
- Stored in Supabase Storage bucket `booking-receipts`
- Emailed to customer as PDF attachment immediately on payment
- Download button on `/bookings/[id]` at ALL booking statuses — labelled "Booking Confirmation Receipt"
- API route: `GET /api/test-booking/bookings/[id]/receipt` — uses Bearer token auth + customer DB client

### Booking Completion Statement
- Client-side PDF generated via `jsPDF` in `app/bookings/[id]/page.tsx`
- Only shown on completed bookings
- Uses **charge_currency** (what customer paid), has Camel logo
- Button labelled "Booking Completion Statement"

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
| `v-stable-chat29c` | Chat 29 — commission invoice PDF complete, full end to end working |
| `v-stable-chat30a` | Chat 30a — booking receipt PDF, completion statement fixes complete |
| `v-stable-chat30b` | Chat 30b — partner suggestions feature complete |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat25` | Chat 25 — Stripe checkout, PaymentIntent split, CSP fix, booking confirmation flow, webhook booking creation |
| `v-stable-chat26` | Chat 26 — currency fix, bid vs charge currency split, Stripe fees captured |
| `v-stable-chat27` | Chat 27 — PDF receipts, booking confirmed emails, cancellation refunds |
| `v-stable-chat28` | Chat 28 — no customer changes |
| `v-stable-chat29c` | Chat 29 — no customer changes |
| `v-stable-chat30a` | Chat 30a — booking receipt PDF, completion statement fixes, email attachments |
| `v-stable-chat30b` | Chat 30b — no customer changes |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat30b
cd ~/camel-customer && git checkout v-stable-chat30a
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget with currency selection
- Guest booking flow — draft survives login/signup redirect, currency preserved
- Partner bid submission and management
- Driver job portal — light theme, expandable history, fuel recording, stat cards
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording, charge/refund calculation (to nearest ¼ tank)
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all (booking confirmed: customer/partner/admin; completion: customer/admin; review reminder)
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
- Stripe Connect partner onboarding — Express account creation, hosted onboarding, webhook completion
- Partner + admin bookings and reports pages — correct per-currency reconciliation + Excel export
- Stripe fees captured and shown in reports
- Payout status breakdown — partner and admin reports
- Partner approvals — country filter + react-leaflet map
- Commission invoice PDF — stored in Supabase Storage, emailed on payout run
- Monthly payout cron — generates invoice per partner after Stripe transfer
- Partner reports — Commission Invoices section
- Admin reports — Commission Invoices section
- **Booking receipt PDF** — generated on payment, stored in `booking-receipts`, emailed to customer with attachment, downloadable from booking page at all statuses
- **Booking Completion Statement** — renamed (was "Receipt"), uses charge_currency, has Camel logo, completed bookings only
- **Partner Suggestions** — submit form, admin list/filter/update, emails to partner + admin, status tracking

---

## What Needs Building in Chat 31 (PRIORITY ORDER)

### 1. Driver Age & Additional Drivers — both repos (DO FIRST)
Customers must provide their age and any additional driver ages at point of booking. Car hire companies need this for insurance purposes.

#### Database (run in Supabase SQL editor BEFORE starting Chat 31)
```sql
ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS driver_age integer,
  ADD COLUMN IF NOT EXISTS additional_drivers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_driver_ages text;
```
`additional_driver_ages` is a comma-separated string e.g. `"28,35"` — simple, no JSON needed.

#### Files to change — camel-customer
- **`app/page.tsx`** (`CustomerHome`) — add to booking widget form:
  - "Main driver age" — number input (18–99), required, goes in Row 3 alongside passengers/suitcases (make it a 5-col grid or add a new row)
  - "Additional drivers" — select 0–4, default 0
  - When additional_drivers > 0: show one age input per additional driver (e.g. "Additional driver 1 age", "Additional driver 2 age" etc.) — these are required if additional_drivers > 0
  - Save all to `camel_booking_draft` in sessionStorage via `saveDraft()`
  - Pass all to API in `handleBookNow()` fetch body

- **`app/book/page.tsx`** — read `driverAge`, `additionalDrivers`, `additionalDriverAges` from draft and pass to API in the fetch body

- **`app/api/test-booking/requests/route.ts`** (POST) — accept and store:
  - `driver_age` = `Number(body?.driver_age || 0)` — validate: must be >= 18
  - `additional_drivers` = `Number(body?.additional_drivers || 0)` — clamp 0–4
  - `additional_driver_ages` = `String(body?.additional_driver_ages || "").trim()` — comma-separated ages

- **`app/api/test-booking/requests/[id]/route.ts`** (GET) — add to select: `driver_age, additional_drivers, additional_driver_ages` and return in `requestRow`

- **`app/bookings/[id]/page.tsx`** — add to `RequestData` type and display in Booking Details card:
  - "Main driver age: 35"
  - "Additional drivers: 2 (ages: 28, 31)"

#### Files to change — camel-portal
- **`app/partner/requests/[id]/page.tsx`** — add to `RequestRow` type and display in Request Information panel alongside passengers/suitcases:
  - "Main driver age: 35"
  - "Additional drivers: 2 (ages: 28, 31)"

- **`app/admin/requests/[id]/page.tsx`** — same as above, add to `RequestData` type and display in Request Information grid

- **`app/api/admin/requests/[id]/route.ts`** — add `driver_age, additional_drivers, additional_driver_ages` to the select query (need to cat this file at start of Chat 31)
- **`app/api/partner/requests/[id]/route.ts`** — same (need to cat this file at start of Chat 31)

#### UX notes
- Driver age field: validate >= 18 on submit, show error "Main driver must be 18 or over"
- Additional driver ages: each must be >= 18, show error if any are under 18
- On the booking widget, keep it clean — show additional driver age inputs only when additional_drivers > 0
- In portal/admin, display clearly in the request info panel — partners need this for insurance

### 2. Spanish Translation — both repos (DO AFTER DRIVER AGE)
- All user-facing strings in camel-customer and camel-portal
- Language toggle (EN / ES) — remember preference
- Do customer site first, then portal

---

## What Still Needs Building (Lower Priority)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint — deferred
- DAC7 EU platform reporting — deferred
- Outreach: deduplicate prospect database
- Outreach: set up `e.camel-global.com` subdomain in Resend

---

## Collaborator Note
A collaborator works on the same `camel-portal` repo from a Windows machine (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). His changes are on `main`. Always `git pull` before starting. Key files he owns: `app/admin/outreach/page.tsx`, `app/api/admin/outreach/*`.

---

## Session Log

### Chat 30 (Completed)
**Booking receipt PDF, completion statement fixes, partner suggestions**
1. `lib/email.ts` — attachments support added to camel-customer (matching portal version)
2. `lib/portal/generateBookingReceiptPDF.tsx` — new PDF generator in camel-customer. @react-pdf/renderer, A4, orange top bar, Camel logo, charge_currency, driving licence reminder note. Uploads to `booking-receipts` Supabase Storage. Emails to customer as attachment.
3. `app/api/webhooks/stripe/route.ts` (camel-customer) — calls `sendBookingReceiptEmail()` after booking created (fire-and-forget)
4. `app/api/test-booking/bookings/[id]/receipt/route.ts` — new GET route, Bearer token auth, customer DB client throughout, returns signed URL or regenerates
5. `app/bookings/[id]/page.tsx` — added `ReceiptDownloadButton` (all statuses), renamed completion statement, fixed to use charge_currency, added Camel logo
6. `partner_bookings.receipt_storage_path` column added via SQL
7. `booking-receipts` Supabase Storage bucket created (private)
8. `EMAIL_FROM` env var added to camel-customer-live on Vercel
9. `camel-invoice-logo.png` copied to camel-customer/public/
10. Partner suggestions feature — `app/api/partner/suggestions/route.ts`, `app/api/admin/suggestions/route.ts`, `app/partner/suggestions/page.tsx`, `app/admin/suggestions/page.tsx`
11. `partner_suggestions` DB table created with RLS + service role policy
12. `app/components/portal/PortalSidebar.tsx` — Suggestions added to both partner and admin nav (this is the REAL sidebar — not PartnerSidebar.tsx or AdminSidebar.tsx)
13. Admin suggestions: fixed `getPortalUserRole()` return shape (returns `{user, role, error}` not just role string), fixed super_admin access
14. Stable tags: `v-stable-chat30a`, `v-stable-chat30b`

### Chat 29 (Completed)
**Payout drilldown, per-partner export, country filter, approvals map, commission invoice system**
1. Admin reports: payout status drilldown, per-partner Excel export, partner country column
2. Partner approvals: country filter + react-leaflet map
3. Commission invoice system — full end to end working
4. Stable tags: `v-stable-chat29`, `v-stable-chat29b`, `v-stable-chat29c`

### Chat 28 (Completed)
**Admin financial dashboard, Stripe fee conversion fixes, dual-currency P&L**

### Chat 27 (Completed)
**Payout status breakdown on reports, Stripe fee fixes**

### Chat 26 (Completed)
**Currency architecture, fuel refund, commission fixes**

### Chat 25 (Completed)
Stripe Connect full payment flow.

### Chats 20–24 (Completed)
Branding, SEO, chat widget, cancellation, address search, commission fixes.

---

## Pre-Launch Build Plan

| # | Task | Status |
|---|------|--------|
| 1 | Security headers | ✅ Done |
| 2 | Code cleanup | ✅ Done |
| 3 | Rate limiting | ✅ Done |
| 4 | CAPTCHA at all sign-in points | ✅ Done |
| 5 | Cookie acceptance banner | ✅ Done |
| 6 | Partner & Admin finance pages | ✅ Done |
| 7 | RLS audit | ✅ Done |
| 8 | GDPR data deletion | ✅ Done |
| 9 | Footer + policy pages | ✅ Done |
| 10 | Spanish translation | ⬜ Todo — Chat 31 |
| 11 | Customer booking site full UI overhaul | ✅ Done |
| 11b | Portal rebrand | ✅ Done |
| 11c | Repo split | ✅ Done |
| 11d | Google Analytics | ✅ Done |
| 12 | Stripe Connect integration | ✅ Done |
| 13 | Xero monthly commission endpoint | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | ⬜ Deferred |
| 15 | Partner outreach agent | ✅ Done (collaborator) |
| 16 | Commission invoice PDF | ✅ Done |
| 17 | Booking receipt PDF | ✅ Done |
| 18 | Partner suggestions | ✅ Done |
| 19 | Driver age + additional drivers at booking | ⬜ Todo — Chat 31 |
| 20 | Spanish translation | ⬜ Todo — Chat 31 (after #19) |

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

*Last updated: Chat 30b — Booking receipt PDF, completion statement fixes, partner suggestions all complete. Driver age + additional drivers feature fully specced for Chat 31. Spanish translation after that.*