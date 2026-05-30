import { NextRequest, NextResponse } from "next/server";
import { completeBooking } from "@/lib/portal/completeBooking";

/**
 * POST /api/internal/complete-booking
 * Internal route — called from camel-customer when booking status reaches "completed".
 * Protected by CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const result = await completeBooking(bookingId);
  return NextResponse.json(result);
}