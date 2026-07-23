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

    const [batch1, batch2, appsRes] = await Promise.all([
      db.from("outreach_prospects").select("*").order("created_at", { ascending: false }).range(0, 999),
      db.from("outreach_prospects").select("*").order("created_at", { ascending: false }).range(1000, 1999),
      // All partner applications (a small table) — used to auto-detect which
      // prospects actually signed up. "Onboarded" is computed from this, NOT a
      // manual status, so it reflects real conversions.
      db.from("partner_applications").select("email, status"),
    ]);
    if (batch1.error) throw batch1.error;
    if (batch2.error) throw batch2.error;
    if (appsRes.error) throw appsRes.error;

    const appStatusByEmail = new Map<string, string>();
    for (const a of appsRes.data || []) {
      const e = String((a as any).email || "").toLowerCase().trim();
      if (e) appStatusByEmail.set(e, String((a as any).status || "pending"));
    }

    const prospects = [...(batch1.data || []), ...(batch2.data || [])].map((p: any) => {
      const appStatus = appStatusByEmail.get(String(p.email || "").toLowerCase().trim()) || null;
      return { ...p, onboarded: !!appStatus, application_status: appStatus };
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