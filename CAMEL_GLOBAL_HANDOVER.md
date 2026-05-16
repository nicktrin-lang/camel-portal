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
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/portal/completeBooking.tsx` | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64) |
| `app/api/partner/bookings/[id]/route.ts` | Partner booking detail API — uses single customer DB client. Fetches customer_requests including driver_age, additional_drivers, additional_driver_ages |
| `app/api/admin/bookings/[id]/route.ts` | Admin booking detail API — fetches customer_requests including driver_age, additional_drivers, additional_driver_ages |
| `app/admin/requests/[id]/page.tsx` | Admin request detail — shows sport_equipment, driver_age, additional_drivers |
| `app/admin/bookings/[id]/page.tsx` | Admin booking detail — Journey Information shows sport_equipment, driver_age, additional_drivers |
| `app/partner/requests/[id]/page.tsx` | Partner request detail — shows sport_equipment, driver_age, additional_drivers |
| `app/partner/bookings/[id]/page.tsx` | Partner booking detail — Journey Information shows sport_equipment, driver_age, additional_drivers. PaymentFeesCard shows fuel deposit |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/serverCurrency.ts` | Server-side currency conversion |
| `lib/email.ts` | Resend email sender |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF — includes passengers, suitcases, sport_equipment, driver_age, additional_drivers |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF generator — @react-pdf/renderer, matches receipt style exactly |
| `app/api/test-booking/bookings/[id]/receipt/route.ts` | GET — returns signed URL for booking receipt. Uses ONLY createCustomerServiceRoleSupabaseClient for everything |
| `app/api/test-booking/bookings/[id]/completion-statement/route.ts` | GET — returns signed URL for completion statement. Uses ONLY createCustomerServiceRoleSupabaseClient for everything (mirrors receipt route exactly) |
| `app/api/test-booking/requests/route.ts` | POST — creates booking request, stores driver_age, additional_drivers, additional_driver_ages |
| `app/api/test-booking/requests/[id]/route.ts` | GET — returns request including sport_equipment, driver_age, additional_drivers, additional_driver_ages |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates receipt PDF, sends confirmation emails. Passes driver age fields to receipt PDF |
| `app/bookings/[id]/page.tsx` | Booking detail — receipt + completion statement download buttons in white boxes with orange border. Completion statement only shown for completed bookings |
| `app/page.tsx` | Customer homepage — booking widget includes main driver age (required, min 18) + additional drivers (0-4) with per-driver age inputs |
| `app/book/page.tsx` | Auto-submit after login — passes driver age fields from draft to API |

---

## CRITICAL: DB Client Rules
**The customer Supabase project is used for ALL customer-facing API routes** — including queries to `partner_bookings`, `customer_requests`, `partner_profiles`, and `booking-receipts` storage bucket. Always use `createCustomerServiceRoleSupabaseClient` in `app/api/test-booking/**` routes. Never mix with `createServiceRoleSupabaseClient` (main/portal DB) in these routes.

---

## Sidebar Architecture (CRITICAL)
The portal uses **`PortalSidebar.tsx`** (`app/components/portal/PortalSidebar.tsx`) as the main sidebar for both partner and admin — NOT `PartnerSidebar.tsx` or `AdminSidebar.tsx`. Always edit `PortalSidebar.tsx` to add/change nav items.

---

## Driver Age Feature (Chat 31)

### Database columns (already migrated)
```sql
-- Already run — do not run again
ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS driver_age integer,
  ADD COLUMN IF NOT EXISTS additional_drivers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_driver_ages text;
```
`additional_driver_ages` is comma-separated e.g. `"28,35"`.

### Validation rules
- Main driver age: required, must be >= 18
- Additional driver ages: each must be >= 18
- additional_drivers: 0–4

### Where displayed
- Customer booking widget (homepage) — row 4 of the form
- Customer booking detail page — Booking Details card
- Partner request detail — Request Information panel
- Partner booking detail — Journey Information panel
- Admin request detail — Request Information grid
- Admin booking detail — Journey Information panel
- Booking confirmation receipt PDF
- Booking completion statement PDF

---

## Currency Architecture (CRITICAL)

### Two-currency model
- `partner_bookings.currency` = **bid currency** — what partner quoted in
- `partner_bookings.charge_currency` = **charge currency** — what customer paid in
- `partner_bookings.conversion_rate` = rate used at payment time

### Commission calculation rule
**NEVER use `commission_amount` or `partner_payout_amount` from the DB for display.** Always recalculate:
```typescript
const commAmt = Math.max((car_hire_price * commission_rate) / 100, 10);
const payout  = Math.max(0, car_hire_price - commAmt);
```

---

## Email Addresses
| Address | Type | Forwards to |
|---------|------|-------------|
| `info@camel-global.com` | Mailbox (Mail Lite, Fasthosts) | Gmail via POP |
| `contact@camel-global.com` | Forwarder | `artur@` + `info@` |
| `partners@camel-global.com` | Forwarder | `artur@` + `info@` |
| `email@camel-global.com` | Forwarder | `nicktrin@gmail.com` + `artur@` |

---

## Stripe Connect — Architecture

### Payment flow
```
Customer accepts bid → /checkout/[bid_id]
→ PaymentIntent created in customer's currency
→ Customer pays → webhook fires
→ partner_bookings + payments created
→ Booking receipt PDF generated + emailed to customer
→ Customer redirected to /bookings/[request_id]?payment=success
```

### At booking completion
```
Booking marked completed
→ completeBooking() called (lib/portal/completeBooking.tsx)
→ Fuel refund calculated + Stripe partial refund issued
→ Completion statement PDF generated (lib/portal/generateCompletionStatementPDF.tsx)
→ PDF attached to customer completion email
→ Customer email: "The Camel Global team thank you for your completed car hire..."
→ payout_status = 'ready'
```

### Stripe webhook endpoints
| Endpoint | Event | Purpose |
|----------|-------|---------|
| `https://portal.camel-global.com/api/webhooks/stripe` | `account.updated` | Partner onboarding |
| `https://www.camel-global.com/api/webhooks/stripe` | `payment_intent.succeeded` | Creates booking after payment |

---

## Supabase Storage Buckets
| Bucket | Purpose |
|--------|---------|
| `commission-invoices` | Commission invoice PDFs |
| `booking-receipts` | Booking receipt PDFs + completion statement PDFs |

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat30b` | Chat 30b — partner suggestions complete |
| `v-stable-chat31` | Chat 31 — driver age, sport equipment everywhere, completion statement PDF, completion email |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat30a` | Chat 30a — booking receipt PDF, completion statement fixes |
| `v-stable-chat31` | Chat 31 — driver age, sport equipment, completion statement download (signed URL), receipt PDF with journey details |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat31
cd ~/camel-customer && git checkout v-stable-chat31
```

---

## What Is Working ✅
- Customer booking flow — homepage widget with currency + driver age selection
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording, charge/refund calculation
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all (booking confirmed, completion, review reminder)
- Live status system — 7 checks
- Partner onboarding — 7 steps including Stripe Express
- Stripe Connect partner onboarding
- Partner + admin bookings and reports
- Commission invoice PDF
- Booking receipt PDF — includes driver age, sport equipment, journey details
- Booking Completion Statement PDF — server-side @react-pdf/renderer, matches receipt style, stored in booking-receipts bucket, downloadable via signed URL (works in incognito), attached to completion email
- Partner suggestions feature
- **Driver age + additional drivers** — captured at booking, displayed on all request/booking detail pages (customer, partner, admin), included in both PDFs
- **Sport equipment** — displayed on all request/booking detail pages and both PDFs
- Fuel deposit shown in partner payment fee breakdown

---

## What Needs Building in Chat 32

### 1. Spanish Translation (PRIORITY)
- All user-facing strings in camel-customer and camel-portal
- Language toggle (EN / ES) — remember preference in localStorage
- Do customer site first, then portal

---

## What Still Needs Building (Lower Priority)
- Commission invoice PDF — VAT number + 20% UK VAT once NTUK is VAT registered
- Xero monthly commission endpoint — deferred
- DAC7 EU platform reporting — deferred
- Outreach: set up `e.camel-global.com` subdomain in Resend

---

## Collaborator Note
A collaborator works on `camel-portal` from Windows (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). Always `git pull` before starting.

---

## Session Log

### Chat 31 (Completed)
**Driver age, sport equipment, completion statement PDF, completion email**

1. DB migration — `driver_age`, `additional_drivers`, `additional_driver_ages` added to `customer_requests`
2. `app/page.tsx` (customer) — driver age + additional drivers added to booking widget (row 4), validation >= 18
3. `app/book/page.tsx` — passes driver age fields from sessionStorage draft to API
4. `app/api/test-booking/requests/route.ts` — POST stores driver age fields; GET selects them
5. `app/api/test-booking/requests/[id]/route.ts` — adds `sport_equipment` + driver age fields to select
6. `app/bookings/[id]/page.tsx` — full rewrite: driver age in Booking Details, completion statement in white box below summary card matching receipt button style, no jsPDF anywhere
7. `lib/portal/generateCompletionStatementPDF.tsx` (customer) — new server-side PDF using @react-pdf/renderer, matches receipt style exactly
8. `app/api/test-booking/bookings/[id]/completion-statement/route.ts` — new GET route, uses ONLY `createCustomerServiceRoleSupabaseClient` for everything (mirrors receipt route), stores PDF in `booking-receipts` bucket, returns signed URL
9. `lib/portal/generateBookingReceiptPDF.tsx` — updated to include passengers, suitcases, sport_equipment, driver_age, additional_drivers in PDF
10. `app/api/webhooks/stripe/route.ts` (customer) — passes driver age fields to receipt PDF
11. `lib/portal/completeBooking.tsx` (portal) — renamed from .ts to .tsx (JSX support), generates completion statement PDF server-side, attaches to customer email, improved email copy
12. `app/api/partner/bookings/[id]/route.ts` — customer_requests select includes driver_age, additional_drivers, additional_driver_ages
13. `app/api/admin/bookings/[id]/route.ts` — same
14. `app/partner/bookings/[id]/page.tsx` — Journey Information shows driver ages; PaymentFeesCard shows fuel deposit row
15. `app/partner/requests/[id]/page.tsx` — shows driver ages
16. `app/admin/requests/[id]/page.tsx` — full clean rewrite, shows sport_equipment + driver ages, no duplicates
17. `app/admin/bookings/[id]/page.tsx` — Journey Information shows driver ages
18. Stable tags: `v-stable-chat31` on both repos

### Chat 30 (Completed)
**Booking receipt PDF, completion statement fixes, partner suggestions**

### Chat 29 (Completed)
**Payout drilldown, per-partner export, country filter, approvals map, commission invoice system**

### Chats 20–28 (Completed)
See previous handover docs.

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

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Roll back
git checkout v-tag-name
```

---

*Last updated: Chat 31 — Driver age + additional drivers, sport equipment everywhere, completion statement PDF (server-side, signed URL, works in incognito), completion email with PDF attachment and improved wording. Spanish translation is Chat 32 priority.*