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

    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 400 });
    if (!adminRow || !isAllowed(adminRow.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select("id,user_id,email,company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status,created_at,terms_accepted_at,terms_version")
      .eq("id", id)
      .maybeSingle();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
    if (!application) return NextResponse.json({ error: "Partner account not found" }, { status: 404 });

    let resolvedUserId = String(application.user_id || "").trim() || null;

    if (!resolvedUserId && application.email) {
      const { data: authUsers, error: authErr } = await db.auth.admin.listUsers();
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
      const matchedUser = authUsers?.users?.find(
        (u) => String(u.email || "").toLowerCase().trim() === String(application.email || "").toLowerCase().trim()
      );
      if (matchedUser?.id) resolvedUserId = String(matchedUser.id).trim();
    }

    let profile = null;
    let fleet: any[] = [];
    let drivers: any[] = [];

    if (resolvedUserId) {
      const [profileRes, fleetRes, driversRes] = await Promise.all([
        db.from("partner_profiles")
          .select("id,user_id,role,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_address1,base_address2,base_town,base_city,base_province,base_postcode,base_country,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number,commission_rate")
          .eq("user_id", resolvedUserId)
          .maybeSingle(),
        db.from("partner_fleet")
          .select("id,category_name,category_slug,max_passengers,max_suitcases,is_active")
          .eq("user_id", resolvedUserId)
          .eq("is_active", true),
        db.from("partner_drivers")
          .select("id,full_name,email,phone,is_active")
          .eq("partner_user_id", resolvedUserId)
          .eq("is_active", true),
      ]);

      if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 });
      profile = profileRes.data;
      fleet = fleetRes.data || [];
      drivers = driversRes.data || [];
    }

    // Full 7-check live status
    const p = profile as any;
    const hasBaseAddress  = !!String(p?.base_address || "").trim();
    const hasBaseLat      = p?.base_lat != null && !isNaN(Number(p.base_lat));
    const hasBaseLng      = p?.base_lng != null && !isNaN(Number(p.base_lng));
    const hasRadius       = p?.service_radius_km != null && Number(p.service_radius_km) > 0;
    const hasFleet        = fleet.length > 0;
    const hasDrivers      = drivers.length > 0;
    const hasCurrency     = !!String(p?.default_currency || "").trim();
    const hasVat          = !!String(p?.vat_number || "").trim();

    const missing: string[] = [];
    if (!hasBaseAddress) missing.push("Fleet base address");
    if (!hasBaseLat || !hasBaseLng) missing.push("Fleet GPS coordinates");
    if (!hasRadius) missing.push("Service radius");
    if (!hasFleet) missing.push("Active fleet vehicle");
    if (!hasDrivers) missing.push("Active driver");
    if (!hasCurrency) missing.push("Billing currency");
    if (!hasVat) missing.push("VAT / NIF number");

    const isLiveProfile = missing.length === 0;
    const liveProfileReason = missing.length > 0 ? `Missing: ${missing.join(", ")}` : "";

    return NextResponse.json({
      application,
      profile,
      fleet,
      fleet_count: fleet.length,
      drivers,
      is_live_profile: isLiveProfile,
      live_profile_reason: liveProfileReason,
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}