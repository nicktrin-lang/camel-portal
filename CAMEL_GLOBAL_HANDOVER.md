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
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers |
| `app/api/geocode/route.ts` | Photon forward search + Nominatim reverse geocode |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (portal side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to partner/admin |
| `app/api/cron/review-reminder/route.ts` | Daily cron — sends review reminder 7 days after completion |
| `app/api/partner/stripe/connect/route.ts` | Creates Stripe Express account + returns onboarding URL |
| `app/api/partner/stripe/status/route.ts` | Returns partner Stripe onboarding status |
| `app/api/partner/stripe/dashboard-link/route.ts` | Returns Stripe Express dashboard login link |
| `app/api/webhooks/stripe/route.ts` | Portal webhook — handles `account.updated` (partner onboarding) |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable (mouse + touch), streaming |
| `app/components/Footer.tsx` | Smart footer — partner/admin/driver/customer variants |
| `app/partner/onboarding/page.tsx` | 7-step onboarding — Location, Currency, Billing, Fleet, Drivers, **Payouts (Stripe)**, Go Live |
| `app/partner/settings/page.tsx` | Settings — payout management + Stripe Express link + delete account |
| `app/partner/dashboard/page.tsx` | Dashboard — Stripe payout status banner + checklist |
| `app/driver/jobs/page.tsx` | Driver jobs — light theme, expandable jobs, fuel recording. **Needs stat cards added (awaiting delivery / on hire / completed counts)** |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (customer side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to customer |
| `app/api/payments/create-intent/route.ts` | Creates Stripe PaymentIntent with destination charge split (Camel commission + partner net) |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — handles `payment_intent.succeeded` → creates booking, records payment |
| `app/api/test-booking/bookings/[id]/cancel/route.ts` | Customer booking cancellation |
| `app/checkout/[bid_id]/page.tsx` | Stripe Elements checkout page — card form, order summary, pay button |
| `app/components/ChatWidget.tsx` | **Identical to portal version** — always update both |
| `app/bookings/[id]/page.tsx` | Booking detail — "Accept & Pay →" redirects to checkout, payment success banner |
| `app/login/page.tsx` | Customer login — supports `?next=` redirect param |
| `next.config.ts` | CSP headers — includes Stripe domains (js.stripe.com, *.stripe.com) |
| `app/ClientRootLayout.tsx` | Global nav — suppressed on `/checkout` pages only |

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
→ PaymentIntent created with destination charge split:
    Camel account:  commission amount (20%, min €10)
    Partner account: net car hire + full fuel deposit
→ Customer pays with card via Stripe Elements
→ payment_intent.succeeded webhook fires to www.camel-global.com/api/webhooks/stripe
→ Booking created in partner_bookings, payment recorded in payments table
→ Customer redirected to /bookings/[request_id]?payment=success
```

### At booking completion (TODO — not yet built)
```
Booking marked completed
→ Fuel used calculated (quarters)
→ Fuel refund = (fuel_deposit / 4) * quarters_unused
→ Stripe refund issued from partner's Stripe account back to customer's card
→ payments.fuel_refund_amount + fuel_refunded_at updated
→ partner_bookings.payout_status = 'ready'
```

### Monthly payout (TODO — not yet built)
```
1st of month cron job
→ Finds all partner_bookings where payout_status = 'ready'
→ Groups by partner
→ Triggers one Stripe payout per partner (manual payout schedule)
→ Generates commission invoice PDF (NTUK Ltd → partner, in partner billing currency)
→ Emails invoice to partner
→ Marks bookings payout_status = 'paid'
```

### Stripe webhook endpoints
| Endpoint | Webhook name | Event | Purpose |
|----------|-------------|-------|---------|
| `https://portal.camel-global.com/api/webhooks/stripe` | charming-victory | `account.updated` | Partner onboarding completion |
| `https://www.camel-global.com/api/webhooks/stripe` | sophisticated-triumph | `payment_intent.succeeded` | Creates booking after payment |

**Important:** `camel-global.com` (without www) redirects with 308 — Stripe won't follow redirects. Always use `www.camel-global.com` for the customer webhook.

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
| `amount_total` | Total charged to customer |
| `amount_car_hire` | Car hire portion |
| `amount_fuel_deposit` | Fuel deposit held |
| `amount_commission` | Camel commission |
| `amount_partner_net` | Partner net amount |
| `fuel_refund_amount` | Fuel refund issued (set on completion) |
| `fuel_refunded_at` | When refund was issued |
| `payout_status` | `held` / `ready` / `paid` / `cancelled` |

### `payout_batches`
Monthly batch records — one per partner per month.

### `commission_invoices`
Auto-generated monthly — NTUK Ltd → partner.

### `partner_bookings` additions
| Column | Purpose |
|--------|---------|
| `payment_id` | FK to payments table |
| `payout_status` | `held` / `ready` / `paid` / `cancelled` |

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
- `partner_profiles.stripe_account_id` — populated on Stripe Express onboarding
- `partner_profiles.stripe_onboarding_complete` — boolean, set by webhook
- `partner_profiles.stripe_payouts_enabled` — boolean, set by webhook

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
- **Storage:** All prices stored in the currency the booking was made in
- **Commission invoices:** Issued in partner's billing currency at live exchange rate at time of invoice

---

## Supabase Projects
| Project | URL | Used by |
|---------|-----|---------|
| `camel-global` | `https://guhcavvpuveiovspzxmg.supabase.co` | Portal + Customer (both) |

---

## Environment Variables

### Portal (`camel-portal-live`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
CRON_SECRET
CAMEL_ADMIN_EMAILS
PORTAL_BASE_URL                   → https://portal.camel-global.com
NEXT_PUBLIC_SITE_URL              → https://portal.camel-global.com
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET             → charming-victory signing secret (portal.camel-global.com webhook)
```

### Customer (`camel-customer-live`)
```
NEXT_PUBLIC_CUSTOMER_SUPABASE_URL
NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY
CUSTOMER_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL              → https://camel-global.com
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET             → sophisticated-triumph signing secret (www.camel-global.com webhook)
```

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — 5 bug fixes, geocode API, duplicate email fixed |
| `v-stable-chat21` | Chat 21 — Photon search, city fields, address overhaul |
| `v-stable-chat22` | Chat 22 — Commission rate system fully fixed |
| `v-stable-chat23` | Chat 23 — AI chat widget, cancellation system |
| `v-stable-chat24` | Chat 24 — Portal homepage, branding overhaul, driver fixes |
| `v-stable-chat24b` | Chat 24b — NTUK Ltd company details, footer fixes |
| `v-stable-chat24c` | Chat 24c — SEO metadata, sitemaps, robots.txt |
| `v-stable-chat25` | Chat 25 — Stripe Connect partner onboarding, webhook, dashboard payout status, settings payout page |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — map picker address fix |
| `v-stable-chat21` | Chat 21 — Photon search, city selector |
| `v-stable-chat22` | Chat 22 — Commission stamp on customer bid acceptance |
| `v-stable-chat23` | Chat 23 — AI chat widget, cancellation system |
| `v-stable-chat24` | Chat 24 — Customer T&Cs, chat widget touch drag |
| `v-stable-chat24b` | Chat 24b — NTUK Ltd company details |
| `v-stable-chat24c` | Chat 24c — SEO metadata, sitemaps, robots.txt |
| `v-stable-chat25` | Chat 25 — Stripe checkout, PaymentIntent split, CSP fix, booking confirmation flow, webhook booking creation |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat25
cd ~/camel-customer && git checkout v-stable-chat25
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal — light theme, expandable history, fuel recording, minimal footer
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10
- Fuel level recording, charge/refund calculation (to nearest ¼ tank)
- Email notifications + password reset on all portals
- Live status system — 7 checks
- Partner onboarding — 7 steps including Stripe Express payout setup
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- Photon address search across all address inputs
- AI Chat Widget — both sites, logged-in only, draggable, streaming, transcript email
- Booking cancellation — customer/partner/admin, 48hr rule, financial breakdowns
- Portal homepage — full partner landing page
- Branding overhaul — all partner and admin static pages
- SEO — metadata, Open Graph, sitemaps, robots.txt
- **Stripe Connect partner onboarding** — Express account creation, hosted onboarding, webhook completion, dashboard link
- **Partner dashboard** — Stripe payout status banner, setup checklist includes payouts
- **Partner settings** — payout management section with Stripe Express link
- **Customer checkout** — Stripe Elements payment form at `/checkout/[bid_id]`
- **PaymentIntent with destination charge** — commission split to Camel, net to partner, on payment
- **Stripe webhook** — `payment_intent.succeeded` creates booking and payment record
- **Payment success banner** — shown on booking page after successful payment
- **CSP headers** — Stripe domains whitelisted (js.stripe.com, *.stripe.com, api.stripe.com)

---

## Payments — What Still Needs Building

### 1. Fuel refund on booking completion (next priority)
When a booking is marked `completed` by the system:
- Calculate quarters of fuel used = `return_fuel_quarters` (already stored)
- `fuel_refund = (fuel_deposit / 4) * (4 - quarters_used)`
- Issue Stripe refund from the PaymentIntent
- Update `payments.fuel_refund_amount` + `fuel_refunded_at`
- Set `partner_bookings.payout_status = 'ready'`
- Files to touch: wherever booking completion is triggered (check `syncBookingStatuses.ts` and driver confirm route)

### 2. Monthly payout cron
- New cron route: `app/api/cron/monthly-payout/route.ts`
- Runs 1st of each month
- Groups `ready` bookings by partner
- Triggers Stripe payout to partner's `stripe_account_id`
- Generates commission invoice PDF
- Emails invoice to partner
- Marks bookings `paid`

### 3. Commission invoice PDF generation
- NTUK Ltd → partner
- In partner's billing currency at live exchange rate
- Line items: each booking that month
- Auto-emailed on monthly payout run
- Also downloadable from partner reports page

### 4. Customer booking receipts
- Customer account page needs a receipts section
- Each completed booking shows: what was paid, fuel refund received, final amount
- Downloadable PDF receipt per booking

### 5. Driver portal stat cards (quick fix)
- Add 3 stat cards at top of driver jobs page: Awaiting Delivery / On Hire / Completed
- Currently just shows "X active · Y completed" as text in header
- Should be visual cards matching the rest of the portal style

### 6. Cancellation refunds via Stripe
- Currently cancellation records refund_status in DB but doesn't actually trigger a Stripe refund
- Need to issue actual Stripe refund when booking cancelled
- Full refund (>48hrs) or fuel-only refund (<48hrs customer cancel)

### 7. Webhook URL fix for production
- Current customer webhook points to `www.camel-global.com` (works)
- `camel-global.com` (without www) returns 308 redirect — Stripe won't follow
- Consider forcing www on all production traffic in Vercel

### 8. Admin financial dashboard
- View all payments, commissions, payouts
- Filter by partner, date range, status
- Export to CSV/Excel

### 9. Reports pages update
- Partner reports: show paid vs unpaid breakdown, payout history
- Admin reports: full financial view with payment records

---

## Collaborator Note
A collaborator works on the same `camel-portal` repo from a Windows machine (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). His changes are on `main`. Always `git pull` before starting. Key files he owns: `app/admin/outreach/page.tsx`, `app/api/admin/outreach/*`.

---

## Session Log

### Chat 25 (Completed)
**Stripe Connect — full payment flow**
1. Database schema — `payments`, `payout_batches`, `commission_invoices` tables created. Columns added to `partner_bookings` and `partner_profiles`.
2. Portal — Stripe Express partner onboarding (Step 7 in onboarding flow). API routes: connect, status, dashboard-link.
3. Portal webhook — `account.updated` marks partner onboarding complete.
4. Portal dashboard — Stripe payout status banner (orange = not set up, green = active). Checklist item added.
5. Portal settings — Payout management section with Stripe Express dashboard link.
6. Customer — Stripe package installed (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`).
7. Customer checkout page — `/checkout/[bid_id]` with Stripe Elements, order summary, pay button.
8. Customer `create-intent` API — creates PaymentIntent with destination charge split.
9. Customer webhook — `payment_intent.succeeded` creates booking + payment record.
10. Booking page — "Accept & Pay →" redirects to checkout. Payment success banner added.
11. CSP fix — `js.stripe.com`, `*.stripe.com`, `api.stripe.com` added to `next.config.ts`.
12. Double header fix — `/checkout` excluded from global nav in `ClientRootLayout.tsx`.
13. Webhook URL fix — must use `www.camel-global.com` not `camel-global.com` (308 redirect issue).
14. Stable tags `v-stable-chat25` on both repos.
15. **Tested end-to-end** — payment flows, booking created, partner sees booking, transfer split confirmed in Stripe.

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
| 6 | Partner & Admin finance pages | ⏸ Partial — reports need payment data |
| 7 | RLS audit | ✅ Done |
| 8 | GDPR data deletion | ✅ Done |
| 9 | Footer + policy pages | ✅ Done |
| 10 | Spanish translation | ⬜ Todo — do last |
| 11 | Customer booking site full UI overhaul | ✅ Done |
| 11b | Portal rebrand | ✅ Done |
| 11c | Repo split | ✅ Done |
| 11d | Google Analytics | ✅ Done |
| 12 | Stripe Connect integration | 🔄 In progress — core flow done, refunds + payouts + invoices remaining |
| 13 | Xero monthly commission endpoint | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | ⬜ Deferred |
| 15 | Partner outreach agent | ✅ Done (collaborator) |

---

## TODO Before Go-Live
- [ ] Fuel refund on booking completion — **next priority**
- [ ] Monthly payout cron
- [ ] Commission invoice PDF generation
- [ ] Customer booking receipts page
- [ ] Driver portal stat cards (quick fix)
- [ ] Cancellation Stripe refunds
- [ ] Stripe webhook production URL fix (www vs non-www)
- [ ] Admin financial dashboard
- [ ] Reports pages — paid vs unpaid
- [ ] Spanish translation — after Stripe complete
- [ ] Delete legacy `camel-customers` Supabase project
- [ ] Outreach: deduplicate database
- [ ] Outreach: set up `e.camel-global.com` subdomain in Resend

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

*Last updated: Chat 25 — Stripe Connect full payment flow complete. Partner onboarding, checkout, PaymentIntent split, webhook booking creation all working and tested. Next: fuel refund on completion, monthly payout cron, commission invoices, customer receipts, driver stat cards.*