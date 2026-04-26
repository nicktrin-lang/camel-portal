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

# Customer
cd ~/camel-customer
git add .
git commit -m "message"
git push origin main
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
| `lib/cities.ts` | Shared city list for Photon search bias — used by signup, profile, customer site |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements, stamps DB before email, `.is(null)` guard |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `app/api/geocode/route.ts` | Photon forward search + Nominatim reverse geocode. Returns label, subtitle, city, type fields |
| `app/components/HCaptcha.tsx` | Reusable hCaptcha React widget |
| `app/components/GoogleAnalytics.tsx` | GA4 SPA pageview tracker — fires on every route change |
| `app/components/Footer.tsx` | Portal footer — black theme, partner/admin/driver variants, exported as PortalFooter |
| `app/components/portal/PortalTopbar.tsx` | Partner/admin header — black, h-[76px], inverted logo |
| `app/components/portal/PortalSidebar.tsx` | Partner/admin sidebar — black, orange active state |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Supabase server client (customers) |
| `lib/supabase/server.ts` | Also present — used by test-booking API routes |
| `lib/supabase/auth-client.ts` | Auth client — used by reset-password pages |
| `lib/cities.ts` | Shared city list — copy of portal version, used by homepage + /book |
| `lib/portal/calculateFuelCharge.ts` | Copied — used by customer booking API |
| `lib/portal/syncBookingStatuses.ts` | Copied — used by customer booking API |
| `lib/currency.ts` | Currency utilities |
| `lib/useCurrency.ts` | Currency hook |
| `lib/rateLimit.ts` | Rate limiter |
| `lib/hcaptcha.ts` | hCaptcha verification |
| `app/components/GoogleAnalytics.tsx` | GA4 SPA pageview tracker |
| `app/components/portal/fleetCategories.tsx` | Copied — used by customer booking pages |
| `app/components/Footer.tsx` | Customer footer |
| `app/components/CookieBanner.tsx` | GDPR cookie consent banner |
| `app/components/CurrencySelector.tsx` | GBP/EUR/USD selector — order is GBP, EUR, USD |
| `app/api/maps/search/route.ts` | Photon-powered address search with lat/lon bias |
| `app/api/maps/reverse/route.ts` | Nominatim reverse geocode for map clicks |

### API Routes — Customer Booking Engine
All internal API routes stay at `/api/test-booking/*` — do not rename these.

### Address Search System (Photon)
- **Engine:** Photon (komoot) — `https://photon.komoot.io/api/`
- **Bias:** City centre lat/lng passed with every search — results weighted to selected city
- **City list:** `lib/cities.ts` in both repos — single source of truth, add one line per city to expand
- **Reverse geocode:** Nominatim — used for map clicks and GPS location only
- **Result format:** `{ label, subtitle, city, type, lat, lng, address_line1, address_line2, province, postcode, country }`
- **Type icons:** ✈ airport, 🏨 hotel, 🍽 food, 🚆 train, 🚌 bus, 🏠 street, 📍 place
- **CSP:** `photon.komoot.io` in `connect-src`, `*.basemaps.cartocdn.com` in `img-src` + `connect-src`

### Map Tiles
- **Provider:** CartoDB Positron — free, no API key, clean grey modern style
- **URL:** `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- **Component:** `app/partner/profile/MapPickerInner.tsx` (portal) — copied to customer repo

### Currency System
- **Supported:** `EUR | GBP | USD`
- **Order everywhere:** GBP, EUR, USD
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

---

## Supabase Projects
| Project | URL | Used by |
|---------|-----|---------|
| `camel-global` | `https://guhcavvpuveiovspzxmg.supabase.co` | Portal + Customer (both) |
| `camel-customers` | `https://hkolxykbjtrzwiwkwpzv.supabase.co` | Legacy — no longer used |

---

## Database — Key Columns Added in Chat 20 (Address)

### `partner_profiles`
| Column | Purpose |
|--------|---------|
| `address1` | Business address line 1 |
| `address2` | Business address line 2 |
| `city` | Business city / town |
| `base_address1` | Fleet base address line 1 |
| `base_address2` | Fleet base address line 2 |
| `base_city` | Fleet base city / town |

### `partner_applications`
| Column | Purpose |
|--------|---------|
| `city` | Business city / town |

All columns added via SQL: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS city text` etc.

---

## Branding System

### Customer Site — Black / Grey / White / Orange
- **Colours:** Black `#000000`, Orange `#ff7a00`, Grey `#f0f0f0`, White
- **No blue anywhere**
- **Navbar:** Full-width black, `h-[76px]`, logo `h-16 brightness-0 invert`, square buttons
- **City selector bar:** Black background, orange `<select>`, white bold text
- **Buttons:** Square, orange `bg-[#ff7a00]`, `font-black`

### Partner / Admin / Driver Portals — Same Black Theme
- **No blue (`#003768`), no rounded corners, no shadows** anywhere in portal UI
- **Sidebar:** Black background, white/10 border, orange active nav item

---

## Google Analytics

| Domain | GA ID | Property |
|--------|-------|---------|
| `camel-global.com` / `www.camel-global.com` | `G-1Y758X38G4` | Camel site (production) |
| `test.camel-global.com` | `G-G90QB28J12` | Camel Customer Test Site |
| `portal.camel-global.com` / `test-portal.camel-global.com` | `G-YCZMDQJDM7` | Camel Portal Site |

---

## Commission & Payments Model
- Partner = supplier, issues VAT invoice to customer
- Camel = intermediary, earns 20% commission (min €10 floor), invoices partner
- Fuel charges pass through 100% to partner

---

## Live Status System (7 checks)
1. Fleet base address set
2. Fleet base GPS set (lat + lng)
3. Service radius set
4. At least one active fleet vehicle
5. At least one active driver
6. Billing currency set
7. VAT / NIF number set

---

## Duplicate Email Guard
- `partner_applications.live_email_sent_at` stamped **before** email is sent
- `.is("live_email_sent_at", null)` DB guard — UPDATE only succeeds once even with concurrent calls
- Both paths (`make-live/route.ts` and `refreshPartnerLiveStatus.ts`) are guarded
- `refreshPartnerLiveStatus` is called from 6 places — guard makes all calls safe

---

## Customer Booking Flow
- **Single page:** Homepage widget only — no separate `/book` form page
- `/book` is a pure auto-submit spinner — reached only after login redirect
- Notes field on homepage — collapsible behind "Add special requirements +"
- Draft saved to `sessionStorage` as `camel_booking_draft`
- Flow: homepage → validate → if logged in submit directly → `/bookings/[id]`
- Flow: homepage → not logged in → save draft → `/login?next=/book` → spinner → `/bookings/[id]`

---

## Partner Profile — Address System
- Business address: `address`, `address1`, `address2`, `city`, `province`, `postcode`, `country`
- Fleet base: `base_address`, `base_address1`, `base_address2`, `base_city`, `base_province`, `base_postcode`, `base_country`, `base_lat`, `base_lng`
- Three ways to set fleet base: Photon search (as-you-type), Use my current location, click map
- City selector bar biases Photon results to selected city — shared between biz + fleet searches
- POI names (hotels, airports) prepended to address line 1: e.g. "The Westin, Calle Amadeo 16"

---

## GDPR — Account Deletion
- Soft delete — stamps `deleted_at`, retains all booking/financial data
- `partner_profiles.deleted_at`, `customer_profiles.deleted_at`

---

## Security
- CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy in `next.config.ts` (both repos)
- Portal CSP `connect-src` includes: photon.komoot.io, *.basemaps.cartocdn.com, nominatim, frankfurter, hCaptcha, Supabase, Google Analytics
- Rate limiting: 3 req / 15 min per IP
- hCaptcha on all login, signup, forgot password, contact forms

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
NEXT_PUBLIC_CUSTOMER_SUPABASE_URL      → https://guhcavvpuveiovspzxmg.supabase.co
NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY
CUSTOMER_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL               → https://guhcavvpuveiovspzxmg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL                   → https://camel-global.com
```

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — 5 bug fixes, geocode API, duplicate email fixed |
| `v-stable-chat21` | Chat 21 — Photon search, city fields, address overhaul, duplicate email hardened |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — map picker address fix |
| `v-stable-chat21` | Chat 21 — Photon search, city selector, /book removed as form |

### Rollback
```bash
# Portal
cd ~/camel-portal
git checkout v-stable-chat21

# Customer
cd ~/camel-customer
git checkout v-stable-chat21
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget, no separate /book form
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support (order: GBP, EUR, USD everywhere)
- Full commission system — 20% default, min €10
- Fuel level recording, charge/refund calculation
- Email notifications + password reset on all portals
- Live status system — 7 checks, duplicate email permanently fixed
- Partner onboarding — 6 steps with Photon address search
- Driver portal — independent header, auto-refresh
- Insurance handover — all three portals
- Partner review system — ratings, replies, admin moderation
- Partner T&Cs — full legal document, versioned acceptance, PDF download
- Partner Operating Rules — web page + PDF download
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- **Photon address search across all address inputs — homepage, /book, partner signup, partner profile**
- **City/country selector with location bias on all address searches**
- **CartoDB Positron map tiles — no API key, clean modern style**
- **City / Town field in all address sections — profile, account, admin approvals, admin accounts**
- **Partner profile loads and saves all address fields correctly**
- **Partner signup steps 2 & 3 — Photon search with city selector + GPS button**
- **Admin approvals and accounts — full address display including city**
- **Duplicate live email — DB stamped before send, .is(null) guard, safe from concurrent calls**

---

## Session Log

### Chat 21 (Completed)
**Address search overhaul, city fields, booking flow simplification**

1. **Photon address search** — replaced Nominatim with Photon across all address inputs. Returns clean POI names (hotels, airports), proper city, location bias. `lib/cities.ts` created with 30+ cities worldwide grouped by country.

2. **City selector** — black bar with orange dropdown added to: customer homepage, partner signup steps 2 & 3, partner profile (business + fleet). Bias passed to Photon. Results weighted to selected city but not hard-blocked.

3. **Booking flow simplified** — `/book` page removed as a form. Homepage widget handles all input including collapsible notes. `/book` is now a pure auto-submit spinner. Flow: homepage → login if needed → spinner → `/bookings/[id]`.

4. **CartoDB Positron map tiles** — replaced Stadia Maps (required paid API key). Free, no auth, clean modern grey style. CSP updated.

5. **City column** — `city` added to `partner_profiles` and `partner_applications` via SQL migration. All select queries, upserts, and display pages updated. Existing records backfilled manually.

6. **Full address fields** — `address1`, `address2`, `base_address1`, `base_address2`, `base_city` etc added to DB and wired through profile page, account page, admin approvals, admin accounts. City/Town field visible everywhere.

7. **Duplicate live email hardened** — DB stamped before email sent, `.is(null)` guard added so concurrent calls can never double-send regardless of how many pages trigger refresh.

8. **Currency order** — GBP / EUR / USD order applied consistently to `CurrencySelector` and partner billing currency buttons.

- Stable tag `v-stable-chat21` created on both repos

### Chat 20 (Completed)
**5 bug fixes — bookings, emails, maps, insurance**
1. Partner bookings revenue stats — net payout shown not gross
2. Duplicate live email — `make-live/route.ts` stamps `live_email_sent_at` atomically
3. Insurance documents card — readable in all states
4. Partner profile address search — geocode API added to portal, as-you-type debounce
5. Customer map picker — `reverseLookup()` fixed to read `json?.display_name` not `json?.data?.display_name`
- Stable tag `v-stable-chat20` created on both repos

### Chats 18–19 (Completed)
- GA4 fully working, CSP fixed, footer links fixed, Supabase env fixed, headers standardised

### Chats 1–17 (Completed)
- Core booking flow, fuel, drivers, insurance, reviews, currency, password reset, commission, T&Cs, security, GDPR, footer, policy pages, maps, full customer UI overhaul, guest booking flow, repo split, portal rebrand

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
| 11d | Google Analytics — all 3 properties working | ✅ Done |
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
- [ ] Delete or archive legacy `camel-customers` Supabase project (`hkolxykbjtrzwiwkwpzv`) once confirmed unused

---

## Useful Commands

```bash
# Portal
cd ~/camel-portal && git add . && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add . && git commit -m "message" && git push origin main

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Roll back
git checkout v-tag-name

# Deploy (if webhook fails)
cd ~/camel-portal && vercel --prod
cd ~/camel-customer && vercel --prod
```

---

*Last updated: Chat 21 — Photon address search, city fields, booking flow simplified, CartoDB maps, duplicate email hardened. Stable tag v-stable-chat21 on both repos.*