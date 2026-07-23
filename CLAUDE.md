# CLAUDE.md — camel-portal

Partner + Admin + Driver portal for **Camel Global** (meet & greet car hire marketplace).
Sister repo: `camel-customer` (customer booking site) at `~/camel-customer`.

Session history and in-flight project plans live in `CAMEL_GLOBAL_HANDOVER.md` in this repo.
**Read it when you need context on what happened recently or what a project's phase plan is** —
do not assume it's loaded. This file is the durable stuff only.

**Money flow:** `STRIPE_REWRITE_DESIGN.md` is the authoritative architecture (the model, the state
machine, the phase plan); `STRIPE_MONEY_FLOW_AUDIT.md` records the 20 findings that caused the
rewrite and is why several rules below are worded as hard prohibitions.
`STRIPE_REWRITE_SCHEMA.sql` is the applied migration. **Read the design doc before touching
charge, refund, or payout code.**

> **Work happens across several surfaces (CLI, desktop app, phone).** Separate sessions share this
> repo, not each other's context — this file and the handover ARE the handoff. Finish a session
> with work committed and these docs true, or the next session starts from a lie. That has already
> happened once: a full charge-model rewrite shipped while this file still described the old one.

---

## Identity

- **Legal entity:** NTUK Ltd, trading as Camel Global. Company no. 08765474.
- **Registered address:** Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
- **Stack:** Next.js 16, Supabase, Vercel, GitHub, Stripe Connect
- **Launched in Spain.** Multi-currency + multi-locale. US is a future market, not built.

### Domains
| Domain | Env |
|---|---|
| `portal.camel-global.com` | Portal production |
| `test-portal.camel-global.com` | Portal staging |

### Portals in this repo
`/partner` (car hire companies) · `/driver` (delivery drivers) · `/admin` (Camel Global staff)

---

## NON-NEGOTIABLE RULES

Break these and you break production. Each one is here because it was broken before.

### 1. Git safety
- A "safe rollback" means **create a tag**. A tag is a bookmark and changes nothing.
- **NEVER `git revert`** a range of commits to "roll back". This once backed out an entire
  session's work (13 revert commits) and required a force-push recovery.
- **NEVER `git reset --hard`, `push --force`, or rewrite history** without explicit confirmation
  from Nick in that message. Not implied consent, not "you said rollback".
- Git being correct does **not** mean production is correct. Vercel can be serving an older
  promoted build. After any history change, check the Vercel **Production badge** points at a
  good commit.
- `camel-coming-soon` is a submodule and **always shows modified**. Ignore it. Never `git add` it.
  Always `git add <specific-file>`, never `git add .`

### 2. `partner_applications.status` is ONLY `pending` / `approved` / `rejected`
- **"Live" is a COMPUTED concept**, never a stored status value. It is the **7 checks** in
  `lib/portal/computeLiveReadiness.ts` (service_radius_km > 0, base_address, base_lat,
  base_lng, active fleet, default_currency, vat_number). This is the single source of truth —
  `refreshPartnerLiveStatus.ts`, both `admin/accounts` routes, the `onboarding-reminder` cron,
  and the customer match loop all mirror it.
- **An active driver is NOT a live check.** It's a fulfilment-time requirement: the partner
  assigns a driver when they process a won booking (`partner_bookings.assigned_driver_id` is
  nullable, filled at delivery/collection). A partner missing only a driver is live and receives
  bids. The partner dashboard checklist still nudges them to add one — it just doesn't gate.
- The `onboarding-reminder` cron (48h) **skips live partners** — only approved-but-not-live
  partners (missing one of the 7 checks) are nagged.
- A partner is matchable when **approved AND live-ready**.
- **Never write `status = 'live'` anywhere.** The enum contains an inert unused `live` label from
  a past incident — leave it, never use it.

### 3. PDFs are always ENGLISH. Emails are localised.
- All PDF documents (receipt, completion statement, commission invoice, invoice data, terms,
  operating rules) stay **English** — NTUK legal requirement.
- All notification emails honour `communication_locale` across **6 locales** (en, es, fr, it, pt,
  de) with **English fallback**. Use `coerceEmailLocale()` from `lib/email.ts`.
- Never write `locale === "es" ? "es" : "en"` — that silently collapses de/fr/it/pt to English.
  This exact pattern was the root cause of a whole class of bugs.
- Fuel level VALUES ("½ Tank") stay English in all locales; only labels/prose localise.
- Internal `[Admin]` notification emails stay English (internal audience).

### 4. Currency: bid-currency, NO FX
- **One currency per partner** = their Stripe account settlement currency, derived from their
  country at Stripe onboarding, written to `partner_profiles.default_currency`, **read-only**
  everywhere in the UI.
- **Bid currency = charge currency = payout currency = settlement currency.** There is no FX on
  the transactional path. The `useCurrency`/rate layer is **browse-display only**, never
  transactional.
- Each bid/booking **snapshots** its currency at creation. History is immutable — changing a
  profile currency never rewrites past rows.
- Supported set defined once in `lib/currency.ts` `CURRENCIES` (EUR, GBP, USD, AUD, NZD, CAD).
  Adding a 7th = add to `CURRENCIES` + `COUNTRY_MAP`/`COUNTRY_CURRENCY` in the connect route +
  `MIN_FLOOR_RATE` + the rate route. Shared helpers mean most consumers pick it up automatically.
- `stripeCountry()` **throws** on an unrecognised country. Do not reintroduce a `|| "ES"` default
  — a connected account's country is locked at creation, and the silent default created
  wrong-country accounts.
- **Never sum money across currencies.** Reporting accumulators are per-currency, built from
  `CURRENCIES`.

### 5. Money model: charge to platform, settle monthly
**Rewritten Jul 2026 (`STRIPE_REWRITE_DESIGN.md`). Destination charges are GONE.** If you read
anything — a comment, an old handover block — describing `transfer_data.destination`,
`on_behalf_of`, `application_fee_amount`, or transfer *reversals*, it is stale. Verify in code.

- **Charge:** a plain PaymentIntent for `car_hire + fuel_deposit` to **Camel's platform balance**,
  in the bid currency. No `transfer_data`, no `on_behalf_of`, no `application_fee`.
  `charge_model='platform_hold'`. Camel is **merchant of record**.
- **Completion:** refund the customer `fuel_deposit − fuel_used` from the platform balance. There
  is **nothing to reverse** — no transfer was ever made. Stamps `settled_partner_net`
  (`car_hire − commission + fuel_used`) and `settled_at`.
- **Month-end:** the cron pays each partner the sum of their `ready` bookings' stored
  `settled_partner_net`, one transfer per partner per currency. Commission stays on the balance.
- **Liability sits with Camel.** Refunds and chargebacks debit the platform balance; we cannot
  easily claw back from a connected account. This was an accepted trade, not an oversight.

**`payout_status` state machine** (mirrored onto `payments`):
`held` (charge succeeded) → `ready` (completed, or <48h-cancelled — owed to partner) → `paid`
(monthly run), plus `cancelled` (>48h cancel, fully refunded, nothing owed). Orthogonal boolean
`payout_hold` — cron skips it. Design also specifies a `paying` claim state — **designed, not
implemented.** Don't assume it exists.

**Cancellations** (`lib/portal/cancelBooking.ts`): >48h → refund `car_hire + fuel_deposit`,
`payout_status='cancelled'`. <48h → refund fuel deposit only, partner keeps car hire,
`payout_status='ready'` with `settled_partner_net = car_hire − commission`. Both statuses are
written to **`partner_bookings` AND `payments`** — writing only `payments` is what previously let
the cron pay a cancelled booking.

**Every money-moving Stripe call carries a deterministic idempotency key:**
`charge_${bid_id}` · `fuelrefund_${booking_id}` · `cancelrefund_${booking_id}` ·
`payout_${partner}_${YYYYMM}_${ccy}_${hash}`. Never add a Stripe money call without one.

**Rails — the ONLY difference is the month-end payout call:**
- **In-corridor** (EUR/GBP/USD/CAD — UK, EEA, US, Canada, Switzerland): `transfers.create` to the
  partner's Express Connect account.
- **AU/NZ are OUT of corridor** (`payout_rail='global_payouts'`): v2 recipient object +
  OutboundPaymentQuote → OutboundPayment. **On `main` the cron skips this rail and leaves the
  booking `ready`** — AU/NZ payouts are manual until P5 lands. Charge, completion and cancellation
  are identical across both rails.

### 6. Invoicing / VAT
- Camel is a **marketplace intermediary**. The **partner** is the supplier and issues VAT
  invoices to customers.
- Booking receipt is **NOT** a VAT invoice — it carries a Platform Payment Notice.
- Commission invoice: monthly, to the partner, **English only** (NTUK legal).
- Invoice Data PDF: a data sheet so the partner can raise their own invoice.
- Documented in partner terms clause 9, operating rules section 9b, customer terms clause 10b.

### 7. Commission — computed ONCE, then read
`Math.max((car_hire_price * commission_rate) / 100, 10)` — 20%, minimum €10 floor (stored EUR,
converted to bid currency via `MIN_FLOOR_RATE` in the customer repo's create-intent).

`lib/portal/calculateCommission.ts` is the **only** place this is computed. It is snapshotted to
`partner_bookings.commission_amount` at charge time, and the payout cron, commission invoice,
monthly statement and every report **read the stored value**. There were once three divergent
recomputations that disagreed on non-EUR hires — do not reintroduce one. Same rule for
`settled_partner_net` and `stripe_fee_total`: **stored, never recomputed in a report.**

### 7b. Camel absorbs all Stripe fees
Card processing fee (captured at the webhook from the charge's balance transaction) and AU/NZ
payout fees both land on `partner_bookings.stripe_fee_total` + `stripe_fee_breakdown` (jsonb,
includes currency). Reports show "Stripe fees (absorbed)" and net margin = commission − fees.
**Never sum fees across currencies.**

### 8. Database
- One Supabase project. `lib/supabase/server.ts` exports `createRouteHandlerSupabaseClient()` and
  `createServiceRoleSupabaseClient()`.
- **Never use `db.auth.admin.listUsers()` from portal code to find customers.** Look up
  `customer_profiles` by `user_id`.
- Partner contact email lives on `partner_applications.email`, **not** `partner_profiles`.
- Widening a UI enum (e.g. adding locales) needs a matching **DB CHECK constraint** change.
  This has bitten twice.

### 9. Security invariants
- Identity comes from the **verified JWT only**.
- Partner API scopes with `.eq("partner_user_id", userId)` unless adminMode → 404 on mismatch.
- Never weaken ownership scoping.

---

## Architecture map

Only the files you'll actually need. Read the file before changing it — do not trust this table
or any code comment as current.

### Core libs
| File | Purpose |
|---|---|
| `lib/currency.ts` | Single source of truth for currencies. Exports `CURRENCIES`, `currencyLocale()`, `currencySymbol()`, `coerceCurrency()`, `isCurrency()`, `formatMoney()` |
| `lib/email.ts` | Resend sender + all notification helpers. Exports `EmailLocale`, `coerceEmailLocale()`. **Large file — never replace with a partial.** Restore: `git show <commit>:lib/email.ts > lib/email.ts` |
| `lib/portal/computeLiveReadiness.ts` | The **7** live-readiness checks — source of truth. Computed, never stored as status. An active driver is deliberately NOT one of them |
| `lib/portal/refreshPartnerLiveStatus.ts` | Wrapper that recomputes and persists the readiness flags. Mirrors `computeLiveReadiness.ts` — do not let the two drift |
| `lib/portal/completeBooking.tsx` | Completion: customer fuel refund from the platform balance (**no transfer reversal — nothing was transferred**), stamps `settled_partner_net`/`settled_at`, `payout_status=ready`, emails all parties with PDF. Idempotency `fuelrefund_${booking_id}`; re-entry guarded on `payout_status`. Logo read from disk via `fs.readFileSync` |
| `lib/portal/cancelBooking.ts` | >48h full refund vs <48h fuel-only. Writes `payout_status` to **both** `partner_bookings` and `payments` |
| `lib/portal/stripeGlobalPayouts.ts` | AU/NZ v2 Money Management: recipient onboarding + OutboundPaymentQuote/OutboundPayment. **Written from docs, not yet verified against Stripe** |
| `lib/portal/generateMonthlyStatementPDF.tsx` | Monthly partner statement PDF (English), emitted by the payout cron |
| `lib/portal/calculateCommission.ts` | 20%, min €10 floor — the single commission computation |
| `lib/portal/partnerTerms.ts` | Partner T&Cs, version 2026-06d. Clause 7 chargeback, clause 9 VAT/invoicing |
| `lib/portal/operatingRules.ts` | Operating rules + `downloadOperatingRulesPDF()`. Section 9b invoicing |
| `lib/i18n/useTranslation.ts` | `t()` hook — dot-notation keys, `{{var}}` interpolation, English fallback |

### Key routes
| Route | Notes |
|---|---|
| `app/api/partner/stripe/connect/route.ts` | `stripeCountry()` + settlement currency. Throws on unknown country. Writes `default_currency` back — Stripe is source of truth |
| `app/api/partner/bids/route.ts` | Bid submission; uses `coerceCurrency()` |
| `app/api/admin/applications/make-live/route.ts` | Stamps `live_email_sent_at` (email de-dup). Does NOT write status |
| `app/cron/monthly-payout/route.ts` | Pays `payout_status='ready' AND payout_hold=false` from stored `settled_partner_net`, one idempotency-keyed `transfers.create` per partner per currency, then emits the commission invoice + monthly statement. Skips the `global_payouts` rail (leaves it `ready`) |
| `app/api/admin/outreach/webhook/route.ts` | Resend webhook, svix-verified |

### Cron jobs
| Schedule | Route |
|---|---|
| `0 8 1 * *` | `/api/cron/monthly-payout` |
| `0 10 * * *` | `/api/cron/review-reminder` |
| `0 9 * * *` | `/api/cron/onboarding-reminder` (48h approval resend) |

---

## i18n

Six locales: **en, es, fr, it, pt, de**. Flat key-value JSON, **NOT nested**. All files same key
count. English fallback for any missing key. Browser auto-detects from `navigator.languages`.

Language switchers exist in **many** places — changing the locale set means updating all of them:
`lib/i18n/LanguageToggle.tsx`, `app/components/portal/PortalSidebar.tsx`,
`app/components/partner/PartnerSidebar.tsx`, `app/driver/layout.tsx` (both the
CompactLanguageToggle **and** the mobile dropdown), `app/HomePageContent.tsx`,
`app/partner/signup/page.tsx`, `app/partner/settings/page.tsx`,
`app/api/admin/outreach/send/route.ts` (`getLocale()`), and `lib/email.ts`.

**`app/marketing/translations.ts` is a self-contained i18n island** with its own `Lang` type and
`<option>` list — separate from `useTranslation`. Adding a language needs both.

**Mobile switcher pattern:** desktop inline switcher wrapped in `hidden lg:*`, mobile hamburger
whose dropdown holds a six-box LANGUAGE row. `LanguageToggle.tsx` has **no** `hidden lg:flex` of
its own — it renders at all breakpoints, so wrap it or you get a double-up.

**When validating machine translation: assert the output DIFFERS from the English source.** A
past run validated only JSON shape and silently left every section heading in English.

---

## Working agreement

*(This block is intentionally duplicated in `camel-customer/CLAUDE.md` — keep them in sync.)*

- **Read the actual file before changing it.** Never trust a comment, an old artifact, or this
  document as current. Multiple stale comments have caused real bugs.
- **`npx tsc --noEmit` after every change.** Widening a shared type surfaces every hardcoded
  consumer — use tsc as the checklist. Cross-file changes may need both files applied before tsc
  passes; apply the pair, then run tsc once.
- **Commit per logical unit** with a descriptive message. Never batch unrelated changes.
- **Deploy and verify per unit**, not at the end. Disk-correct is not deployed — check
  `git show HEAD:<file>` and/or the live DOM when a fix "isn't taking".
- Adding a column to a table is not enough: **add it to the `.select()` of every route that feeds
  a page**. This has been missed three separate times.
- A form sending a field does not mean it's saved — the route must parse it from the body **and**
  include it in the insert.
- When editing large files, back up first and assert the anchor matched before writing. Abort on
  mismatch, never silently no-op.
- `.bak` files are gitignored. Sweep them when convenient.
- Branch protection: `main` requires PRs; pushes have used admin bypass.
- Git shows a "committer name/email not configured" notice — harmless.

### Deploy
```bash
cd ~/camel-portal && git add <file> && git commit -m "message" && git push origin main
```

### Tag a stable point
```bash
git tag -a v-stable-chatNN -m "description" && git push origin v-stable-chatNN
```

---

## Known traps

- **zsh globs `[id]` paths.** Always single-quote paths containing brackets:
  `git add 'app/partner/bookings/[id]/page.tsx'`
- Never paste a line starting with `#` into zsh — it errors and can eat the next command.
- macOS `~/Downloads` xattrs can make `cp`/`cat <` fail with "Operation not permitted", and
  `cat src > dest` **truncates dest even when the read fails**.
- Map wrappers need `style={{ zIndex: 0, position: "relative" }}` or the map overlaps the header
  (`app/partner/profile/MapPickerInner.tsx`, `app/admin/approvals/PartnersMap.tsx`).
- `RESEND_WEBHOOK_SECRET` must include the `whsec_` prefix, no quotes, no trailing newline —
  otherwise svix throws and every event 401s silently. Env changes need a redeploy.
- `app/components/partner/PartnerSidebar.tsx` is unused; the layout uses `PortalSidebar`.
- `ChatWidget.tsx` and `Footer.tsx` exist in both repos but are **NOT identical**. Update
  separately.
