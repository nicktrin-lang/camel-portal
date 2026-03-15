import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const userId = userData.user.id;

    const body = await req.json().catch(() => null);

    const bookingId = String(body?.booking_id || "").trim();
    const status = String(body?.status || "").trim();

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Missing booking_id or status" },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "confirmed",
      "driver_assigned",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data: booking, error: findErr } = await db
      .from("partner_bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("partner_user_id", userId)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 400 });
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or not yours" },
        { status: 404 }
      );
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        booking_status: status,
      })
      .eq("id", bookingId)
      .eq("partner_user_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}