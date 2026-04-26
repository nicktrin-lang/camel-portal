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

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
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

### Vercel Projects
| Project | Repo | Domains |
|---------|------|---------|
| `camel-portal-live` | `nicktrin-lang/camel-portal` | `portal.camel-global.com`, `test-portal.camel-global.com` |
| `camel-customer-live` | `nicktrin-lang/camel-customer` | `camel-global.com`, `www.camel-global.com`, `test.camel-global.com` |

### Deploy Commands
```bash
# Portal
cd ~/camel-portal
git add .
git commit -m "message"
git push origin main
# Auto-deploys to portal.camel-global.com + test-portal.camel-global.com

# Customer
cd ~/camel-customer
git add .
git commit -m "message"
git push origin main
# Auto-deploys to camel-global.com + test.camel-global.com
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
| `lib/supabase/server.ts` | Supabase server client |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `app/components/HCaptcha.tsx` | Reusable hCaptcha React widget |
| `app/components/Footer.tsx` | Portal footer — black theme, partner/admin/driver variants, exported as PortalFooter |
| `app/components/portal/PortalTopbar.tsx` | Partner/admin header — black, h-[76px], inverted logo |
| `app/components/portal/PortalSidebar.tsx` | Partner/admin sidebar — black, orange active state |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) — uses createClient with hardcoded fallback |
| `lib/supabase-customer/server.ts` | Supabase server client (customers) — hardcoded fallback URL |
| `lib/supabase/server.ts` | Also present — used by test-booking API routes |
| `lib/supabase/auth-client.ts` | Auth client — used by reset-password pages, hardcoded fallback |
| `lib/portal/calculateFuelCharge.ts` | Copied — used by customer booking API |
| `lib/portal/syncBookingStatuses.ts` | Copied — used by customer booking API |
| `lib/currency.ts` | Currency utilities |
| `lib/useCurrency.ts` | Currency hook |
| `lib/rateLimit.ts` | Rate limiter |
| `lib/hcaptcha.ts` | hCaptcha verification |
| `app/components/portal/fleetCategories.tsx` | Copied — used by customer booking pages |
| `app/partner/profile/MapPicker.tsx` | Copied — used by customer /book page |
| `app/partner/profile/MapPickerInner.tsx` | Copied — inner map component |
| `app/components/Footer.tsx` | Customer footer — black, "Ready to book?" CTA |
| `app/components/CookieBanner.tsx` | GDPR cookie consent banner |
| `app/components/CustomerMap.tsx` | Customer map component |
| `app/components/HCaptcha.tsx` | hCaptcha widget |

### API Routes — Customer Booking Engine
All internal API routes stay at `/api/test-booking/*` — do not rename these.

### Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

---

## Supabase Projects
| Project | URL | Used by |
|---------|-----|---------|
| `camel-global` | `https://guhcavvpuveiovspzxmg.supabase.co` | Portal + Customer (both) |
| `camel-customers` | `https://hkolxykbjtrzwiwkwpzv.supabase.co` | Legacy — no longer used |

**IMPORTANT:** Both the portal and customer site now use the same Supabase project (`guhcavvpuveiovspzxmg`). The `camel-customers` project is legacy and unused. All customer env vars point to the same project as the portal.

---

## Branding System

### Customer Site — Black / Grey / White / Orange
- **Colours:** Black `#000000`, Orange `#ff7a00`, Grey `#f0f0f0`, White
- **No blue anywhere**
- **Navbar:** Full-width black, `h-[76px]`, logo `h-16 brightness-0 invert`, square buttons
- **Hero sections:** Black band `py-16`, orange label, white `font-black` heading
- **Form areas:** `bg-[#f0f0f0]` with white cards, square edges (no rounded corners)
- **Inputs:** `bg-[#f0f0f0]`, labels `text-xs font-black uppercase tracking-widest`
- **Buttons:** Square, orange `bg-[#ff7a00]`, `font-black`
- **Footer:** Black, "Ready to book?" CTA at top

### Partner / Admin / Driver Portals — Same Black Theme
- **Pre-auth headers** (login, signup, portal homepage): Black, `max-w-7xl`, `px-4 py-2.5`, logo `h-16` — matches customer site exactly
- **Authenticated headers:** Black, `h-[76px]`, inverted logo, no "Book Now" button
- **Sidebar (`PortalSidebar`):** Black background, white/10 border, orange active nav item
- **Footer:** Black background, white text — only shown when authenticated, never on pre-auth pages
- **No blue (`#003768`), no rounded corners, no shadows** anywhere in portal UI
- **Portal homepage** (`portal.camel-global.com`): Black hero, "Partner Portal" heading, Partner Login + Become a Partner + Driver login CTAs, minimal copyright bar only (no footer)

---

## Google Analytics

| Domain | GA ID | Property |
|--------|-------|---------|
| `camel-global.com` / `www.camel-global.com` | `G-1Y758X38G4` | Camel site (production) |
| `test.camel-global.com` | `G-G90QB28J12` | Camel Customer Test Site |
| `portal.camel-global.com` / `test-portal.camel-global.com` | `G-YCZMDQJDM7` | Camel Portal Site |

GA scripts injected server-side in each repo's `app/layout.tsx` using raw `<script>` tags in `<head>`.

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
- CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy in `next.config.ts` (both repos)
- CSP includes: googletagmanager, google-analytics, OpenStreetMap, unpkg, hCaptcha, Supabase, Google Maps, frankfurter
- Rate limiting: 3 req / 15 min per IP
- hCaptcha on all login, signup, forgot password, contact forms
- **Portal and customer site are fully separated** — different repos, different Vercel projects, different origins

---

## Environment Variables

### Portal (`camel-portal-live`)
```
NEXT_PUBLIC_SUPABASE_URL          → https://guhcavvpuveiovspzxmg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
CRON_SECRET
CAMEL_ADMIN_EMAILS
PORTAL_BASE_URL
NEXT_PUBLIC_SITE_URL              → https://portal.camel-global.com
```

### Customer (`camel-customer-live`)
```
NEXT_PUBLIC_CUSTOMER_SUPABASE_URL      → https://guhcavvpuveiovspzxmg.supabase.co (same as portal)
NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY → same anon key as portal
CUSTOMER_SUPABASE_SERVICE_ROLE_KEY     → same service role key as portal
NEXT_PUBLIC_SUPABASE_URL               → https://guhcavvpuveiovspzxmg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY          → same anon key as portal
SUPABASE_SERVICE_ROLE_KEY              → same service role key as portal
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL                   → https://camel-global.com
```

**Note:** Customer site needs both sets of vars because `lib/supabase/server.ts` (used by API routes) reads the non-prefixed vars, while `lib/supabase-customer/` reads the CUSTOMER_ prefixed vars. Both point to the same Supabase project.

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-repo-split` | Stable after repo split — portal only, all 4 domains live |
| `v-stable-partner-branding` | Full portal rebrand — black/orange/grey theme |
| `v-stable-chat18` | Chat 18 — header standardisation, footer fixes, Supabase env fix |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-repo-split` | Stable after repo split — customer only, all 4 domains live |
| `v-stable-chat18` | Chat 18 — Supabase env fixed, bookings working, browser client fixed |

### Rollback
```bash
# Portal
cd ~/camel-portal
git checkout v-stable-chat18

# Customer
cd ~/camel-customer
git checkout v-stable-chat18
```

---

## What Is Working ✅
- Customer booking flow at `/book`, `/bookings`, `/bookings/[id]`
- Guest booking flow — draft survives login/signup
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — 20% default, min €10
- Fuel level recording, charge/refund calculation
- Email notifications + password reset on all portals
- Live status system — 7 checks
- Partner onboarding — 6 steps
- Driver portal — independent header, auto-refresh
- Insurance handover — all three portals
- Partner review system — ratings, replies, admin moderation
- Partner T&Cs — full legal document, versioned acceptance, PDF download
- Partner Operating Rules — web page + PDF download
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- **Full portal rebrand — black/orange/grey, square UI, no blue anywhere**
- **Repo split complete — customer and portal fully separated**
- **4 domains live and correctly routed**
- **Google Analytics working on all 4 domains**
- **New portal homepage at portal.camel-global.com**
- **Customer bookings page working — 73 bookings visible**
- **All Supabase env vars correctly set in both Vercel projects**
- **Standardised headers across all pre-auth pages**

---

## Session Log

### Chat 18 (Completed)
**Header standardisation, footer fixes, Supabase env fix**
- Portal homepage: tightened spacing, removed full footer, minimal copyright bar only, driver login link added
- Fixed double footer bug — `ClientRootLayout` no longer renders footer, each layout manages its own
- Removed footer from all pre-auth pages (partner login, signup, driver login, driver layout)
- Standardised all pre-auth headers to match customer site: `h-16` logo, `px-4 py-2.5`, `max-w-7xl`
- Removed "Book Now" from partner login, signup and driver pre-auth headers
- `PortalFooter` exported from `Footer.tsx` for use on authenticated pages only
- Fixed customer site Supabase env vars — both `CUSTOMER_` and non-prefixed vars now set in Vercel
- Fixed `lib/supabase-customer/browser.ts` to use `createClient` (not `createBrowserClient`) with hardcoded fallbacks
- Fixed `lib/supabase-customer/server.ts` and `lib/supabase/auth-client.ts` with hardcoded fallbacks
- Customer bookings restored — 73 bookings reassigned to correct user ID via SQL update
- Local `camel-customer/.env.local` corrected to point at portal Supabase project
- Stable tag `v-stable-chat18` created on both repos

### Chat 17 (Completed)
**Repo split — customer site separated from portal**
- Split `camel-portal` into two repos: `camel-portal` (portal) + `camel-customer` (customer)
- Two Vercel projects: `camel-portal-live` + `camel-customer-live`
- 4 domains correctly routed
- GA tracking per domain correctly configured
- New portal homepage built
- Admin portal rebrand completed
- Stable tag `v-stable-repo-split` created on both repos

### Chat 16 (Completed)
**Portal rebrand — black/orange/grey theme**
- PortalTopbar, PortalSidebar, Footer, partner login, signup, terms, operating rules rebranded
- All partner, admin, driver pages rebranded
- Double footer bug fixed, ClientRootLayout simplified

### Chats 1–15 (Completed)
- Core booking flow, fuel, drivers, insurance, reviews, currency, password reset, commission, T&Cs, security, GDPR, footer, policy pages, maps, full customer UI overhaul, guest booking flow

---

## Pre-Launch Build Plan

| # | Task | Status |
|---|------|--------|
| 1 | Security headers | ✅ Done |
| 2 | Code cleanup | ✅ Done |
| 3 | Rate limiting | ✅ Done |
| 4 | CAPTCHA at all sign-in points | ✅ Done |
| 5 | Cookie acceptance banner | ✅ Done |
| 6 | Partner & Admin finance pages | ⏸ Deferred (post-Stripe) |
| 7 | RLS audit | ✅ Done |
| 8 | GDPR data deletion | ✅ Done |
| 9 | Footer + policy pages | ✅ Done |
| 10 | Spanish translation | ⬜ Todo |
| 11 | Customer booking site full UI overhaul | ✅ Done |
| 11b | Partner/admin/driver portal rebrand | ✅ Done |
| 11c | Repo split — customer / portal separation | ✅ Done |
| 12 | Stripe Connect integration | ⬜ Deferred |
| 13 | Xero monthly commission endpoint | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | ⬜ Deferred |

---

## TODO Before Go-Live
- [ ] Update company registration number in privacy/terms pages (currently `XXXXXXXX`)
- [ ] Update registered address in privacy/terms pages (currently placeholder)
- [ ] Create `contact@camel-global.com` mailbox
- [ ] Create `press@camel-global.com` mailbox
- [ ] Build portal homepage further (currently minimal)
- [ ] Driver portal rebrand (jobs page)
- [ ] Stripe Connect integration (Phase 2)
- [ ] Spanish translation (Item 10)
- [ ] Point `camel-global.com` naked domain to customer site (verify redirect is correct)
- [ ] Delete or archive legacy `camel-customers` Supabase project (`hkolxykbjtrzwiwkwpzv`) once confirmed unused

---

## Useful Commands

```bash
# Portal
cd ~/camel-portal
git add .
git commit -m "message"
git push origin main

# Customer
cd ~/camel-customer
git add .
git commit -m "message"
git push origin main

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag (run in both repos)
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back
git checkout v-tag-name

# Deploy (if webhook fails)
cd ~/camel-portal && vercel --prod
cd ~/camel-customer && vercel --prod
```

---

*Last updated: Chat 18 — Header standardisation, footer fixes, Supabase env vars fixed, customer bookings restored.*