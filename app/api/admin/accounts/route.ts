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

    const { data: applications, error: applicationsErr } = await db
      .from("partner_applications")
      .select(
        "id,user_id,email,company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status,created_at"
      )
      .order("created_at", { ascending: false });

    if (applicationsErr) {
      return NextResponse.json({ error: applicationsErr.message }, { status: 400 });
    }

    const applicationRows = applications || [];

    const applicationEmails = Array.from(
      new Set(
        applicationRows
          .map((row: any) => String(row.email || "").toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const { data: authUsers, error: authUsersErr } = await db.auth.admin.listUsers();

    if (authUsersErr) {
      return NextResponse.json({ error: authUsersErr.message }, { status: 400 });
    }

    const emailToUserId = new Map<string, string>();

    for (const user of authUsers?.users || []) {
      const userEmail = String(user.email || "").toLowerCase().trim();
      const authUserId = String(user.id || "").trim();

      if (userEmail && authUserId && applicationEmails.includes(userEmail)) {
        emailToUserId.set(userEmail, authUserId);
      }
    }

    const profileUserIds = Array.from(
      new Set(
        applicationRows
          .map((row: any) => String(row.user_id || "").trim())
          .filter(Boolean)
          .concat(Array.from(emailToUserId.values()))
      )
    );

    let profileMap = new Map<string, any>();

    if (profileUserIds.length > 0) {
      const { data: profiles, error: profilesErr } = await db
        .from("partner_profiles")
        .select(
          "user_id,role,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
        )
        .in("user_id", profileUserIds);

      if (profilesErr) {
        return NextResponse.json({ error: profilesErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profiles || []).map((row: any) => [String(row.user_id || "").trim(), row])
      );
    }

    let fleetCountMap = new Map<string, number>();

    if (profileUserIds.length > 0) {
      const { data: fleetRows, error: fleetErr } = await db
        .from("partner_fleet")
        .select("user_id")
        .in("user_id", profileUserIds);

      if (fleetErr) {
        return NextResponse.json({ error: fleetErr.message }, { status: 400 });
      }

      fleetCountMap = new Map<string, number>();

      for (const row of fleetRows || []) {
        const userId = String((row as any)?.user_id || "").trim();
        if (!userId) continue;
        fleetCountMap.set(userId, (fleetCountMap.get(userId) || 0) + 1);
      }
    }

    const data = applicationRows.map((row: any) => {
      const normalizedEmail = String(row.email || "").toLowerCase().trim();
      const resolvedUserId =
        String(row.user_id || "").trim() || emailToUserId.get(normalizedEmail) || null;

      const profile = resolvedUserId ? profileMap.get(resolvedUserId) || null : null;
      const fleetCount = resolvedUserId ? fleetCountMap.get(resolvedUserId) || 0 : 0;

      const hasFleetAddress = !!String(profile?.base_address || "").trim();
      const hasFleet = fleetCount > 0;
      const liveProfile = hasFleetAddress && hasFleet;

      const liveProfileReason = liveProfile
        ? ""
        : !hasFleetAddress && !hasFleet
        ? "Missing fleet address and no fleet added"
        : !hasFleetAddress
        ? "Missing fleet address"
        : "No fleet added";

      return {
        id: row.id,
        user_id: resolvedUserId,
        email: row.email || "",
        company_name: profile?.company_name || row.company_name || "",
        contact_name: profile?.contact_name || row.full_name || "",
        phone: profile?.phone || row.phone || "",
        address:
          profile?.address ||
          row.address ||
          [row.address1, row.address2, row.province, row.postcode, row.country]
            .filter(Boolean)
            .join(", ") ||
          "",
        website: profile?.website || row.website || "",
        role: profile?.role || "partner",
        application_status: row.status || "pending",
        live_profile: liveProfile,
        live_profile_reason: liveProfileReason,
        created_at: row.created_at || null,
        has_profile: !!profile,
        service_radius_km: profile?.service_radius_km ?? null,
        base_address: profile?.base_address || "",
        fleet_count: fleetCount,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}