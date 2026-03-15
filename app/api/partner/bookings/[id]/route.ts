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
    const userId = user.id;
    const adminMode = isAdminEmail(user.email);

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
        job_number
      `)
      .eq("id", id)
      .maybeSingle();

    if (!adminMode) {
      bookingQuery = bookingQuery.eq("partner_user_id", userId);
    }

    const { data: bookingRow, error: bookingErr } = await bookingQuery;

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
        booking: bookingRow,
        request: requestRow || null,
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