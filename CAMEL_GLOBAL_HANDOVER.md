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
| `lib/portal/completeBooking.tsx` | Shared completion logic — Stripe fuel refund, payout_status=ready, generates + emails completion statement PDF to customer. Sends rich completion email with fuel summary, thank you message and PDF attachment |
| `lib/portal/generateCommissionInvoice.tsx` | Commission invoice PDF generator |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/email.ts` | Resend email sender — all notification helpers. Supports `attachments` array (base64). Contains old `sendCustomerBookingCompletedEmail` — NOT called anywhere, superseded by completeBooking.tsx |
| `app/api/partner/bids/route.ts` | Partner bid submission — saves mileage_limit + security_deposit_notes |
| `app/api/partner/requests/[id]/route.ts` | Partner request detail API — selects mileage_limit + security_deposit_notes from partner_bids |
| `app/api/partner/bookings/[id]/route.ts` | Partner booking detail API |
| `app/api/admin/bookings/[id]/route.ts` | Admin booking detail API |
| `app/admin/requests/[id]/page.tsx` | Admin request detail |
| `app/admin/bookings/[id]/page.tsx` | Admin booking detail |
| `app/partner/requests/[id]/page.tsx` | Partner request detail — bid form includes mileage limit + security deposit (text fields, optional). Security deposit only shown when full insurance is NOT included. Young driver alert shown when driver aged 21–24 |
| `app/partner/bookings/[id]/page.tsx` | Partner booking detail |
| `app/partner/terms/page.tsx` | Partner T&Cs — includes clause on mileage/deposit collection responsibility. PDF generated dynamically from TERMS array |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Exports `createCustomerServerClient()` and `createCustomerServiceRoleSupabaseClient()` |
| `lib/serverCurrency.ts` | Server-side currency conversion |
| `lib/email.ts` | Resend email sender. Contains old `sendCustomerBookingCompletedEmail` — NOT called anywhere, superseded by completeBooking.tsx in portal |
| `lib/portal/generateBookingReceiptPDF.tsx` | Booking confirmation receipt PDF — includes passengers, suitcases, sport_equipment, driver_age, additional_drivers, mileage_limit, security_deposit_notes, and "What to bring" checklist section |
| `lib/portal/generateCompletionStatementPDF.tsx` | Booking completion statement PDF generator |
| `app/api/test-booking/bookings/[id]/receipt/route.ts` | GET — returns signed URL for booking receipt |
| `app/api/test-booking/bookings/[id]/completion-statement/route.ts` | GET — returns signed URL for completion statement |
| `app/api/test-booking/bookings/[id]/update/route.ts` | POST — customer confirms fuel/insurance. Does NOT send completion email (that is handled by completeBooking.tsx in portal) |
| `app/api/test-booking/requests/route.ts` | POST — creates booking request. Min driver age validation is 21 |
| `app/api/test-booking/requests/[id]/route.ts` | GET — returns request + bids (including mileage_limit, security_deposit_notes) + booking |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates receipt PDF (with checklist + mileage/deposit), sends confirmation emails |
| `app/bookings/[id]/page.tsx` | Booking detail — young driver warning, document checklist + mileage/deposit shown on confirmed booking. Bid cards show mileage limit and security deposit disclosure boxes |
| `app/page.tsx` | Customer homepage — min driver age 21, young driver warning for 21–24, no document checklist (moved to confirmed booking only) |
| `app/book/page.tsx` | Auto-submit after login |
| `app/terms/page.tsx` | Customer T&Cs — section 5 young driver surcharge included in bid price, section 6 credit card only required if security deposit stated on bid, section 7 security deposit, section 8 mileage |

---

## CRITICAL: DB Client Rules
**The customer Supabase project is used for ALL customer-facing API routes** — always use `createCustomerServiceRoleSupabaseClient` in `app/api/test-booking/**` routes. Never mix with `createServiceRoleSupabaseClient` (main/portal DB) in these routes.

---

## Sidebar Architecture (CRITICAL)
The portal uses **`PortalSidebar.tsx`** (`app/components/portal/PortalSidebar.tsx`) as the main sidebar for both partner and admin — NOT `PartnerSidebar.tsx` or `AdminSidebar.tsx`. Always edit `PortalSidebar.tsx` to add/change nav items.

---

## Driver Age Feature

### Database columns
```sql
-- Already run — do not run again
ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS driver_age integer,
  ADD COLUMN IF NOT EXISTS additional_drivers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_driver_ages text;
```

### Validation rules
- Main driver age: required, must be >= 21
- Additional driver ages: each must be >= 21
- additional_drivers: 0–4
- Drivers aged 21–24: young driver warning shown to customer and partner

---

## Mileage Limit & Security Deposit Feature

### Database columns
```sql
-- Already run — do not run again
ALTER TABLE partner_bids
  ADD COLUMN IF NOT EXISTS mileage_limit text,
  ADD COLUMN IF NOT EXISTS security_deposit_notes text;
```

### Rules
- Both are free-text, optional fields on the partner bid form
- Security deposit field only shown when full insurance is NOT included
- Both are outside Camel's payment system — collected by partner directly at handover
- Customer sees them as disclosure boxes on bid card before accepting
- Shown again on confirmed booking "Additional Terms" section
- Included in booking receipt PDF
- If security deposit set: amber credit card row added to "What to bring" checklist on confirmed booking and receipt PDF
- Partner operating rules section 3b covers partner responsibility for collection
- Partner T&Cs clause 6.7/6.8 covers same
- Customer T&Cs sections 7 and 8 cover customer-facing rules

---

## Completion Email Architecture (CRITICAL)
- **`lib/portal/completeBooking.tsx`** sends the rich completion email to the customer — fuel summary, thank you message, PDF attachment
- **`lib/email.ts`** in both repos contains an old `sendCustomerBookingCompletedEmail` function — this is NOT called anywhere and must not be used
- **`app/api/test-booking/bookings/[id]/update/route.ts`** (customer) does NOT send any completion email — this was the source of a duplicate basic email bug, now fixed

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
→ Booking receipt PDF generated + emailed to customer (includes what to bring checklist)
→ Customer redirected to /bookings/[request_id]?payment=success
```

### At booking completion
```
Booking marked completed
→ completeBooking() called (lib/portal/completeBooking.tsx)
→ Fuel refund calculated + Stripe partial refund issued
→ Completion statement PDF generated
→ Rich completion email sent to customer (fuel summary, thank you, PDF attached)
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
| `v-stable-chat32` | Chat 32 — min age 21, young driver warning, mileage/deposit on bids, document checklist, completion email fix, terms updated |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat30a` | Chat 30a — booking receipt PDF, completion statement fixes |
| `v-stable-chat31` | Chat 31 — driver age, sport equipment, completion statement download |
| `v-stable-chat32` | Chat 32 — min age 21, young driver warning, mileage/deposit on bids, document checklist on confirmed booking + receipt PDF, completion email fix, terms updated |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat32
cd ~/camel-customer && git checkout v-stable-chat32
```

---

## What Is Working ✅
- Customer booking flow — homepage widget with currency + driver age selection (min 21)
- Young driver warning (21–24) shown on homepage widget, booking page, partner request page
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
- Booking receipt PDF — includes driver age, sport equipment, journey details, what to bring checklist, mileage/deposit if set
- Booking Completion Statement PDF — server-side, stored in booking-receipts bucket, downloadable via signed URL, attached to completion email
- Rich completion email — fuel summary, thank you message, PDF attached (sent by completeBooking.tsx only)
- Partner suggestions feature
- Driver age + additional drivers — captured at booking, displayed everywhere, included in both PDFs
- Sport equipment — displayed everywhere and in both PDFs
- Mileage limit + security deposit — optional text fields on partner bid, shown to customer on bid card and confirmed booking, included in receipt PDF
- Document checklist — shown on confirmed booking page and in receipt PDF only (not on homepage)
- Customer terms — updated for min age 21, young driver surcharge in bid, credit card only if deposit required
- Partner terms — updated with mileage/deposit collection responsibility clauses
- Partner operating rules — section 3b added covering mileage limits and security deposits

---

## What Needs Building in Chat 33

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

### Chat 32 (Completed)
**Min age 21, young driver warning, mileage/deposit on bids, document checklist, completion email fix, terms updated**

1. `app/page.tsx` (customer) — min age 18→21, young driver warning for 21–24, document checklist removed from homepage entirely
2. `app/api/test-booking/requests/route.ts` — server-side validation 18→21
3. `app/bookings/[id]/page.tsx` — young driver warning, document checklist on confirmed booking only, bid cards show mileage/deposit disclosure boxes
4. `app/partner/requests/[id]/page.tsx` (portal) — mileage limit + security deposit text fields on bid form; security deposit hidden when full insurance included; young driver alert for partner
5. `app/api/partner/bids/route.ts` — saves mileage_limit + security_deposit_notes to DB
6. `app/api/partner/requests/[id]/route.ts` — selects mileage_limit + security_deposit_notes from partner_bids
7. `app/api/test-booking/requests/[id]/route.ts` (customer) — returns mileage_limit + security_deposit_notes on bids and passes through to confirmed booking
8. `lib/portal/generateBookingReceiptPDF.tsx` — adds "What to bring" checklist section, mileage/deposit sections, passes fields from webhook
9. `app/api/webhooks/stripe/route.ts` (customer) — passes mileage_limit + security_deposit_notes to receipt PDF
10. `app/api/test-booking/bookings/[id]/update/route.ts` — removed duplicate basic completion email (was sending before completeBooking.tsx ran)
11. `app/terms/page.tsx` (customer) — section 5 young driver in bid, section 6 credit card only if deposit required
12. `app/partner/terms/page.tsx` — clauses 6.7/6.8 partner responsible for collecting mileage/deposit directly
13. `lib/portal/operatingRules.ts` — section 3b added: mileage limits and security deposits
14. DB migration: `partner_bids` — `mileage_limit text`, `security_deposit_notes text`
15. Stable tags: `v-stable-chat32` on both repos

### Chat 31 (Completed)
**Driver age, sport equipment, completion statement PDF, completion email**

### Chat 30 (Completed)
**Booking receipt PDF, completion statement fixes, partner suggestions**

### Chats 20–29 (Completed)
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

*Last updated: Chat 32 — Min age 21, young driver warning, mileage limit + security deposit on bids (text disclosure, outside Camel payments), document checklist on confirmed booking + receipt PDF only, rich completion email fix (duplicate basic email removed), customer + partner terms + operating rules all updated.*