# Stripe Payments Rewrite — Design

**Date:** 2026-07-22 · **Status:** proposed, for review before any code · **Precondition:** zero live bookings (clean-slate rewrite, no data migration).

Supersedes the broken destination-charge model documented in `STRIPE_MONEY_FLOW_AUDIT.md`. Unifies the in-corridor fix and the AU/NZ Global Payouts build into one architecture.

---

## 1. Model: charge-to-platform, monthly settlement

Money is **held on Camel's Stripe balance** and paid out **monthly**, per partner, net of fuel refunds and commission. Fuel refunds to customers happen promptly at completion. Commission stays on Camel's balance in the charge currency. Camel absorbs all Stripe fees.

| Event | Money movement | Stripe call |
|---|---|---|
| **Booking** | `car_hire + fuel_deposit` → Camel platform balance (bid currency) | `paymentIntents.create` — **plain charge**: no `on_behalf_of`, no `transfer_data`, no `application_fee`. |
| **Completion** | Refund customer `fuel_deposit − fuel_used` from balance. Record partner net `car_hire − commission + fuel_used` as `ready`. | `refunds.create` (no `reverse_transfer` — nothing was transferred). |
| **Month-end** | Pay each partner the sum of their `ready` nets, one payout, same currency. Commission stays on balance. Email the partner **(a) a full monthly statement PDF** of every transaction (car hire, fuel deposit, fuel refund, commission, net) and **(b) Camel's commission invoice PDF**. | in-corridor: `transfers.create`; AU/NZ: `OutboundPaymentQuote` → `OutboundPayment`. |
| **Cancel >48h** | Full refund `car_hire + fuel_deposit` to customer. No commission, no payout. | `refunds.create` (full). |
| **Cancel <48h** | Refund `fuel_deposit`; partner keeps car hire → paid month-end as `car_hire − commission`; Camel keeps commission. | `refunds.create` (fuel only). |
| **Chargeback** | Auto-hold the booking's payout. | webhook `charge.dispute.created` → set `payout_hold`. |

### Money reconciliation (per booking, completed)
Balance after charge = `(car_hire + deposit) − card_fee`.
Out: partner `(car_hire − commission + fuel_used)` + customer refund `(deposit − fuel_used)`.
**Remaining on Camel balance = `commission − card_fee`.** After the month's payouts, the balance holds exactly the accumulated commission per currency, minus absorbed Stripe fees. ✓

---

## 2. Currencies & fees

- **One currency per partner** (Stripe settlement currency, unchanged). Bid = charge = payout currency. **No FX on the transactional path.**
- **Multi-currency balance required:** each charge must settle to the platform balance **in its own currency** (AUD stays AUD, etc.) so payouts are same-currency and skip the ~2% FX. → **CONFIRM in Stripe dashboard** that the platform account holds multi-currency balances / settles presentment currency in-kind. (This is the Chat 59 "crux question".)
- **Camel bears all Stripe fees:** card processing fee (per charge, from the charge's balance-transaction) + payout fees (AU/NZ OutboundPayment cross-border % + fixed + FX-only-if-conversion). Captured per booking, reported as "Stripe fees (absorbed)"; net margin = commission − fees. **Never sum fees across currencies.**

---

## 2b. Stripe compliance (verified against Stripe docs, 2026-07-22)

- **Separate charges and transfers is Stripe's *recommended* charge type** for a marketplace where the platform charges the customer, holds funds, and pays providers later. This is not a workaround — it's the sanctioned pattern for our shape.
- **Camel is merchant of record.** We do *not* set `on_behalf_of` — the charge is Camel's own, which matches the existing "marketplace intermediary / Platform Payment Notice" legal framing (partner terms cl.9). Statement descriptor = Camel.
- **Liability shifts to the platform (accept consciously).** Stripe applies refunds, chargebacks, and negative balances to the account where the charge was made — i.e. **Camel's balance**. Camel "cannot easily recover those funds from connected accounts." Under the old destination-charge model some of that could sit with the connected account; under this model Camel carries dispute/refund liability directly. This aligns with "Camel bears all Stripe fees" and Camel controlling refunds — but it is a real risk to accept. Mitigations built into this design: pay partners only for **completed, non-disputed** bookings (§3); auto-`payout_hold` on dispute; retained commission buffers the balance; AU/NZ recovery ledger for post-payout clawback.
- **Cross-border:** transfers to connected accounts are corridor-limited (in-corridor EUR/GBP/USD/CAD). AU/NZ out-of-corridor → Global Payouts OutboundPayment (P5). Unchanged from Chat 59.
- **Holding funds:** no hard Stripe time limit on holding before transfer; monthly is fine. (Stripe also offers a "funds segregation" private-preview to hold to-be-transferred funds in a protected state — optional, worth asking Stripe about. Holding customer funds is a standard-marketplace question NTUK may want to confirm with Stripe for its account, but the pattern is standard and not a code blocker.)

## 3. State machine

`partner_bookings.payout_status` (mirror onto `payments`):

- **`held`** — charge succeeded, funds on platform. (set by webhook)
- **`ready`** — settled and owed to partner: either completed (net = `car_hire − commission + fuel_used`) or <48h-cancelled (net = `car_hire − commission`). (set by completion / late-cancel)
- **`paid`** — paid in the monthly run (`paid_out_at`, `payout_batch_id`/`outbound_payment_id`). (set by cron)
- **`cancelled`** — >48h cancel, fully refunded, nothing owed. **Written to BOTH `partner_bookings` and `payments`** (fixes audit C4/#4).
- Orthogonal `payout_hold` (bool) — set manually or by dispute webhook; cron skips it.

Cron selects `payout_status='ready' AND payout_hold=false`, grouped by partner **and asserted single-currency**.

### 3b. Month-end cutoff & the cancellation race (the tricky bit)

**Principle: payout eligibility is tied to COMPLETION, not the charge/calendar date.** A booking becomes `ready` only when it is **completed** (car returned, fuel reconciled) — at which point the service is delivered and **the customer can no longer cancel it**. Upcoming/cancellable bookings stay `held` no matter when they were charged, and are paid in the month they *complete*, not the month they were charged.

This dissolves the cutoff race the user flagged: **the cron never pays a cancellable booking** — anything payable is already past the point of cancellation, and a customer cannot cancel a completed hire. A booking charged Jan 28 with pickup Feb 3 stays `held` through the Feb 1 run and is paid at the *end of Feb*, after it completes; its >48h/<48h cancellation rights are fully intact while held, with the money sitting on Camel's balance to refund cleanly.

Residual edges, all handled:
- **Completes right at the cutoff** (returns 23:00 on the 31st, cron 08:00 on the 1st) → completed = non-cancellable → safe to pay.
- **Concurrent cancel/refund vs. the running cron** → the cron claims each booking atomically: conditional `ready → paying` (only if still `ready` and not `payout_hold`), then the transfer (idempotency-keyed), then `paying → paid`. Cancel/refund paths refuse or defer if status is `paying`/`paid`, routing instead to the post-payout reversal (in-corridor) / recovery-ledger (AU/NZ) path.
- **Post-completion refund / dispute after payout** (rare, admin- or dispute-driven) → `charge.dispute.created` auto-sets `payout_hold`; a post-payout refund uses reversal (in-corridor) or the recovery ledger (AU/NZ).
- Optional extra safety: only pay bookings completed ≥ N hours before the cutoff. Not strictly needed (completed = non-cancellable) — decide during P4.

---

## 4. Idempotency (fixes the whole idempotency-gap class)

Every money-moving Stripe call gets a deterministic `idempotencyKey`, and the DB guard is written/read to make re-runs safe:

- charge: `charge_${bid_id}`
- fuel refund: `fuelrefund_${booking_id}`
- cancel refund: `cancelrefund_${booking_id}`
- monthly payout: `payout_${partner_id}_${YYYYMM}`

Webhook booking creation: reorder so the `partner_bookings` + `payments` inserts happen **before** flipping `customer_requests.status='confirmed'` (fixes audit #2 dropped-booking), and enforce a **DB unique constraint** on `partner_bookings.winning_bid_id` and `payments.stripe_payment_intent_id` (fixes #18 concurrent double-insert). Booking/receipt amounts read the **charge snapshot** (metadata), never the live bid (fixes #7).

---

## 5. Corridor handling

The **only** difference between in-corridor and AU/NZ is the month-end payout call:
- In-corridor (EUR/GBP/USD/CAD): `transfers.create` to the partner's Express Connect account.
- AU/NZ: `OutboundPaymentQuote` → `OutboundPayment` to a v2 **recipient** object (separate from Connect). Partner onboarding forks here too (recipient vs Connect), keyed on `payout_rail`.

Charge, completion, and cancellation logic are **identical across corridors** (all plain charges to the platform balance) — a big simplification vs. the old "destination charge + AU/NZ fork".

---

## 6. Cancellation rules (confirmed)

- **>48h before pickup:** full refund `car_hire + fuel_deposit` to customer. Camel keeps nothing. `payout_status='cancelled'` (both tables).
- **<48h:** refund `fuel_deposit` to customer. Partner keeps car hire → month-end payout `car_hire − commission`. Camel keeps commission. `payout_status='ready'` with settled net.

---

## 7. DB schema (additive; Chat 59 columns + this rewrite)

```
partner_profiles:  stripe_recipient_id text, payout_rail text DEFAULT 'connect'  -- 'connect' | 'global_payouts'
partner_bookings:  charge_model text DEFAULT 'platform_hold',
                   settled_partner_net numeric, settled_at timestamptz,  -- car_hire − commission + fuel_used, canonical (read by ALL reports)
                   stripe_fee_total numeric DEFAULT 0,                    -- card fee + payout fee, all absorbed by Camel
                   stripe_fee_breakdown jsonb,                            -- {card:{amount,currency}, payout:{amount,currency}}
                   outbound_payment_id text, outbound_quote_id text
                   -- reuse payout_status / payout_batch_id / payout_hold / commission_amount
payments:          (already has stripe_fee, fuel_refund_amount, cancellation_refund_amount) — canonical figures live on partner_bookings
partner_recovery_ledger:  (Chat 59) AU/NZ post-payout clawback — id, partner_user_id, booking_id, amount, currency, reason, status, created_at
UNIQUE constraints: partner_bookings.winning_bid_id, payments.stripe_payment_intent_id  (kills concurrent double-insert)
payout_status states: 'held' → 'ready' → 'paying' → 'paid', plus 'cancelled'  ('paying' = the atomic cron claim, §3b)
```

**Reporting rule (from the reporting-reconciliation audit):** every report/CSV reads these **stored canonical** columns — `commission_amount`, `settled_partner_net`, `stripe_fee_total`, the refund columns — and **never recomputes** them. Kills the three-way "partner payout" disagreement, the recomputed-commission mismatch, and the cross-currency Partner Breakdown. New surfaces: fees-absorbed + net-margin (commission − all fees), a per-currency reconciliation view proving §8c, a cancellation-refund column, and a `payout_batch_id` drill-down.

---

## 8. Phased build (each phase: test-mode E2E, diff shown, per-unit commit, verify)

- **P0 — Design sign-off + DB schema + dashboard prereqs.** (this doc + SQL + your dashboard tasks)
- **P1 — Charge model.** `create-intent`: plain charge to platform (drop `transfer_data`/`on_behalf_of`/`application_fee`), idempotency key, card-fee capture. `webhooks/stripe`: reorder inserts, unique constraints, snapshot-authoritative amounts, `payout_status='held'`.
- **P2 — Completion.** Rewrite `completeBooking`: customer fuel refund only (no reversal), record `settled_partner_net`, `payout_status='ready'`, idempotency. Remove all transfer-reversal code.
- **P3 — Cancellations.** Rewrite cancel routes + `cancelBooking`: platform refunds only (no reversals), correct >48h/<48h split, write `payout_status` to both tables, idempotency, surface refund failures (no silent swallow).
- **P4 — Monthly cron + statements.** Rewrite `monthly-payout`: pay `ready` bookings from `settled_partner_net`, one transfer per partner, per-currency, idempotency key, `booking_status`-safe. Then email each paid partner **two English PDFs** (localised email wrapper): a **monthly statement** listing every transaction for the period (car hire, fuel deposit, fuel refund, commission, net payout, per-currency totals) + the **commission invoice** keyed to the actual period. New generator `generateMonthlyStatementPDF`; reuse `generateCommissionInvoice` (corrected period selection).
- **P5 — AU/NZ payout rail.** Recipient onboarding fork (v2 Accounts API) + OutboundPayment path in the cron + payout-fee capture. (Needs the two dashboard toggles.)
- **P6 — Chargebacks + reconciliation & reporting.** `charge.dispute.created` → auto `payout_hold`. Rework admin + partner **bookings pages, reports pages, and every CSV/Excel export** (both repos) + the AI `chat` figures to read the single ledger, per-currency, with fees-absorbed + net margin. Add an admin **reconciliation view** proving the §8c identity holds against Stripe.

---

## 8b. PDF branding — one consistent system

There are four partner/customer PDFs: **booking receipt**, **completion statement**, **commission invoice**, and the new **monthly statement**. They must share **one branding system** — logo, colour, header/footer, NTUK legal block, typography — so everything a partner/customer receives looks like one company.

- Audit the existing three generators for drift, extract a **shared branded header/footer + document shell** (logo via `fs.readFileSync`, NTUK Ltd footer, colours, fonts), and build the monthly statement on it.
- **All four PDFs stay English** (NON-NEGOTIABLE rule 3, NTUK legal). Only the **email wrapper** that carries them is localised (6 locales, EN fallback) — and the email wrapper (`brandEmail`) should also be visually consistent across all sends.
- Done as a dedicated branding-unification unit alongside P2 (completion) and P4 (statement/invoice).

## 8c. Reconciliation & reporting — must tie to Stripe to the cent

**Every Stripe money event is recorded on the DB as it happens, so admin + partner bookings, all reports, and every CSV/Excel export reconcile exactly to Stripe, per currency.**

- **Single ledger.** Each booking's full money history is reconstructable from the DB: charge amount, **card fee** (from the charge balance-transaction), fuel refund (id + amount), cancellation refund (id + amount), payout transfer/OutboundPayment (id + amount), **payout fee**, and any dispute. Every Stripe call writes its `id`, `amount`, and `fee` back. No money figure is ever recomputed on the fly for a report where a recorded value exists — reports read the ledger.
- **One commission number.** Kill the three divergent commission computations (audit #10) — a single stored `commission_amount` per booking, snapshotted at charge, used by payout, invoice, statement, and reports identically.
- **Correct payout figure.** Store `settled_partner_net` at completion (includes fuel used) — fixes the audit's "payout amount excludes fuel" (#12). Reports use it, not a recompute.
- **Per-currency, never summed across.** All accumulators keyed off `CURRENCIES`; admin + partner reports and CSVs show per-currency totals.
- **Reconciliation identity (must hold, per currency):** `Σ charges = Σ partner payouts + Σ customer refunds (fuel + cancellation) + Σ retained commission + Σ Stripe fees absorbed`. Add an admin reconciliation view/CSV that proves it, and surface "Stripe fees (absorbed)" + "Camel net margin = commission − fees" (Chat 59 requirement).
- **Surfaces to update (both repos):** `admin/reports`, `admin/bookings`, `partner/reports`, `partner/bookings` pages **and their CSV/Excel exports**, plus the AI `chat` route's figures. Audited separately (see reporting-reconciliation audit).

## 8d. Build status (2026-07-23) — branch `stripe-rewrite`, both repos

| Phase | Status |
|---|---|
| P1a charge → platform balance | ✅ committed |
| P1b webhook (ledger-first, idempotent, card fee, snapshot amounts) | ✅ committed |
| P2 completion (fuel refund, no reversal, settled_partner_net) | ✅ committed |
| P3a cancellation core (platform refund, both-table status, cap) | ✅ committed |
| P3b cancel routes (refund before cancel, abort on failure) | ✅ committed |
| P4a monthly cron (pay settled_partner_net, per-currency, idempotent) | ✅ committed |
| P4b monthly statement PDF + invoice reconciliation | ✅ committed |
| P6 reporting reconciliation (read canonical, fees/margin, currency-key) | 🔄 in progress |
| **P5 AU/NZ Global Payouts** (recipient onboarding + OutboundPayment) | ⏸ deferred |

**P5 is deliberately deferred** until the dashboard toggles are done and it can be verified against test-mode Stripe — it uses the v2 Accounts + OutboundPayment APIs which must not be written unverified. The cron already handles the `global_payouts` rail safely (leaves such bookings `ready` with a skip note), so nothing breaks meanwhile; AU/NZ payouts stay manual (current reality).

### Setup checklist for Nick (before staging test)
1. Run **`STRIPE_REWRITE_SCHEMA.sql`** in Supabase (columns + unique indexes + recovery ledger).
2. Create a Supabase Storage bucket **`monthly-statements`** (same as `commission-invoices`).
3. Confirm `STRIPE_SECRET_KEY` = the `…cs5n` account; confirm multi-currency balance settles in-kind.
4. Dashboard (for P5, later): enable AU/NZ Local network + recurring daily transfers.
5. Then push `stripe-rewrite` to staging with **test-mode** Stripe keys and run the full lifecycle end-to-end before any merge.

## 9. Open items to confirm

- **Dashboard (you):** multi-currency balance settles presentment currency in-kind (§2); enable AU/NZ Local network + recurring transfers (P5); confirm `STRIPE_SECRET_KEY` = the `…cs5n` account.
- **Stripe SDK:** verify v2 Accounts API (recipient) + OutboundPayment are available on `stripe@^22` / apiVersion `2026-04-22.dahlia` before P5 (confirm against current Stripe docs).
- **Policy:** monthly cron currently runs 1st @ 08:00 UTC — keep that cadence for payouts + invoices.
