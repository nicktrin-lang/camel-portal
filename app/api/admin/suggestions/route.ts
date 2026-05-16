import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

// ── GET — list all suggestions (admin) ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const { user, role } = await getPortalUserRole();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceRoleSupabaseClient();

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const category = searchParams.get("category");

  let query = db
    .from("partner_suggestions")
    .select("id, partner_user_id, partner_name, title, category, description, status, admin_notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (status)   query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suggestions: data || [] });
}

// ── PATCH — update status / admin notes ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { user, role } = await getPortalUserRole();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { id, status, admin_notes } = body || {};

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const validStatuses = ["submitted", "reviewing", "planned", "done"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = createServiceRoleSupabaseClient();

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status      !== undefined) updates.status      = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  const { error } = await db
    .from("partner_suggestions")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}