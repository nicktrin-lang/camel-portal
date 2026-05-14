import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { sendEmail } from "@/lib/email";
import { cancelBookingRefund } from "@/lib/portal/cancelBooking";

const PRE_COLLECTION_STATUSES = ["confirmed", "driver_assigned", "en_route", "arrived"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const { id: bookingId } = await params;
    if (!bookingId) return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim() || null;

    const db = createServiceRoleSupabaseClient();
    const isAdmin = isAdminRole(role);

    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`id, job_number, booking_status, partner_user_id, car_hire_price, fuel_price, currency, request_id`)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr)    return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (!isAdmin && booking.partner_user_id !== user.id) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }
    if (booking.booking_status === "cancelled") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }
    if (!isAdmin && !PRE_COLLECTION_STATUSES.includes(booking.booking_status)) {
      return NextResponse.json({ error: "This booking cannot be cancelled — the car has already been collected" }, { status: 400 });
    }

    const { data: request } = await db
      .from("customer_requests")
      .select("id, customer_name, customer_email, pickup_at, pickup_address")
      .eq("id", booking.request_id)
      .maybeSingle();

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name, phone")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
    const partnerEmail = partnerAuthData?.user?.email || null;

    const cancelledBy = isAdmin ? "admin" : "partner";

    // ── Mark booking cancelled ───────────────────────────────────────────────
    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        booking_status: "cancelled",
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        refund_status: "full",
      })
      .eq("id", bookingId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    await db.from("customer_requests").update({ status: "cancelled" }).eq("id", booking.request_id);

    // ── Issue Stripe refund ──────────────────────────────────────────────────
    const refundResult = await cancelBookingRefund(bookingId, "full");
    if (!refundResult.ok) {
      console.error("Partner cancel refund error:", refundResult.error);
    }

    const refundAmount = refundResult.ok && !("already_processed" in refundResult)
      ? refundResult.refund_amount
      : Number(booking.car_hire_price || 0) + Number(booking.fuel_price || 0);

    // ── Emails ───────────────────────────────────────────────────────────────
    const jobNo       = booking.job_number ? `#${booking.job_number}` : "";
    const companyName = partnerProfile?.company_name || "the car hire company";
    const pickupTime  = request?.pickup_at
      ? new Date(request.pickup_at).toLocaleString("en-GB", { timeZone: "Europe/Madrid" })
      : "—";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
    const curr    = booking.currency || "EUR";
    const fmt     = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: curr }).format(n);

    if (request?.customer_email) {
      await sendEmail({
        to: request.customer_email,
        subject: `Your Camel Global booking ${jobNo} has been cancelled`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Booking Cancelled</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${request.customer_name || "there"},</p>
              <p>Your car hire booking ${jobNo} has been cancelled by ${cancelledBy === "admin" ? "Camel Global" : companyName}.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p><strong>Pickup was:</strong> ${pickupTime}<br/><strong>Pickup address:</strong> ${request.pickup_address || "—"}</p>
              <div style="background:#f0fff4;border:1px solid #22c55e;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:700;">✅ Full refund of ${fmt(refundAmount)} will be processed to your original payment method.</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666;">Car hire and fuel deposit will both be refunded in full. Please allow 5–10 business days.</p>
              </div>
              <p>Questions? Email <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a></p>
              <a href="${siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Bookings</a>
              <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(e => console.error("Customer cancel email failed:", e?.message));
    }

    if (partnerEmail) {
      await sendEmail({
        to: partnerEmail,
        subject: `Booking ${jobNo} has been cancelled`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Booking Cancelled</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Booking ${jobNo} has been cancelled by ${cancelledBy === "admin" ? "Camel Global admin" : "your account"}.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p><strong>Customer:</strong> ${request?.customer_name || "—"}<br/><strong>Pickup was:</strong> ${pickupTime}</p>
              <p>The customer will receive a full refund. No further action is required from you.</p>
              <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(e => console.error("Partner cancel email failed:", e?.message));
    }

    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `[Admin] Booking ${jobNo} cancelled by ${cancelledBy}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Booking <strong>${jobNo}</strong> cancelled by <strong>${cancelledBy}</strong>.</p>
            <p>
              <strong>Partner:</strong> ${companyName}<br/>
              <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
              <strong>Pickup was:</strong> ${pickupTime}<br/>
              <strong>Refund:</strong> full — ${fmt(refundAmount)}<br/>
              <strong>Stripe refund:</strong> ${refundResult.ok && !("already_processed" in refundResult) ? (refundResult.stripe_refund_id || "none (£0 refund)") : "see logs"}
            </p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          </div>
        `,
      }).catch(e => console.error("Admin cancel email failed:", e?.message));
    }

    return NextResponse.json({ ok: true, refund_status: "full", refund_amount: refundAmount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}