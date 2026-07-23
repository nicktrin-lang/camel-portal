# Stripe Money-Flow Audit — Camel Global

**Date:** 2026-07-22
**Scope:** payments, payouts, fuel refunds, cancellations, chargebacks — both repos (`camel-portal`, `camel-customer`).
**Method:** four parallel read-only audits (one per flow), then every critical/high finding re-verified by hand against the actual source. No code was changed.
**Verification key:** ✅ = confirmed by me against the code · ⚠️ = agent-reported, high confidence, not independently re-read · ❓ = needs a DB-schema or Stripe-dashboard check to settle.

---

## The one root cause behind most of this

The charge path is a **destination charge**: `create-intent` sets `on_behalf_of` + `transfer_data.destination` + `application_fee_amount`
(`camel-customer/app/api/payments/create-intent/route.ts:112-114`). **Money moves to the partner's connected account the instant the charge succeeds.** The platform balance only ever keeps the commission (the application fee).

Several downstream paths are written as if the money still sits on the platform waiting to be pushed out (a "separate charges & transfers" model). That single mismatch produces the worst bugs. The paths that *are* destination-charge-aware (completion fuel refund, full-cancel, post-completion refund) move money correctly in isolation.

A second cross-cutting cause: **no Stripe idempotency keys anywhere**, and every "Stripe call then DB write" is non-atomic, so a retry or a concurrent call re-executes the money movement.

---

## Severity-ranked findings

### 🔴 CRITICAL

**1. Monthly payout cron double-pays (or false-fails). ✅**
`app/cron/monthly-payout/route.ts:147` issues a **second** `stripe.transfers.create` of `car_hire − commission + fuel_charge` — funds the destination charge already delivered at charge time. Two outcomes: platform balance short → `balance_insufficient` → partner skipped + "[Admin] Payout FAILED" email (noise, no second pay); platform balance funded → **partner paid twice.** Independently flagged by the payout *and* cancellation audits.
*Likely benign so far only if runs have been failing on insufficient balance (partners already got paid at charge time). It is a landmine: the cron's only legitimate jobs under these rails are flip `payout_status→paid` and emit the invoice — the whole `transfers.create` block is wrong.*

**2. Webhook drops the entire booking on a transient insert failure. ✅**
`camel-customer/app/api/webhooks/stripe/route.ts`: `customer_requests.status` is set to `"confirmed"` (L249) **before** the `partner_bookings` insert (L262). If the insert fails, the handler 500s so Stripe retries — but the retry hits the `status !== "open"` gate (L242) and returns early. **Net: card charged, request confirmed, no booking row, no payment row, partner never paid.** Any transient DB error on that one insert silently loses the booking.

**3. Completion refund/reversal double-fires on retry. ✅**
`lib/portal/completeBooking.tsx`: transfer reversal (L603) and customer refund (L616) carry **no idempotency key**; the guards that stop a re-run (`payout_status`, `fuel_refunded_at`) are written only *after* both Stripe calls (L642, L649). A crash/timeout/DB-failure in that window → a retry refunds the customer and reverses the partner a **second time**. Callers do retry (the `update` route auto-triggers; a manual "complete" button exists).

**4. Cancelling a *completed* booking still pays the partner at month-end. ✅**
`lib/portal/cancelBooking.ts:132` writes `payout_status="cancelled"` **only to `payments`**, never to `partner_bookings`. The cron reads `partner_bookings.payout_status="ready"` and does **not** filter on `booking_status` (`monthly-payout/route.ts:48`). So a completed→cancelled booking (customer refunded, transfer reversed) is still `ready` and gets paid out. Nothing sets `payout_hold` automatically.

### 🟠 HIGH

**5. `fuel_only` cancellation (<48h) leaks the fuel deposit. ✅**
`cancelBooking.ts:104-116` refunds the fuel deposit to the customer with `reverse_transfer:false`. The deposit was already transferred to the partner. Result: **customer refunded + partner keeps the deposit + Camel eats it** (platform net = commission − fuel_deposit, often negative). Fires on every <48h customer cancel with a fuel deposit.

**6. Full-cancel refund reads no cap and swallows Stripe rejection. ✅**
`cancelBooking.ts:72-74` always requests `car_hire + fuel_deposit`, never reading prior `fuel_refund_amount` / post-completion refunds; its idempotency latch (`cancelled_refunded_at`) is null after completion. Cancel a completed booking (fuel already partially refunded) → Stripe rejects the over-refund → `cancelBookingRefund` returns `ok:false` → the admin cancel route **ignores the failure** and emails "Full refund … processed." Customer told they were refunded; they were not; booking is now `cancelled` so retry is blocked. No recovery path in the UI.

**7. Booking / receipt amounts re-read a MUTABLE bid, diverging from the actual charge. ⚠️**
The charge + `payments` row use the immutable PaymentIntent metadata snapshot, but `partner_bookings`, the receipt PDF, the confirmation emails, GA4, and the downstream commission invoice re-read the live `partner_bids` row. Bids are editable while the request is `"open"` (`camel-portal/app/api/partner/bids/route.ts`), and the request stays open until payment confirms. A partner editing the bid (amount **or currency**) during the pay window makes the stored booking, the customer's receipt, and the commission math disagree with what was actually charged — including a possible mixed-currency row.

**8. No chargeback / dispute handling at all. ✅ (absence confirmed)**
The webhook handles only `payment_intent.succeeded` — there is no `charge.dispute.created` handler. `payout_hold` is a manual admin toggle (correctly enforced by the cron, but never set automatically). Under destination charges a chargeback debits the **platform** while the partner keeps the transferred funds, and the cron would still pay them. Partner-terms clause 7 is contractual only, no code enforcement.

### 🟡 MEDIUM

**9. Duplicate payment on one bid is captured and orphaned. ⚠️** No idempotency key on `paymentIntents.create` and nothing blocks a second intent while the request is `"open"`. If a customer pays twice (two tabs), the second `succeeded` event hits the status gate and returns early — money captured, no booking, no refund.

**10. Three inconsistent commission computations. ✅** `create-intent` converts the €10 floor to bid currency via `MIN_FLOOR_RATE`; completion (`completeBooking.tsx`), the cron (`monthly-payout:15`), and the invoice generator all hard-code `Math.max(..., 10)`. For small non-EUR hires the invoice/payout math disagrees with the fee Stripe actually took.

**11. Commission-invoice period is mislabelled. ⚠️** The cron selects **all** `payout_status="ready"` bookings (no date filter) and stamps them with "previous month" as the period. An invoice labelled e.g. "June 2026" can contain bookings from any earlier month that happened to still be `ready`.

**12. `partner_payout_amount` excludes fuel and is never reconciled. ✅** Written once at the webhook as `max(0, car_hire − commission)` (excludes fuel), never corrected after completion, even though the destination transfer delivered `car_hire + fuel − commission`. Reports built on this field understate settlement.

**13. Partner-controlled fuel levels set the customer's refund with no customer cross-check. ✅** `completeBooking.tsx:528-534` prefers the partner's own fuel readings over the driver's and never consults the customer's confirmed reading on the direct-complete path. A partner reporting the car returned emptier than it was shrinks the customer's refund into the partner's pocket.

**14. Completion reversal not clamped to the transfer balance. ✅** `completeBooking.tsx:603` reverses `refundCents` unconditionally (the sibling `post-refund` route correctly clamps to the remaining transfer). When the commission floor exceeds car hire, the transfer is smaller than the fuel deposit → reversal exceeds transfer → Stripe throws → 500 before the refund, booking stuck.

**15. `application_fee_amount` can exceed the charge on tiny hires. ✅** If `total < ~€10 floor`, `application_fee_amount > amount` → Stripe rejects `paymentIntents.create` → hard checkout failure for that bid. Edge case only.

### 🔵 LOW / LATENT

- **16. ✅** Cross-currency summation is structurally possible in the cron (groups by partner, sums in `default_currency` without asserting each booking's snapshot currency). Safe only under the one-currency-per-partner invariant — a re-onboarded/changed currency would sum across currencies. (Moot while #1 stands.)
- **17. ✅** Cron targets the partner's *current* `stripe_account_id`, not the account the charge actually hit — wrong-account risk if re-onboarded (gated by #1).
- **18. ⚠️** Concurrent duplicate webhook delivery could create two bookings/payments unless a DB unique constraint exists on `winning_bid_id` / `stripe_payment_intent_id` — **needs Supabase schema check ❓**.
- **19. ✅** `getCustomerLocale` in the webhook uses `auth.admin.listUsers()` (the anti-pattern CLAUDE.md forbids) — no money impact, wrong email locale + scaling cost only.
- **20. ✅** Partial DB writes after a successful Stripe call (completion, cancel) leave notification/data inconsistency (e.g. money moved but no completion statement sent).

---

## What's genuinely correct (don't "fix" these)

- **Post-completion refund** (`admin/bookings/[id]/post-refund/route.ts`) — retrieves the real transfer, clamps the reversal to the remaining balance, caps total refunds at `car_hire + fuel_charge`. The reference pattern.
- **Full-cancel and completion fuel refund** reverse the transfer correctly.
- **Security:** webhook signature verification, JWT + ownership scoping on create-intent and the partner/customer routes are sound. The fuel-refund *calculation* (`calculateFuelCharge.ts`) is bounded `[0, deposit]` with correct edge behaviour.
- **Currency snapshotting** on the charge itself is correct; the divergence is only where code re-reads the live bid (#7).

---

## Relationship to the Global Payouts (AU/NZ) build

The Chat 59 plan already reshapes the charge model (Phase 2: separate charges for AU/NZ) and the refund path (Phase 3: refund fork). Several findings here should be folded in rather than fixed twice:
- Fixing **#1** (cron) is a prerequisite for Phase 3/4 — the payout pipeline can't be built on top of a cron that double-pays.
- The idempotency-key gap (#1, #3, #6, #9) must be closed as part of any OutboundPayment work — Global Payouts is even less forgiving of double-execution.
- **#8** (dispute handling) and **#4/#5** (refund fork) overlap directly with the Phase 3 refund rework.
- Findings on the **in-corridor** path (#2, #7, #10–#15) are independent of AU/NZ and affect production today.

---

## Recommended fix order (proposed — nothing done yet)

1. **#1 cron** — highest blast radius, runs Aug 1. Rewrite to "mark paid + invoice only" (no transfer), or disable the cron until rewritten. **Do first.**
2. **#4 cross-table desync + #5 fuel_only leak + #6 full-cancel cap** — the cancellation cluster; real money loss on ordinary cancels.
3. **#2 webhook dropped-booking** — reorder so the booking/payment insert precedes the `status="confirmed"` write, or make the retry re-entrant.
4. **#3 idempotency on completion** (+ #14 clamp) — and add idempotency keys across all Stripe money calls.
5. **#7 amount divergence** — make the booking/receipt authoritative on the charge snapshot, not the live bid.
6. **#8 dispute webhook** — auto-`payout_hold` on `charge.dispute.created`.
7. Mediums (#10–#13, #15) and lows as a cleanup pass.

Each fix touches Stripe charge/transfer/refund logic → diff shown and approved before any change.

---

## Open items needing you / the dashboard

- **Diagnostic for #1:** have you been getting "[Admin] Payout FAILED" emails around the 1st of each month? And a Stripe-dashboard check for duplicate transfers, to confirm whether any partner was actually overpaid vs. only false-failures.
- **#18:** confirm in Supabase whether unique constraints exist on `partner_bookings.winning_bid_id` and `payments.stripe_payment_intent_id` (decides whether concurrent-webhook double-insert is real or already prevented).
