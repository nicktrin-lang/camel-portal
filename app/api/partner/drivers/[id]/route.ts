import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const is_active =
      typeof body?.is_active === "boolean" ? body.is_active : null;

    if (is_active === null) {
      return NextResponse.json(
        { error: "is_active is required" },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data: existingDriver, error: existingErr } = await db
      .from("partner_drivers")
      .select("id, partner_user_id")
      .eq("id", id)
      .eq("partner_user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 400 });
    }

    if (!existingDriver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const { data, error } = await db
      .from("partner_drivers")
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("partner_user_id", user.id)
      .select(`
        id,
        partner_user_id,
        auth_user_id,
        full_name,
        email,
        phone,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}