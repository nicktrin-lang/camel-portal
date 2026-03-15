import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const user = userData.user;
    const userId = user.id;
    const adminMode = isAdminEmail(user.email);

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
        job_number
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
      new Set(rows.map((row: any) => String(row.request_id || "")).filter(Boolean))
    );

    let requestMap = new Map<string, any>();

    if (requestIds.length > 0) {
      const { data: requestRows, error: requestErr } = await db
        .from("customer_requests")
        .select(`
          id,
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
          notes
        `)
        .in("id", requestIds);

      if (requestErr) {
        return NextResponse.json({ error: requestErr.message }, { status: 400 });
      }

      requestMap = new Map(
        (requestRows || []).map((row: any) => [String(row.id), row])
      );
    }

    const data = rows.map((booking: any) => {
      const request = requestMap.get(String(booking.request_id)) || null;

      return {
        id: booking.id,
        request_id: booking.request_id,
        partner_user_id: booking.partner_user_id,
        winning_bid_id: booking.winning_bid_id,
        booking_status: booking.booking_status,
        amount: booking.amount,
        notes: booking.notes,
        created_at: booking.created_at,
        job_number: booking.job_number,
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