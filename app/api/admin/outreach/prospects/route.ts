import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    // Every prospect, 1000 at a time (PostgREST's per-request cap). This used to read only
    // the first 2000, which the car hire directory (/admin/outreach/directory) easily passes.
    const allProspects: any[] = [];
    for (let from = 0; from < 100_000; from += 1000) {
      const { data, error } = await db.from("outreach_prospects").select("*")
        .order("created_at", { ascending: false }).order("id").range(from, from + 999);
      if (error) throw error;
      allProspects.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const [appsRes] = await Promise.all([
      // All partner applications (a small table) — used to auto-detect which
      // prospects actually signed up. "Onboarded" is computed from this, NOT a
      // manual status, so it reflects real conversions.
      db.from("partner_applications").select("user_id, email, status, company_name"),
    ]);
    if (appsRes.error) throw appsRes.error;

    // Match on email first, then fall back to a normalised company-name match —
    // partners often sign up with a different email than we outreached to, so the
    // company-name fallback catches those "part onboarded" cases (flagged as a
    // name match so it's clear it's fuzzier than an exact email match).
    const normCompany = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const appByEmail   = new Map<string, string>();
    const appByCompany = new Map<string, string>();
    const appByUser    = new Map<string, string>();
    for (const a of appsRes.data || []) {
      if ((a as any).user_id) appByUser.set(String((a as any).user_id), String((a as any).status || "pending"));
      const e = String((a as any).email || "").toLowerCase().trim();
      if (e) appByEmail.set(e, String((a as any).status || "pending"));
      const c = normCompany((a as any).company_name);
      if (c) appByCompany.set(c, String((a as any).status || "pending"));
    }

    const prospects = allProspects.map((p: any) => {
      // Exact first: the signup carried this prospect's ref from the email link
      // (signed_up_user_id). Then the email / company-name fallbacks for people who
      // signed up some other way.
      const byLink    = p.signed_up_user_id ? (appByUser.get(String(p.signed_up_user_id)) || null) : null;
      const byEmail   = byLink ? null : (appByEmail.get(String(p.email || "").toLowerCase().trim()) || null);
      const byCompany = byLink || byEmail ? null : (appByCompany.get(normCompany(p.company_name)) || null);
      const appStatus = byLink || byEmail || byCompany || null;
      return {
        ...p,
        onboarded:          !!appStatus,
        application_status: appStatus,
        onboarded_match:    byLink ? "link" : byEmail ? "email" : (byCompany ? "company" : null),
      };
    });

    return NextResponse.json({ prospects });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const { company_name, contact_name, email: prospectEmail, city, country, notes } = body || {};
    if (!company_name || !prospectEmail) {
      return NextResponse.json({ error: "company_name and email are required" }, { status: 400 });
    }

    const { data, error } = await db
      .from("outreach_prospects")
      .insert({ company_name, contact_name, email: prospectEmail, city, country: country || "Spain", notes, status: "pending" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ prospect: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}