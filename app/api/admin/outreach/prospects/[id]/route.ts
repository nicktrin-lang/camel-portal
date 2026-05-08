import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const { status, notes, contact_name, city, country } = body || {};

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;

    const { data, error } = await db
      .from("outreach_prospects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ prospect: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { id } = await params;
    const { error } = await db.from("outreach_prospects").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}