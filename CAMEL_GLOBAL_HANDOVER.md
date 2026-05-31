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
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF(). Includes section 3b — mileage limits & security deposits |
| `lib/portal/completeBooking.tsx` | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. Sends rich completion email with fuel summary, thank you message and PDF attachment. Uses direct REST fetch to portal Supabase (single project) to query `customer_requests`. Logo read from disk via `fs.readFileSync`. |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator — uses `created_at` from `partner_bookings` as the date column (pickup_at does not exist on that table). Shows all bookings including zero-commission cancelled ones. |
| `lib/portal/partnerTerms.ts` | **Single source of truth** for partner T&Cs — `PARTNER_TERMS`, `TERMS_VERSION`, `TERMS_EFFECTIVE`, `downloadPartnerTermsPDF()`. Both `signup/page.tsx` and `terms/page.tsx` import from here. Never duplicate terms content. |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64). `sendReviewReminderEmail` links to `${NEXT_PUBLIC_SITE_URL}/bookings/${requestId}#review` — ensure `NEXT_PUBLIC_SITE_URL=https://www.camel-global.com` is set in camel-customer Vercel env vars. |
| `app/api/partner/bids/route.ts` | Partner bid submission — saves mileage_limit + security_deposit_notes |
| `app/api/partner/requests/[id]/route.ts` | Partner request detail API |
| `app/api/partner/bookings/[id]/route.ts` | Partner booking detail API |
| `app/api/partner/bookings/[id]/update/route.ts` | Partner booking update — fuel override, driver assignment, lock logic |
| `app/api/partner/bookings/[id]/complete/route.ts` | Partner/admin manual completion trigger — calls completeBooking() |
| `app/api/partner/invoices/route.ts` | GET — lists partner's commission invoices with signed download URLs |
| `app/api/partner/invoices/generate/route.ts` | POST — partner generates invoice for a period. Selects `created_at` (not `pickup_at`) from `partner_bookings`. |
| `app/api/partner/stripe/connect/route.ts` | Stripe Express account creation — sets default_currency from partner_profiles.default_currency |
| `app/api/admin/invoices/route.ts` | GET/POST — admin lists and generates commission invoices. POST selects `created_at` (not `pickup_at`) from `partner_bookings`. |
| `app/api/admin/accounts/[id]/route.ts` | GET/PATCH — admin account detail. PATCH supports `commission_rate` and `default_currency` updates. |
| `app/api/internal/complete-booking/route.ts` | Internal route — called from camel-customer when booking reaches completed. Protected by CRON_SECRET. Calls completeBooking(). |
| `app/api/driver/jobs/route.ts` | Driver jobs API |
| `app/admin/bookings/[id]/page.tsx` | Admin booking detail — Stripe fee shown as Camel cost, partner payout excludes Stripe fee |
| `app/admin/bookings/page.tsx` | Admin bookings list — Camel Net Income column, partner payout excludes Stripe fee, CSV updated |
| `app/admin/reports/page.tsx` | Admin reports — commission invoices section with partner dropdown + month dropdown (starts from current month). calcPayout gives partnerPayout (no Stripe deduction) and camelNetComm. |
| `app/admin/accounts/[id]/page.tsx` | Admin account detail — includes Billing Currency Override section (admin only) to correct partner currency if wrong during setup. |
| `app/partner/reports/page.tsx` | Partner reports page — bookings, per-currency summary, Excel export, Commission Invoices section with month dropdown (starts from current month) and generate/download. |
| `app/partner/profile/page.tsx` | Partner edit profile — currency displayed read-only, not editable |
| `app/partner/signup/page.tsx` | Partner signup — imports `downloadPartnerTermsPDF` from `lib/portal/partnerTerms.ts` |
| `app/partner/terms/page.tsx` | Partner T&Cs page — imports all content from `lib/portal/partnerTerms.ts` |
| `app/driver/jobs/page.tsx` | Driver jobs page |
| `app/cron/monthly-payout/route.ts` | Monthly payout cron — runs 1st of month, triggers Stripe transfers, generates commission invoices, emails partners. Uses `created_at` (not `pickup_at`) in invoiceBookings map. |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/serverCurrency.ts` | Server-side currency conversion (unused since Chat 36) |
| `lib/email.ts` | Resend email sender |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF — includes passengers, suitcases, sport_equipment, driver_age, additional_drivers, mileage_limit, security_deposit_notes, dropoffAt, durationMinutes, and "What to bring" checklist section. Logo fetched from portal URL. |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF — includes dropoff_at and duration. Logo fetched from portal URL. |
| `app/api/test-booking/bookings/[id]/receipt/route.ts` | GET — returns signed URL for booking receipt |
| `app/api/test-booking/bookings/[id]/completion-statement/route.ts` | GET — returns signed URL for completion statement. Selects dropoff_at and journey_duration_minutes. Always regenerates PDF. |
| `app/api/test-booking/bookings/[id]/update/route.ts` | POST — customer confirms fuel/insurance. When booking reaches completed, triggers portal internal route to call completeBooking(). |
| `app/api/test-booking/requests/route.ts` | POST — creates booking request. Min driver age validation is 21 |
| `app/api/payments/create-intent/route.ts` | Creates Stripe payment intent in partner's bid currency |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates receipt PDF (with dropoffAt + durationMinutes), sends confirmation emails |
| `app/page.tsx` | Customer homepage — react-datepicker for date/time selection, useIsDesktop hook for Book Now layout, special requirements above Book Now on mobile |

---

## CRITICAL: DB Client Rules
**One Supabase project** — both portal and customer data live in the same project (`guhcavvpuveiovspzxmg.supabase.co`).

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_CUSTOMER_SUPABASE_URL` point to the same project
- `SUPABASE_SERVICE_ROLE_KEY` and `CUSTOMER_SUPABASE_SERVICE_ROLE_KEY` are the same key
- `completeBooking.tsx` uses a direct REST fetch with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to query `customer_requests`
- `customer_requests` table has RLS enabled with a permissive policy (`USING (true)`) — added Chat 38

---

## Completion Flow (CRITICAL)
Completion is triggered from the **customer** side when the customer confirms the return fuel match:

1. `app/api/test-booking/bookings/[id]/update/route.ts` (camel-customer) sets `booking_status = completed`
2. It then calls `POST /api/internal/complete-booking` on the portal with `CRON_SECRET`
3. `app/api/internal/complete-booking/route.ts` (camel-portal) validates the secret and calls `completeBooking()`
4. `completeBooking()` issues Stripe fuel refund, sends customer + partner + admin emails with PDF

---

## Stripe Payment Architecture (CRITICAL)

### Currency Architecture (fixed Chat 38)
- Partner's billing currency is set during Stripe onboarding from `partner_profiles.default_currency`
- `stripe.accounts.create()` passes `default_currency` — partner's Stripe balance stays in their currency, no conversion
- Currency is **read-only** in the partner edit profile page — cannot be changed after onboarding
- Admin can override `default_currency` on the partner profile via the admin account detail page (before Stripe onboarding only)
- Customer always pays in partner bid currency — no conversion

### Payment split — `application_fee_amount` model
- **Camel always receives exactly the commission amount** — Stripe fee never reduces it
- **Stripe fee is borne entirely by Camel** — NOT deducted from partner payout
- **Partner payout = car hire − commission + fuel charge retained**
- **Camel net income = commission − Stripe fee**
- **Fuel refunds come from the partner's connected account balance**

### Two-currency model (simplified Chat 36)
- Customer always pays in partner bid currency — no conversion
- `currency = charge_currency = bid_currency`, `conversion_rate = 1` always

### Commission calculation rule
**NEVER use `commission_amount` or `partner_payout_amount` from the DB for display.** Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const partnerPayout = Math.max(0, car_hire_price - commAmt + fuel_charge);
const camelNetComm = Math.max(0, commAmt - stripeFeeInBidCurrency);
```

### Cancellation payout rule
- Full refund cancellation → partner payout = 0
- Partial refund (within 48hrs) → partner keeps car hire minus commission

---

## Fuel Override Architecture (CRITICAL)
**Effective fuel = partner override (`collection_fuel_level_partner`) if set, else driver reading (`collection_fuel_level_driver`).**

### Lock logic
A fuel stage locks when: **effective fuel exists AND customer has confirmed AND customer fuel matches effective fuel.**

---

## Commission Invoice Architecture (CRITICAL)
- **Auto-generated:** Vercel cron runs 1st of each month at 08:00 UTC (`/api/cron/monthly-payout`)
- **Covers:** all bookings with `payout_status = ready` for each partner
- **Process:** Stripe transfer → mark bookings paid → generate PDF → upload to Supabase Storage (`commission-invoices` bucket) → insert `commission_invoices` DB record → email PDF to partner
- **Invoice number format:** `NTUK-YYYY-MM-NNN` via DB sequence `nextval_commission_invoice`
- **Date column on PDF:** uses `created_at` from `partner_bookings` — `pickup_at` does NOT exist on that table (it lives on `customer_requests`)
- **Cancelled bookings:** shown on invoice with zero commission, greyed out, for transparency
- **Partner download:** `/partner/reports` — Commission Invoices section, month dropdown from current month back 24 months
- **Admin generate:** `/admin/reports` — Commission Invoices section, partner dropdown + month dropdown
- **Manual trigger:** `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout`

---

## Partner Terms Architecture (CRITICAL)
- **Single source of truth:** `lib/portal/partnerTerms.ts` — exports `PARTNER_TERMS`, `TERMS_VERSION`, `TERMS_EFFECTIVE`, `downloadPartnerTermsPDF()`
- **Current version:** `2026-06b` effective 1 June 2026
- Both `app/partner/signup/page.tsx` and `app/partner/terms/page.tsx` import from this file
- **To update T&Cs:** edit `lib/portal/partnerTerms.ts` only — both pages update automatically

---

## PDF Logo Architecture
- Logo file: `~/camel-portal/public/camel-invoice-logo.png`
- `completeBooking.tsx` (portal) — reads logo from disk via `fs.readFileSync(path.join(process.cwd(), "public", "camel-invoice-logo.png"))`
- `generateCompletionStatementPDF.tsx` (customer) — fetches from `https://portal.camel-global.com/camel-invoice-logo.png`
- `generateBookingReceiptPDF.tsx` (customer) — fetches from `https://portal.camel-global.com/camel-invoice-logo.png`

---

## Environment Variables (CRITICAL)
| Variable | Repo | Value |
|----------|------|-------|
| `NEXT_PUBLIC_SITE_URL` | camel-customer (Vercel) | `https://www.camel-global.com` — must be set or review email links break |

---

## Date Picker (Customer Homepage)
- Uses `react-datepicker` + `date-fns` (installed Chat 37)
- Both pickup and dropoff use `showTimeSelect`, 30-minute intervals, `dd/MM/yyyy, HH:mm` format
- Styled with Camel design (black header, orange selected state)
- `useIsDesktop()` hook controls Book Now layout — exactly ONE Book Now rendered at all times

## Homepage Book Now Layout (Fixed Chat 37)
- **Desktop, no additional drivers:** Book Now spans cols 3–4 of driver age grid. Special requirements in cols 1–2 below, "No account needed" in cols 3–4
- **Desktop, additional drivers:** Book Now full-width below grid
- **Mobile:** Special requirements above Book Now, always full width
- Uses `useIsDesktop()` React hook (not CSS breakpoints) to avoid duplicate rendering bugs

---

## Email Addresses
| Address | Type | Forwards to |
|---------|------|-------------|
| `info@camel-global.com` | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| `contact@camel-global.com` | Forwarder | `artur@` + `info@` |
| `partners@camel-global.com` | Forwarder | `artur@` + `info@` |
| `email@camel-global.com` | Forwarder | `nicktrin@gmail.com` + `artur@` |

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-fuel-override-complete` | Chat 35 — full fuel override flow |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout fixed (customer repo) |
| `v-stable-chat37-pre-payout-fix` | Chat 37 — before cancellation net payout fix |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |
| `v-stable-chat39-testing` | Chat 39 — testing phase: terms shared lib, commission invoices, partner reports invoices, admin currency override, review link fix |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat36-pre` | Chat 36 — single currency model |
| `v-stable-chat37-homepage-layout` | Chat 37 — homepage layout, date picker, Book Now fixed |
| `v-stable-chat38-pre-spanish` | Chat 38 — completion email, logo on PDFs, currency locked at onboarding |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat39-testing
cd ~/camel-customer && git checkout v-stable-chat38-pre-spanish
```

---

## What Is Working ✅
- Customer booking flow — homepage with react-datepicker (date + time), driver age, Book Now layout correct on all screen sizes
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support (customer always pays in bid currency)
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording — driver OR office can record, effective fuel = partner override || driver reading
- Office fuel override — partner admin can override driver fuel reading
- Fuel charge/refund calculation
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all (booking confirmed, completion, review reminder)
- Review reminder email — links to `${NEXT_PUBLIC_SITE_URL}/bookings/${requestId}#review` (requires `NEXT_PUBLIC_SITE_URL` set in camel-customer Vercel)
- Completion email — customer receives rich email with PDF attachment (fixed Chat 38)
- Completion statement PDF — includes dropoff time, duration and logo (fixed Chat 38)
- Booking receipt PDF — includes dropoff time and duration, logo from portal URL
- Customer password reset
- Live status system — 7 checks
- Partner onboarding — 7 steps including Stripe Express
- Stripe Connect partner onboarding — default_currency set from partner profile (fixed Chat 38)
- Partner billing currency — read-only in edit profile, correctable by admin in account detail page
- Partner + admin bookings and reports
- Commission invoice PDF — auto-generated monthly, emailed to partner with PDF attachment
- Commission invoices — downloadable from partner reports page (month dropdown, current month included)
- Commission invoices — admin can generate on-demand per partner per month from admin reports page
- Partner terms — single source of truth in `lib/portal/partnerTerms.ts`, version `2026-06b`
- Stripe payment split — `application_fee_amount` ensures Camel gets exact commission, Stripe fee borne by Camel
- Partner payout correctly excludes Stripe fee everywhere
- Camel Net Income = commission − Stripe fee shown in admin reports and CSV
- Admin bookings page — Camel Net Income column, correct partner payout
- Admin reports page — all tables, tiles, Financial Dashboard and CSV updated
- Partner reports page — summary tiles, Excel export, Commission Invoices section
- Partner booking detail — net payout shows zero on full refund cancellation
- Document checklist — shown on confirmed booking page and in receipt PDF only
- Sport equipment, driver age, additional drivers — everywhere and in both PDFs
- Young driver warning (21–24)
- Internal complete-booking route — `POST /api/internal/complete-booking` protected by CRON_SECRET
- Admin currency override — admin can correct partner billing currency from account detail page

---

## What Needs Building in Chat 40

### 1. Spanish Translation (PRIORITY)
- All user-facing strings in camel-customer and camel-portal
- Language toggle (EN / ES) — remember preference in localStorage
- Do customer site first, then portal

### 2. Continue testing
- Keep testing all flows and fixing bugs before translation

---

## What Still Needs Building (Lower Priority)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint — deferred
- DAC7 EU platform reporting — deferred
- Outreach: set up `e.camel-global.com` subdomain in Resend

---

## Collaborator Note
A collaborator works on `camel-portal` from Windows (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). Always `git pull` before starting.

**Note:** `camel-coming-soon` is a git submodule inside `camel-portal`. It always shows as modified in `git status` — this is normal and can be ignored. Use `git add <specific-file>` rather than `git add .` when committing portal changes to avoid submodule conflicts.

---

## Session Log

### Chat 39 (Completed)
**Testing phase — bug fixes and feature completions**

1. `lib/portal/partnerTerms.ts` (portal) — **new file**. Single source of truth for partner T&Cs. Exports `PARTNER_TERMS`, `TERMS_VERSION` (`2026-06b`), `TERMS_EFFECTIVE`, `downloadPartnerTermsPDF()`.
2. `app/partner/signup/page.tsx` (portal) — removed inline terms data, imports `downloadPartnerTermsPDF` from shared lib.
3. `app/partner/terms/page.tsx` (portal) — imports all content from shared lib.
4. `app/partner/reports/page.tsx` (portal) — added Commission Invoices section: lists past invoices, generate/download by month dropdown (current month included).
5. `app/admin/reports/page.tsx` (portal) — fixed duplicate months in invoice generator dropdown; month dropdown now starts from current month.
6. `lib/portal/generateCommissionInvoice.tsx` (portal) — added Date column to PDF table; shows all bookings including zero-commission cancelled ones (greyed, "nil"); renamed `pickup_at` → `created_at` in `InvoiceBooking` type (pickup_at does not exist on partner_bookings).
7. `app/api/partner/invoices/generate/route.ts` (portal) — selects `created_at` instead of `pickup_at`.
8. `app/api/admin/invoices/route.ts` (portal) — selects `created_at` instead of `pickup_at`.
9. `app/cron/monthly-payout/route.ts` (portal) — selects `created_at` instead of `pickup_at`; passes `created_at` in invoiceBookings map.
10. `app/api/admin/accounts/[id]/route.ts` (portal) — PATCH now supports `default_currency` in addition to `commission_rate`.
11. `app/admin/accounts/[id]/page.tsx` (portal) — added Billing Currency Override section in right column with warning note.
12. `NEXT_PUBLIC_SITE_URL` — set to `https://www.camel-global.com` in camel-customer Vercel env vars to fix review email links pointing to `/coming-soon`.
13. Stable tag: `v-stable-chat39-testing` (portal).

### Chat 38 (Completed)
**Completion email, PDF logo, currency architecture fix**

1. `lib/portal/completeBooking.tsx` (portal) — replaced inline `require()` customer DB client with direct REST fetch. Added `fs.readFileSync` for logo. Fixed customer email not sending.
2. `app/api/internal/complete-booking/route.ts` (portal) — **new file**. Internal route protected by `CRON_SECRET`.
3. `app/api/test-booking/bookings/[id]/update/route.ts` (customer) — added `fetch` call to portal internal route when `booking_status = completed`.
4. `app/api/test-booking/bookings/[id]/completion-statement/route.ts` (customer) — added `dropoff_at` and `journey_duration_minutes`. Always regenerates PDF.
5. `lib/portal/generateCompletionStatementPDF.tsx` (customer) — fixed logo URL.
6. `app/api/partner/stripe/connect/route.ts` (portal) — added `default_currency` to `stripe.accounts.create()`.
7. `app/partner/profile/page.tsx` (portal) — currency read-only.
8. `customer_requests` RLS — added permissive policy.
9. Stable tags: `v-stable-chat38-pre-spanish` (both repos).

### Chat 37 (Completed)
**Homepage layout, date picker, Stripe fee architecture fix, completion email fix**

### Chat 36 (Completed)
**Single currency model — customer always pays in partner bid currency**

### Chat 32b (Completed)
**Stripe payment architecture fix, rich metadata, fee wording corrected**

### Chat 32 (Completed)
**Min age 21, young driver warning, mileage/deposit on bids, document checklist, completion email fix, terms updated**

---

## Useful Commands

```bash
# Always pull before starting
cd ~/camel-portal && git pull origin main
cd ~/camel-customer && git pull origin main

# Portal deploy (specific files — avoid submodule issues)
cd ~/camel-portal && git add path/to/file.tsx && git commit -m "message" && git push origin main

# Customer deploy
cd ~/camel-customer && git add app/path/to/file.tsx && git commit -m "message" && git push origin main

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Roll back
git checkout v-tag-name

# Manual cron trigger
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://portal.camel-global.com/api/cron/monthly-payout

# IMPORTANT: camel-coming-soon is a submodule — always shows modified in git status, ignore it.
# Commit specific files to avoid submodule issues:
git add app/path/to/file.tsx && git commit -m "message" && git push origin main
```

---

*Last updated: Chat 39 — Testing phase: partner terms single source of truth, commission invoices on partner/admin reports, invoice PDF date column + cancelled bookings shown, admin currency override, review email link fix (NEXT_PUBLIC_SITE_URL), invoice month dropdowns include current month.*