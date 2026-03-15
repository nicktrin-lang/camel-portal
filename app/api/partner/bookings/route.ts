import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const userId = userData.user.id;
    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("partner_bookings")
      .select(
        `
        id,
        booking_status,
        amount,
        created_at,
        request_id,
        winning_bid_id,
        customer_requests (
          pickup_address,
          dropoff_address,
          pickup_at,
          passengers,
          suitcases,
          hand_luggage,
          vehicle_category_name,
          status
        )
      `
      )
      .eq("partner_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}