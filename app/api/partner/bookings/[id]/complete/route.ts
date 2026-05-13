import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { calculateFuelCharge, normalizeFuel } from "@/lib/portal/calculateFuelCharge";
import { sendEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

/**
 * POST /api/partner/bookings/[id]/complete
 *
 * Called after a booking reaches "completed" status.
 * 1. Calculates fuel used + refund amount
 * 2. Issues Stripe partial refund for unused fuel deposit
 * 3. Updates partner_bookings: fuel_used_quarters, fuel_charge, fuel_refund, payout_status = 'ready'
 * 4. Updates payments: fuel_refund_amount, fuel_refunded_at, payout_status = 'ready'
 * 5. Emails customer with completion summary and refund info
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
    }

    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) {
      return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });
    }

    const isAdmin = isAdminRole(role);
    const db = createServiceRoleSupabaseClient();

    // ── Load booking ──────────────────────────────────────────────────────────
    let bookingQuery = db
      .from("partner_bookings")
      .select(`
        id, partner_user_id, booking_status,
        fuel_price, car_hire_price, currency,
        job_number, request_id, payment_id,
        collection_fuel_level_partner, collection_fuel_level_driver,
        return_fuel_level_partner, return_fuel_level_driver,
        fuel_used_quarters, payout_status
      `)
      .eq("id", bookingId);

    if (!isAdmin) bookingQuery = bookingQuery.eq("partner_user_id", user.id);

    const { data: booking, error: bkErr } = await bookingQuery.maybeSingle();
    if (bkErr)   return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Must be completed
    if (booking.booking_status !== "completed") {
      return NextResponse.json(
        { error: "Booking is not yet completed" },
        { status: 400 }
      );
    }

    // Idempotency — already processed
    if (booking.payout_status === "ready" || booking.payout_status === "paid") {
      return NextResponse.json({ ok: true, already_processed: true });
    }

    // ── Resolve effective fuel levels ─────────────────────────────────────────
    // Partner override wins; fall back to driver reading
    const collectionFuel =
      normalizeFuel(booking.collection_fuel_level_partner) ||
      normalizeFuel(booking.collection_fuel_level_driver);

    const returnFuel =
      normalizeFuel(booking.return_fuel_level_partner) ||
      normalizeFuel(booking.return_fuel_level_driver);

    if (!collectionFuel || !returnFuel) {
      return NextResponse.json(
        { error: "Cannot complete — fuel levels are not recorded for collection or return" },
        { status: 400 }
      );
    }

    const fullTankPrice = Number(booking.fuel_price || 0);
    const fuelCalc = calculateFuelCharge({
      collectionFuel,
      returnFuel,
      fullTankPrice,
    });

    if (!fuelCalc) {
      return NextResponse.json(
        { error: "Failed to calculate fuel charge — invalid fuel levels" },
        { status: 400 }
      );
    }

    const { used_quarters, fuel_charge, fuel_refund } = fuelCalc;

    // ── Load payment record ───────────────────────────────────────────────────
    const { data: payment, error: pmtErr } = await db
      .from("payments")
      .select("id, stripe_payment_intent_id, amount_fuel_deposit, fuel_refunded_at")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (pmtErr)   return NextResponse.json({ error: pmtErr.message }, { status: 400 });
    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

    // Idempotency — already refunded
    if (payment.fuel_refunded_at) {
      return NextResponse.json({ ok: true, already_refunded: true });
    }

    // ── Issue Stripe refund ───────────────────────────────────────────────────
    let stripeRefundId: string | null = null;
    const refundCents = Math.round(fuel_refund * 100);

    if (refundCents > 0 && payment.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: refundCents,
          reason: "requested_by_customer",
          metadata: {
            booking_id: bookingId,
            fuel_used_quarters: String(used_quarters),
            fuel_refund_amount: String(fuel_refund),
          },
        });
        stripeRefundId = refund.id;
      } catch (stripeErr: any) {
        console.error("Stripe refund error:", stripeErr?.message);
        return NextResponse.json(
          { error: `Stripe refund failed: ${stripeErr?.message}` },
          { status: 500 }
        );
      }
    }

    const now = new Date().toISOString();

    // ── Update partner_bookings ───────────────────────────────────────────────
    const { error: bookingUpdateErr } = await db
      .from("partner_bookings")
      .update({
        fuel_used_quarters: used_quarters,
        fuel_charge,
        fuel_refund,
        payout_status: "ready",
      })
      .eq("id", bookingId);

    if (bookingUpdateErr) {
      return NextResponse.json({ error: bookingUpdateErr.message }, { status: 500 });
    }

    // ── Update payments ───────────────────────────────────────────────────────
    const { error: pmtUpdateErr } = await db
      .from("payments")
      .update({
        fuel_refund_amount: fuel_refund,
        fuel_refund_stripe_id: stripeRefundId,
        fuel_refunded_at: now,
        payout_status: "ready",
      })
      .eq("id", payment.id);

    if (pmtUpdateErr) {
      return NextResponse.json({ error: pmtUpdateErr.message }, { status: 500 });
    }

    // ── Load request + customer info for email ────────────────────────────────
    const { data: request } = await db
      .from("customer_requests")
      .select("customer_name, customer_email, pickup_address, dropoff_address, pickup_at")
      .eq("id", booking.request_id)
      .maybeSingle();

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    // ── Email customer ────────────────────────────────────────────────────────
    const currency = booking.currency || "EUR";
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

    const jobNo = booking.job_number ? `#${booking.job_number}` : "";
    const companyName = partnerProfile?.company_name || "the car hire company";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";

    if (request?.customer_email) {
      await sendEmail({
        to: request.customer_email,
        subject: `Your Camel Global booking ${jobNo} is complete`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Booking Complete</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${request.customer_name || "there"},</p>
              <p>Your car hire booking ${jobNo} with ${companyName} has been completed. Thank you for using Camel Global.</p>

              <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
                <p style="margin:0 0 8px;font-weight:700;">Fuel Summary</p>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:4px 0;color:#666;">Collection fuel level</td><td style="text-align:right;">${collectionFuel}</td></tr>
                  <tr><td style="padding:4px 0;color:#666;">Return fuel level</td><td style="text-align:right;">${returnFuel}</td></tr>
                  <tr><td style="padding:4px 0;color:#666;">Fuel used</td><td style="text-align:right;">${used_quarters}/4 tank</td></tr>
                  <tr><td style="padding:4px 0;color:#666;">Fuel charge</td><td style="text-align:right;">${fmt(fuel_charge)}</td></tr>
                  <tr style="border-top:1px solid #ddd;">
                    <td style="padding:8px 0 4px;font-weight:700;">Fuel refund</td>
                    <td style="text-align:right;font-weight:700;color:#22a06b;">${fmt(fuel_refund)}</td>
                  </tr>
                </table>
                ${fuel_refund > 0
                  ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">A refund of <strong>${fmt(fuel_refund)}</strong> has been issued to your original payment method. It may take 5–10 business days to appear.</p>`
                  : `<p style="margin:8px 0 0;font-size:13px;color:#666;">No fuel refund is due — the full tank deposit covered the fuel used.</p>`
                }
              </div>

              <a href="${siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Bookings</a>
              <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(e => console.error("Completion customer email failed:", e?.message));
    }

    // ── Email admin ───────────────────────────────────────────────────────────
    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "")
      .split(",").map(e => e.trim()).filter(Boolean);

    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `[Admin] Booking ${jobNo} completed — fuel refund ${fmt(fuel_refund)}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Booking <strong>${jobNo}</strong> marked completed.</p>
            <p>
              <strong>Partner:</strong> ${companyName}<br/>
              <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
              <strong>Fuel used:</strong> ${used_quarters}/4 tank (${collectionFuel} → ${returnFuel})<br/>
              <strong>Fuel charge:</strong> ${fmt(fuel_charge)}<br/>
              <strong>Fuel refund:</strong> ${fmt(fuel_refund)}<br/>
              <strong>Stripe refund ID:</strong> ${stripeRefundId || "none (refund = 0)"}<br/>
              <strong>Payout status:</strong> ready
            </p>
          </div>
        `,
      }).catch(e => console.error("Completion admin email failed:", e?.message));
    }

    return NextResponse.json({
      ok: true,
      fuel_used_quarters: used_quarters,
      fuel_charge,
      fuel_refund,
      stripe_refund_id: stripeRefundId,
      payout_status: "ready",
    });
  } catch (e: any) {
    console.error("Booking complete error:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}