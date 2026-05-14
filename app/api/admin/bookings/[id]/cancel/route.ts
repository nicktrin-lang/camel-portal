import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { cancelBookingRefund } from "@/lib/portal/cancelBooking";

async function requireAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { ok: false as const, status: 401 };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!adminRow || !["admin", "super_admin"].includes(adminRow.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, db };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Not authorised" }, { status: gate.status });

    const { id: bookingId } = await params;
    if (!bookingId) return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim() || null;

    const { db } = gate;

    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`id, job_number, booking_status, partner_user_id, car_hire_price, fuel_price, currency, request_id`)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr)    return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.booking_status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

    const { data: request } = await db
      .from("customer_requests")
      .select("id, customer_name, customer_email, pickup_at, pickup_address")
      .eq("id", booking.request_id)
      .maybeSingle();

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
    const partnerEmail = partnerAuthData?.user?.email || null;

    // ── Mark booking cancelled ───────────────────────────────────────────────
    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        booking_status: "cancelled",
        cancelled_by: "admin",
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
      console.error("Admin cancel refund error:", refundResult.error);
      // Don't block — booking is already cancelled, log and continue
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
            <div style="background:#000;padding:20px 28px;"><h2 style="color:#fff;margin:0;">Booking Cancelled</h2></div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${request.customer_name || "there"},</p>
              <p>Your booking ${jobNo} has been cancelled by Camel Global.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <div style="background:#f0f0f0;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:700;">Full refund of ${fmt(refundAmount)} will be processed to your original payment method.</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666;">Please allow 5–10 business days for the refund to appear.</p>
              </div>
              <p>Questions? Email <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a></p>
              <a href="${siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Bookings</a>
            </div>
          </div>
        `,
      }).catch(e => console.error("Customer cancel email failed:", e?.message));
    }

    if (partnerEmail) {
      await sendEmail({
        to: partnerEmail,
        subject: `Booking ${jobNo} cancelled by Camel Global admin`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;"><h2 style="color:#fff;margin:0;">Booking Cancelled</h2></div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Booking ${jobNo} has been cancelled by Camel Global admin.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p>Customer will receive a full refund. No action required from you.</p>
              <p style="color:#999;font-size:13px;">The Camel Global Team</p>
            </div>
          </div>
        `,
      }).catch(e => console.error("Partner cancel email failed:", e?.message));
    }

    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `[Admin] Booking ${jobNo} cancelled by admin`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Booking <strong>${jobNo}</strong> cancelled by admin.</p>
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