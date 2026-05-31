import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

const VALID_CURRENCIES = ["EUR", "GBP", "USD"];

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

async function requireAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { ok: false as const, status: 401 };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow, error: adminErr } = await db
    .from("admin_users")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  if (adminErr) return { ok: false as const, status: 400 };
  if (!adminRow || !isAllowed(adminRow.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, db };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing partner account id" }, { status: 400 });

    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Not authorized" }, { status: gate.status });

    const { db } = gate;

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select("id,user_id,email,company_name,full_name,phone,address,address1,address2,city,province,postcode,country,website,status,created_at,terms_accepted_at,terms_version")
      .eq("id", id)
      .maybeSingle();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
    if (!application) return NextResponse.json({ error: "Partner account not found" }, { status: 404 });

    let resolvedUserId = String(application.user_id || "").trim() || null;
    if (!resolvedUserId && application.email) {
      const { data: authUsers } = await db.auth.admin.listUsers();
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
          .select("id,user_id,role,company_name,contact_name,phone,address,address1,address2,city,province,postcode,country,website,service_radius_km,base_address,base_address1,base_address2,base_town,base_city,base_province,base_postcode,base_country,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number,commission_rate")
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

    const p = profile as any;
    const hasBaseAddress   = !!String(p?.base_address || "").trim();
    const hasBaseLat       = p?.base_lat != null && !isNaN(Number(p.base_lat));
    const hasBaseLng       = p?.base_lng != null && !isNaN(Number(p.base_lng));
    const hasRadius        = p?.service_radius_km != null && Number(p.service_radius_km) > 0;
    const hasFleet         = fleet.length > 0;
    const hasDrivers       = drivers.length > 0;
    const hasCurrency      = !!String(p?.default_currency || "").trim();
    const hasVat           = !!String(p?.vat_number || "").trim();

    const missing: string[] = [];
    if (!hasBaseAddress)            missing.push("Fleet base address");
    if (!hasBaseLat || !hasBaseLng) missing.push("Fleet GPS coordinates");
    if (!hasRadius)                 missing.push("Service radius");
    if (!hasFleet)                  missing.push("Active fleet vehicle");
    if (!hasDrivers)                missing.push("Active driver");
    if (!hasCurrency)               missing.push("Billing currency");
    if (!hasVat)                    missing.push("VAT / NIF number");

    return NextResponse.json({
      application, profile, fleet,
      fleet_count: fleet.length, drivers,
      is_live_profile: missing.length === 0,
      live_profile_reason: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// PATCH — admin-only update of commission_rate and/or default_currency
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing partner account id" }, { status: 400 });

    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Not authorized" }, { status: gate.status });

    const body = await req.json().catch(() => null);
    if (body == null) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const { db } = gate;

    // Resolve user_id from application id
    const { data: application } = await db
      .from("partner_applications")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    const userId = String(application?.user_id || "").trim();
    if (!userId) return NextResponse.json({ error: "Partner user not found" }, { status: 404 });

    const updates: Record<string, any> = {};

    // Commission rate
    if (body.commission_rate !== undefined) {
      const rate = parseFloat(String(body.commission_rate));
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: "Commission rate must be between 0 and 100" }, { status: 400 });
      }
      updates.commission_rate = rate;
    }

    // Default currency
    if (body.default_currency !== undefined) {
      const currency = String(body.default_currency).toUpperCase().trim();
      if (!VALID_CURRENCIES.includes(currency)) {
        return NextResponse.json({ error: `Currency must be one of: ${VALID_CURRENCIES.join(", ")}` }, { status: 400 });
      }
      updates.default_currency = currency;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error: updateErr } = await db
      .from("partner_profiles")
      .update(updates)
      .eq("user_id", userId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}