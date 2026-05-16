import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role, user } = await getPortalUserRole();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id } = await params;
    const db = createServiceRoleSupabaseClient();
    const adminMode = role === "admin" || role === "super_admin";

    // Get partner's profile — currency + commission rate
    const { data: profileRow } = await db
      .from("partner_profiles")
      .select("default_currency, commission_rate")
      .eq("user_id", userId)
      .maybeSingle();

    const partnerCurrency: "EUR" | "GBP" | "USD" =
      (profileRow?.default_currency as "EUR" | "GBP" | "USD") ?? "EUR";

    // Get platform default commission rate from platform_settings
    const { data: platformSettings } = await db
      .from("platform_settings")
      .select("default_commission_rate, minimum_commission_amount")
      .limit(1)
      .maybeSingle();

    // Partner-level override takes priority, then platform default, then hardcoded fallback
    const commissionRate: number =
      profileRow?.commission_rate ?? platformSettings?.default_commission_rate ?? 20;
    const minimumCommission: number =
      platformSettings?.minimum_commission_amount ?? 10;

    // Fetch the request
    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id, job_number, customer_name, customer_email, customer_phone,
        pickup_address, dropoff_address, pickup_at, dropoff_at,
        journey_duration_minutes, passengers, suitcases, hand_luggage,
        sport_equipment, vehicle_category_slug, vehicle_category_name, notes,
        status, created_at, expires_at,
        driver_age, additional_drivers, additional_driver_ages
      `)
      .eq("id", id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Get the partner match for this request
    const { data: matchRow } = await db
      .from("request_partner_matches")
      .select("match_status, matched_fleet_id")
      .eq("request_id", id)
      .eq("partner_user_id", userId)
      .maybeSingle();

    // Check for existing bid
    const { data: bidRow } = await db
      .from("partner_bids")
      .select("id, fleet_id, vehicle_category_slug, vehicle_category_name, car_hire_price, fuel_price, total_price, full_insurance_included, full_tank_included, notes, status, created_at, currency")
      .eq("request_id", id)
      .eq("partner_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check for existing booking
    const { data: bookingRow } = bidRow ? await db
      .from("partner_bookings")
      .select("id, request_id, partner_user_id, booking_status")
      .eq("winning_bid_id", bidRow.id)
      .maybeSingle() : { data: null };

    // Get fleet options matching the request vehicle category
    const { data: fleetRows } = await db
      .from("partner_fleet")
      .select("id, category_slug, category_name, max_passengers, max_suitcases, max_hand_luggage, service_level")
      .eq("user_id", userId)
      .eq("is_active", true);

    const fleetOptions = (fleetRows || [])
      .filter(f =>
        !requestRow.vehicle_category_slug ||
        f.category_slug === requestRow.vehicle_category_slug
      )
      .map(f => ({
        ...f,
        label: `${f.category_name} · ${f.max_passengers} pax · ${f.max_suitcases} suitcases`,
      }));

    return NextResponse.json({
      request: { ...requestRow, matched_status: matchRow?.match_status || null },
      existingBid: bidRow || null,
      existingBooking: bookingRow || null,
      fleetOptions,
      adminMode,
      role,
      partnerCurrency,
      commissionRate,
      minimumCommission,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}