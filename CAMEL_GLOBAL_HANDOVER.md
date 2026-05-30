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
| `app/api/partner/bookings/[id]/update/route.ts` | Partner booking update — fuel override, driver assignment, lock logic |
| `app/api/driver/jobs/route.ts` | Driver jobs API — returns all booking fields including partner fuel overrides |
| `app/api/admin/bookings/[id]/route.ts` | Admin booking detail API |
| `app/admin/requests/[id]/page.tsx` | Admin request detail |
| `app/admin/bookings/[id]/page.tsx` | Admin booking detail |
| `app/partner/requests/[id]/page.tsx` | Partner request detail — bid form includes mileage limit + security deposit (text fields, optional). Security deposit only shown when full insurance is NOT included. Young driver alert shown when driver aged 21–24 |
| `app/partner/bookings/[id]/page.tsx` | Partner booking detail — fuel tracking with office override, lock logic uses effective fuel |
| `app/driver/jobs/page.tsx` | Driver jobs page — shows office override fuel with amber notice |
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
| `app/api/test-booking/bookings/[id]/update/route.ts` | POST — customer confirms fuel/insurance. Uses effective fuel (partner override OR driver reading). Gates on effective fuel existing, not just driver confirmed. Does NOT send completion email. |
| `app/api/test-booking/requests/route.ts` | POST — creates booking request. Min driver age validation is 21 |
| `app/api/test-booking/requests/[id]/route.ts` | GET — returns request + bids (including mileage_limit, security_deposit_notes) + booking including all partner fuel override fields |
| `app/api/webhooks/stripe/route.ts` | Customer webhook — creates booking, generates receipt PDF (with checklist + mileage/deposit), sends confirmation emails |
| `app/api/auth/send-customer-reset-email/route.ts` | Customer password reset — uses admin client + sendEmail (Resend), bypasses Supabase email templates entirely |
| `app/bookings/[id]/page.tsx` | Booking detail — shows effective fuel (partner override OR driver), customer can confirm once either is set, amber badge when office override active |
| `app/page.tsx` | Customer homepage — min driver age 21, young driver warning for 21–24, no document checklist (moved to confirmed booking only) |
| `app/book/page.tsx` | Auto-submit after login |
| `app/terms/page.tsx` | Customer T&Cs — section 5 young driver surcharge included in bid price, section 6 credit card only required if security deposit stated on bid, section 7 security deposit, section 8 mileage |

---

## CRITICAL: DB Client Rules
**The customer Supabase project is used for ALL customer-facing API routes** — always use `createCustomerServiceRoleSupabaseClient` in `app/api/test-booking/**` routes. Never mix with `createServiceRoleSupabaseClient` (main/portal DB) in these routes.

**There is only ONE Supabase project** (`camel-global`) shared by both portal and customer auth. The customer client uses different env vars (`NEXT_PUBLIC_CUSTOMER_SUPABASE_URL`) but points to the same project.

---

## Supabase URL Configuration (CRITICAL)
**Site URL:** `https://test.camel-global.com` — set to customer site so password reset fallback lands on customer, not portal.

**Redirect URLs include:**
- All portal login/reset URLs (`portal.camel-global.com/partner/login` etc.)
- `https://portal.camel-global.com/**`
- `https://test.camel-global.com/**`
- `https://test.camel-global.com/reset-password`

**Do not change the Site URL back to portal** — this was done in Chat 35 to fix customer password reset landing on the partner portal homepage. The portal reset still works because all portal URLs are in the redirect list.

---

## Fuel Override Architecture (CRITICAL — implemented Chat 35)

### The rule
**Effective fuel = partner override (`collection_fuel_level_partner`) if set, else driver reading (`collection_fuel_level_driver`).** This applies everywhere — customer page display, lock logic, customer confirmation, partner page display, driver app display.

### Lock logic
A fuel stage locks when: **effective fuel exists AND customer has confirmed AND customer fuel matches effective fuel.**
- Driver confirming is NOT required for lock — partner override alone is sufficient for customer to confirm.

### Files implementing this
| File | What it does |
|------|-------------|
| `app/api/partner/bookings/[id]/update/route.ts` | `effectiveCollectionFuel = partner || driver`. Lock check uses effective. |
| `app/api/test-booking/bookings/[id]/update/route.ts` | Gates on effective fuel existing (not just driver confirmed). Sets `collection_fuel_level_customer` to effective fuel on confirm. |
| `app/api/driver/jobs/route.ts` | Returns `collection_fuel_level_partner` and `return_fuel_level_partner` in job objects. |
| `app/partner/bookings/[id]/page.tsx` | `isLocked()` uses effective fuel. FuelStageCard shows partner override in top row when set. Unlocked state uses light/black colours, locked uses dark theme. |
| `app/bookings/[id]/page.tsx` (customer) | `effectiveCollFuel`/`effectiveRetFuel` computed at render. `collEffectiveReady` = driver confirmed OR partner override set. `FuelConfirmCard` receives effective fuel and shows "Office recorded" badge when override active. |
| `app/driver/jobs/page.tsx` | Shows amber notice when office has set override, both before and after driver records. Completed jobs show effective fuel. |

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

## Stripe Payment Architecture (CRITICAL)

### Payment split — `application_fee_amount` model
Since Chat 32b, payments use `application_fee_amount` instead of `transfer_data.amount`. This means:

- **Camel always receives exactly the commission amount** — Stripe fee never reduces it
- **Stripe fee is borne entirely by the partner** — deducted from partner payout
- **Fuel refunds come from the partner's connected account balance** — not from Camel's balance
- **Camel Stripe balance = sum of all commissions** — reconciles exactly with portal admin report "Net Camel Income"

```
Customer pays:           £300.00  (£200 car hire + £100 fuel)
Camel gets:              £40.00   (20% commission — exact, always)
Partner gets:            £260.00 − Stripe fee (e.g. £9.90) = £250.10
On completion:           £50.00 fuel refund from partner's Stripe balance
Partner final net:       £200.10
```

### Payment intent fields
```typescript
application_fee_amount: commissionCents,
on_behalf_of: partnerProfile.stripe_account_id,
transfer_data: { destination: partnerProfile.stripe_account_id },
description: "Camel Global #JOB | Partner | Car hire + Fuel | Commission | Partner net",
metadata: { job_number, partner_name, car_hire, fuel_deposit, camel_commission, partner_net, ... }
```

### Stripe fee notes
- Rate is variable — depends on card type, issuing country, currency conversion
- Cross-currency payments attract higher combined fee
- Exact fee captured from `balance_transaction` in webhook and stored in `payments.stripe_fee`
- Do NOT quote specific percentages anywhere

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
| `v-stable-chat32b` | Chat 32b — Stripe application_fee_amount, rich metadata, partner terms Stripe fee wording corrected |
| `v-stable-fuel-override-complete` | Chat 35 — full fuel override flow working across all three portals |
| `v-stable-chat36-pre` | Chat 36 — single currency model, charge_currency display removed |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat30a` | Chat 30a — booking receipt PDF, completion statement fixes |
| `v-stable-chat31` | Chat 31 — driver age, sport equipment, completion statement download |
| `v-stable-chat32` | Chat 32 — min age 21, young driver warning, mileage/deposit on bids, document checklist on confirmed booking + receipt PDF, completion email fix, terms updated |
| `v-stable-chat32b` | Chat 32b — Stripe application_fee_amount, rich payment intent description + metadata |
| `v-stable-fuel-override-complete` | Chat 35 — full fuel override flow working, customer password reset fixed |
| `v-stable-chat36-pre` | Chat 36 — single currency model, CurrencySelector removed, homepage Book Now layout improved |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat36-pre
cd ~/camel-customer && git checkout v-stable-chat36-pre
```

---

## What Is Working ✅
- Customer booking flow — homepage widget with currency + driver age selection (min 21)
- Young driver warning (21–24) shown on homepage widget, booking page, partner request page
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal — shows office fuel override with amber notice
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10 floor
- Fuel level recording — driver OR office can record, effective fuel = partner override || driver reading
- Office fuel override — partner admin can override driver fuel reading; customer sees and confirms effective value; driver app shows amber notice when override set
- Fuel charge/refund calculation
- Fuel refund on completion — Stripe partial refund issued automatically
- Email notifications — all (booking confirmed, completion, review reminder)
- Customer password reset — sends via Resend (not Supabase email), lands on customer site
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
- Stripe payment split — `application_fee_amount` ensures Camel gets exact commission, Stripe fee borne by partner, fuel refunds from partner balance
- Rich Stripe metadata on every payment intent and fuel refund for full reconciliation
- Stripe dashboard descriptions labelled with job number, partner, all amounts
- Partner terms version `2026-06a` — Stripe fee wording corrected across all files, no specific percentages quoted anywhere
- Document checklist — shown on confirmed booking page and in receipt PDF only (not on homepage)
- Customer terms — updated for min age 21, young driver surcharge in bid, credit card only if deposit required
- Partner terms — updated with mileage/deposit collection responsibility clauses
- Partner operating rules — section 3b added covering mileage limits and security deposits

---

## What Needs Building in Chat 37

### 1. Homepage Book Now layout (carry over from Chat 36)
- On desktop: Book Now should sit in the driver age row right columns when no additional drivers selected
- Needs to be verified visually after Chat 36 deploy — may already be working
- If not, rewrite the driver age + Book Now section cleanly in one go

### 2. Spanish Translation (PRIORITY)
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

### Chat 36 (Completed)
**Single currency model — customer always pays in partner bid currency**

1. `app/api/payments/create-intent/route.ts` (customer) — removed all currency conversion. Customer charged in `bid.currency` directly. No `convertCurrency` calls.
2. `app/api/webhooks/stripe/route.ts` (customer) — `currency = charge_currency = bid_currency`, `conversion_rate = 1` always. Simplified fee data storage.
3. `app/api/test-booking/bookings/[id]/completion-statement/route.ts` (customer) — uses `bk.currency` not `bk.charge_currency`. This was the root cause of the completion statement showing wrong currency.
4. `app/api/test-booking/bookings/[id]/receipt/route.ts` (customer) — same, uses `bk.currency`.
5. `app/page.tsx` (customer) — removed `CurrencySelector` import and component entirely. Removed `currency` field from booking request submission. Book Now layout improved — sits in driver age row on desktop when no additional drivers selected.
6. `app/bookings/[id]/page.tsx` (customer) — removed all `BidAmount`/`BookingAmount` conversion components. All amounts shown in `bk.currency` directly.
7. `app/partner/bookings/[id]/page.tsx` (portal) — `hasCurrConv = false`, `chargeCurr = bidCurrency`. Removes Stripe currency conversion warning.
8. `app/admin/bookings/[id]/page.tsx` (portal) — same.
9. `lib/serverCurrency.ts` (customer) — no longer called anywhere (kept in place but unused).
10. `app/api/currency/rate/route.ts` (customer) — no longer called anywhere (kept in place but unused).
11. Stable tags: `v-stable-chat36-pre` on both repos.

1. `app/api/partner/bookings/[id]/update/route.ts` (portal) — `isLocked()` uses effective fuel (partner override || driver). `effectiveCollectionFuel`/`effectiveReturnFuel` used for lock check and status advancement.
2. `app/partner/bookings/[id]/page.tsx` (portal) — `isLocked()` accepts `partnerFuel`, uses effective fuel. `FuelStageCard` shows partner override in top row when set, with "Set by office" label and driver reading shown below. Unlocked state correctly uses dark text on light background.
3. `app/api/test-booking/bookings/[id]/update/route.ts` (customer) — `isFuelLocked()` uses effective fuel. Customer confirmation gates on effective fuel existing (not just driver confirmed). `collection_fuel_level_customer` set to effective fuel on confirm.
4. `app/bookings/[id]/page.tsx` (customer) — `FuelConfirmCard` redesigned with `effectiveFuel`, `effectiveReady`, `partnerOverrideActive` props. Shows "Office recorded" label and amber badge when override active. Customer can confirm once either driver or office has recorded.
5. `app/api/driver/jobs/route.ts` (portal) — added `collection_fuel_level_partner` and `return_fuel_level_partner` to returned job objects (were selected from DB but never returned).
6. `app/driver/jobs/page.tsx` (portal) — shows amber notice when office override set, both before and after driver records. Completed jobs show effective fuel with "Office recorded" label.
7. **Supabase URL Configuration** — Site URL changed to `https://test.camel-global.com`. Added `https://test.camel-global.com/**` and `https://test.camel-global.com/reset-password` to redirect URLs. Portal redirect URLs unchanged — portal reset still works.
8. Stable tags: `v-stable-fuel-override-complete` on both repos.

### Chat 32b (Completed)
**Stripe payment architecture fix, rich metadata, fee wording corrected**

### Chat 32 (Completed)
**Min age 21, young driver warning, mileage/deposit on bids, document checklist, completion email fix, terms updated**

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

*Last updated: Chat 36 — Single currency model implemented (customer always pays in partner bid currency). CurrencySelector removed. Completion statement currency bug fixed. Homepage Book Now layout improved. Stable tags v-stable-chat36-pre on both repos.*