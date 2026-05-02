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
| `lib/cities.ts` | Shared city list for Photon search bias |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission calculation — rate % of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `lib/portal/operatingRules.ts` | Shared OPERATING_RULES data + downloadOperatingRulesPDF() |
| `lib/rateLimit.ts` | In-memory rate limiter — 3 req / 15 min per IP |
| `lib/hcaptcha.ts` | Server-side hCaptcha token verification |
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `app/api/geocode/route.ts` | Photon forward search + Nominatim reverse geocode |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (portal side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to partner/admin |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable, streaming |

### Key Libraries & Files — Customer (`~/camel-customer`)
| File | Purpose |
|------|---------|
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/supabase-customer/server.ts` | Supabase server client (customers) |
| `app/api/chat/route.ts` | AI chat API — Camel Help widget (customer side) |
| `app/api/chat/transcript/route.ts` | Emails chat transcript to customer |
| `app/api/test-booking/bookings/[id]/cancel/route.ts` | Customer booking cancellation |
| `app/components/ChatWidget.tsx` | Floating AI chat widget — draggable, streaming |

### API Routes — Cancel
| Route | Repo | Who can use |
|-------|------|-------------|
| `POST /api/partner/bookings/[id]/cancel` | portal | Partner (own bookings), Admin |
| `POST /api/admin/bookings/[id]/cancel` | portal | Admin only |
| `POST /api/test-booking/bookings/[id]/cancel` | customer | Customer (own bookings) |

---

## AI Chat Widget (Camel Help)
- Floating orange bubble, bottom-right, draggable
- Logged-in users only — customer site and partner portal
- Calls Anthropic API (`claude-haiku-4-5-20251001`) server-side
- Fetches user's bookings/requests from Supabase and injects into system prompt
- Streams responses back to the widget
- "End chat" button emails transcript to user via Resend
- WhatsApp links auto-detected in phone numbers in responses
- **Env var required:** `ANTHROPIC_API_KEY` in both Vercel projects

---

## Cancellation System

### Rules
| Who cancels | Car hire refund | Fuel refund |
|-------------|-----------------|-------------|
| Partner | Full | Full |
| Customer >48hrs before pickup | Full | Full |
| Customer <48hrs before pickup | None | Full |
| Admin | Full | Full |

### DB columns added to `partner_bookings`
| Column | Purpose |
|--------|---------|
| `cancelled_by` | `customer` / `partner` / `admin` |
| `cancelled_at` | Timestamp of cancellation |
| `cancellation_reason` | Optional reason text |
| `refund_status` | `full` / `partial` / `none` |

### Key behaviours
- Cancel button only shown on pre-collection statuses: `confirmed`, `driver_assigned`, `en_route`, `arrived`
- Once car is collected (`collected`, `returned`) — no cancellation possible
- Partner/admin cancel = always full refund regardless of timing
- All cancellations email customer, partner, and admin
- Cancelled bookings show zeroed financials (car hire/commission/payout = 0) on full refund
- Partial refund: partner keeps car hire minus commission, fuel always refunded to customer
- `calcPayout()` in all list/report pages is cancellation-aware
- Excel exports include: Cancelled By, Cancelled At, Cancellation Reason, Refund Status

### Customer UI
- Cancel button with 48hr warning shown on booking detail page
- Full `CustomerCancellationSummary` component shows: what they paid, refund breakdown, 48hr explanation
- Cancelled tab added to My Bookings page (4 tabs: Active, Completed, Cancelled, All)

### Partner/Admin UI
- `CancellationSummary` component on both partner and admin booking detail pages
- Shows: original amounts, customer refund, partner financial position
- Admin bookings list and reports show cancelled rows in red with strikethrough on zeroed figures
- Cancelled By + Cancelled At columns in all tables and Excel exports

---

## Commission & Payments Model
- Partner = supplier, issues VAT invoice to customer
- Camel = intermediary, earns commission (default 20%, min €10 floor), invoices partner
- Commission rate is set per-partner in admin — stored on `partner_profiles.commission_rate`
- Rate is stamped on each booking at acceptance time and never changes after that
- Fuel charges pass through 100% to partner — no commission on fuel
- Historical bookings with null `commission_rate` display as 20%

---

## Currency System
- **Supported:** `EUR | GBP | USD`
- **Order everywhere:** GBP, EUR, USD
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
PORTAL_BASE_URL
NEXT_PUBLIC_SITE_URL              → https://portal.camel-global.com
ANTHROPIC_API_KEY                 → sk-ant-... (for AI chat widget)
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
ANTHROPIC_API_KEY                 → sk-ant-... (for AI chat widget)
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

### Customer (`~/camel-customer`)
| Tag | Description |
|-----|-------------|
| `v-stable-chat20` | Chat 20 — map picker address fix |
| `v-stable-chat21` | Chat 21 — Photon search, city selector, /book simplified |
| `v-stable-chat22` | Chat 22 — Commission stamp on customer bid acceptance |
| `v-stable-chat23` | Chat 23 — AI chat widget, cancellation system, customer cancellation UI |

### Rollback
```bash
cd ~/camel-portal && git checkout v-stable-chat23
cd ~/camel-customer && git checkout v-stable-chat23
```

---

## What Is Working ✅
- Customer booking flow — single homepage widget
- Guest booking flow — draft survives login/signup redirect
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Full commission system — adjustable per partner, default 20%, min €10
- Fuel level recording, charge/refund calculation
- Email notifications + password reset on all portals
- Live status system — 7 checks
- Partner onboarding — 6 steps with Photon address search
- Security headers, rate limiting, hCaptcha on all forms
- Customer profile RLS, cookie consent banner, GDPR soft delete
- Photon address search across all address inputs
- CartoDB Positron map tiles
- **AI Chat Widget (Camel Help)** — both sites, logged-in only, draggable, streaming, transcript email, booking-aware
- **Booking cancellation** — customer, partner, admin. 48hr rule for customers. Full financial breakdown on all pages. Cancellation-aware reports and Excel exports. Cancelled tab on customer bookings page.

---

## Session Log

### Chat 23 (Completed)
**AI Chat Widget + Booking Cancellation System**

**AI Chat Widget:**
1. `app/api/chat/route.ts` — portal and customer. Fetches user's bookings, injects into Claude system prompt, streams response.
2. `app/api/chat/transcript/route.ts` — emails transcript on "End chat".
3. `app/components/ChatWidget.tsx` — draggable floating bubble, streaming, WhatsApp link detection, suggestion buttons.
4. `ANTHROPIC_API_KEY` env var required in both Vercel projects. Model: `claude-haiku-4-5-20251001`.
5. CSP updated in both `next.config.ts` to allow `api.anthropic.com`.

**Booking Cancellation:**
1. DB migration — added `cancelled_by`, `cancelled_at`, `cancellation_reason`, `refund_status` to `partner_bookings`.
2. Three cancel API routes — partner, admin (always full refund), customer (48hr rule).
3. Cancel button on partner, admin, customer booking detail pages.
4. Full `CancellationSummary` component on partner and admin booking detail.
5. Full `CustomerCancellationSummary` on customer booking page — explains 48hr rule, what they paid, refund breakdown.
6. `calcPayout()` in all list/report pages is cancellation-aware — zeroes figures on full refund, partial on within-48hr.
7. Cancelled rows shown in red with strikethrough in admin bookings list and reports.
8. Cancelled By, Cancelled At, Cancellation Reason, Refund Status in all Excel exports.
9. Cancelled tab added to customer My Bookings page.
10. `/api/partner/bookings/route.ts` updated to return cancellation fields and apply financial overrides.

### Chat 22 (Completed)
**Commission rate system — full fix**
- Stable tag `v-stable-chat22` on both repos

### Chat 21 (Completed)
**Address search overhaul, city fields, booking flow simplification**
- Stable tag `v-stable-chat21` on both repos

### Chat 20 (Completed)
**5 bug fixes — bookings, emails, maps, insurance**
- Stable tag `v-stable-chat20` on both repos

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
- [ ] Delete or archive legacy `camel-customers` Supabase project
- [ ] Add cancellation policy to customer T&Cs
- [ ] Add cancellation policy to partner T&Cs and Operating Rules
- [ ] Update T&Cs wording — refunds will be automatic once Stripe is live

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
```

---

*Last updated: Chat 23 — AI chat widget live on both sites. Full booking cancellation system with 48hr rule, financial breakdowns, cancellation-aware reports and Excel exports. Stable tag v-stable-chat23 on both repos.*