import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

export type CancelRefundType = "full" | "fuel_only" | "none";

export type CancelBookingResult =
  | { ok: true; already_processed: true }
  | { ok: true; refund_type: CancelRefundType; refund_amount: number; stripe_refund_id: string | null }
  | { ok: false; error: string; status: number };

/**
 * Issues the Stripe refund for a cancelled booking and records it on the payments table.
 * Must be called AFTER the booking row has already been marked cancelled.
 *
 * refund_type:
 *   "full"      — refund car hire + fuel deposit  (admin/partner cancel, or customer >48hrs)
 *   "fuel_only" — refund fuel deposit only         (customer cancel <48hrs)
 *   "none"      — no refund (e.g. booking had no payment record)
 */
export async function cancelBookingRefund(
  bookingId: string,
  refundType: CancelRefundType
): Promise<CancelBookingResult> {
  if (refundType === "none") {
    return { ok: true, refund_type: "none", refund_amount: 0, stripe_refund_id: null };
  }

  const db = createServiceRoleSupabaseClient();

  // Load payment record — amounts here are in charge currency (what Stripe processed)
  const { data: payment, error: pmtErr } = await db
    .from("payments")
    .select(`
      id, stripe_payment_intent_id,
      amount_car_hire, amount_fuel_deposit,
      cancelled_refunded_at
    `)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (pmtErr) return { ok: false, error: pmtErr.message, status: 400 };

  // No payment record = test/manual booking — nothing to refund via Stripe
  if (!payment) {
    console.log(`cancelBookingRefund: no payment record for ${bookingId} — skipping Stripe refund`);
    return { ok: true, refund_type: "none", refund_amount: 0, stripe_refund_id: null };
  }

  // Idempotency — already refunded
  if (payment.cancelled_refunded_at) {
    return { ok: true, already_processed: true };
  }

  const carHireAmount  = Number(payment.amount_car_hire   || 0);
  const fuelDepAmount  = Number(payment.amount_fuel_deposit || 0);

  const refundAmount = refundType === "full"
    ? carHireAmount + fuelDepAmount
    : fuelDepAmount; // fuel_only

  const refundCents = Math.round(refundAmount * 100);

  let stripeRefundId: string | null = null;

  if (refundCents > 0 && payment.stripe_payment_intent_id) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: {
          booking_id: bookingId,
          refund_type: refundType,
          refund_amount: String(refundAmount),
        },
      });
      stripeRefundId = refund.id;
    } catch (err: any) {
      console.error("Stripe cancellation refund error:", err?.message);
      return { ok: false, error: `Stripe refund failed: ${err?.message}`, status: 500 };
    }
  }

  const now = new Date().toISOString();

  const { error: pmtUpdateErr } = await db
    .from("payments")
    .update({
      cancellation_refund_amount: refundAmount,
      cancellation_refund_stripe_id: stripeRefundId,
      cancelled_refunded_at: now,
      payout_status: "cancelled",
    })
    .eq("id", payment.id);

  if (pmtUpdateErr) return { ok: false, error: pmtUpdateErr.message, status: 500 };

  console.log(`cancelBookingRefund: ${bookingId} — ${refundType} refund ${refundAmount}, stripe ${stripeRefundId || "none"}`);
  return { ok: true, refund_type: refundType, refund_amount: refundAmount, stripe_refund_id: stripeRefundId };
}