import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user, role, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const adminMode = isAdminRole(role);

    const db = createServiceRoleSupabaseClient();

    let bookingQuery = db
      .from("partner_bookings")
      .select(`
        id,
        request_id,
        partner_user_id,
        winning_bid_id,
        booking_status,
        amount,
        notes,
        created_at,
        job_number,
        assigned_driver_id,
        driver_name,
        driver_phone,
        driver_vehicle,
        driver_notes,
        driver_assigned_at,

        collection_confirmed_by_partner,
        collection_confirmed_by_partner_at,
        collection_fuel_level_partner,
        collection_partner_notes,

        return_confirmed_by_partner,
        return_confirmed_by_partner_at,
        return_fuel_level_partner,
        return_partner_notes,

        collection_confirmed_by_customer,
        collection_confirmed_by_customer_at,
        collection_fuel_level_customer,
        collection_customer_notes,

        return_confirmed_by_customer,
        return_confirmed_by_customer_at,
        return_fuel_level_customer,
        return_customer_notes
      `)
      .eq("id", id);

    if (!adminMode) {
      bookingQuery = bookingQuery.eq("partner_user_id", userId);
    }

    const { data: bookingRow, error: bookingErr } = await bookingQuery.maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id,
        job_number,
        customer_name,
        customer_email,
        customer_phone,
        pickup_address,
        dropoff_address,
        pickup_at,
        dropoff_at,
        journey_duration_minutes,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_name,
        notes,
        status,
        created_at
      `)
      .eq("id", bookingRow.request_id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        booking: {
          ...bookingRow,
          collection_fuel_level:
            bookingRow.collection_fuel_level_partner ??
            bookingRow.collection_fuel_level_customer ??
            null,
          return_fuel_level:
            bookingRow.return_fuel_level_partner ??
            bookingRow.return_fuel_level_customer ??
            null,
        },
        request: requestRow || null,
        role,
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