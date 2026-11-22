import { NextResponse } from "next/server";
import { requireDirectoryAdmin as requireAdmin } from "@/lib/outreach/requireDirectoryAdmin";
import { OUTREACH_CAMPAIGN } from "@/lib/outreach/outreachEmail";
import { isHumanClick, isTestAddress } from "@/lib/outreach/humanClick";

// Outreach campaigns (OUTREACH_CAMPAIGNS_SCHEMA.sql): each version of the email and how it did.
// GET  → every campaign with its results, overall and by country. ?id=<campaign> adds the
//        stored email content (all six languages) for that one campaign.
// PATCH { id, notes } → saves what we learned from a campaign.
//
// Email events (delivered, opened, clicked, bounced) come from that campaign's own sends.
// Site events (visited, started signup, signed up) are recorded per prospect, so each is
// credited to the prospect's latest send at or before it happened. Unsubscribes and "replied"
// carry no date and go to the prospect's latest send. Test addresses are left out.

type Counts = {
  sent: number; delivered: number; bounced: number; hard_bounced: number; opened: number;
  clicked: number; human_clicked: number; complained: number; unsubscribed: number;
  replied: number; landed: number; signup_started: number; signed_up: number;
};
const zero = (): Counts => ({ sent: 0, delivered: 0, bounced: 0, hard_bounced: 0, opened: 0, clicked: 0, human_clicked: 0, complained: 0, unsubscribed: 0, replied: 0, landed: 0, signup_started: 0, signed_up: 0 });

async function readAll(db: any, table: string, columns: string) {
  const rows: any[] = [];
  for (let from = 0; from < 500_000; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { db } = guard;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      const { data, error } = await db.from("outreach_campaigns").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      return NextResponse.json({ campaign: data });
    }

    const { data: campaigns, error: cErr } = await db.from("outreach_campaigns")
      .select("id, name, description, source_ref, notes, created_at").order("created_at");
    if (cErr) {
      // Table missing (PostgREST PGRST205 / Postgres 42P01): the schema hasn't been run yet.
      // Say so rather than erroring the page.
      if (cErr.code === "PGRST205" || cErr.code === "42P01") return NextResponse.json({ setup_needed: true, campaigns: [] });
      throw cErr;
    }

    const [sends, prospects] = await Promise.all([
      readAll(db, "outreach_sends", "id, prospect_id, campaign_id, sent_at, delivered_at, opened_at, clicked_at, last_click_user_agent, bounced_at, bounce_type, complained_at"),
      readAll(db, "outreach_prospects", "id, email, country, status, unsubscribed, landed_at, signup_started_at, signed_up_at"),
    ]);
    const prospectById = new Map(prospects.map((p) => [p.id, p]));

    const sendsByProspect = new Map<string, any[]>();
    for (const s of sends) {
      const list = sendsByProspect.get(s.prospect_id) ?? [];
      list.push(s);
      sendsByProspect.set(s.prospect_id, list);
    }
    for (const list of sendsByProspect.values()) list.sort((a, b) => a.sent_at.localeCompare(b.sent_at));

    const totals    = new Map<string, Counts>();
    const byCountry = new Map<string, Map<string, Counts>>();
    const firstSent = new Map<string, string>();
    const lastSent  = new Map<string, string>();
    const bump = (campaignId: string, country: string, key: keyof Counts) => {
      const t = totals.get(campaignId) ?? zero(); t[key]++; totals.set(campaignId, t);
      const m = byCountry.get(campaignId) ?? new Map<string, Counts>(); byCountry.set(campaignId, m);
      const c = m.get(country) ?? zero(); c[key]++; m.set(country, c);
    };

    for (const s of sends) {
      const p = prospectById.get(s.prospect_id);
      if (!p || isTestAddress(p.email)) continue;
      const country = p.country || "Unknown";
      const c = s.campaign_id;
      if (!firstSent.has(c) || s.sent_at < firstSent.get(c)!) firstSent.set(c, s.sent_at);
      if (!lastSent.has(c)  || s.sent_at > lastSent.get(c)!)  lastSent.set(c, s.sent_at);
      bump(c, country, "sent");
      if (s.delivered_at)  bump(c, country, "delivered");
      if (s.bounced_at)    bump(c, country, "bounced");
      if (s.bounce_type === "hard") bump(c, country, "hard_bounced");
      if (s.opened_at || s.clicked_at) bump(c, country, "opened");
      if (s.clicked_at)    bump(c, country, "clicked");
      if (isHumanClick(s.clicked_at, s.last_click_user_agent)) bump(c, country, "human_clicked");
      if (s.complained_at) bump(c, country, "complained");
    }

    for (const p of prospects) {
      if (isTestAddress(p.email)) continue;
      const list = sendsByProspect.get(p.id);
      if (!list?.length) continue;
      const country = p.country || "Unknown";
      const latest = list[list.length - 1];
      const creditAt = (at: string | null, key: keyof Counts) => {
        if (!at) return;
        const s = [...list].reverse().find((x) => x.sent_at <= at) ?? list[0];
        bump(s.campaign_id, country, key);
      };
      creditAt(p.landed_at, "landed");
      creditAt(p.signup_started_at, "signup_started");
      creditAt(p.signed_up_at, "signed_up");
      if (p.unsubscribed)          bump(latest.campaign_id, country, "unsubscribed");
      if (p.status === "replied")  bump(latest.campaign_id, country, "replied");
    }

    return NextResponse.json({
      current_campaign_id: OUTREACH_CAMPAIGN.id,
      campaigns: (campaigns || []).map((c: any) => ({
        ...c,
        first_sent_at: firstSent.get(c.id) ?? null,
        last_sent_at:  lastSent.get(c.id) ?? null,
        totals:        totals.get(c.id) ?? zero(),
        by_country:    [...(byCountry.get(c.id) ?? new Map()).entries()]
          .map(([country, counts]) => ({ country, ...counts }))
          .sort((a, b) => b.sent - a.sent),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 10_000) : null;
  if (!id || notes === null) return NextResponse.json({ error: "id and notes are required" }, { status: 400 });
  const { error } = await guard.db.from("outreach_campaigns")
    .update({ notes, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
