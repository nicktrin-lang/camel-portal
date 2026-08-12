# AU/NZ Global Payouts — go-live runbook

**Status at 2026-08-12: the code is DONE and on `main`. Nothing here is a build task.**
What remains is Stripe dashboard setup, one sandbox verification, a data migration, and one
partner re-onboarding. This file is the ordered path; the detail lives in the docs it points to.

| Doc | What it holds |
|---|---|
| `STRIPE_REWRITE_DESIGN.md` | The architecture and every Stripe confirmation, including the resolved MCS/ACP question |
| `AUNZ_PARTNER_JOURNEY.md` | Path A partner flow + Kingsman's current broken state |
| `AUNZ_MIGRATE_PARTNERS.sql` | The rail migration (preview SELECT, then UPDATE) |
| `KINGSMAN_REONBOARD_EMAIL.md` | Ready-to-send re-onboarding email |
| `scripts/verify-global-payouts-sandbox.ts` | Sandbox harness — moves no money |

**Owner key:** 🧑 = Nick only (dashboard/bank/email). 🤖 = Claude can do it.

---

## The one risk worth naming

`lib/portal/stripeGlobalPayouts.ts` **has never run against Stripe.** Every v2 call shape in it was
written from documentation. It is merged, wired in, and typechecks — none of which means Stripe
accepts the request bodies. **Step 2 exists specifically to find that out before real money.**

Reassurance in the meantime: an unverified rail cannot silently mispay anyone. The cron gates on
`stripe_recipient_id && recipient_payouts_enabled`, and no AU/NZ partner has a recipient yet, so
every AU/NZ booking simply stays `ready` and unpaid. Failure mode today is "partner isn't paid
automatically", never "wrong money moves".

---

## Step 1 — Stripe dashboard 🧑

**1a. Enable Multi-Currency Settlement / ACP**
Dashboard → Settings → Connect → **Multi-Currency Settlement**. Self-serve (confirmed by Stripe,
2026-07-29) — no request needed.

> ⚠️ **Verify what it actually gives you.** We need the **platform** to hold a retained **AUD
> balance** that can fund OutboundPayments. Stripe's wording ("for your connected accounts") is
> ambiguous, and per-connected-account settlement is a *different thing* that does not help us —
> our rail pays Global Payouts **recipients**, not connected accounts. If after enabling you can't
> see a platform-level AUD balance, stop and ask Stripe before spending money on step 1b.

**1b. Open the AUD-denominated account**
A **Wise UK business account with a UK sort code + account number, denominated in AUD**.
**Not** an Australian BSB — confirmed correct by Stripe.

**1c. Add AUD (and NZD) as settlement currencies** using that account.

**Why it matters:** with ACP, an AU payout costs **~1–2%**; without it, the money round-trips
AUD→GBP→AUD at **~3–4%**. Camel absorbs this either way, so it's margin, not a blocker. The code
works on both paths — ACP only changes which balance the OutboundPayment draws from.

---

## Step 2 — Sandbox verification 🤖 (needs one thing from you)

Add the sandbox secret key to `~/camel-portal/.env.local`:

```
STRIPE_SANDBOX_SECRET_KEY=sk_test_...
```

(Stripe → sandbox `acct_1TwWcWG5yRPYnAl6` → API keys. Sandbox Global Payouts is already enabled
there — this supersedes the older "live mode only" note.)

Then:

```bash
cd ~/camel-portal && npx tsx scripts/verify-global-payouts-sandbox.ts
```

**Safe by construction:** refuses an `sk_live_` key, and stops at the OutboundPaymentQuote — it
never creates an OutboundPayment, so no money can move.

It exercises, in order: `isGlobalPayoutsCountry` → create recipient → hosted onboarding link →
platform financial account → recipient payout method → quote.

**Reading the result:** the recipient / onboarding-link / financial-account steps must PASS — those
are the "written from docs" call shapes. `getRecipientPayoutMethod` returning `null` and the quote
failing are **expected**, because the sandbox recipient hasn't completed hosted onboarding and the
financial account is unfunded. A 4xx with a *coherent* Stripe error still proves the request shape
was understood; a 404 on the endpoint itself does not.

**If a call shape is wrong, this is where it surfaces — before any partner is involved.**

---

## Step 3 — Migrate the AU/NZ partners onto the rail 🧑 (SQL) / 🤖 (if DB access allowed)

Run `AUNZ_MIGRATE_PARTNERS.sql` — **the preview `SELECT` first**, then the `UPDATE`.

It flips AU/NZ partners to `payout_rail='global_payouts'` and clears the dead-end Express flags so
nothing treats them as payable until they re-onboard. `stripe_account_id` is deliberately left for
audit — the rail decides, not that field.

**Ordering matters:** run this *after* the code is live (it is) and *before* emailing partners.

**Note:** the cron already derives the rail from **country**, not this stored flag, so a stale
`connect` value cannot misroute anyone into a failing transfer. This migration makes the stored
data honest; it is not load-bearing for safety.

---

## Step 4 — Re-onboard Kingsman 🧑

Kingsman is on the **wrong rail**: an AU **Express Connect** account, `payout_rail='connect'`, and
**no `stripe_recipient_id`**. Under Path A that account is a dead end — a transfer to it fails
`transfers_not_allowed`.

Send `KINGSMAN_REONBOARD_EMAIL.md` (drafted, apologises for the re-do, ~2 minutes for them).
They go to Settings → Payouts in the portal, which creates the v2 recipient and returns a
Stripe-hosted onboarding link.

**Done when** their row has a `stripe_recipient_id` **and** `recipient_payouts_enabled = true`.
Until both are true the cron deliberately skips them and leaves bookings `ready`.

---

## Step 5 — First real payout, in this order 🧑

Do **not** let the monthly cron be the first thing that ever moves AU money.

1. **Fund** the platform financial account with a small AUD amount.
2. **Pay Kingsman by hand in the Stripe dashboard** — proves the Stripe side end to end with zero
   code involved. If this fails, the problem is setup, not our code.
3. **Then one small payout through the cron** for a single real booking.
4. **Watch `/api/webhooks/stripe-v2`** reconcile `paying` → `paid`.

**What "working" looks like:** the booking goes `ready` → `paying` at dispatch, then `paid` when
the webhook sees `posted`. `paying` means *dispatched, not delivered* — local settlement takes 1–7
days and can still be returned. If it fails or is returned, the webhook puts it back to `ready`,
clears the outbound ids, and the next monthly run retries. **A booking sitting at `paying` for
days is normal.**

---

## Step 6 — Open AU/NZ properly 🧑

Only after step 5 reconciles to the cent. Then AU/NZ partners can be onboarded normally.

---

## Failure modes, and what each means

| Symptom | Meaning |
|---|---|
| Booking stays `ready`, admin email "no recipient / not payout-ready" | Partner hasn't finished onboarding. Expected before step 4. |
| Admin email "Insufficient AUD balance" | Financial account needs funding (step 5.1). No money moved. |
| Admin email "Recipient has no local bank payout method" | Onboarding incomplete. We deliberately refuse to let Stripe pick a destination we never verified. |
| Admin email **"Global Payout SENT but not recorded"** | **Money moved, DB write failed.** Set the bookings `paid` + `outbound_payment_id` by hand so reports reconcile. The email contains the ids. |
| Booking stuck `paying` > 7 days | Chase the OutboundPayment in the dashboard; the webhook never delivered a terminal status. |

---

## Things that are true and easy to forget

- **Charge, completion and cancellation are identical on both rails.** The *only* AU/NZ difference
  is the month-end payout call. There is no corridor fork in `create-intent`.
- **Commission never rides the Global Payouts rail.** It stays on Camel's balance; with MCS it
  settles AUD-as-AUD with no FX. Only the partner's share converts.
- **Idempotency key is `gp_payout_${partner}_${YYYYMM}_${ccy}_${hash}`** — a re-run over the same
  booking set returns the *same* OutboundPayment. It cannot double-pay.
- **Chargeback debt is reclaimed** from the next payout via `partner_recovery_ledger`, but only when
  the whole debt fits inside that payout.
- **Never sum money or fees across currencies** in any report.
