import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

function hasText(value: unknown) {
  return String(value || "").trim().length > 0;
}

function hasValidNumber(value: unknown) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
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
          "user_id,role,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng,default_currency"
        )
        .in("user_id", profileUserIds);

      if (profilesErr) {
        return NextResponse.json({ error: profilesErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profiles || []).map((row: any) => [String(row.user_id || "").trim(), row])
      );
    }

    // Active fleet counts
    let fleetCountMap = new Map<string, number>();

    if (profileUserIds.length > 0) {
      const { data: fleetRows, error: fleetErr } = await db
        .from("partner_fleet")
        .select("user_id")
        .in("user_id", profileUserIds)
        .eq("is_active", true);

      if (fleetErr) {
        return NextResponse.json({ error: fleetErr.message }, { status: 400 });
      }

      for (const row of fleetRows || []) {
        const uid = String((row as any)?.user_id || "").trim();
        if (!uid) continue;
        fleetCountMap.set(uid, (fleetCountMap.get(uid) || 0) + 1);
      }
    }

    // Active driver counts
    let driverCountMap = new Map<string, number>();

    if (profileUserIds.length > 0) {
      const { data: driverRows, error: driverErr } = await db
        .from("partner_drivers")
        .select("partner_user_id")
        .in("partner_user_id", profileUserIds)
        .eq("is_active", true);

      if (driverErr) {
        return NextResponse.json({ error: driverErr.message }, { status: 400 });
      }

      for (const row of driverRows || []) {
        const uid = String((row as any)?.partner_user_id || "").trim();
        if (!uid) continue;
        driverCountMap.set(uid, (driverCountMap.get(uid) || 0) + 1);
      }
    }

    const data = applicationRows.map((row: any) => {
      const normalizedEmail = String(row.email || "").toLowerCase().trim();
      const resolvedUserId =
        String(row.user_id || "").trim() || emailToUserId.get(normalizedEmail) || null;

      const profile = resolvedUserId ? profileMap.get(resolvedUserId) || null : null;
      const fleetCount = resolvedUserId ? fleetCountMap.get(resolvedUserId) || 0 : 0;
      const driverCount = resolvedUserId ? driverCountMap.get(resolvedUserId) || 0 : 0;

      const hasBaseAddress = hasText(profile?.base_address);
      const hasBaseLat = hasValidNumber(profile?.base_lat);
      const hasBaseLng = hasValidNumber(profile?.base_lng);
      const hasRadius =
        profile?.service_radius_km !== null &&
        profile?.service_radius_km !== undefined &&
        Number(profile.service_radius_km) > 0;
      const hasFleet = fleetCount > 0;
      const hasCurrency = hasText(profile?.default_currency);

      // Active driver is NOT a live-readiness gate — it's a fulfilment-time
      // requirement. driverCount is still returned so the UI can show it.
      const liveProfile =
        hasBaseAddress && hasBaseLat && hasBaseLng && hasRadius && hasFleet && hasCurrency;

      const missing: string[] = [];
      if (!hasRadius) missing.push("service_radius_km");
      if (!hasBaseAddress) missing.push("base_address");
      if (!hasBaseLat || !hasBaseLng) missing.push("base_location");
      if (!hasFleet) missing.push("fleet");
      if (!hasCurrency) missing.push("default_currency");

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
        missing,
        created_at: row.created_at || null,
        has_profile: !!profile,
        service_radius_km: profile?.service_radius_km ?? null,
        base_address: profile?.base_address || "",
        fleet_count: fleetCount,
        driver_count: driverCount,
        default_currency: profile?.default_currency || null,
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