# AU/NZ Partner Journey — Path A (Stripe Global Payouts)

**Decision (2026-07-24): Path A locked.** AU/NZ partners are paid via Stripe Global Payouts
(OutboundPayment to their local bank). FX applies (~3%, Camel absorbs) because a UK entity's
financial account holds GBP, not AUD. Revolut/MCS (Path B) is the recorded fallback if AU/NZ
volume ever makes the ~2% FX worth a separate off-Stripe payout rail.

**Status key:** ✅ built & code-verified · 🔶 built, verifiable ONLY in the live test (no sandbox
exists for Global Payouts) · ⚠️ needs action.

---

## The journey, step by step

### 1. Currency — automatic, not chosen ✅
An AU partner does **not** pick their currency. It is **derived from their country** and locked
(NON-NEGOTIABLE rule 4): `base_country = "Australia"` → `AU` → `default_currency = AUD` (NZ → NZD).
Written by the connect route, read-only everywhere. So bid currency = charge currency = payout
currency = **AUD**, guaranteed, with no way for the partner to set it wrong.

### 2. Onboarding — Stripe-hosted, automated ✅ / 🔶
`app/api/partner/stripe/connect/route.ts` forks on country:
- AU/NZ → creates a **v2 recipient** (`createGlobalPayoutRecipient`), sets
  `payout_rail='global_payouts'`, `default_currency='AUD'`, then returns a **Stripe-hosted
  onboarding link** (`createRecipientOnboardingLink`).
- The partner completes KYC **and adds their AU bank account** on Stripe's hosted page. Stripe
  collects the bank details — we never handle them. 🔶 (recipient-create payload proven in test
  mode; the hosted link + bank capture verify in the live test).

### 3. Readiness — a real signal, gated everywhere ✅
A recipient exists the moment onboarding starts, so presence ≠ ready. `getRecipientReadiness()`
requires the **local-bank capability active AND a payout method attached**, persisted to
`recipient_payouts_enabled`. Gated in three places so we never charge a customer for a partner we
can't pay: the status route, customer checkout (`create-intent`), and the payout cron.

### 4. Customer pays — plain charge to platform balance ✅
`create-intent` charges `car_hire + fuel_deposit` in **AUD** to Camel's platform balance (no
`transfer_data`, no corridor fork). Gate is rail-aware: AU/NZ partners pass on
`stripe_recipient_id + recipient_payouts_enabled`.

### 5. Completion / cancellation — from the platform balance ✅
Fuel refund and cancellations refund the customer from the platform balance (nothing was
transferred). Partner net (`car_hire − commission + fuel_used`) stored as `settled_partner_net`,
`payout_status='ready'`. Identical across corridors.

### 6. Monthly payout — automated OutboundPayment 🔶
The cron pays each AU/NZ partner their summed `settled_partner_net` in AUD via
OutboundPaymentQuote → OutboundPayment to their recipient's local bank. Idempotency-keyed. Parks
the booking at `paying` — **not** `paid` — because the payment is asynchronous.
🔶 The v2 Money Management calls verify only in the live test. **Known detail to confirm there:**
the quote's `from.currency` must be the currency the financial account actually HOLDS (GBP), with
the `to`/`amount` in AUD — the current draft assumes AUD-in/AUD-out. The quote returns the real
FX fee regardless, which we capture.

### 7. Reconciliation — automated, to the cent ✅ / 🔶
The v2 webhook (`/api/webhooks/stripe-v2`) promotes `paying → paid` only on `posted`; on
failed/returned/canceled it returns the booking to `ready` (clearing the outbound ids) and alerts
an admin. Card fee (at charge) and payout fee (from the quote) are captured per booking into
`stripe_fee_total`/`stripe_fee_breakdown`, per-currency, so reports reconcile and show the real
absorbed cost. 🔶 End-to-end reconciliation confirmed at the live test.

---

## Can it all be automated and reconciled? — YES, by construction.
Onboarding, currency, bank capture, charge, refund, payout and reconciliation are all automated
and all built. The **only** thing that cannot be pre-proven is the live Stripe money movement
(steps 6–7), because Stripe has NO sandbox for Global Payouts — validated by one small real payout
at go-live. That is a verification gap, not an automation gap.

---

## Kingsman — current setup does NOT work as-is ⚠️

DB state (2026-07-24):

| | Kingsman | Test AUS |
|---|---|---|
| base_country | Australia | Australia |
| default_currency | AUD ✅ | AUD ✅ |
| **payout_rail** | **connect** ⚠️ | **connect** ⚠️ |
| stripe_account_id | acct_1TpKvaG0Wr3Puqti (AU Express) | acct_1TpCHX8twiAEsZs9 (AU Express) |
| stripe_recipient_id | **none** ⚠️ | none |
| recipient_payouts_enabled | false | false |

**Kingsman is on the wrong rail.** It has an AU **Express Connect** account, not a Global Payouts
recipient. Under Path A that account is a dead end: the cron would call `transfers.create` to an AU
Express account and hit `transfers_not_allowed` (verified — AU is outside the platform's region).
So a Kingsman booking would charge the customer fine but **fail at payout**. (Note: this also
corrects two stale handover claims — Kingsman's `stripe_account_id` is NOT null, and its fleet is
NOT inactive; 2 vehicles are active, so it can match and win today.)

**To make Kingsman work (Unit 5 migration):** flip `payout_rail='global_payouts'`, clear the
recipient fields, and have Kingsman re-onboard through the recipient flow — creating a recipient
object and adding their AU bank account via Stripe's hosted page. Only then does
`recipient_payouts_enabled` go true and payouts route correctly. This cannot be done by a DB flag
alone; the partner must complete recipient onboarding.
