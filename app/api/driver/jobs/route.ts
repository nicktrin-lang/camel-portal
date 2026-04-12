import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

function bookingStatusLabel(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "confirmed":
    case "driver_assigned":
    case "en_route":
    case "arrived":
      return "Awaiting delivery";
    case "collected":
    case "returned":
      return "On Hire";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status || "—").replaceAll("_", " ");
  }
}

export async function GET(_req: NextRequest) {
  try {
    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const db = createServiceRoleSupabaseClient();
    const signedInEmail = String(user.email || "").trim().toLowerCase();

    let driverRow = null as any;

    const { data: byAuthUser, error: byAuthErr } = await db
      .from("partner_drivers")
      .select("id,partner_user_id,auth_user_id,full_name,email,phone,is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (byAuthErr) {
      return NextResponse.json({ error: byAuthErr.message }, { status: 400 });
    }

    driverRow = byAuthUser || null;

    if (!driverRow && signedInEmail) {
      const { data: byEmail, error: byEmailErr } = await db
        .from("partner_drivers")
        .select("id,partner_user_id,auth_user_id,full_name,email,phone,is_active")
        .ilike("email", signedInEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (byEmailErr) {
        return NextResponse.json({ error: byEmailErr.message }, { status: 400 });
      }

      driverRow = byEmail || null;
    }

    if (!driverRow) {
      return NextResponse.json(
        { error: "No active driver profile found for this account." },
        { status: 404 }
      );
    }

    if (!driverRow.auth_user_id) {
      await db
        .from("partner_drivers")
        .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", driverRow.id);
    }

    // Fetch company name from partner profile
    let companyName: string | null = null;
    if (driverRow?.partner_user_id) {
      const { data: partnerProfile } = await db
        .from("partner_profiles")
        .select("company_name")
        .eq("user_id", driverRow.partner_user_id)
        .maybeSingle();
      companyName = partnerProfile?.company_name || null;
    }

    const { data: bookingRows, error: bookingErr } = await db
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
        collection_confirmed_by_driver,
        collection_confirmed_by_driver_at,
        collection_fuel_level_driver,
        return_confirmed_by_driver,
        return_confirmed_by_driver_at,
        return_fuel_level_driver,
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
      .eq("assigned_driver_id", driverRow.id)
      .order("created_at", { ascending: false });

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    const requestIds = Array.from(
      new Set(
        (bookingRows || [])
          .map((row: any) => String(row.request_id || ""))
          .filter(Boolean)
      )
    );

    let requestMap = new Map<string, any>();

    if (requestIds.length > 0) {
      const { data: requestRows, error: requestErr } = await db
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
        .in("id", requestIds);

      if (requestErr) {
        return NextResponse.json({ error: requestErr.message }, { status: 400 });
      }

      requestMap = new Map((requestRows || []).map((row: any) => [String(row.id), row]));
    }

    const jobs = (bookingRows || []).map((booking: any) => {
      const request = requestMap.get(String(booking.request_id)) || null;
      return {
        booking_id: booking.id,
        request_id: booking.request_id,
        job_number: booking.job_number ?? request?.job_number ?? null,
        booking_status: booking.booking_status,
        booking_status_label: bookingStatusLabel(booking.booking_status),
        amount: booking.amount,
        created_at: booking.created_at,
        driver_name: booking.driver_name || null,
        driver_phone: booking.driver_phone || null,
        driver_vehicle: booking.driver_vehicle || null,
        driver_notes: booking.driver_notes || null,
        driver_assigned_at: booking.driver_assigned_at || null,
        pickup_address: request?.pickup_address || null,
        dropoff_address: request?.dropoff_address || null,
        pickup_at: request?.pickup_at || null,
        dropoff_at: request?.dropoff_at || null,
        customer_name: request?.customer_name || null,
        customer_phone: request?.customer_phone || null,
        vehicle_category_name: request?.vehicle_category_name || null,
        collection_confirmed_by_driver: booking.collection_confirmed_by_driver ?? null,
        collection_confirmed_by_driver_at: booking.collection_confirmed_by_driver_at || null,
        collection_fuel_level_driver: booking.collection_fuel_level_driver || null,
        return_confirmed_by_driver: booking.return_confirmed_by_driver ?? null,
        return_confirmed_by_driver_at: booking.return_confirmed_by_driver_at || null,
        return_fuel_level_driver: booking.return_fuel_level_driver || null,
      };
    });

    return NextResponse.json({
      driver: {
        id: driverRow.id,
        full_name: driverRow.full_name,
        email: driverRow.email,
        phone: driverRow.phone,
        company_name: companyName,
      },
      jobs,
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}