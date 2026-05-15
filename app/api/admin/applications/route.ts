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

    const userId = String(userData?.user?.id || "").trim();

    if (userErr || !userId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: me, error: meErr } = await db
      .from("partner_profiles")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 400 });
    }

    if (!me || !isAllowed(me.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: applications, error: applicationsErr } = await db
      .from("partner_applications")
      .select("id,email,company_name,full_name,phone,address,status,created_at,user_id")
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
      const userEmail  = String(user.email || "").toLowerCase().trim();
      const authUserId = String(user.id    || "").trim();
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
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          contact_name,
          phone,
          address,
          role,
          base_address,
          base_lat,
          base_lng,
          base_country,
          service_radius_km,
          default_currency
        `)
        .in("user_id", profileUserIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
      );
    }

    // Fetch active fleet counts
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

    // Fetch active driver counts
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
      const applicationEmail = String(row.email || "").toLowerCase().trim();
      const matchedUserId =
        String(row.user_id || "").trim() || emailToUserId.get(applicationEmail) || null;

      const profile     = matchedUserId ? profileMap.get(matchedUserId) || null : null;
      const fleetCount  = matchedUserId ? fleetCountMap.get(matchedUserId)  || 0 : 0;
      const driverCount = matchedUserId ? driverCountMap.get(matchedUserId) || 0 : 0;

      const hasBaseAddress = hasText(profile?.base_address);
      const hasBaseLat     = hasValidNumber(profile?.base_lat);
      const hasBaseLng     = hasValidNumber(profile?.base_lng);
      const hasRadius      =
        profile?.service_radius_km !== null &&
        profile?.service_radius_km !== undefined &&
        Number(profile.service_radius_km) > 0;
      const hasFleet    = fleetCount > 0;
      const hasDriver   = driverCount > 0;
      const hasCurrency = hasText(profile?.default_currency);

      const isLiveProfile =
        hasBaseAddress && hasBaseLat && hasBaseLng &&
        hasRadius && hasFleet && hasDriver && hasCurrency;

      const missing: string[] = [];
      if (!hasRadius)           missing.push("service_radius_km");
      if (!hasBaseAddress)      missing.push("base_address");
      if (!hasBaseLat || !hasBaseLng) missing.push("base_location");
      if (!hasFleet)            missing.push("fleet");
      if (!hasDriver)           missing.push("driver");
      if (!hasCurrency)         missing.push("default_currency");

      return {
        id:           row.id,
        email:        row.email || "",
        company_name: profile?.company_name || row.company_name || "",
        contact_name: profile?.contact_name || row.full_name   || "",
        phone:        profile?.phone        || row.phone        || "",
        address:      profile?.address      || row.address      || "",
        role:         profile?.role         || "partner",
        status:       row.status            || "pending",
        created_at:   row.created_at,
        user_id:      matchedUserId,
        is_live_profile: isLiveProfile,
        live_profile:    isLiveProfile,
        missing,
        fleet_count:  fleetCount,
        driver_count: driverCount,
        service_radius_km: profile?.service_radius_km ?? null,
        base_address:      profile?.base_address       || "",
        base_lat:          profile?.base_lat           ?? null,
        base_lng:          profile?.base_lng           ?? null,
        partner_country:   profile?.base_country       || null,
        default_currency:  profile?.default_currency   || null,
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