import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admin_users").select("role").eq("email", email).maybeSingle();
    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 400 });
    if (!adminRow) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select("id,user_id,email,company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status,created_at")
      .eq("id", id).maybeSingle();
    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
    if (!application) return NextResponse.json({ error: "Partner application not found" }, { status: 404 });

    // Resolve user_id
    let resolvedUserId = String(application.user_id || "").trim() || null;
    if (!resolvedUserId && application.email) {
      const { data: authUsersData } = await db.auth.admin.listUsers();
      const matched = authUsersData?.users?.find(
        u => (u.email || "").toLowerCase().trim() === String(application.email).toLowerCase().trim()
      );
      if (matched?.id) resolvedUserId = matched.id;
    }

    let profile = null;
    let fleet: any[] = [];
    let drivers: any[] = [];

    if (resolvedUserId) {
      const [profileRes, fleetRes, driversRes] = await Promise.all([
        db.from("partner_profiles")
          .select("id,user_id,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_address1,base_address2,base_town,base_city,base_province,base_postcode,base_country,base_lat,base_lng,default_currency")
          .eq("user_id", resolvedUserId).maybeSingle(),
        db.from("partner_fleet")
          .select("id,category_slug,category_name,max_passengers,max_suitcases,max_hand_luggage,service_level,notes,is_active,created_at")
          .eq("user_id", resolvedUserId).order("created_at", { ascending: false }),
        db.from("partner_drivers")
          .select("id,full_name,email,phone,is_active")
          .eq("partner_user_id", resolvedUserId).eq("is_active", true),
      ]);

      if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 });
      profile = profileRes.data;
      fleet = fleetRes.data || [];
      drivers = driversRes.data || [];
    }

    return NextResponse.json({ application, profile, fleet, drivers }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}