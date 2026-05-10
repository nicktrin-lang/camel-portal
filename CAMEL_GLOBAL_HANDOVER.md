# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory.
- **Always give Claude the full file tree** at the start of a new chat: `find /c/dev/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.
- **Claude must always write full files** — no partial diffs, no "change X to Y" instructions.
- **Local path is** `C:/dev/camel-portal` (Windows, Git Bash)
- **Two terminals always open:** Terminal 1 = `npm run dev` running, Terminal 2 = git/bash commands

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
- **Repo:** `github.com/nicktrin-lang/camel-portal`
- **Branch:** `main`
- **Local path:** `C:/dev/camel-portal`
- **Deployment:** Vercel (auto-deploys on push to main)
- **Cost target:** Zero / minimal

### How It Works
1. Customer submits a car hire request with pickup/dropoff details
2. All car hire companies (partners) within 30km radius are alerted and can bid
3. Customer accepts a bid → booking is confirmed
4. Driver delivers car to chosen location; fuel level recorded at delivery
5. Fuel level recorded again at collection
6. Customer pays only for fuel used (rounded to nearest ¼ tank)
7. Launching in Spain first, with USD support ready for future US rollout

### Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `/` (root) | End customers |
| Partner | `/partner` | Car hire companies |
| Driver | `/driver` | Delivery drivers |
| Admin | `/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files
| File | Purpose |
|------|---------|
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification (`verifyHCaptcha`) |
| `lib/email.ts` | Resend email sender — `sendEmail()` + all notification helpers |
| `app/components/HCaptcha.tsx` | Reusable hCaptcha React widget (explicit render) |
| `app/components/CookieBanner.tsx` | GDPR cookie consent banner (localStorage) |
| `app/components/Footer.tsx` | Smart footer — 4 variants: Customer, Partner, Admin, Driver |
| `app/components/ChatWidget.tsx` | AI chat widget — floating bubble, streaming, transcript email |
| `app/api/chat/route.ts` | Claude AI chat API — context-aware, streams responses |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to user on end chat |
| `app/api/auth/verify-captcha/route.ts` | POST endpoint — verifies hCaptcha token server-side |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check |
| `app/api/partner/requests/[id]/route.ts` | Returns commissionRate + minimumCommission to bid form |
| `app/api/partner/delete-account/route.ts` | POST — soft deletes partner account (stamps deleted_at) |
| `app/api/contact/route.ts` | POST — contact form handler, Resend email, hCaptcha, rate limited |
| `app/partner/settings/page.tsx` | Partner settings page — delete account flow |
| `app/partner/terms/page.tsx` | Full partner T&Cs — versioned, PDF download, Legal label |
| `app/partner/operating-rules/page.tsx` | Partner Operating Agreement web page + PDF download |
| `app/partner/contact/page.tsx` | Partner contact form |
| `app/partner/privacy/page.tsx` | Privacy policy inside partner layout |
| `app/partner/cookies/page.tsx` | Cookie policy inside partner layout |
| `app/partner/about/page.tsx` | About Us inside partner layout |
| `app/admin/terms/page.tsx` | Partner T&Cs inside admin layout |
| `app/admin/operating-rules/page.tsx` | Operating Agreement inside admin layout |
| `app/admin/contact/page.tsx` | Contact form inside admin layout |
| `app/admin/privacy/page.tsx` | Privacy policy inside admin layout |
| `app/admin/cookies/page.tsx` | Cookie policy inside admin layout |
| `app/admin/about/page.tsx` | About Us inside admin layout |
| `app/admin/outreach/page.tsx` | AI partner outreach UI — prospect table, batch send, map (TODO) |
| `app/api/admin/outreach/prospects/route.ts` | GET all prospects (2-batch for 1916 rows) + POST add prospect |
| `app/api/admin/outreach/prospects/[id]/route.ts` | PATCH update status/notes + DELETE prospect |
| `app/api/admin/outreach/send/route.ts` | POST — Claude generates Spanish email + sends via Resend. GET — daily count |

### API Routes — Customer Booking Engine
All internal API routes stay at `/api/test-booking/*` — do not rename these.
| Route | Purpose |
|-------|---------|
| `app/api/test-booking/requests/route.ts` | Create / list customer requests |
| `app/api/test-booking/requests/[id]/route.ts` | Get single request + bids + booking |
| `app/api/test-booking/bids/accept/route.ts` | Accept a partner bid |
| `app/api/test-booking/bookings/[id]/update/route.ts` | Customer fuel/insurance confirmations |
| `app/api/test-booking/reviews/route.ts` | Submit / fetch reviews |
| `app/api/test-booking/customer-profile/route.ts` | Upsert customer profile (service role) |
| `app/api/test-booking/delete-account/route.ts` | Soft delete customer account |

### Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

### PDF Downloads
- All PDF exports use **jsPDF** — real `.pdf` files, direct download, no print dialog
- Operating Rules PDF: `downloadOperatingRulesPDF()` in `lib/portal/operatingRules.ts`
- Partner T&Cs PDF: `downloadTermsPDF()` in `app/partner/terms/page.tsx`

---

## Footer System

### Four Distinct Footers (`app/components/Footer.tsx`)
| Portal | Footer | All links |
|--------|--------|-----------|
| `/partner/*` | PartnerFooter | `/partner/*` |
| `/admin/*` | AdminFooter | `/admin/*` |
| `/driver/*` | DriverFooter | Driver Login link only |
| Everything else | CustomerFooter | Standard public links |

---

## Commission & Payments Model
- Partner = supplier, issues VAT invoice to customer
- Camel = intermediary, earns 20% commission (min €10 floor), invoices partner
- Fuel charges pass through 100% to partner

---

## Live Status System (7 checks)
1. Fleet base address set
2. Fleet base GPS set
3. Service radius set
4. At least one active fleet vehicle
5. At least one active driver
6. Billing currency set
7. VAT / NIF number set

---

## GDPR — Account Deletion
- Soft delete — stamps `deleted_at`, retains all booking/financial data
- `partner_profiles.deleted_at`, `customer_profiles.deleted_at`

---

## Security
- CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`
- CSP includes: OpenStreetMap tiles (`*.tile.openstreetmap.org`), unpkg (Leaflet), hCaptcha, Supabase, Google Maps, frankfurter
- Rate limiting: 3 req / 15 min per IP
- hCaptcha on all login, signup, forgot password, contact forms

---

## Map System (Leaflet / OpenStreetMap)
- All maps use react-leaflet with SSR disabled
- Pattern: thin shell component (`dynamic(() => import('./Inner'), { ssr: false })`) + inner component with all Leaflet code
- Files: `app/partner/profile/MapPicker.tsx` (shell) + `MapPickerInner.tsx` (full code)
- Marker icons loaded from unpkg — fix applied in all inner files

---

## AI Chat Widget
- Floating orange bubble on partner and admin portals
- Uses Claude Haiku via Anthropic API (streaming)
- Context-aware: loads last 20 bookings + partner profile data per session
- On "End chat": emails full transcript to user via Resend
- Component: `app/components/ChatWidget.tsx`
- API: `app/api/chat/route.ts` + `app/api/chat/transcript/route.ts`

---

## Partner Outreach Agent

### Overview
AI-powered cold email outreach system to contact car hire companies across Spain.
Built entirely without any email marketing platform — uses Claude + Resend only.

### How It Works
1. Admin goes to `/admin/outreach`
2. Clicks "Send Today's Batch (50)" 
3. For each prospect, Claude generates a personalised Spanish email
4. Resend delivers it to the company's inbox
5. Status updates automatically: pending → sent
6. Admin manually updates: sent → replied → onboarded when companies respond

### Database Table: `outreach_prospects`
```sql
id, company_name, contact_name, email, city, country,
status (pending/sent/bounced/replied/onboarded),
notes, sent_at, created_at
```
- **Total prospects loaded:** ~1,700 (after deduplication from original 1,916)
- **Source:** Master_Database_Spain.xlsx — pre-filtered qualified Spanish car hire companies
- **Daily limit:** 50 emails/day (server-enforced) — safe for Resend free tier + spam filters

### Key Details
- **Email language:** Spanish
- **No commission mention in emails** — just get the click, explain on landing page
- **Link in email:** `https://portal.camel-global.com/`
- **Sender:** `partners@camel-global.com` (plan to move to `partners@e.camel-global.com` subdomain — see TODO)
- **Cost:** ~$1 total for all 1,916 emails (Claude Haiku is very cheap)
- **Resend free tier:** 3,000 emails/month — fits entirely within free tier

### Pending Tasks for Outreach (Nick's feedback)
- [ ] **Deduplicate database** — run SQL to remove duplicate emails (keep one per unique email)
  ```sql
  DELETE FROM outreach_prospects
  WHERE id NOT IN (
    SELECT DISTINCT ON (email) id
    FROM outreach_prospects
    ORDER BY email, created_at ASC
  );
  ```
- [ ] **Subdomain sender** — Nick to register `e.camel-global.com` in Resend, add DNS records, update `EMAIL_FROM` in Vercel to `partners@e.camel-global.com` to protect main domain from blacklisting
- [ ] **Add lat/lng columns** to `outreach_prospects` table
- [ ] **Map view** on outreach page — colour-coded by status (pending/sent/replied/onboarded)
- [ ] **Airport priority ordering** — sort batch sends by proximity to key airports: Málaga, Alicante, Valencia, Madrid

### Environment Variables Required
```
ANTHROPIC_API_KEY=sk-ant-...   # Claude API — add to Vercel (Nick has permission)
RESEND_API_KEY=re_...          # Already set
EMAIL_FROM=...                 # Currently partners@camel-global.com
```

### Auth Pattern for Admin API Routes
All outreach API routes use this pattern (NOT `getPortalUserRole` — that only works for partners):
```ts
const authed = await createRouteHandlerSupabaseClient();
const { data: userData } = await authed.auth.getUser();
const email = userData?.user?.email;
const db = createServiceRoleSupabaseClient();
const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
if (!adminRow || !isAllowed(adminRow.role)) return 403;
```

---

## DB Columns Reference
**Chat 8:** `partner_profiles`: legal_company_name, vat_number, company_registration_number, stripe_account_id, stripe_onboarding_status, commission_rate. `partner_bookings`: commission_rate, commission_amount, partner_payout_amount, invoice_period. `platform_settings`: default_commission_rate, minimum_commission_amount.
**Chat 9:** `partner_applications`: terms_accepted_at, terms_version
**Chat 10:** `customer_profiles`: RLS enabled
**Chat 11:** `partner_profiles`: deleted_at. `customer_profiles`: deleted_at
**Chat 14:** `outreach_prospects`: full table created (id, company_name, contact_name, email, city, country, status, notes, sent_at, created_at). lat/lng columns pending.

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-pre-customer-ui
```
**Description:** All portals working, maps fixed (CSP + Leaflet SSR), review email link fixed, login auth redirect working. Safe rollback point before customer UI overhaul.

### All Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-pre-customer-ui` | Safe rollback before customer UI overhaul — everything working |
| `v-stable-footer-policy-pages-complete` | Full footer system, all portal policy pages, customer header fix |
| `v-stable-footer-contact` | Split footers, contact page, operating rules shared lib |
| `v-stable-footer-policy-pages` | Footer, About, Privacy, Cookie Policy, Customer Terms |
| `v-stable-gdpr-delete` | GDPR soft delete, settings pages, cookie banner, RLS audit |
| `v-stable-captcha` | Security headers, cleanup, rate limiting, hCaptcha all forms |
| `v-stable-partner-terms` | Partner T&Cs, versioned acceptance, PDF downloads |
| `v-stable-commission-reporting` | Full commission system, billing details, reporting, Excel exports |
| `v-stable-partner-reviews` | Partner review system, admin moderation, 7-day reminder cron |
| `v-stable-admin-insurance-live-status` | Admin booking detail with insurance and driver audit trail |
| `v-stable-driver-audit-trail` | Driver audit trail — stamped permanently |
| `v-stable-insurance-handover` | Full insurance document handover flow |
| `v-stable-live-status-checks` | 6-check live status system |
| `v-stable-fuel-flow-fixed` | Full fuel confirmation flow |
| `v-stable-admin-booking-fixes` | Admin booking detail matches partner view |
| `v-stable-password-reset` | All three portals password reset |
| `v-stable-currency-reporting` | Full EUR/GBP/USD revenue reporting |

---

## What Is Working ✅
- Customer booking flow (functional at `/test-booking/*` — UI overhaul in progress)
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — 20% default, min €10, per-partner override
- Fuel level recording, charge/refund calculation
- Email notifications + password reset on all three portals
- Google Maps integration
- Live status system — 7 checks
- Partner login → onboarding redirect if incomplete
- Partner login → blocked with amber notice if account deleted
- Partner onboarding — 6 steps including Business & Billing
- Driver portal — independent header, auto-refresh, insurance checkbox
- Insurance handover — all three portals
- Partner review system — ratings, replies, admin moderation, cron reminder
- Review email link — uses correct request_id, auth redirect to login then back
- Business & Billing — onboarding, read-only for partners, editable by admin
- Partner T&Cs — full legal document, versioned acceptance at signup, PDF download
- Partner Operating Rules — web page + PDF download, shared lib
- Real PDF downloads (jsPDF) — no print dialog
- Security headers — CSP includes OpenStreetMap, unpkg, hCaptcha, Supabase, Google Maps
- Rate limiting — 3 req / 15 min per IP
- hCaptcha — all login, forgot password, signup, and contact forms
- Customer profile RLS — policies in place, service role used on signup
- Cookie consent banner — GDPR compliant
- RLS audit — all tables reviewed
- GDPR account deletion — soft delete for partners and customers
- Footer system — 4 portal-aware footers
- Policy pages — Privacy, Cookies, Terms, About, Contact for all three portals
- Maps — Leaflet/OpenStreetMap working on all pages (CSP fixed, SSR fixed)
- AI chat widget — Claude Haiku, streaming, transcript email, draggable bubble
- **Partner outreach agent — 1,916 prospects loaded, Spanish emails, 50/day batch, test email working**

---

## Session Log

### Chat 14 (Completed — AI Partner Outreach Agent)
- Built full outreach system: `/admin/outreach` page + 3 API routes
- Loaded 1,916 Spanish car hire companies from Master_Database_Spain.xlsx
- Claude Haiku generates personalised Spanish email per company
- Sends via Resend — no marketing platform needed
- 50/day server-enforced limit with progress bar
- Test email sent and confirmed working (lands in Promotions tab — normal)
- Fixed auth bug: outreach routes use `admin_users` table check, not `getPortalUserRole`
- Fixed Supabase 1,000 row limit — 2-batch fetch pattern
- Added "Partner Outreach" to admin sidebar nav
- Nick's pending requests: deduplicate emails, subdomain sender, lat/lng + map, airport priority ordering, remove commission from email copy, change link to portal.camel-global.com

### Chat 13 (Completed — Bugs + Customer UI Overhaul)
- Review email link: cron was passing `booking.id` to URL — fixed to pass `booking.request_id`
- Request detail page: added auth guard — unauthenticated users redirected to `/test-booking/login?next=...`
- Login page: added `useSearchParams` + `next=` redirect support, wrapped in `<Suspense>`
- Maps: all Leaflet maps broken due to CSP blocking tile requests — fixed
- Maps: Leaflet SSR crash — split MapPicker into shell + inner
- Customer UI overhaul spec agreed, build starting

### Chats 1–12 (Completed)
- Core booking flow, fuel, drivers, insurance, reviews, currency, password reset, commission, T&Cs, security, GDPR, footer, policy pages

---

## Pre-Launch Build Plan

| # | Task | Est. Time | Status |
|---|------|-----------|--------|
| 1 | Security headers | 30 min | ✅ Done |
| 2 | Code cleanup | 1 hr | ✅ Done |
| 3 | Rate limiting | 1–2 hrs | ✅ Done |
| 4 | CAPTCHA at all sign-in points | 2–3 hrs | ✅ Done |
| 5 | Cookie acceptance banner | 2–3 hrs | ✅ Done |
| 6 | Partner & Admin finance pages | 2–3 hrs | ⏸ Deferred (post-Stripe) |
| 7 | RLS audit | 2–3 hrs | ✅ Done |
| 8 | GDPR data deletion | 3–4 hrs | ✅ Done |
| 9 | Footer + policy pages | 3–4 hrs | ✅ Done |
| 10 | Spanish translation (partner + driver portals, `next-intl`) | 15–20 hrs | ⬜ Todo |
| 11 | Customer booking site full UI overhaul | 15–20 hrs | 🔄 In progress |
| 12 | Stripe Connect integration | 8–10 hrs | ⬜ Deferred |
| 13 | Xero monthly commission endpoint | 3–4 hrs | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | 3–4 hrs | ⬜ Deferred |
| 15 | Outreach agent — dedup + map + airport priority | 3–4 hrs | ⬜ Todo |

---

## TODO Before Go-Live
- [ ] Update company registration number in privacy/terms pages (currently `XXXXXXXX`)
- [ ] Update registered address in privacy/terms pages (currently placeholder)
- [ ] Stripe Connect integration (Phase 2)
- [ ] Spanish translation (Item 10)
- [ ] Customer UI overhaul (Item 11) — in progress
- [ ] Outreach: deduplicate database (SQL above)
- [ ] Outreach: Nick to set up `e.camel-global.com` subdomain in Resend
- [ ] Outreach: Nick to update `ANTHROPIC_API_KEY` in Vercel
- [ ] Outreach: add lat/lng + map view + airport priority ordering

---

## Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CUSTOMER_SUPABASE_URL=
NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY=
CUSTOMER_SUPABASE_SERVICE_ROLE_KEY=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=Camel Global Partners <partners@camel-global.com>
ADMIN_NOTIFY_EMAIL=nick@camel-global.com
PORTAL_BASE_URL=https://portal.camel-global.com

# Admin
NEXT_PUBLIC_CAMEL_ADMIN_EMAILS=nick@camel-global.com,nicktrin@gmail.com
CAMEL_ADMIN_EMAILS=nick@camel-global.com,nicktrin@gmail.com

# AI
ANTHROPIC_API_KEY=sk-ant-...   # Claude API — must be set in Vercel by Nick

# Other
CRON_SECRET=
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
HCAPTCHA_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=https://portal.camel-global.com
```

---

## Useful Commands

```bash
# Push changes
cd /c/dev/camel-portal
git add .
git commit -m "your message"
git push origin main

# Pull latest
git stash
git pull origin main

# Full file tree (Windows)
find /c/dev/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat a file
cat /c/dev/camel-portal/app/admin/outreach/page.tsx

# Create stable tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back
git checkout v-tag-name

# List tags
git tag | grep stable
```

---

*Last updated: Chat 14 — AI partner outreach agent built and tested. 1,916 Spanish car hire prospects loaded. Claude writes personalised Spanish emails, Resend delivers, 50/day limit. Test email confirmed working. Pending: Nick to update Anthropic API key in Vercel, deduplicate DB, subdomain sender, map view, airport priority ordering.*
