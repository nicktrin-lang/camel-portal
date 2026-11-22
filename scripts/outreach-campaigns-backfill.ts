/**
 * Outreach campaigns backfill: records the emails sent before campaigns existed.
 *
 * Run once, after OUTREACH_CAMPAIGNS_SCHEMA.sql:  npm run outreach:campaigns-backfill [-- --dry]
 *
 *  1. Creates the two campaigns that were actually sent:
 *     - 2026-06-founding-partner  (Jun–Sep 2026, the paid list). Its copy, as rendered by the
 *       send route at commit 16f7ba4, is in scripts/data/outreach-campaign-2026-06-founding-partner.json.
 *       (The fleet-utilisation rewrite of 6 Sep, #126/#127, was never sent to anyone.)
 *     - the current OUTREACH_CAMPAIGN (Nov 2026 onwards, the car hire directory), rendered now.
 *  2. Gives every prospect that was emailed one outreach_sends row (backfilled = true): before
 *     1 Oct 2026 → the founding-partner campaign, after → the current one, copying the
 *     prospect's delivered / opened / clicked / complained state onto it. A bounce is dated at
 *     the send. bounce_type is left empty: until this change every bounce was stored as "soft".
 *
 * Safe to re-run: prospects that already have a send row are skipped.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

(function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const DRY = process.argv.includes("--dry");

const FOUNDING = {
  id:          "2026-06-founding-partner",
  name:        "Founding partner invitation",
  description: "Black header with the white logo. \"Would you like <company> to attract more customers searching for car hire in <city>?\" Meet & greet platform for independent car hire companies, invitation to join as a founding partner. Button: SIGN UP NOW. Sent to the paid email list.",
  source_ref:  "16f7ba4",
  notes:       "Sent Jun–Jul 2026 (and 2 on 1 Sep) to the paid Spanish list. Delivery and site-visit tracking didn't exist yet: \"delivered\" was only recorded for the last few weeks, and visits/signups started being tracked on 3 Nov 2026, so zeros there mean not measured, not none.",
};
const CUTOFF = "2026-10-01";

async function main() {
  const { createServiceRoleSupabaseClient } = await import("../lib/supabase/server");
  const { OUTREACH_CAMPAIGN, renderCampaignContent, getLocale } = await import("../lib/outreach/outreachEmail");
  const db = createServiceRoleSupabaseClient();

  const foundingContent = JSON.parse(readFileSync(join(process.cwd(), "scripts/data/outreach-campaign-2026-06-founding-partner.json"), "utf8"));
  const currentContent  = await renderCampaignContent();
  const hash = (await import("crypto")).createHash("sha256").update(JSON.stringify(currentContent)).digest("hex").slice(0, 16);

  for (const row of [
    { ...FOUNDING, content: foundingContent, created_at: "2026-06-08T00:00:00Z" },
    { ...OUTREACH_CAMPAIGN, content: currentContent, content_hash: hash, source_ref: "2215bcb", created_at: "2026-10-31T00:00:00Z" },
  ]) {
    const { data: existing } = await db.from("outreach_campaigns").select("id").eq("id", row.id).maybeSingle();
    console.log(`${existing ? "exists " : "create "} campaign ${row.id}`);
    if (!existing && !DRY) {
      const { error } = await db.from("outreach_campaigns").insert(row);
      if (error) throw error;
    }
  }

  const prospects: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("outreach_prospects")
      .select("id, country, status, sent_at, delivered_at, opened_at, open_count, clicked_at, click_count, last_click_user_agent, complained_at")
      .not("sent_at", "is", null).order("id").range(from, from + 999);
    if (error) throw error;
    prospects.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const have = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("outreach_sends").select("prospect_id").order("id").range(from, from + 999);
    if (error) throw error;
    for (const r of data || []) have.add(r.prospect_id);
    if (!data || data.length < 1000) break;
  }

  const rows = prospects.filter((p) => !have.has(p.id)).map((p) => ({
    prospect_id:  p.id,
    campaign_id:  p.sent_at < CUTOFF ? FOUNDING.id : OUTREACH_CAMPAIGN.id,
    sent_at:      p.sent_at,
    locale:       getLocale(p.country),
    delivered_at: p.delivered_at,
    opened_at:    p.opened_at,
    open_count:   p.open_count ?? 0,
    clicked_at:   p.clicked_at,
    click_count:  p.click_count ?? 0,
    last_click_user_agent: p.last_click_user_agent,
    bounced_at:   p.status === "bounced" ? p.sent_at : null,
    complained_at: p.complained_at,
    backfilled:   true,
  }));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.campaign_id] = (tally[r.campaign_id] || 0) + 1;
  console.log(`${prospects.length} prospects emailed, ${have.size} already recorded, ${rows.length} to backfill:`, tally);
  if (DRY) return console.log("--dry: nothing written");

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from("outreach_sends").insert(chunk);
    if (error) throw error;
  }
  for (const campaign of Object.keys(tally)) {
    const ids = rows.filter((r) => r.campaign_id === campaign).map((r) => r.prospect_id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from("outreach_prospects").update({ campaign_id: campaign }).in("id", ids.slice(i, i + 200));
      if (error) throw error;
    }
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
