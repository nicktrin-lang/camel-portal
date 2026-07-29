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

---

## P5 — Stripe confirmations (live-chat support, 2026-07-24)

Answers obtained directly from Stripe support on the LIVE platform account
`acct_1TggMl5bphnFcs5n`. These retire several open questions above. Treat as
authoritative for AU/NZ Global Payouts.

- **Global Payouts IS enabled on the live account, at Standard tier.** Confirmed
  by the agent while screen-sharing the actual Global Payouts settings page. It
  is enabled but not yet *set up* (financial account not provisioned, payout
  method not activated).
- **LIVE MODE ONLY. No sandbox, no test mode.** Stated explicitly and twice:
  recipient onboarding + OutboundPayments cannot be exercised in test mode or a
  sandbox. This kills the "verify in a sandbox first" plan — there is no such
  environment. **The only validation is a small REAL payout in live.**
- **Standard Connect cannot pay AU/NZ.** Verified by us:
  `POST /v1/transfers currency=aud destination=<AU account>` →
  `transfers_not_allowed` ("restricted outside of your platform's region"),
  with GBP/EUR funds available (not a funding issue). Confirms Global Payouts is
  required, not optional. Destination charges are separately incompatible with
  our model (they pay at charge time; we refund fuel deposits + cancellations
  after the charge), so we must settle from the platform balance.
- **Same-currency payout avoids FX — CONDITIONAL on MCS.** Hold AUD → pay AUD =
  no conversion = no FX fee. BUT this requires the platform to actually hold an
  **AUD-denominated balance**, which requires **Multi-Currency Settlement (MCS)
  enabled** so AUD accumulates separately instead of converting to GBP. Same for
  NZD. Without MCS: ~2% FX in + ~2% out. This resolves the Chat 59 "FX crux" —
  answer: enable MCS. **MCS for AUD/NZD is now a hard prerequisite.**
- **Fees (Standard tier), Stripe-quoted:** £0.50 per payout (UK) + cross-border
  0.25–1.25% + FX 0.50–2% *only when a conversion happens*. So same-currency AU
  ≈ £0.50 + ~1% CBP; the 2% FX is avoided under MCS.
- **Financial account funding:** transfer from the platform Payments balance into
  the financial account, via Dashboard or API. Provisioned via Global Payouts →
  Get started → accept ToS → enable Standard (local network) payout method.
- **STILL OPEN (Jaya left chat before answering):** exact steps to enable MCS for
  AUD/NZD. Likely a self-serve platform setting (the platform test balance
  already holds GBP + EUR in separate buckets, so multi-currency holding is at
  least partly active). If not self-serve, one short follow-up chat: "enable
  multi-currency settlement for AUD and NZD on acct_1TggMl5bphnFcs5n". NOT a
  code blocker — only bites at the live-test stage.

### Live go-live sequence (there is no other test)
1. Dashboard (live): enable Global Payouts (Get started + ToS), enable MCS for
   AUD/NZD, provision the financial account, fund it with a small amount.
2. Onboard ONE real AU recipient with a real AU bank account you control.
3. FIRST payout BY HAND in the Dashboard — proves the Stripe side, zero code risk.
4. THEN one small payout through the cron code for a single booking; watch the v2
   webhook (/api/webhooks/stripe-v2) reconcile paying → paid.
5. Only after that passes does AU/NZ go live for real bookings.

### Broader flag (in-corridor, live NOW)
The shipped rewrite already charges EUR bookings to the platform balance and pays
Spanish partners EUR monthly. That path ALSO depends on holding EUR in-kind — if
the live account doesn't, every EUR booking silently pays FX both ways. The test
balance holding EUR separately is reassuring but must be CONFIRMED in live
(Balances shows EUR held as EUR, not swept to GBP).

### UNRESOLVED (2026-07-24) — classic MCS vs Global Payouts financial account
The Stripe AI assistant, asked how to enable MCS, described CLASSIC Multi-Currency
Settlement: settle AUD → pay out to CAMEL'S OWN Australian AUD bank account (real
AU bank, Wise/Airwallex not supported), min AU$1,000 auto / AU$100 manual. That is
a DIFFERENT product from Global Payouts, where AUD is held in a Stripe FINANCIAL
ACCOUNT and paid to the PARTNER via OutboundPayment. The AI also wrongly stated our
account is Australian. Do NOT act on that answer.

OPEN QUESTION for a human Global Payouts specialist: does funding OutboundPayments
in AUD require Camel (UK) to hold a real Australian bank account, or does the
Stripe financial account hold the AUD directly? One path is a serious blocker
(UK company needs an AU bank account); the other is not. Believed to be the
latter (financial account holds it), but UNCONFIRMED. Resolve before the live
go-live test. NOT a code blocker for Units 5-6.

### RESOLVED via Stripe docs (2026-07-24) — no AU/NZ bank account; FX is unavoidable for a UK entity
Read from Stripe's own documentation (global-payouts, send-money, money-management/
financial-accounts), which agree across three pages — unlike the chat AI, which kept
answering about classic Multi-Currency Settlement (a DIFFERENT product) and
contradicted itself on Wise/Revolut.

- **No Camel-owned AU/NZ bank account is required.** Global Payouts pays the
  PARTNER's local bank via OutboundPayment from a Stripe financial account. Classic
  MCS (settle to your own foreign bank account) is a separate product we do NOT use.
- **A UK entity's financial account holds GBP/EUR/USD only — NOT AUD/NZD.** So we
  hold GBP, and an AUD/NZD OutboundPayment CONVERTS from GBP at send time → the ~2%
  FX applies. The Chat 59 "hold AUD, pay AUD, no FX" plan is NOT achievable for a UK
  entity. Revised cost per AU/NZ payout ≈ £0.50 + cross-border % + ~2% FX (worst
  case ~3%), NOT ~1%. Camel absorbs it (margin hit on AU/NZ), not a blocker.
- **Code implication (needs live confirmation):** the OutboundPaymentQuote's
  `from.currency` should be what the financial account actually HOLDS (GBP), with the
  `to`/`amount` in the recipient currency (AUD/NZD) — NOT GBP-in/AUD-out with
  `from.currency=aud` as the current draft assumes. The quote will return the real FX
  fee, which our per-booking fee capture already records. Verify the exact quote shape
  in the live go-live test.
- One confirmation still worth getting from a human GP specialist: that a UK financial
  account genuinely cannot hold AUD/NZD. High confidence from docs; build on it.

### CONFIRMED by Stripe support (LK, 2026-07-27) — the definitive AU/NZ model
Two SEPARATE money mechanisms, confirmed for our UK platform account:

1. **Commission (Camel's own money) → Multi-Currency Settlement (MCS): NO FX.**
   AUD charges can settle directly as AUD to a Camel AUD balance, withdrawn to a
   Camel-owned AUD bank account (a Wise UK business account's AUD details are
   accepted). Setup: Dashboard → Payout Settings → Manage Currencies → Add AUD +
   add the AUD bank account. Zero FX on the commission leg.

2. **Partner payout → Global Payouts OutboundPayment: FX APPLIES.**
   Direct Connect UK→AU transfers are unsupported (confirmed, matches our test).
   Partners are paid via an OutboundPayment from the Global Payouts financial
   account, and **"Stripe handles the GBP → AUD/NZD conversion at the point of
   sending."** So the partner-payout leg is GBP-sourced and converts at send —
   FX is UNAVOIDABLE here. The Chat-59 "zero FX on partner payouts" ideal is NOT
   achievable; zero FX applies ONLY to Camel's own commission via MCS.

**CODE IMPLICATION (now confirmed):** the OutboundPaymentQuote `from.currency`
must be **GBP** (the financial account's currency), with the `to`/amount in
AUD/NZD — NOT AUD-in/AUD-out as the current draft assumes. Fix before P6 live test.

**STILL TO CONFIRM (possible DOUBLE FX — a real margin risk):** the customer
pays AUD but the OutboundPayment is GBP-sourced. Confirm with Stripe whether the
partner's money converts ONCE (GBP→AUD out) or TWICE (AUD→GBP at settlement, then
GBP→AUD at payout). That is the difference between ~1–2% and ~3–4% on every AU/NZ
payout. Ask LK explicitly before finalising the economics.

Sandbox Global Payouts enablement (acct_1TwWcWG5yRPYnAl6): still pending Stripe's
internal team. LK also requested a screen recording of the "only UK bank account
accepted" error for the MCS currency-add step.

### RESOLVED — double-FX question answered by Stripe (Anannya, 2026-07-28)
The open double-FX question is now settled definitively:

- **DEFAULT (no ACP): DOUBLE conversion, ~3–4% all-in.** AUD charge → GBP at
  settlement, then GBP → AUD at payout. Confirmed: the partner's AUD round-trips
  through GBP, exactly the wasteful case we flagged.
- **WITH ACP (Alternative Currency Payout): SINGLE conversion, ~1–2%.** ACP lets
  the platform RETAIN an AUD balance and fund Global Payouts directly from it,
  skipping the AUD→GBP leg.

**ACP is the linchpin for BOTH legs** (commission settled as AUD, and partner
payouts at ~1–2% instead of ~3–4%). It requires a **GB-domiciled bank account
that HOLDS AUD** — e.g. a Wise UK account with a UK sort code / account number
denominated in AUD. An Australian BSB account is NOT supported in this flow (which
is why the settlement-currency dialog offered no Australia and wanted a GB IBAN).

**Prerequisites to get the good (~1–2%) economics:**
1. Obtain a GB-domiciled AUD-holding account (Wise UK sort code/account set to AUD)
   — NOT the Australian BSB details. Confirm Wise can provide this.
2. Confirm ACP is enabled on acct_1TggMl5bphnFcs5n (may need to request from Stripe).
3. Add AUD (and NZD) as a settlement currency using that GB-domiciled account.

**CODE IMPLICATION (for when ACP is live):** the OutboundPayment must fund from the
retained AUD balance (ACP), NOT the GBP financial account, to get the single
conversion. Our per-booking fee capture records whatever the quote returns either
way, so reporting is correct regardless — but the `from` source must point at the
AUD balance once ACP is set up. Not actionable until ACP + the Wise account exist.

**Business decision (Nick's):** AU/NZ payouts cost ~1–2% WITH ACP or ~3–4% WITHOUT.
Set up ACP before AU goes live properly, or accept the ~3–4% margin hit. Not a
go-live blocker for the code (Path A works either way) — it's a cost/setup choice.

### RESOLVED (2026-07-29) — Stripe (Anannya) closed all three open AU/NZ items
Reply covering the three outstanding questions:

1. **ACP / Multi-Currency Settlement — SELF-SERVE.** Enable it yourself:
   Dashboard → **Settings → Connect → Multi-Currency Settlement** toggle. No
   Stripe-side request needed. Retires the "exact steps to enable MCS/ACP" open
   question and the classic-MCS-vs-ACP confusion above — the Settings→Connect
   toggle IS the path. ⚠️ **Verify on enabling** that it gives the PLATFORM a
   retained AUD balance to fund OutboundPayments (the ACP behaviour our economics
   depend on), not merely per-connected-account settlement — the reply's "for your
   connected accounts" wording is slightly ambiguous, and our rail funds Global
   Payouts recipients, not connected accounts.
2. **Wise UK AUD account — CONFIRMED correct.** A Wise UK account with a UK sort
   code / account number denominated in AUD (NOT the Australian BSB) is the right
   vehicle. Cleared to arrange with Wise. Closes prerequisite #1 above.
3. **Sandbox Global Payouts — ENABLED** on `acct_1TwWcWG5yRPYnAl6`. Sandbox
   testing of the Global Payouts rail is now unblocked. NOTE: this **supersedes
   the earlier "LIVE MODE ONLY, no sandbox" claim** — trust this newer
   confirmation; verify `lib/portal/stripeGlobalPayouts.ts` (still "written from
   docs, unverified") against the sandbox before going live.

Remaining to reach the good (~1–2%) economics: (a) toggle MCS/ACP, (b) open the
Wise UK AUD account, (c) add AUD (+NZD) as a settlement currency using it. The
code (Path A / Units 1–6) works either way; ACP only changes the OutboundPayment
`from` source (retained AUD balance vs GBP) and the resulting FX cost.
