import { NextRequest, NextResponse } from "next/server";
import { cancelBookingRefund, CancelRefundType } from "@/lib/portal/cancelBooking";

/**
 * POST /api/internal/cancel-booking
 * TEMP test harness — drives cancelBookingRefund directly (bypassing the customer
 * route's auth + 48h calc) so both refund branches can be validated server-side.
 * Protected by CRON_SECRET. Remove after the Stripe rewrite is validated.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId, refundType } = await req.json();
  if (!bookingId || !["full", "fuel_only", "none"].includes(refundType)) {
    return NextResponse.json({ error: "Missing bookingId or invalid refundType" }, { status: 400 });
  }

  const result = await cancelBookingRefund(bookingId, refundType as CancelRefundType);
  return NextResponse.json(result);
}
