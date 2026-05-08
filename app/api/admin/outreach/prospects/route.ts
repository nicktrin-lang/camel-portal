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

    const { data, error } = await db
      .from("outreach_prospects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ prospects: data || [] });
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