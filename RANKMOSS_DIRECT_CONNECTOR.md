# RankMoss "Custom website (direct)" connector - camel-portal receiver

camel-portal now accepts RankMoss guide deliveries two ways:

1. **GitHub PR + rebuild (legacy).** RankMoss opens a PR adding
   `content/guides/{market}/{slug}.md`; Vercel rebuilds and the Markdown engine
   (`lib/guides.ts`) renders it. This path is fragile: it repeatedly stalls on GitHub
   secondary rate limits, leaving posts "delivered" but not live.
2. **Direct push (new, this change).** RankMoss POSTs each approved post straight to
   `POST /api/rankmoss` as signed JSON. No PR, no rebuild. The receiver verifies the
   signature, upserts the post into Supabase, and it is live at the same URL on the next
   request.

Both paths render through the **same** route and produce the **same** URL
(`/{market}/guides/{slug}`), so switching to direct push changes nothing for Google or
for readers. Nothing is re-indexed.

## What the code does

- `app/api/rankmoss/route.ts` - the receiver. Reads the raw body, verifies
  `X-RankMoss-Signature` (HMAC-SHA256 over the raw bytes) against
  `RANKMOSS_SIGNING_SECRET`, then:
  - **ping** (`action: "ping"`): verify and reply `200 { ok: true }`, publish nothing.
  - **upsert** (`action: "upsert"`): store the post keyed on its `id` (re-delivery
    replaces in place, never duplicates), reply `200 { url }`, and revalidate the post
    path + its market hub so the post is live immediately.
  - Bad/missing signature -> `401` (permanent). Malformed body -> `400` (permanent).
    Store error -> `503` (transient; RankMoss retries).
- `lib/rankmoss/core/*` - the published connector contract, copied verbatim from the
  RankMoss website starter kit (`verify.ts`, `parse.ts`, `receiver.ts`, `store.ts`,
  `types.ts`). Framework-agnostic, zero deps beyond `node:crypto`.
- `lib/rankmoss/supabaseStore.ts` - the real content layer: a `PostStore` backed by the
  `rankmoss_direct_guides` Supabase table (the kit's filesystem demo store is not used,
  because Vercel's filesystem is read-only/ephemeral at runtime).
- `lib/guides.direct.ts` - maps a stored direct post onto the existing `Guide` /
  `GuideMeta` shapes so the existing route components render it with no presentation
  changes.
- Render wiring: the post route (`app/[market]/guides/[slug]/page.tsx`) tries the
  filesystem first, then the direct store; the hub (`app/[market]/guides/page.tsx`)
  merges filesystem + direct posts, de-duped by slug.
- `RANKMOSS_DIRECT_GUIDES_SCHEMA.sql` - the additive, idempotent table migration.

The render path **never throws** on a store problem (missing env, missing table,
transient DB error): it degrades to filesystem-only, exactly as the site behaves today.
So this change is inert until the founder runs the migration and sets the secret.

## Environment variable

| Name | Value | Where |
|---|---|---|
| `RANKMOSS_SIGNING_SECRET` | the secret RankMoss shows once on connect | Vercel project env (Production + Preview) |

The store reuses the existing `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; no new Supabase env is needed.

## Manual steps for the founder (code cannot do these)

Do these in order. Nothing goes live until step (c) succeeds.

0. **Run the DB migration.** In the Supabase SQL editor, run
   `RANKMOSS_DIRECT_GUIDES_SCHEMA.sql` (additive, idempotent).
1. **Set the env var and deploy.** You will get the secret value in step (b); set
   `RANKMOSS_SIGNING_SECRET` in Vercel (Production and Preview) and redeploy so the
   receiver has it. (Env changes need a redeploy to take effect.)
2. **(a) Switch the connector in RankMoss.** Open **Connections** for the camel-portal
   project, choose **Custom website (direct)**, and enter the receiver URL:
   `https://portal.camel-global.com/api/rankmoss`
3. **(b) Copy the signing secret.** On first connect RankMoss shows the signing secret
   **once**. Copy it immediately and set it as `RANKMOSS_SIGNING_SECRET` (step 1). If you
   regenerate it later, the old one stops working the moment you do - update Vercel and
   redeploy.
4. **(c) Send a test ping.** Use **Send test ping** in RankMoss Connections. A green
   result means the endpoint received the POST and the signature verified. A `401` means
   the secret in Vercel does not match (re-check the value and that the deploy picked it
   up); nothing is published by a ping.
5. **(d) Deliver a post and confirm it is live.** Approve/deliver one post and confirm it
   appears at its expected URL (`https://portal.camel-global.com/{market}/guides/{slug}`)
   and on that market's hub (`/{market}/guides`). RankMoss also runs its own live check on
   the returned URL after delivery.

## Retiring the GitHub path (do NOT do yet)

The GitHub path is left fully intact on purpose: posts already delivered as Markdown in
`content/guides/` still render. Retire it only **after** direct delivery is proven:

- A handful of real posts have been delivered directly and confirmed live.
- You are satisfied re-deliveries/updates work (re-approving a post updates it in place).

Then, when ready:

1. In RankMoss, confirm the connector is **Custom website (direct)** (not GitHub) for this
   project, so no new PRs are opened.
2. Leave the existing `content/guides/**` Markdown in place (it keeps the already-indexed
   posts live via the filesystem path), or migrate those posts to the direct store by
   re-delivering them from RankMoss, then remove the Markdown in a separate, deliberate
   change. There is no rush - both paths coexist safely.

## Known limitations (follow-ups, not blockers)

- **New direct-only markets:** the country-nav rail and the `sitemap.xml` are still built
  from the filesystem (`getGuideMarkets()` / the `force-static` sitemap). A direct post in
  a market that has **no** filesystem posts yet still renders at its URL and shows on its
  own hub, but that market will not appear in the cross-market country nav or the sitemap
  until the next rebuild, or until a follow-up makes `getGuideMarkets()` and the sitemap
  direct-aware. All of camel-portal's current markets (es, gb, pt, fr, it, de) already
  have filesystem posts, so this only affects a brand-new country delivered direct-first.
- **Sitemap freshness:** because the sitemap is `force-static`, newly direct-delivered
  posts enter `sitemap.xml` on the next build. The post itself is live immediately
  regardless (the receiver revalidates its path), and search engines discover it via the
  hub and internal links; a follow-up could make the sitemap direct-aware if needed.
