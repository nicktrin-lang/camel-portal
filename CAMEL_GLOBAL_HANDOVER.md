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
| `app/api/partner/bookings/[id]/complete/route.ts` | Manual trigger for completion flow (fuel refund) |
| `app/api/webhooks/stripe/route.ts` | Portal webhook — handles `account.updated` (partner onboarding) |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable (mouse + touch), streaming |
| `app/components/Footer.tsx` | Smart footer — partner/admin/driver/customer variants |
| `app/partner/onboarding/page.tsx` | 7-step onboarding — Location, Currency, Billing, Fleet, Drivers, Payouts (Stripe), Go Live |
| `app/partner/settings/page.tsx` | Settings — payout management + Stripe Express link + delete account |
| `app/partner/dashboard/page.tsx` | Dashboard — Stripe payout status banner + checklist |
| `app/partner/reports/page.tsx` | Partner reports — revenue, commission, Stripe fees, fuel, payout status breakdown |
| `app/admin/reports/page.tsx` | Admin reports — network-wide, partner breakdown, payout status breakdown |
| `app/driver/jobs/page.tsx` | Driver jobs — light theme, expandable jobs, fuel recording, stat cards |

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
- **Commission invoices:** Issued in partner's billing currency at live exchange rate at time of invoice

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

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat25` | Chat 25 — Stripe checkout, PaymentIntent split, CSP fix, booking confirmation flow, webhook booking creation |
| `v-stable-chat26` | Chat 26 — currency fix (customer pays in their currency), bid vs charge currency split, Stripe fees captured, serverCurrency lib |
| `v-stable-chat27` | Chat 27 — PDF receipts, booking confirmed emails, cancellation refunds |
| `v-stable-chat28` | Chat 28 — no customer changes |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat28
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
- Stripe fee CSV column — shows bid currency not charge currency
- Payout status breakdown — partner and admin reports show held/ready/paid counts and totals
- Payment success banner — shown on booking page after successful payment
- CSP headers — Stripe domains whitelisted
- Partner terms — Stripe fee + currency conversion disclosure
- Customer receipts — PDF download on completed bookings
- Monthly payout cron — groups ready bookings by partner, triggers Stripe payout, marks paid
- Partner booking detail — full payment & fee breakdown with correct currency conversion
- Admin booking detail — full dual-currency P&L breakdown (bid + charge currency equivalent in brackets)
- Admin financial dashboard — P&L summary per currency + filterable payments table on admin reports page
- Admin reports net Camel income — shows commission only, Stripe fee shown separately

---

## What Still Needs Building

### 1. Commission invoice PDF generation (deferred)
- NTUK Ltd → partner
- In partner's billing currency at live exchange rate
- Line items: each booking that month
- Auto-emailed on monthly payout run

### 2. Admin financial dashboard (deferred)
- View all payments, commissions, payouts, Stripe fees
- Filter by partner, date range, status
- Export to CSV/Excel

### 3. Reports — paid vs unpaid history (quick win)
- Payout status breakdown is on both reports pages (held/ready/paid counts + totals) ✅
- Could add a drilldown table listing individual bookings per payout bucket

---

## Collaborator Note
A collaborator works on the same `camel-portal` repo from a Windows machine (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). His changes are on `main`. Always `git pull` before starting. Key files he owns: `app/admin/outreach/page.tsx`, `app/api/admin/outreach/*`.

---

## Session Log

### Chat 28 (Completed)
**Admin financial dashboard, Stripe fee conversion fixes, dual-currency P&L**
1. Admin financial dashboard added to admin reports page — P&L summary per currency (total revenue, commission, Stripe fees, net Camel income, partner payout, fuel refunds) + payments table with payout status and partner filters.
2. Stripe fee currency conversion fixed across all pages — was dividing when should divide (£4.43 / 0.8662 = €5.11). Fixed `stripeFeeInBidCurrency` in partner reports and admin reports.
3. Booking detail pages (partner + admin) — fixed `hasCurrConv` detection to use `stripe_fee_currency || payment.charge_currency || booking.charge_currency` fallback chain. Previously `stripe_fee_currency` was null so no conversion was applied.
4. Admin booking detail `PaymentFeesCard` — full dual-currency P&L rewrite: Car hire, Fuel deposit, Total paid by customer, Commission, Fuel charge, Stripe fee, Fuel refund, Cancellation refund, Partner net payout. Bid currency amounts shown with charge currency equivalent in brackets.
5. Partner booking detail `PaymentFeesCard` — same charge currency fallback fix applied.
6. Admin reports "Net Camel" payments column — fixed to show commission only (not commission minus Stripe fee, which was double-counting since Stripe fee has its own column).
7. Partner reports CSV — Stripe Fee Currency column was showing GBP (charge currency), fixed to show bid currency (EUR).
8. Admin reports CSV — same fix applied.
9. Stable tags `v-stable-chat28` on both repos.

### Chat 27 (Completed)
**Payout status breakdown on reports, Stripe fee fixes**
1. `app/api/partner/bookings/route.ts` — `payout_status` confirmed in select and returned data object.
2. `app/partner/reports/page.tsx` — payout status breakdown section (held/ready/paid) confirmed working.
3. `app/admin/reports/page.tsx` — payout status breakdown section added + missing `stripeFeeInBidCurrency` function fixed (build was failing on Vercel).
4. Both repos clean and deployed.

### Chat 26 (Completed)
**Currency architecture, fuel refund, commission fixes**
1. EUR + USD settlement currencies added to Camel's Stripe account (no code).
2. Fuel refund on completion — `completeBooking()` extracted to shared lib, called inline from update route.
3. Stripe fees captured — `stripe_fee`, `stripe_fee_currency`, `exchange_rate` added to payments table.
4. Currency fix — customer pays in `request.currency`, bid amounts converted server-side.
5. Bid vs charge currency split — `partner_bookings.currency` = bid, `charge_currency` = what customer paid.
6. Commission recalc — all display pages recalculate from `car_hire_price` in bid currency.
7. Customer booking page — shows `charge_currency`.
8. Stable tags `v-stable-chat26` on both repos.

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

---

## TODO Before Go-Live
- [ ] Commission invoice PDF generation — deferred
- [ ] Admin financial dashboard — deferred
- [ ] Spanish translation — after everything else
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

*Last updated: Chat 28 — Admin financial dashboard complete. Stripe fee currency conversion fixed across all pages and CSV exports. Dual-currency P&L on admin booking detail. Net Camel income column corrected. Both repos tagged v-stable-chat28. Pre-launch list is very short — Spanish translation is the only real blocker.*