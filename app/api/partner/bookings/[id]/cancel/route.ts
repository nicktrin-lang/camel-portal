import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { sendEmail, coerceEmailLocale, sendCustomerCancellationEmail, sendPartnerCancellationEmail, EmailLocale } from "@/lib/email";
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
      .select("id, customer_name, customer_email, customer_user_id, pickup_at, pickup_address")
      .eq("id", booking.request_id)
      .maybeSingle();

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name, phone, communication_locale")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const partnerLocale = coerceEmailLocale(partnerProfile?.communication_locale);
    let customerLocale: EmailLocale = "en";
    if (request?.customer_user_id) {
      const { data: custProfile } = await db
        .from("customer_profiles")
        .select("communication_locale")
        .eq("user_id", request.customer_user_id)
        .maybeSingle();
      customerLocale = coerceEmailLocale(custProfile?.communication_locale);
    }

    const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
    const partnerEmail = partnerAuthData?.user?.email || null;

    const cancelledBy = isAdmin ? "admin" : "partner";

    // ── Issue the Stripe refund FIRST — only cancel once the money is on its
    // way back. Abort without cancelling if the refund fails, so it can be retried.
    const refundResult = await cancelBookingRefund(bookingId, "full");
    if (!refundResult.ok) {
      console.error("Partner cancel refund error:", refundResult.error);
      return NextResponse.json(
        { error: `Refund failed — booking NOT cancelled, please retry: ${refundResult.error}` },
        { status: 502 }
      );
    }

    // ── Refund succeeded — mark booking + request cancelled ──────────────────
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

    const refundAmount = !("already_processed" in refundResult)
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
      await sendCustomerCancellationEmail(request.customer_email, {
        locale: customerLocale,
        jobNo,
        customerName: request.customer_name,
        cancelledByName: cancelledBy === "admin" ? "Camel Global" : companyName,
        reason,
        pickupTime,
        pickupAddress: request.pickup_address,
        refundAmountText: fmt(refundAmount),
        siteUrl,
      }).catch(e => console.error("Customer cancel email failed:", e?.message));
    }

    if (partnerEmail) {
      const actor: Record<EmailLocale, string> = cancelledBy === "admin"
        ? { en: "a Camel Global administrator", es: "un administrador de Camel Global", fr: "un administrateur Camel Global", it: "un amministratore di Camel Global", pt: "um administrador da Camel Global", de: "einen Camel Global Administrator" }
        : { en: "your account", es: "tu cuenta", fr: "votre compte", it: "il tuo account", pt: "a sua conta", de: "Ihr Konto" };
      await sendPartnerCancellationEmail(partnerEmail, {
        locale: partnerLocale,
        jobNo,
        cancelledByName: actor[partnerLocale] ?? actor.en,
        reason,
        customerName: request?.customer_name,
        pickupTime,
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