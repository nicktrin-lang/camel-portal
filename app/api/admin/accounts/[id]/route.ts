import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params?.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Missing partner account id" }, { status: 400 });
    }

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const email = (userData?.user?.email || "").toLowerCase().trim();

    if (userErr || !email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admin_users")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }

    if (!adminRow || !isAllowed(adminRow.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select(
        "id,user_id,email,company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status,created_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }

    if (!application) {
      return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
    }

    let resolvedUserId = String(application.user_id || "").trim() || null;

    if (!resolvedUserId && application.email) {
      const { data: authUsers, error: authErr } = await db.auth.admin.listUsers();

      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 400 });
      }

      const matchedUser = authUsers?.users?.find(
        (u) =>
          String(u.email || "").toLowerCase().trim() ===
          String(application.email || "").toLowerCase().trim()
      );

      if (matchedUser?.id) {
        resolvedUserId = String(matchedUser.id).trim();
      }
    }

    let profile = null;
    let fleetCount = 0;

    if (resolvedUserId) {
      const { data: profileRow, error: profileErr } = await db
        .from("partner_profiles")
        .select(
          "id,user_id,role,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
        )
        .eq("user_id", resolvedUserId)
        .maybeSingle();

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profile = profileRow;

      const { count, error: fleetErr } = await db
        .from("partner_fleet")
        .select("*", { count: "exact", head: true })
        .eq("user_id", resolvedUserId);

      if (fleetErr) {
        return NextResponse.json({ error: fleetErr.message }, { status: 400 });
      }

      fleetCount = count || 0;
    }

    const hasFleetAddress = !!String((profile as any)?.base_address || "").trim();
    const hasFleet = fleetCount > 0;
    const isLiveProfile = hasFleetAddress && hasFleet;

    const liveProfileReason = isLiveProfile
      ? ""
      : !hasFleetAddress && !hasFleet
      ? "Missing fleet address and no fleet added"
      : !hasFleetAddress
      ? "Missing fleet address"
      : "No fleet added";

    return NextResponse.json(
      {
        application,
        profile,
        fleet_count: fleetCount,
        is_live_profile: isLiveProfile,
        live_profile_reason: liveProfileReason,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}