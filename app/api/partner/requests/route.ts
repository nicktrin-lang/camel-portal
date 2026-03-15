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

    let requestIds: string[] | null = null;

    if (!adminMode) {
      const { data: matchRows, error: matchErr } = await db
        .from("request_partner_matches")
        .select("request_id")
        .eq("partner_user_id", userId);

      if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 400 });
      }

      requestIds = Array.from(
        new Set(
          (matchRows || [])
            .map((row: any) => String(row.request_id || ""))
            .filter(Boolean)
        )
      );

      if (requestIds.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
    }

    let requestQuery = db
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
        vehicle_category_slug,
        vehicle_category_name,
        notes,
        status,
        created_at,
        expires_at
      `)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!adminMode && requestIds) {
      requestQuery = requestQuery.in("id", requestIds);
    }

    const { data: requestRows, error: requestErr } = await requestQuery;

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    const rows = requestRows || [];
    const ids = rows.map((row: any) => String(row.id));

    if (ids.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: myBids, error: bidsErr } = await db
      .from("partner_bids")
      .select("id, request_id, status, created_at")
      .eq("partner_user_id", userId)
      .in("request_id", ids);

    if (bidsErr) {
      return NextResponse.json({ error: bidsErr.message }, { status: 400 });
    }

    const { data: myBookings, error: bookingsErr } = await db
      .from("partner_bookings")
      .select("id, request_id, booking_status")
      .eq("partner_user_id", userId)
      .in("request_id", ids);

    if (bookingsErr) {
      return NextResponse.json({ error: bookingsErr.message }, { status: 400 });
    }

    const myBidMap = new Map(
      (myBids || []).map((bid: any) => [String(bid.request_id), bid])
    );

    const myBookingMap = new Map(
      (myBookings || []).map((booking: any) => [String(booking.request_id), booking])
    );

    const visibleRows = rows.filter((row: any) => {
      const requestId = String(row.id);
      const myBid = myBidMap.get(requestId) || null;
      const myBooking = myBookingMap.get(requestId) || null;

      if (myBooking) return false;

      if (myBid?.status === "accepted") return false;
      if (myBid?.status === "unsuccessful") return false;
      if (myBid?.status === "rejected") return false;

      return true;
    });

    const data = visibleRows.map((row: any) => {
      const requestId = String(row.id);
      const myBid = myBidMap.get(requestId) || null;

      let partnerStatus = "open";

      if (myBid?.status === "submitted") {
        partnerStatus = "bid_submitted";
      } else if (myBid?.status) {
        partnerStatus = myBid.status;
      }

      return {
        id: row.id,
        pickup_address: row.pickup_address,
        dropoff_address: row.dropoff_address,
        pickup_at: row.pickup_at,
        dropoff_at: row.dropoff_at,
        journey_duration_minutes: row.journey_duration_minutes,
        passengers: row.passengers,
        suitcases: row.suitcases,
        hand_luggage: row.hand_luggage,
        vehicle_category_slug: row.vehicle_category_slug,
        vehicle_category_name: row.vehicle_category_name,
        notes: row.notes,
        request_status: row.status,
        status: partnerStatus,
        created_at: row.created_at,
        expires_at: row.expires_at,
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