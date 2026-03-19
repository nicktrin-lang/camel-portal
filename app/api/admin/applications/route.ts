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
      return NextResponse.json(
        { error: applicationsErr.message },
        { status: 400 }
      );
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
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          contact_name,
          phone,
          address,
          role,
          base_address
        `)
        .in("user_id", profileUserIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
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

      for (const row of fleetRows || []) {
        const fleetUserId = String((row as any)?.user_id || "").trim();
        if (!fleetUserId) continue;
        fleetCountMap.set(fleetUserId, (fleetCountMap.get(fleetUserId) || 0) + 1);
      }
    }

    const data = applicationRows.map((row: any) => {
      const applicationEmail = String(row.email || "").toLowerCase().trim();
      const matchedUserId =
        String(row.user_id || "").trim() || emailToUserId.get(applicationEmail) || null;

      const profile = matchedUserId ? profileMap.get(matchedUserId) || null : null;
      const fleetCount = matchedUserId ? fleetCountMap.get(matchedUserId) || 0 : 0;

      const hasFleetAddress = !!String(profile?.base_address || "").trim();
      const hasFleet = fleetCount > 0;
      const isLiveProfile = hasFleetAddress && hasFleet;

      return {
        id: row.id,
        email: row.email || "",
        company_name: profile?.company_name || row.company_name || "",
        full_name: profile?.contact_name || row.full_name || "",
        phone: profile?.phone || row.phone || "",
        address: profile?.address || row.address || "",
        role: profile?.role || "partner",
        status: row.status || "pending",
        created_at: row.created_at,
        user_id: matchedUserId,
        has_profile: isLiveProfile,
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