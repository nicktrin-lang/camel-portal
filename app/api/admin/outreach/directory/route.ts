import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

// The outreach directory (OUTREACH_DIRECTORY_SCHEMA.sql): every car hire company found in
// Overture Maps, with emails found on their websites. GET lists it by country; POST
// "add" promotes rows that have an email into outreach_prospects, where the normal send
// flow (daily limit, unsubscribe, Resend tracking) takes over. Nothing is emailed here.

const PAGE_SIZE = 100;
const MAX_ADD = 500;

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

async function requireAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!adminRow || !isAllowed(adminRow.role)) return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  return { db };
}

// outreach_prospects.country holds a name, and the send route picks the email language
// from it (getLocale), so promoted rows use the names that route and the outreach page know.
const PROSPECT_COUNTRY: Record<string, string> = {
  ES: "Spain", FR: "France", IT: "Italy", PT: "Portugal", DE: "Germany", GB: "UK", US: "USA",
};
const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
function prospectCountry(iso: string): string {
  const cc = iso.toUpperCase();
  if (PROSPECT_COUNTRY[cc]) return PROSPECT_COUNTRY[cc];
  try { return REGION_NAMES.of(cc) ?? cc; } catch { return cc; }
}

const ISO = /^[A-Z]{2}$/;

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;

    const url = new URL(req.url);
    const country = (url.searchParams.get("country") || "").toUpperCase();
    const filter = url.searchParams.get("filter") || "all"; // all | email | website | no_website | added | not_scanned
    const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
    const chains = url.searchParams.get("chains") === "1";
    const page = Math.max(0, Number(url.searchParams.get("page") || 0) || 0);

    const { data: summary, error: sumErr } = await db.rpc("outreach_directory_summary");
    if (sumErr) throw sumErr;

    if (!ISO.test(country)) return NextResponse.json({ summary: summary ?? [], rows: [], total: 0, pageSize: PAGE_SIZE });

    let query = db.from("outreach_directory")
      .select("id, name, town, region, phone, website, domain, email, emails, email_source, scan_status, is_chain, confidence, prospect_id, added_at", { count: "exact" })
      .eq("country", country);
    if (!chains) query = query.eq("is_chain", false);
    if (filter === "email") query = query.not("email", "is", null).is("prospect_id", null);
    if (filter === "website") query = query.not("website", "is", null);
    if (filter === "no_website") query = query.is("website", null);
    if (filter === "added") query = query.not("prospect_id", "is", null);
    if (filter === "not_scanned") query = query.eq("scan_status", "pending");
    if (q) {
      const like = `%${q.replace(/[%_,()]/g, " ")}%`;
      query = query.or(`name.ilike."${like}",town.ilike."${like}",domain.ilike."${like}"`);
    }
    const { data: rows, count, error } = await query
      .order("name")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;

    return NextResponse.json({ summary: summary ?? [], rows: rows ?? [], total: count ?? 0, pageSize: PAGE_SIZE });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;

    const body = await req.json().catch(() => null);
    if (body?.action !== "add") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const ids: string[] | null = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, MAX_ADD) : null;
    const country = String(body.country || "").toUpperCase();
    if (!ids?.length && !ISO.test(country)) {
      return NextResponse.json({ error: "Send ids, or a country to add every company there with an email" }, { status: 400 });
    }

    // Candidates: independents with an email that aren't in outreach yet.
    let cq = db.from("outreach_directory")
      .select("id, name, town, country, phone, website, email")
      .eq("is_chain", false).not("email", "is", null).is("prospect_id", null)
      .order("name").limit(MAX_ADD);
    cq = ids?.length ? cq.in("id", ids) : cq.eq("country", country);
    const { data: candidates, error: cErr } = await cq;
    if (cErr) throw cErr;
    if (!candidates?.length) return NextResponse.json({ added: 0, linked: 0, message: "Nothing to add" });

    // One prospect per email: branches of one company share it.
    const byEmail = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const e = String(c.email).toLowerCase().trim();
      byEmail.set(e, [...(byEmail.get(e) ?? []), c]);
    }
    const emails = [...byEmail.keys()];

    // Already a prospect (e.g. from the old paid list or a CSV import)? Link to it, don't duplicate.
    const existing = new Map<string, string>();
    for (let i = 0; i < emails.length; i += 100) {
      const { data, error } = await db.from("outreach_prospects").select("id, email").in("email", emails.slice(i, i + 100));
      if (error) throw error;
      for (const p of data ?? []) existing.set(String(p.email).toLowerCase().trim(), p.id);
    }

    const toInsert = emails.filter((e) => !existing.has(e)).map((e) => {
      const first = byEmail.get(e)![0];
      const notes = ["Directory", first.phone, first.website].filter(Boolean).join(" · ");
      return {
        company_name: first.name,
        contact_name: null,
        email: e,
        city: first.town,
        country: prospectCountry(first.country),
        notes,
        status: "pending",
      };
    });

    const created = new Map<string, string>();
    for (let i = 0; i < toInsert.length; i += 200) {
      const { data, error } = await db.from("outreach_prospects").insert(toInsert.slice(i, i + 200)).select("id, email");
      if (error) throw error;
      for (const p of data ?? []) created.set(String(p.email).toLowerCase().trim(), p.id);
    }

    const addedAt = new Date().toISOString();
    for (const [e, rows] of byEmail) {
      const prospectId = created.get(e) ?? existing.get(e);
      if (!prospectId) continue;
      const { error } = await db.from("outreach_directory")
        .update({ prospect_id: prospectId, added_at: addedAt })
        .in("id", rows.map((r) => r.id));
      if (error) throw error;
    }

    return NextResponse.json({ added: created.size, linked: existing.size });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
