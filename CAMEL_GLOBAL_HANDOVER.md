# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory. For small fixes this isn't needed, but for any full file rewrite, paste the file first.
- **Always give Claude the full file tree** at the start of a new chat by running: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
- **Repo:** `github.com/nicktrin-lang/camel-portal`
- **Branch:** `main`
- **Local path:** `~/camel-portal`
- **Deployment:** Vercel (auto-deploys on push to main)
- **Cost target:** Zero / minimal

### How It Works
1. Customer submits a car hire request with pickup/dropoff details
2. All car hire companies (partners) within 30km radius are alerted and can bid
3. Customer accepts a bid → booking is confirmed
4. Driver delivers car to chosen location; fuel level recorded at delivery
5. Fuel level recorded again at collection
6. Customer pays only for fuel used (rounded to nearest ¼ tank)
7. Launching in Spain first, with USD support ready for future US rollout

### Three Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `/test-booking` | End customers |
| Partner | `/partner` | Car hire companies |
| Driver | `/driver` | Delivery drivers |
| Admin | `/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files
| File | Purpose |
|------|---------|
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status logic — checks all 6 requirements, updates DB |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check for current partner |

### Currency System
- **Storage:** All prices stored in the currency the booking was made in (`booking.currency`)
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app` (no API key), cached 1 hour, fallback to hardcoded rates
- **Fallback rates:** GBP 0.85, USD 1.08
- **Partner billing:** Partners price in their own currency (EUR or GBP typically)
- **Customer display:** Converted to customer's preferred currency in real time

### Live Status System
A partner account is **live** only when ALL of the following are true:
1. Fleet base address set (`base_address`)
2. Fleet base lat/lng set (`base_lat`, `base_lng`)
3. Service radius set (`service_radius_km > 0`)
4. At least one active fleet vehicle (`partner_fleet.is_active = true`)
5. At least one active driver (`partner_drivers.is_active = true`)
6. Billing currency set (`default_currency`)

### Insurance Documents Handover System
At delivery, both driver and customer must confirm insurance documents were handed over:
- **Driver app** — checkbox at delivery stage (hard blocker — cannot confirm delivery fuel without ticking)
- **Customer portal** — separate `InsuranceConfirmCard` always visible once booking exists; customer ticks and confirms after driver has confirmed
- **Partner portal** — read-only `InsuranceStatusCard` showing both driver and customer status; always visible
- **DB columns:** `insurance_docs_confirmed_by_driver`, `insurance_docs_confirmed_by_driver_at`, `insurance_docs_confirmed_by_customer`, `insurance_docs_confirmed_by_customer_at` on `partner_bookings`
- Insurance is delivery-only (not collection). Saved via `insurance_only: true` flag in customer update API so it doesn't interfere with fuel confirmation state.
- Driver app auto-refreshes every 10s (silent fetch, does not reset fuel/insurance input state)

### Driver Audit Trail System
Permanent record of exactly who delivered and collected each vehicle and when:
- **DB columns on `partner_bookings`:** `delivery_driver_id`, `delivery_driver_name`, `delivery_confirmed_at`, `collection_driver_id`, `collection_driver_name`, `collection_confirmed_at`
- Stamped automatically by the driver confirm API at the moment the driver confirms — **never overwritten**
- If a different driver is assigned before collection, the new driver is stamped for collection; the delivery driver record remains intact
- When `assigned_driver_id` changes, the booking disappears from the old driver's app immediately
- **Partner portal** shows a Driver Audit Trail card with delivery driver + timestamp, collection driver + timestamp, and an amber warning if different drivers handled each leg

### Fuel Confirmation Flow
- Driver records fuel at delivery (`collection` stage) and collection (`return` stage)
- Customer confirms each reading independently — copies driver's fuel level as customer fuel
- Both must agree (same fuel level) to lock each stage
- Partner has office override to correct driver reading if needed
- Booking status: `collected` when delivery locked, `completed` when both locked
- Fuel charge calculated automatically on completion

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-driver-audit-trail
```
**Tag:** `v-stable-driver-audit-trail`
**Description:** Full driver audit trail. Delivery and collection driver stamped permanently with exact timestamps when they confirm via their app. Never overwritten — split-driver bookings correctly record both drivers. Partner portal shows Driver Audit Trail card with names, times, and amber warning if different drivers handled each leg. Job disappears from old driver's app immediately on reassignment.

### Previous Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-insurance-handover` | Full insurance document handover flow. Driver checkbox hard blocker. Customer confirmation card. Partner read-only status. Driver app shows both sides and auto-refreshes every 10s. |
| `v-stable-live-status-checks` | Live status checks require fleet location, service radius, billing currency, at least one active fleet vehicle, and at least one active driver. |
| `v-stable-fuel-flow-fixed` | Full fuel confirmation flow working end to end. |
| `v-stable-admin-booking-fixes` | Admin booking detail matches partner view. All three currencies shown everywhere. |
| `v-stable-password-reset` | All three portals password reset fully working with branded emails. |
| `v-stable-currency-reporting` | Full EUR/GBP/USD revenue reporting on partner and admin booking pages. |

### What Is Working ✅
- Customer booking flow (test-booking portal)
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support throughout
- Live exchange rates with fallback
- Currency selector persisted in localStorage per user
- Partner bookings page — per-currency revenue cards + breakdown table + date filter
- Admin bookings page — full reconciliation table per currency + currency filter dropdown
- Fuel level recording at delivery and collection
- Fuel charge / refund calculation
- Customer fuel confirmation flow
- Partner and admin booking detail pages
- Email notifications (application received, etc.)
- Google Maps integration (pickup/dropoff, partner location)
- Forgot password flow on all three login pages
- Reset password pages for partner, driver and customer portals
- Branded reset emails via Resend from Camel Global address
- Correct post-reset redirects for all three portals
- **Live status system** — 6 requirements, shown everywhere with missing items listed
- **Partner login** — always goes to dashboard, no onboarding redirect loop
- **Partner onboarding** — Go Live step shows real completion state even if steps were skipped
- **Partner dashboard** — amber live status banner with clickable fix links
- **Driver portal** — independent header, full name + company name, correct logout, 3 tab cards, 10-per-page pagination, auto-refresh every 10s
- **Insurance handover** — driver checkbox (hard blocker at delivery), customer confirmation card, partner read-only status, driver app shows both sides
- **Driver audit trail** — permanent stamp of delivery driver + time and collection driver + time; split-driver warning on partner portal; reassignment removes job from old driver immediately

---

## Session Log

### Chat 1 (Initial build — filled)
- Project created from scratch, Supabase schema built, all three portals scaffolded
- Core booking flow and fuel level recording implemented

### Chat 2 (Currency work — filled)
- GBP support, live exchange rates, currency selector, dual currency display
- Partner profile currency detection by country

### Chat 3 (filled)
- USD support throughout, full EUR/GBP/USD revenue summary on partner and admin booking pages
- Stable tag: `v-stable-currency-reporting`

### Chat 4 (Completed)
- Reset-password pages for all three portals, branded emails via Resend
- Stable tag: `v-stable-password-reset`

### Chat 5 (Completed)
- Admin booking detail rebuilt to match partner view, all three currencies everywhere
- Stable tag: `v-stable-admin-booking-fixes`

### Chat 6 (Completed)
- Full 6-check live status system, dashboard banners, partner login redirect fix, driver portal polish
- Stable tag: `v-stable-live-status-checks`

### Chat 7 (Completed)
- Fuel flow fixes — correct stage labels, lock logic, driver layout, partner booking detail
- Stable tag: `v-stable-fuel-flow-fixed`

### Chat 8 (Completed)
- Full insurance document handover flow across all three portals
- Added 4 insurance columns to `partner_bookings`
- Driver confirm API hard blocks without insurance tick
- Customer update API `insurance_only` flag saves independently of fuel state
- Both GET API routes fixed to return insurance columns
- Driver app auto-refreshes every 10s silently
- Stable tag: `v-stable-insurance-handover`

### Chat 9 (Completed)
- Added driver audit trail — 6 new columns on `partner_bookings`: `delivery_driver_id`, `delivery_driver_name`, `delivery_confirmed_at`, `collection_driver_id`, `collection_driver_name`, `collection_confirmed_at`
- Driver confirm API stamps delivery/collection driver at moment of confirmation — never overwritten
- Partner booking detail — new Driver Audit Trail card showing who delivered and collected with exact timestamps; amber warning if different drivers
- Partner bookings GET API updated to select all 6 new columns
- Booking disappears from old driver's app immediately on reassignment
- Stable tag: `v-stable-driver-audit-trail`

---

## Business Model & Roadmap

### Revenue Model
Camel Global operates as a **marketplace facilitator**. Customers pay Camel Global directly (not the partner). Camel takes its commission and passes the remainder to the partner automatically via Stripe Connect.

**Commission Structure:**
- 15% of car hire price (not fuel) for first 10 completed bookings per partner
- Drops to 10% after 10 successful completed bookings
- Fuel charges pass through at 100% to partner — Camel takes no cut on fuel
- Commission is deducted automatically at point of payment split — no chasing partners

**Alternative model under consideration:** Flat monthly subscription fee (£99–£199/month) with zero commission. To be decided before launch.

---

### Payment Architecture — Stripe Connect (To Build)
**Status:** Not yet built.
- Customer card held by Stripe at booking acceptance
- On completion: automatic split — partner share + Camel commission
- Partner bank details in Stripe only — never in Camel DB
- Files to create: `app/api/stripe/`, `lib/stripe.ts`, `app/partner/payments/`

---

### Invoicing & Tax (To Build)
**Status:** Not yet built.
- Auto-generated monthly PDF commission invoices per partner
- VAT/IVA handling (UK 20%, Spain 21%)
- Files to create: `app/api/invoicing/generate/route.ts`, `lib/invoice.ts`, `app/partner/invoices/`, `app/admin/invoices/`

---

### Insurance Certificate Upload (To Build)
**Status:** Handover confirmation done. Certificate upload not yet built.
- Partners upload insurance certificate to profile
- Certificate expiry alerts (30 days warning)
- Expired = auto not-live
- Files to update: `app/partner/profile/page.tsx`, `app/admin/approvals/`

---

### Terms & Conditions (To Build)
**Status:** Not yet built.
- Customer and partner T&Cs with versioned acceptance
- Re-acceptance required on update

---

### Multilingual Support — English & Spanish (To Build)
**Status:** Marketing homepage has EN/ES/IT/FR/DE. Portals are English only.
- Files to create: `lib/i18n.ts`, `messages/en.json`, `messages/es.json`

---

### Reviews & Ratings (To Build)
**Status:** Not yet built.
- Post-booking review prompt, 1–5 star + written review, public on bid cards
- Files to create: `partner_reviews` table, review UI, `app/partner/reviews/`, `app/admin/reviews/`

---

## Outstanding TODOs
- [ ] `partner_profiles` table missing columns: `currency`, `fleet_size`, `description` — add when ready
- [ ] Reports pages (`/partner/reports` and `/admin/reports`) — not yet updated for multi-currency
- [ ] CSV export on admin bookings page
- [ ] Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options)
- [ ] Full RLS audit on all Supabase tables
- [ ] Rate limiting on `/api/auth/` routes
- [ ] GDPR data deletion endpoint
- [ ] `app/partner/bids/` — folder exists, no page.tsx (unused/WIP)
- [ ] `app/api/admin/admin/requests/` — looks like legacy duplicate, review and remove
- [ ] Clean up stray files: `main`, `camel-portal/camel-portal/`, `public/Screenshot *.png`

---

## Useful Commands

```bash
# Push changes
git add .
git commit -m "your message"
git push origin main

# Show full file tree (paste to Claude at start of each chat)
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat multiple files for Claude
cat ~/camel-portal/app/partner/login/page.tsx

# Create a stable rollback tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back to a tag
git checkout v-tag-name

# List all tags
git tag

# Check what's changed
git status
git diff
```

---

## Environment
- `.env.local` — Supabase keys, Google Maps API key, email config
- Never commit `.env.local` — it is in `.gitignore`
- Vercel environment variables set separately in Vercel dashboard

---

*Last updated: Chat 9 — Driver audit trail fully working*
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory. For small fixes this isn't needed, but for any full file rewrite, paste the file first.
- **Always give Claude the full file tree** at the start of a new chat by running: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
- **Repo:** `github.com/nicktrin-lang/camel-portal`
- **Branch:** `main`
- **Local path:** `~/camel-portal`
- **Deployment:** Vercel (auto-deploys on push to main)
- **Cost target:** Zero / minimal

### How It Works
1. Customer submits a car hire request with pickup/dropoff details
2. All car hire companies (partners) within 30km radius are alerted and can bid
3. Customer accepts a bid → booking is confirmed
4. Driver delivers car to chosen location; fuel level recorded at collection
5. Fuel level recorded again at return
6. Customer pays only for fuel used (rounded to nearest ¼ tank)
7. Launching in Spain first, with USD support ready for future US rollout

### Three Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `/test-booking` | End customers |
| Partner | `/partner` | Car hire companies |
| Driver | `/driver` | Delivery drivers |
| Admin | `/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files
| File | Purpose |
|------|---------|
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status logic — checks all 6 requirements, updates DB |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check for current partner |

### Currency System
- **Storage:** All prices stored in the currency the booking was made in (`booking.currency`)
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app` (no API key), cached 1 hour, fallback to hardcoded rates
- **Fallback rates:** GBP 0.85, USD 1.08
- **Partner billing:** Partners price in their own currency (EUR or GBP typically)
- **Customer display:** Converted to customer's preferred currency in real time

### Live Status System
A partner account is **live** only when ALL of the following are true:
1. Fleet base address set (`base_address`)
2. Fleet base lat/lng set (`base_lat`, `base_lng`)
3. Service radius set (`service_radius_km > 0`)
4. At least one active fleet vehicle (`partner_fleet.is_active = true`)
5. At least one active driver (`partner_drivers.is_active = true`)
6. Billing currency set (`default_currency`)

### Insurance Documents Handover System
At delivery, both driver and customer must confirm insurance documents were handed over:
- **Driver app** — checkbox at delivery stage (hard blocker — cannot confirm delivery fuel without ticking)
- **Customer portal** — separate `InsuranceConfirmCard` always visible once booking exists; customer ticks and confirms after driver has confirmed
- **Partner portal** — read-only `InsuranceStatusCard` showing both driver and customer status; visible always
- **DB columns:** `insurance_docs_confirmed_by_driver`, `insurance_docs_confirmed_by_driver_at`, `insurance_docs_confirmed_by_customer`, `insurance_docs_confirmed_by_customer_at` on `partner_bookings`
- Insurance is delivery-only (not collection/return). Saved via `insurance_only: true` flag in customer update API so it doesn't interfere with fuel confirmation state.
- Driver app auto-refreshes every 10s (silent fetch, does not reset fuel/insurance input state)

### Fuel Confirmation Flow
- Driver records fuel at delivery (`collection` stage) and collection (`return` stage)
- Customer confirms each reading independently — copies driver's fuel level as customer fuel
- Both must agree (same fuel level) to lock each stage
- Partner has office override to correct driver reading if needed
- Booking status: `collected` when delivery locked, `completed` when both locked
- Fuel charge calculated automatically on completion

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-insurance-handover
```
**Tag:** `v-stable-insurance-handover`
**Description:** Full insurance document handover flow. Driver must tick insurance checkbox before confirming delivery (hard blocker). Customer confirms receipt via dedicated card on booking page. Partner sees read-only status of both sides. Driver app shows both driver and customer confirmation status and auto-refreshes every 10s. All four insurance columns added to partner_bookings table. Insurance confirmation saved independently of fuel state via insurance_only flag.

### Previous Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-live-status-checks` | Live status checks require fleet location, service radius, billing currency, at least one active fleet vehicle, and at least one active driver. Missing items shown on admin approvals, admin account management, partner account page, and partner dashboard. Partner login always goes to dashboard. Onboarding Go Live step fetches real counts on mount. |
| `v-stable-fuel-flow-fixed` | Full fuel confirmation flow working end to end. Driver sets collected/returned status. Customer confirms each fuel stage independently. Booking only completes when both driver and customer confirm both stages. |
| `v-stable-admin-booking-fixes` | Admin booking detail matches partner view. All three currencies shown everywhere. |
| `v-stable-password-reset` | All three portals password reset fully working with branded emails. |
| `v-stable-currency-reporting` | Full EUR/GBP/USD revenue reporting on partner and admin booking pages. |

### What Is Working ✅
- Customer booking flow (test-booking portal)
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support throughout
- Live exchange rates with fallback
- Currency selector persisted in localStorage per user
- Partner bookings page — per-currency revenue cards + breakdown table + date filter
- Admin bookings page — full reconciliation table per currency + currency filter dropdown
- Fuel level recording at collection and return
- Fuel charge / refund calculation
- Customer fuel confirmation flow
- Partner and admin booking detail pages
- Email notifications (application received, etc.)
- Google Maps integration (pickup/dropoff, partner location)
- Forgot password flow on all three login pages
- Reset password pages for partner, driver and customer portals
- Branded reset emails via Resend from Camel Global address
- Correct post-reset redirects for all three portals
- **Live status system** — 6 requirements, shown everywhere with missing items listed
- **Partner login** — always goes to dashboard, no onboarding redirect loop
- **Partner onboarding** — Go Live step shows real completion state even if steps were skipped
- **Partner dashboard** — amber live status banner with clickable fix links
- **Driver portal** — independent header with full name + company name, correct logout, login box properly positioned, 3 clickable tab cards, 10-per-page pagination, partner drivers page links to driver portal
- **Insurance handover** — driver checkbox (hard blocker at delivery), customer confirmation card, partner read-only status, driver app shows both sides, auto-refresh every 10s

---

## Session Log

### Chat 1 (Initial build — filled)
- Project created from scratch
- Supabase schema built
- All three portals scaffolded
- Core booking flow implemented
- Fuel level recording implemented

### Chat 2 (Currency work — filled)
- Added GBP support alongside EUR
- Live exchange rate integration (frankfurter.app)
- Currency selector component built
- Dual currency display on booking pages
- Partner profile currency detection by country
- Admin and partner booking list pages updated for currency

### Chat 3 (filled)
- Added `formatUSD` to `lib/currency.ts`
- Updated `formatCurrency()` to handle USD
- Fixed `app/test-booking/requests/[id]/page.tsx` — USD support
- Updated `app/partner/bookings/page.tsx` — full EUR/GBP/USD revenue summary
- Updated `app/admin/bookings/page.tsx` — full reconciliation table per currency
- Stable tag: `v-stable-currency-reporting`

### Chat 4 (Completed)
- Fixed Supabase redirect URL config
- Built reset-password pages for all three portals
- Fixed TypeScript errors in reset-password pages
- Added `app/api/auth/send-reset-email/route.ts`
- Added `app/api/auth/send-customer-reset-email/route.ts`
- Added `app/api/auth/exchange-reset-code/route.ts`
- Added `lib/supabase/auth-client.ts`
- All three portals password reset fully working
- Stable tag: `v-stable-password-reset`

### Chat 5 (Completed)
- Restored partner requests detail page from git history
- Fixed rate badge to always show EUR/GBP/USD on customer and partner booking pages
- Fixed USD rate fetch — now uses live frankfurter.app rate
- Fixed `Amt` component to show all three currency conversions
- Admin booking detail page rebuilt to match partner view
- Added partner company name to booking detail API response
- Admin request detail — duration in days, bid currency displayed correctly
- Stable tag: `v-stable-admin-booking-fixes`

### Chat 6 (Completed)
- Built full annotated file structure breakdown
- Fixed `lib/portal/refreshPartnerLiveStatus.ts` — added driver and currency checks
- Updated admin approvals, admin accounts, partner account, partner dashboard — live status banners
- Updated partner onboarding — Go Live step fetches real counts on mount
- Updated partner login — removed onboarding redirect, all approved partners go to dashboard
- Updated driver portal — independent header, correct layout, 3 tab cards, pagination
- Stable tag: `v-stable-live-status-checks`

### Chat 7 (Completed)
- Fixed driver confirm API — return stage sets `booking_status = "returned"` not `"completed"`
- Fixed customer page fuel lock flicker
- Fixed driver jobs page — jobs start collapsed, correct labels, clickable tab cards, 10 per page
- Fixed driver layout — independent header, full name + company name, correct logout
- Fixed partner booking detail — correct fuel stage labels
- Fixed partner bookings list — confirmed status now blue
- Added driver portal link card to partner drivers page
- Stable tag: `v-stable-fuel-flow-fixed`

### Chat 8 (Completed)
- Added insurance document handover flow across all three portals
- Added 4 columns to `partner_bookings`: `insurance_docs_confirmed_by_driver`, `insurance_docs_confirmed_by_driver_at`, `insurance_docs_confirmed_by_customer`, `insurance_docs_confirmed_by_customer_at`
- **Driver confirm API** — insurance is hard blocker at delivery; 400 error if not ticked
- **Driver jobs page** — insurance checkbox at delivery, confirm button disabled until ticked; summary card shows both driver and customer status; auto-refresh every 10s (silent, doesn't reset input state)
- **Driver jobs API** — added insurance columns to select and response map
- **Customer update API** — `insurance_only: true` flag saves insurance independently of fuel state; `now` variable hoisted before insurance-only block (fixed TS build error)
- **Customer request page** — `InsuranceConfirmCard` always visible once booking exists, independent of fuel lock state; full clean rewrite to fix JSX structure
- **Partner booking detail** — `InsuranceStatusCard` always visible, read-only, shows driver + customer status separately; full clean rewrite to fix JSX structure
- **Both GET API routes** fixed to include insurance columns in Supabase select + response mapping: `app/api/test-booking/requests/[id]/route.ts` and `app/api/partner/bookings/[id]/route.ts`
- Stable tag: `v-stable-insurance-handover`

---

## Business Model & Roadmap

### Revenue Model
Camel Global operates as a **marketplace facilitator**. Customers pay Camel Global directly (not the partner). Camel takes its commission and passes the remainder to the partner automatically via Stripe Connect.

**Commission Structure:**
- 15% of car hire price (not fuel) for first 10 completed bookings per partner
- Drops to 10% after 10 successful completed bookings
- Fuel charges pass through at 100% to partner — Camel takes no cut on fuel
- Commission is deducted automatically at point of payment split — no chasing partners

**Alternative model under consideration:** Flat monthly subscription fee (£99–£199/month) with zero commission. To be decided before launch.

---

### Payment Architecture — Stripe Connect (To Build)
**Status:** Not yet built.

- Customer card held by Stripe at booking acceptance
- On completion: automatic split — partner share + Camel commission
- Partner bank details in Stripe only — never in Camel DB
- Files to create: `app/api/stripe/`, `lib/stripe.ts`, `app/partner/payments/`

---

### Invoicing & Tax (To Build)
**Status:** Not yet built.

- Auto-generated monthly PDF commission invoices per partner
- VAT/IVA handling (UK 20%, Spain 21%)
- Files to create: `app/api/invoicing/generate/route.ts`, `lib/invoice.ts`, `app/partner/invoices/`, `app/admin/invoices/`

---

### Insurance (To Build)
**Status:** Handover confirmation done. Certificate upload not yet built.

- Partners upload insurance certificate to profile
- Certificate expiry alerts (30 days warning)
- Expired = auto not-live
- Files to update: `app/partner/profile/page.tsx`, `app/admin/approvals/`

---

### Terms & Conditions (To Build)
**Status:** Not yet built.

- Customer T&Cs with versioned acceptance (`customer_tc_acceptances` table)
- Partner T&Cs with versioned acceptance (`partner_tc_acceptances` table)
- Re-acceptance required on update

---

### Partner Onboarding Polish (To Build)
**Status:** Functional but not slick.

- Progress bar wizard already exists at `/partner/onboarding`
- Needs: insurance upload step, branded confirmation email, Spanish translation

---

### Multilingual Support — English & Spanish (To Build)
**Status:** Marketing homepage has EN/ES/IT/FR/DE. Portals are English only.

- Recommended approach: Option B (simple JSON + context, consistent with marketing page)
- Files to create: `lib/i18n.ts`, `messages/en.json`, `messages/es.json`

---

### Reviews & Ratings (To Build)
**Status:** Not yet built.

- Post-booking review prompt for customers
- 1–5 star + written review, public on bid cards
- Files to create: `partner_reviews` table, review UI on booking completion, `app/partner/reviews/`, `app/admin/reviews/`

---

## Outstanding TODOs
- [ ] `partner_profiles` table missing columns: `currency`, `fleet_size`, `description` — add when ready
- [ ] Reports pages (`/partner/reports` and `/admin/reports`) — not yet updated for multi-currency
- [ ] CSV export on admin bookings page
- [ ] Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options)
- [ ] Full RLS audit on all Supabase tables
- [ ] Rate limiting on `/api/auth/` routes
- [ ] GDPR data deletion endpoint
- [ ] `app/partner/bids/` — folder exists, no page.tsx (unused/WIP)
- [ ] `app/api/admin/admin/requests/` — looks like legacy duplicate, review and remove
- [ ] Clean up stray files: `main`, `camel-portal/camel-portal/`, `public/Screenshot *.png`

---

## Useful Commands

```bash
# Push changes
git add .
git commit -m "your message"
git push origin main

# Show full file tree (paste to Claude at start of each chat)
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat multiple files for Claude
cat ~/camel-portal/app/partner/login/page.tsx
cat ~/camel-portal/app/partner/dashboard/page.tsx

# Create a stable rollback tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back to a tag
git checkout v-tag-name

# List all tags
git tag

# Check what's changed
git status
git diff
```

---

## Environment
- `.env.local` — Supabase keys, Google Maps API key, email config
- Never commit `.env.local` — it is in `.gitignore`
- Vercel environment variables set separately in Vercel dashboard

---

*Last updated: Chat 8 — Insurance document handover flow fully working across all portals*