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
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });
    if (!isAdminRole(role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const db = createServiceRoleSupabaseClient();

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select(`
        id, request_id, partner_user_id, winning_bid_id,
        booking_status, amount, currency, fuel_price, car_hire_price,
        fuel_used_quarters, fuel_charge, fuel_refund,
        notes, created_at, job_number, assigned_driver_id,
        driver_name, driver_phone, driver_vehicle, driver_notes, driver_assigned_at,
        collection_confirmed_by_driver, collection_confirmed_by_driver_at, collection_fuel_level_driver,
        return_confirmed_by_driver, return_confirmed_by_driver_at, return_fuel_level_driver,
        collection_confirmed_by_partner, collection_confirmed_by_partner_at, collection_fuel_level_partner, collection_partner_notes,
        return_confirmed_by_partner, return_confirmed_by_partner_at, return_fuel_level_partner, return_partner_notes,
        collection_confirmed_by_customer, collection_confirmed_by_customer_at, collection_fuel_level_customer, collection_customer_notes,
        return_confirmed_by_customer, return_confirmed_by_customer_at, return_fuel_level_customer, return_customer_notes,
        insurance_docs_confirmed_by_driver, insurance_docs_confirmed_by_driver_at,
        insurance_docs_confirmed_by_customer, insurance_docs_confirmed_by_customer_at,
        delivery_driver_id, delivery_driver_name, delivery_confirmed_at,
        collection_driver_id, collection_driver_name, collection_confirmed_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    if (!bookingRow) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    let requestRow = null;
    if (bookingRow.request_id) {
      const { data: reqData } = await db
        .from("customer_requests")
        .select(`
          id, job_number, customer_name, customer_email, customer_phone,
          pickup_address, dropoff_address, pickup_at, dropoff_at,
          journey_duration_minutes, passengers, suitcases, hand_luggage,
          vehicle_category_name, notes, status, created_at
        `)
        .eq("id", bookingRow.request_id)
        .maybeSingle();
      requestRow = reqData || null;
    }

    const { data: profileRow } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", bookingRow.partner_user_id)
      .maybeSingle();

    return NextResponse.json({
      booking: { ...bookingRow, partner_company_name: profileRow?.company_name || null },
      request: requestRow,
      role,
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}