import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function getAdminEmails() {
  return String(process.env.CAMEL_ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).toLowerCase());
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const user = userData.user;
    const partnerUserId = user.id;
    const adminMode = isAdminEmail(user.email);

    const db = createServiceRoleSupabaseClient();

    // 1) Load request
    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dropoff_address,
        dropoff_lat,
        dropoff_lng,
        pickup_at,
        dropoff_at,
        journey_duration_minutes,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_slug,
        vehicle_category_name,
        notes,
        status,
        created_at,
        expires_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // 2) Load match row for this partner
    const { data: matchRow, error: matchErr } = await db
      .from("request_partner_matches")
      .select("id, request_id, partner_user_id, match_status, matched_fleet_id, created_at")
      .eq("partner_user_id", partnerUserId)
      .eq("request_id", id)
      .maybeSingle();

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 400 });
    }

    // 3) Load existing bid
    const { data: existingBid, error: bidErr } = await db
      .from("partner_bids")
      .select(`
        id,
        request_id,
        partner_user_id,
        fleet_id,
        vehicle_category_slug,
        vehicle_category_name,
        car_hire_price,
        fuel_price,
        total_price,
        full_insurance_included,
        full_tank_included,
        notes,
        status,
        created_at
      `)
      .eq("request_id", id)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (bidErr) {
      return NextResponse.json({ error: bidErr.message }, { status: 400 });
    }

    // 4) Load existing booking
    const { data: existingBooking, error: bookingErr } = await db
      .from("partner_bookings")
      .select("id, request_id, partner_user_id, booking_status")
      .eq("request_id", id)
      .eq("partner_user_id", partnerUserId)
      .maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    // 5) Access control:
    // - admins can always open
    // - matched partners can open
    // - partners with an existing bid can open
    // - partners with an existing booking can open
    if (!adminMode && !matchRow && !existingBid && !existingBooking) {
      return NextResponse.json(
        {
          error: "Request not found",
          reason: "No partner match, bid, or booking found for this user",
        },
        { status: 404 }
      );
    }

    // 6) Load active fleet for this partner
    const { data: fleetRows, error: fleetErr } = await db
      .from("partner_fleet")
      .select(`
        id,
        user_id,
        vehicle_name,
        category_slug,
        category_name,
        max_passengers,
        max_suitcases,
        max_hand_luggage,
        service_level,
        is_active
      `)
      .eq("user_id", partnerUserId)
      .eq("is_active", true)
      .order("category_name", { ascending: true });

    if (fleetErr) {
      return NextResponse.json({ error: fleetErr.message }, { status: 400 });
    }

    // 7) Compatible fleet list
    const compatibleFleet = (fleetRows || []).filter((fleet: any) => {
      const fitsCategory =
        String(fleet.category_slug || "") ===
        String(requestRow.vehicle_category_slug || "");

      const fitsPassengers =
        Number(fleet.max_passengers || 0) >= Number(requestRow.passengers || 0);

      const fitsSuitcases =
        Number(fleet.max_suitcases || 0) >= Number(requestRow.suitcases || 0);

      const fitsHand =
        Number(fleet.max_hand_luggage || 0) >=
        Number(requestRow.hand_luggage || 0);

      return fitsCategory && fitsPassengers && fitsSuitcases && fitsHand;
    });

    const fleetOptions = compatibleFleet.map((fleet: any) => ({
      id: fleet.id,
      vehicle_name: fleet.vehicle_name || null,
      category_slug: fleet.category_slug,
      category_name: fleet.category_name,
      max_passengers: fleet.max_passengers,
      max_suitcases: fleet.max_suitcases,
      max_hand_luggage: fleet.max_hand_luggage,
      service_level: fleet.service_level || null,
      label:
        fleet.vehicle_name ||
        `${fleet.category_name} · ${fleet.max_passengers} pax · ${fleet.max_suitcases} suitcases`,
    }));

    return NextResponse.json(
      {
        request: {
          ...requestRow,
          matched_status: matchRow?.match_status || (adminMode ? "admin_visible" : null),
        },
        existingBid: existingBid || null,
        existingBooking: existingBooking || null,
        fleetOptions,
        adminMode,
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