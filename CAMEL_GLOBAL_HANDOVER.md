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
- **When rebranding/restyling, never touch API call parameters or business logic — visual classes only.**
- **ChatWidget.tsx is identical in both repos** — always update both when changing it.
- **Always `git pull` before starting any session** — collaborator may have pushed.

---

## Project Overview
- **Name:** Camel Global
- **Legal entity:** NTUK Ltd, trading as Camel Global
- **Company number:** 08765474
- **Registered address:** Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN
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
cd ~/camel-portal && git add . && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add . && git commit -m "message" && git push origin main
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
| `lib/cities.ts` | Shared city list for Photon search bias |
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
| `lib/email.ts` | Resend email sender — all notification helpers. Review reminder uses `NEXT_PUBLIC_SITE_URL` (customer domain) with `?next=` login redirect |
| `app/api/geocode/route.ts` | Photon forward search + Nominatim reverse geocode |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (portal side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to partner/admin |
| `app/api/cron/review-reminder/route.ts` | Daily cron — sends review reminder 7 days after completion |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable (mouse + touch), streaming |
| `app/components/Footer.tsx` | Smart footer — partner/admin/driver/customer variants. Driver footer is minimal — no portal links |
| `app/page.tsx` | Portal public homepage — full partner landing page |
| `app/partner/terms/page.tsx` | Full partner T&Cs — cancellation section, NTUK Ltd details |
| `app/partner/operating-rules/page.tsx` | Partner Operating Agreement — web + PDF |
| `app/partner/about/page.tsx` | About Us — new branding |
| `app/partner/contact/page.tsx` | Contact form — new branding |
| `app/partner/privacy/page.tsx` | Privacy policy — NTUK Ltd details |
| `app/partner/cookies/page.tsx` | Cookie policy — new branding |
| `app/admin/terms/page.tsx` | Partner T&Cs inside admin layout |
| `app/admin/operating-rules/page.tsx` | Operating Agreement inside admin layout |
| `app/admin/about/page.tsx` | About Us inside admin layout |
| `app/admin/contact/page.tsx` | Contact form inside admin layout |
| `app/admin/privacy/page.tsx` | Privacy policy inside admin layout — NTUK Ltd details |
| `app/admin/cookies/page.tsx` | Cookie policy inside admin layout |
| `app/driver/jobs/page.tsx` | Driver jobs — light theme, expandable completed jobs |
| `app/api/driver/bookings/[id]/confirm/route.ts` | Driver confirm — accepts `action` OR `stage`, standalone insurance |
| `app/api/partner/bookings/[id]/cancel/route.ts` | Partner/admin cancel — always full refund |
| `app/api/admin/bookings/[id]/cancel/route.ts` | Admin cancel — always full refund |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Supabase server client (customers) |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (customer side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to customer |
| `app/api/test-booking/bookings/[id]/cancel/route.ts` | Customer booking cancellation |
| `app/components/ChatWidget.tsx` | **Identical to portal version** — always update both |
| `app/terms/page.tsx` | Customer T&Cs — full 48hr cancellation policy, NTUK Ltd details |
| `app/privacy/page.tsx` | Privacy policy — NTUK Ltd details |
| `app/login/page.tsx` | Customer login — supports `?next=` redirect param |
| `app/bookings/[id]/page.tsx` | Booking detail — has review form, uses `request_id` as URL param |

---

## Email Addresses
| Address | Type | Forwards to |
|---------|------|-------------|
| `info@camel-global.com` | Mailbox (Mail Lite, Fasthosts) | Gmail via POP — `mail.livemail.co.uk:995` |
| `contact@camel-global.com` | Forwarder | `artur@` + `info@` |
| `partners@camel-global.com` | Forwarder | `artur@` + `info@` |
| `press@camel-global.com` | Forwarder | `artur@` + `info@` |
| `email@camel-global.com` | Forwarder | `nicktrin@gmail.com` + `artur@` |

---

## AI Chat Widget (Camel Help)
- Floating orange bubble, bottom-right, draggable on **both mouse and touch (mobile)**
- Logged-in users only — customer site and partner portal
- Calls Anthropic API (`claude-haiku-4-5-20251001`) server-side
- Fetches user's bookings/requests from Supabase and injects into system prompt
- Streams responses back to the widget
- "End chat" button emails transcript to user via Resend
- WhatsApp links auto-detected in phone numbers in responses
- **ChatWidget.tsx is identical in both repos** — cp portal version to customer whenever changed:
  ```bash
  cp ~/camel-portal/app/components/ChatWidget.tsx ~/camel-customer/app/components/ChatWidget.tsx
  ```
- **Env var required:** `ANTHROPIC_API_KEY` in both Vercel projects (use same key for both)

---

## Review Reminder Email
- Cron runs daily at 10am UTC — sends 7 days after booking completion if no review
- Link in email goes to: `camel-global.com/login?next=/bookings/{request_id}`
- Login page reads `?next=` param and redirects after auth — lands on booking with review form
- **Bug history:** was pointing to `portal.camel-global.com` (wrong domain) with no login redirect — fixed Chat 24

---

## Cancellation System

### Rules
| Who cancels | Car hire refund | Fuel refund |
|-------------|-----------------|-------------|
| Partner | Full | Full |
| Customer >48hrs before pickup | Full | Full |
| Customer <48hrs before pickup | None | Full |
| Admin | Full | Full |

### DB columns on `partner_bookings`
| Column | Purpose |
|--------|---------|
| `cancelled_by` | `customer` / `partner` / `admin` |
| `cancelled_at` | Timestamp of cancellation |
| `cancellation_reason` | Optional reason text |
| `refund_status` | `full` / `partial` / `none` |

---

## Commission & Payments Model
- Partner = supplier, issues VAT invoice to customer
- Camel = intermediary, earns commission (default 20%, min €10 floor), invoices partner
- Commission rate set per-partner in admin — stored on `partner_profiles.commission_rate`
- Rate stamped on each booking at acceptance — never changes after that
- Fuel charges pass through 100% to partner — no commission on fuel
- `partner_profiles.stripe_account_id` column exists ready for Stripe Connect

---

## Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

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

## Footer System
| Portal | Footer variant | Notes |
|--------|---------------|-------|
| `/partner/*` | PartnerFooter | Full links — company, legal, platform |
| `/admin/*` | AdminFooter | Full links — company, legal, platform |
| `/driver/*` | DriverFooter | Minimal — customer site, partner login, become a partner only. No portal links. |
| Everything else | CustomerFooter | Standard public links |

**Important:** Portal footer links use prefixed paths (`/partner/about`, `/admin/cookies` etc.) — not root paths.

---

## Supabase Projects
| Project | URL | Used by |
|---------|-----|---------|
| `camel-global` | `https://guhcavvpuveiovspzxmg.supabase.co` | Portal + Customer (both) |

---

## Environment Variables

### Portal (`camel-portal-live`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
CRON_SECRET
CAMEL_ADMIN_EMAILS
PORTAL_BASE_URL                   → https://portal.camel-global.com
NEXT_PUBLIC_SITE_URL              → https://portal.camel-global.com
ANTHROPIC_API_KEY                 → sk-ant-... (same key as customer site)
```

### Customer (`camel-customer-live`)
```
NEXT_PUBLIC_CUSTOMER_SUPABASE_URL
NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY
CUSTOMER_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HCAPTCHA_SITE_KEY
HCAPTCHA_SECRET_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL              → https://camel-global.com
ANTHROPIC_API_KEY                 → sk-ant-... (same key as portal)
```

---

## Stable Tags

### Portal (`~/camel-portal`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — 5 bug fixes, geocode API, duplicate email fixed |
| `v-stable-chat21` | Chat 21 — Photon search, city fields, address overhaul |
| `v-stable-chat22` | Chat 22 — Commission rate system fully fixed |
| `v-stable-chat23` | Chat 23 — AI chat widget, cancellation system, cancellation-aware financials |
| `v-stable-chat24` | Chat 24 — Portal homepage, branding overhaul, driver fixes, chat widget touch drag |
| `v-stable-chat24b` | Chat 24b — NTUK Ltd company details, footer fixes, driver footer restricted, review email fix |
| `v-stable-chat24c` | Chat 24c — SEO metadata, sitemaps, robots.txt, alt text, partner signup metadata |

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — map picker address fix |
| `v-stable-chat21` | Chat 21 — Photon search, city selector, /book simplified |
| `v-stable-chat22` | Chat 22 — Commission stamp on customer bid acceptance |
| `v-stable-chat23` | Chat 23 — AI chat widget, cancellation system, customer cancellation UI |
| `v-stable-chat24` | Chat 24 — Customer T&Cs Section 7 rewrite, chat widget touch drag |
| `v-stable-chat24b` | Chat 24b — NTUK Ltd company details, privacy/terms updated |
| `v-stable-chat24c` | Chat 24c — SEO metadata, sitemaps, robots.txt, alt text improvements |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat24c
cd ~/camel-customer && git checkout v-stable-chat24c
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal — light theme, expandable history, touch-draggable chat widget, minimal footer
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10
- Fuel level recording, charge/refund calculation (to nearest ¼ tank)
- Email notifications + password reset on all portals
- Live status system — 7 checks
- Partner onboarding — 6 steps with Photon address search
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- Photon address search across all address inputs
- **AI Chat Widget** — both sites, logged-in only, draggable on mouse AND touch, streaming, transcript email, booking-aware
- **Booking cancellation** — customer/partner/admin, 48hr rule, financial breakdowns, cancellation-aware reports, Excel exports
- **Portal homepage** — full partner landing page with how it works, pricing, requirements, cancellation summary, insurance/licence requirements, driver section
- **Branding overhaul** — all partner and admin static pages match current black/white/orange style
- **Customer T&Cs** — full 48hr cancellation policy Section 7, automatic refunds stated
- **Partner T&Cs** — Section 8 cancellation policy, PDF updated
- **Company details** — NTUK Ltd (trading as Camel Global), reg 08765474, Ludgate Hill address — in all privacy/terms/footer pages across both repos
- **Review reminder email** — correct domain (customer site), login redirect with `?next=` to booking page
- **Email addresses** — `contact@`, `partners@`, `press@`, `email@` forwarders live. `info@` mailbox on Fasthosts, connected to Gmail via POP + SMTP
- **SEO** — optimised metadata, Open Graph tags, canonical URLs, airport keywords (Málaga, Alicante, Valencia, Madrid, Barcelona, Palma, Ibiza, Tenerife, Gran Canaria, Seville, Bilbao) across both sites. Sitemaps at `/sitemap.xml` on both domains. robots.txt updated with sitemap reference and correct disallow rules. Alt text improved. Partner signup has dedicated `metadata.ts`. Login/signup/account noindexed.

---

## Collaborator Note
A collaborator works on the same `camel-portal` repo from a Windows machine (`C:/dev/camel-portal`). He built the **Partner Outreach Agent** (`/admin/outreach`). His changes are on `main`. Always `git pull` before starting. Key files he owns: `app/admin/outreach/page.tsx`, `app/api/admin/outreach/*`.

---

## Session Log

### Chat 24c (Completed)
**SEO overhaul**
1. Updated both layout files — title templates, full keyword lists targeting Spanish airports, Open Graph tags, Twitter cards, robots directives.
2. Updated per-page metadata on about, privacy, terms, cookies pages — customer site.
3. Added portal homepage metadata targeting partner keywords.
4. Created `sitemap.ts` on both repos — customer returns empty on test site, portal only lists public pages.
5. Updated `robots.ts` on both repos — added sitemap URL reference, disallow rules for portal inner pages and customer account pages.
6. Created `app/partner/signup/metadata.ts` — dedicated SEO for become a partner page.
7. Fixed alt text — logo images updated from "Camel" to "Camel Global — Meet and Greet Car Hire Spain".
8. Stable tags `v-stable-chat24c` on both repos.
9. **When going live:** submit sitemaps to Google Search Console — `camel-global.com/sitemap.xml` and `portal.camel-global.com/sitemap.xml`.
1. Updated company name to NTUK Ltd (trading as Camel Global), reg 08765474, address Office 7 35-37 Ludgate Hill across all privacy/terms pages and footers in both repos — sed commands run directly.
2. Set up email forwarders on Fasthosts — `contact@`, `partners@`, `press@`, `email@`.
3. Connected `info@camel-global.com` mailbox to Gmail via POP (`mail.livemail.co.uk:995`) and SMTP (`smtp.livemail.co.uk:465`).
4. Fixed driver footer — now minimal (customer site, partner login, become a partner only). No portal links accessible to drivers.
5. Fixed portal homepage nav — Driver Login now styled as bordered box matching Partner Login.
6. Fixed footer copyright text on homepage — changed from `text-white/30` (invisible) to `text-white/70`.
7. Fixed review reminder email — was pointing to `portal.camel-global.com` (wrong domain). Now uses `NEXT_PUBLIC_SITE_URL` → `camel-global.com/login?next=/bookings/{request_id}`.
8. Stable tags `v-stable-chat24b` on both repos.

### Chat 24 (Completed)
**Branding, fixes, homepage, chat widget**
1. Pushed partner T&Cs + driver jobs page rebrand from Chat 23.
2. Fixed driver jobs "Access denied" bug — removed broken `/api/driver/check` GET call.
3. Fixed driver confirm API — accepts `action` (new) or `stage` (legacy), standalone insurance.
4. Made driver completed jobs expandable with read-only detail.
5. Customer T&Cs Section 7 — full 48hr policy rewrite.
6. Fixed portal footer broken links — prefixed paths.
7. Rebranded partner + admin static pages — black hero + white cards.
8. Built portal homepage — full partner landing page.
9. Applied 9 homepage fixes including insurance/licence section.
10. Added touch drag to ChatWidget — copied to both repos.

### Chat 23 (Completed)
**AI Chat Widget + Booking Cancellation System**
- AI chat widget live on both sites
- Full cancellation system — DB, routes, UI, 48hr rule, financials
- Stable tag `v-stable-chat23` on both repos

### Chats 20–22 (Completed)
- Address search, commission fixes, bug fixes

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
| 10 | Spanish translation | ⬜ Todo — do last |
| 11 | Customer booking site full UI overhaul | ✅ Done |
| 11b | Portal rebrand | ✅ Done |
| 11c | Repo split | ✅ Done |
| 11d | Google Analytics | ✅ Done |
| 12 | Stripe Connect integration | ⬜ Next — do before translation |
| 13 | Xero monthly commission endpoint | ⬜ Deferred |
| 14 | DAC7 EU platform reporting | ⬜ Deferred |
| 15 | Partner outreach agent | ✅ Done (collaborator) |

---

## TODO Before Go-Live
- [ ] Stripe Connect integration — **next priority**
- [ ] Spanish translation — after Stripe
- [ ] Delete legacy `camel-customers` Supabase project
- [ ] Outreach: deduplicate database (SQL in collaborator's handover)
- [ ] Outreach: set up `e.camel-global.com` subdomain in Resend
- [ ] Outreach: add lat/lng + map view + airport priority ordering

## Stripe Connect — Plan for Next Session
- Partners need `stripe_account_id` on `partner_profiles` (column already exists)
- Add "Set up payouts" step to partner onboarding flow
- Launches Stripe Express hosted onboarding
- On completion, store `stripe_account_id` on partner profile
- Commission deducted automatically at payout
- Partners receive net amount directly to their bank account
- Stripe handles all bank detail collection — Camel never touches raw bank data

---

## Useful Commands

```bash
# Always pull before starting
cd ~/camel-portal && git pull origin main

# Portal
cd ~/camel-portal && git add . && git commit -m "message" && git push origin main

# Customer
cd ~/camel-customer && git add . && git commit -m "message" && git push origin main

# Copy ChatWidget to both repos (always do both)
cp ~/camel-portal/app/components/ChatWidget.tsx ~/camel-customer/app/components/ChatWidget.tsx

# File trees
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort
find ~/camel-customer -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Create stable tag
git tag -a v-tag-name -m "description" && git push origin v-tag-name

# Roll back
git checkout v-tag-name
```

---

*Last updated: Chat 24c — SEO overhaul complete. Sitemaps, robots.txt, Open Graph, airport keywords, alt text, partner signup metadata. Stable tag v-stable-chat24c on both repos. Next: Stripe Connect integration.*