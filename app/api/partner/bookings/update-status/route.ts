import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const bookingId = body?.booking_id;
    const status = body?.status;

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    const { error } = await db
      .from("partner_bookings")
      .update({
        booking_status: status,
      })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}