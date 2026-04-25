# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory.
- **Always give Claude the full file tree** at the start of a new chat: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.
- **Claude must always write full files** — no partial diffs, no "change X to Y" instructions.

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
- **Repo:** `github.com/nicktrin-lang/camel-portal`
- **Branch:** `main`
- **Local path:** `~/camel-portal`
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
| `app/components/HCaptcha.tsx` | Reusable hCaptcha React widget (explicit render) |
| `app/components/CookieBanner.tsx` | GDPR cookie consent banner (localStorage) |
| `app/components/Footer.tsx` | Smart footer — 4 variants: Customer, Partner, Admin, Driver — all black theme |
| `app/components/portal/PortalTopbar.tsx` | Partner/admin header — black, h-[76px], inverted logo, Book Now + Logout |
| `app/components/portal/PortalSidebar.tsx` | Partner/admin sidebar — black, orange active state, square nav items |
| `app/ClientRootLayout.tsx` | Root layout — controls global header, footer, cookie banner visibility |
| `app/api/auth/verify-captcha/route.ts` | POST endpoint — verifies hCaptcha token server-side |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check |
| `app/api/partner/requests/[id]/route.ts` | Returns commissionRate + minimumCommission to bid form |
| `app/api/partner/delete-account/route.ts` | POST — soft deletes partner account (stamps deleted_at) |
| `app/api/test-booking/customer-profile/route.ts` | Service role upsert for customer profiles (bypasses RLS) |
| `app/api/test-booking/delete-account/route.ts` | POST — soft deletes customer account (stamps deleted_at) |
| `app/api/contact/route.ts` | POST — contact form handler, Resend email, hCaptcha, rate limited, subject-based routing |
| `app/partner/login/page.tsx` | Partner login — black/orange/grey theme, Book Now + Become a Partner in header |
| `app/partner/signup/page.tsx` | Partner signup — 5-step flow, black/orange/grey theme |
| `app/partner/layout.tsx` | Partner layout — auth guard, info pages public without redirect |
| `app/partner/settings/page.tsx` | Partner settings page — delete account flow |
| `app/partner/terms/page.tsx` | Partner T&Cs — black hero, max-w-3xl, rebranded, PDF download |
| `app/partner/operating-rules/page.tsx` | Partner Operating Agreement — black hero, max-w-3xl, rebranded |
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
| `app/test-booking/settings/page.tsx` | Customer settings page — delete account flow (legacy, keep) |

### API Routes — Customer Booking Engine
All internal API routes stay at `/api/test-booking/*` — do not rename these.
| Route | Purpose |
|-------|---------|
| `app/api/test-booking/requests/route.ts` | Create / list customer requests — includes sport_equipment |
| `app/api/test-booking/requests/[id]/route.ts` | Get single request + bids + booking |
| `app/api/test-booking/bids/accept/route.ts` | Accept a partner bid |
| `app/api/test-booking/bookings/[id]/update/route.ts` | Customer fuel/insurance confirmations — syncs customer_requests.status |
| `app/api/test-booking/reviews/route.ts` | Submit / fetch reviews |
| `app/api/test-booking/customer-profile/route.ts` | Upsert customer profile (service role) |
| `app/api/test-booking/delete-account/route.ts` | Soft delete customer account |

### Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

### Contact Form Email Routing
| Subject | Routes to |
|---------|-----------|
| General enquiry | `contact@camel-global.com` |
| Booking question | `contact@camel-global.com` |
| Partnership / become a partner | `partners@camel-global.com` |
| Press or media | `press@camel-global.com` |
| Technical issue | `contact@camel-global.com` |
| Other | `contact@camel-global.com` |
- From address: `Camel Global <noreply@camel-global.com>` (hardcoded in contact route, independent of EMAIL_FROM env var)
- `press@` and `contact@` mailboxes need to be created in email provider

### PDF Downloads
- All PDF exports use **jsPDF** — real `.pdf` files, direct download, no print dialog
- Operating Rules PDF: `downloadOperatingRulesPDF()` in `lib/portal/operatingRules.ts`
- Partner T&Cs PDF: `downloadTermsPDF()` in `app/partner/terms/page.tsx`

---

## Branding System

### Customer Site — Black / Grey / White / Orange
- **Colours:** Black `#000000`, Orange `#ff7a00`, Grey `#f0f0f0`, White
- **No blue anywhere on customer site**
- **Navbar:** Full-width black, `h-[76px]`, logo `h-16 brightness-0 invert`, square buttons
- **Hero sections:** Black band `py-16`, orange label, white `font-black` heading
- **Form areas:** `bg-[#f0f0f0]` with white cards, square edges (no rounded corners)
- **Inputs:** `bg-[#f0f0f0]`, labels `text-xs font-black uppercase tracking-widest`
- **Buttons:** Square, orange `bg-[#ff7a00]`, `font-black`
- **Footer:** Black, "Ready to book?" CTA at top

### Partner / Admin / Driver Portals — Same Black Theme
- **Header (`PortalTopbar`):** Black, `h-[76px]`, same logo as customer (`brightness-0 invert`), orange "Book Now", square "Logout"
- **Sidebar (`PortalSidebar`):** Black background, white/10 border, orange active nav item, square items
- **Footer:** Black background (matches customer), white text, orange hover — NOT blue gradient
- **Partner info pages** (`/partner/terms`, `/partner/operating-rules` etc.): black hero band, `max-w-3xl` centred content, publicly accessible without login
- **No blue (`#003768`), no rounded corners, no shadows** anywhere in portal UI

### Footer Routing (`app/components/Footer.tsx`)
| Path | Footer shown |
|------|-------------|
| `/admin/*` | PortalFooter variant="admin" — black, admin legal links |
| `/driver/*` | PortalFooter variant="driver" — black, minimal |
| `/partner/*` | PortalFooter variant="partner" — black, partner links |
| Everything else | CustomerFooter — black, "Ready to book?" CTA |

### Partner Info Pages — Public Access
These pages are in the partner layout but accessible without login (no redirect to login):
`/partner/terms`, `/partner/operating-rules`, `/partner/contact`, `/partner/privacy`, `/partner/cookies`, `/partner/about`
- Unauthenticated users see: PortalTopbar + content + Footer (no sidebar)
- Authenticated partners see: full layout with sidebar
- `ClientRootLayout` excludes these from `isPortalAppPage` so global footer renders

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
- `app/components/CustomerMap.tsx` + `CustomerMapWrapper.tsx` (already ssr:false wrapped)
- Marker icons loaded from unpkg — fix applied in all inner files

---

## Customer Site — Full Spec

### URL Structure
| Page | URL |
|------|-----|
| Homepage + booking widget | `/` |
| Create booking | `/book` |
| My bookings dashboard | `/bookings` |
| Booking detail | `/bookings/[id]` |
| Login | `/login` |
| Sign up | `/signup` |
| Reset password | `/reset-password` |
| Account / profile | `/account` |

### Booking Flow — Guest to Confirmed
1. Homepage widget → saves draft to `sessionStorage` as `camel_booking_draft` → `/book`
2. `/book` pre-fills from sessionStorage, adds map picker + notes + duration
3. On submit — auth check:
   - **Logged in** → submits booking immediately
   - **Not logged in** → saves draft to sessionStorage → `/login?next=/book`
4. From login page — "Create an account" link passes `?next=/book` through to `/signup?next=/book`
5. After signup — reads draft from sessionStorage, submits booking directly (no redirect to `/book`), goes straight to `/bookings/[id]`
6. After login — redirects to `/book` which auto-submits draft via `onAuthStateChange` listener

### My Bookings (`/bookings`)
- Clickable tab filters: Active / Completed / All — selected tab goes black

### Booking Detail (`/bookings/[id]`)
- Black hero with booking number (no currency badge — shown in booking details card)
- Insurance/fuel confirm cards — all text fully white on black backgrounds
- Booking Summary card — shows on completion with live frankfurter rates

### Status Sync
- `app/api/test-booking/bookings/[id]/update/route.ts` syncs `customer_requests.status` on booking completion

### DB Columns
- `customer_requests.sport_equipment` — added via SQL

---

## DB Columns Reference
**Chat 8:** `partner_profiles`: legal_company_name, vat_number, company_registration_number, stripe_account_id, stripe_onboarding_status, commission_rate. `partner_bookings`: commission_rate, commission_amount, partner_payout_amount, invoice_period. `platform_settings`: default_commission_rate, minimum_commission_amount.
**Chat 9:** `partner_applications`: terms_accepted_at, terms_version
**Chat 10:** `customer_profiles`: RLS enabled
**Chat 11:** `partner_profiles`: deleted_at. `customer_profiles`: deleted_at
**Chat 14:** `customer_requests`: sport_equipment (text, nullable)

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-partner-branding
```

### All Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-partner-branding` | Full portal rebrand — black/orange/grey theme across partner/admin/driver header, sidebar, footer, login, signup, terms, operating rules |
| `v-stable-guest-booking-flow` | Guest booking flow — draft persists through login/signup, auto-submits after account creation |
| `v-stable-pre-customer-ui` | Safe rollback before customer UI overhaul |
| `v-stable-footer-policy-pages-complete` | Full footer system, all portal policy pages |
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
- Customer booking flow at `/book`, `/bookings`, `/bookings/[id]`
- Guest booking flow — draft survives login/signup, booking auto-submitted after account creation
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
- Partner T&Cs — full legal document, versioned acceptance at signup, PDF download
- Partner Operating Rules — web page + PDF download, shared lib
- Real PDF downloads (jsPDF) — no print dialog
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- **Portal branding — black/orange/grey theme across all portals:**
  - `PortalTopbar`: black, `h-[76px]`, inverted logo matches customer, Book Now + Logout
  - `PortalSidebar`: black, orange active state, square items
  - Footer: black across all portals (no more blue gradient)
  - Partner login: rebranded, black hero, square inputs
  - Partner signup: rebranded, black hero, square 5-step form
  - Partner terms + operating rules: black hero, `max-w-3xl` centred, publicly accessible
  - Partner info pages viewable without auth (topbar shown, no redirect to login)
  - Footer links all resolve correctly — no auth redirects
  - Customer signup page widened to `max-w-lg`

---

## Session Log

### Chat 16 (Completed)

**Portal rebrand — black/orange/grey theme**
- `PortalTopbar`: black `h-[76px]`, customer-identical inverted logo, orange Book Now, square Logout
- `PortalSidebar`: black background, orange active nav, square items (was blue gradient + rounded)
- `Footer.tsx`: all portal footers now black (was blue gradient). Single `PortalFooter` component with `variant` prop
- `partner/layout.tsx`: info pages accessible without auth, unauthenticated users get topbar+footer but no sidebar. Header offset updated to `76px`
- `ClientRootLayout.tsx`: `isPartnerInfoPage` excluded from `isPortalAppPage` so footer renders on public info pages
- `partner/login/page.tsx`: full rebrand — black hero, square inputs, Book Now + Become a Partner in header
- `partner/signup/page.tsx`: full rebrand — black header, black hero, square 5-step form
- `partner/terms/page.tsx`: full rebrand — black hero band, `max-w-3xl` centred, square cards
- `partner/operating-rules/page.tsx`: full rebrand — black hero band, `max-w-3xl` centred
- Customer signup page: widened from `max-w-md` to `max-w-lg`
- Footer links fixed: all resolve to public pages, no auth redirects

### Chat 15 (Completed)
- Booking detail fixes (currency badge removed from hero, white text on black in insurance/fuel cards)
- Guest booking flow fixed end-to-end: `?next=` param passed through login→signup link, booking draft submitted directly from signup, `onAuthStateChange` fallback on `/book`

### Chats 1–14 (Completed)
- Core booking flow, fuel, drivers, insurance, reviews, currency, password reset, commission, T&Cs, security, GDPR, footer, policy pages, maps, full customer UI overhaul

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
| 11 | Customer booking site full UI overhaul | 15–20 hrs | ✅ Done |
| 11b | Partner/admin/driver portal rebrand | 8–10 hrs | ✅ Done |
| 12 | Stripe Connect integration | 8–10 hrs | ⬜ Deferred |
| 13 | Xero monthly commission endpoint | 3–4 hrs | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | 3–4 hrs | ⬜ Deferred |

---

## TODO Before Go-Live
- [ ] Update company registration number in privacy/terms pages (currently `XXXXXXXX`)
- [ ] Update registered address in privacy/terms pages (currently placeholder)
- [ ] Create `contact@camel-global.com` mailbox in email provider
- [ ] Create `press@camel-global.com` mailbox in email provider
- [ ] Continue portal rebrand: partner dashboard, bookings, requests, profile, onboarding pages
- [ ] Driver portal rebrand (login, jobs page)
- [ ] Stripe Connect integration (Phase 2)
- [ ] Spanish translation (Item 10)

---

## Environment
- `.env.local` — Supabase keys, Google Maps API key, Resend, CRON_SECRET, hCaptcha keys
- `EMAIL_FROM=Camel Global Partners <partners@camel-global.com>` — used for partner portal emails
- Contact form emails use hardcoded `Camel Global <noreply@camel-global.com>` — independent of EMAIL_FROM
- Never commit `.env.local`
- Vercel env vars set separately in Vercel dashboard

---

## Useful Commands

```bash
# Push changes
git add .
git commit -m "your message"
git push origin main

# Full file tree
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat a file
cat ~/camel-portal/app/admin/accounts/\[id\]/page.tsx

# Create stable tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back
git checkout v-tag-name

# List tags
git tag | grep stable
```

---

*Last updated: Chat 16 — Full portal rebrand to black/orange/grey: PortalTopbar, PortalSidebar, Footer, partner login, partner signup, partner terms, partner operating rules. Info pages publicly accessible. Customer signup widened.*