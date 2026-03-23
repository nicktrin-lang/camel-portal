import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

export async function GET(_req: NextRequest) {
  try {
    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("partner_drivers")
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
      .eq("partner_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const full_name = String(body?.full_name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim() || null;

    if (!full_name) {
      return NextResponse.json(
        { error: "Driver full name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Driver email is required" },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("partner_drivers")
      .insert({
        partner_user_id: user.id,
        full_name,
        email,
        phone,
        is_active: true,
      })
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