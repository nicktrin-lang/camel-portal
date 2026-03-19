import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

export async function GET() {
  try {
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

    let bookingsQuery = db
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
        driver_name,
        driver_phone,
        driver_vehicle,
        driver_notes,
        driver_assigned_at
      `)
      .order("created_at", { ascending: false });

    if (!adminMode) {
      bookingsQuery = bookingsQuery.eq("partner_user_id", userId);
    }

    const { data: bookingRows, error: bookingErr } = await bookingsQuery;

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    const rows = bookingRows || [];
    const requestIds = Array.from(
      new Set(
        rows
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
          pickup_address,
          dropoff_address,
          pickup_at,
          dropoff_at,
          journey_duration_minutes,
          passengers,
          suitcases,
          hand_luggage,
          vehicle_category_name,
          customer_name,
          customer_email,
          customer_phone,
          notes,
          status,
          created_at,
          expires_at
        `)
        .in("id", requestIds);

      if (requestErr) {
        return NextResponse.json({ error: requestErr.message }, { status: 400 });
      }

      requestMap = new Map(
        (requestRows || []).map((row: any) => [String(row.id), row])
      );
    }

    const partnerUserIds = Array.from(
      new Set(
        rows
          .map((row: any) => String(row.partner_user_id || ""))
          .filter(Boolean)
      )
    );

    let profileMap = new Map<string, any>();

    if (partnerUserIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          phone
        `)
        .in("user_id", partnerUserIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
      );
    }

    const data = rows.map((booking: any) => {
      const request = requestMap.get(String(booking.request_id)) || null;
      const partnerProfile =
        profileMap.get(String(booking.partner_user_id)) || null;

      return {
        id: booking.id,
        request_id: booking.request_id,
        partner_user_id: booking.partner_user_id,
        winning_bid_id: booking.winning_bid_id,
        booking_status: booking.booking_status,
        amount: booking.amount,
        notes: booking.notes,
        created_at: booking.created_at,
        job_number: booking.job_number ?? request?.job_number ?? null,

        driver_name: booking.driver_name || null,
        driver_phone: booking.driver_phone || null,
        driver_vehicle: booking.driver_vehicle || null,
        driver_notes: booking.driver_notes || null,
        driver_assigned_at: booking.driver_assigned_at || null,

        partner_company_name: partnerProfile?.company_name || null,
        partner_company_phone: partnerProfile?.phone || null,

        pickup_address: request?.pickup_address || null,
        dropoff_address: request?.dropoff_address || null,
        pickup_at: request?.pickup_at || null,
        dropoff_at: request?.dropoff_at || null,
        journey_duration_minutes: request?.journey_duration_minutes ?? null,
        passengers: request?.passengers ?? null,
        suitcases: request?.suitcases ?? null,
        hand_luggage: request?.hand_luggage ?? null,
        vehicle_category_name: request?.vehicle_category_name || null,
        customer_name: request?.customer_name || null,
        customer_email: request?.customer_email || null,
        customer_phone: request?.customer_phone || null,
        request_notes: request?.notes || null,
        request_status: request?.status || null,
        request_created_at: request?.created_at || null,
        request_expires_at: request?.expires_at || null,

        role,
        adminMode,
      };
    });

    return NextResponse.json({ data, role, adminMode }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}