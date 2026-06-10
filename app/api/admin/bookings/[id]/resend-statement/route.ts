import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  generateCompletionStatementPDF,
  getLogoBase64,
  fuelLabel,
  StatementData,
  PostCompletionRefund,
} from "@/lib/portal/completeBooking";
import { sendEmail } from "@/lib/email";

async function fetchCustomerRequest(requestId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  try {
    const res = await fetch(
      `${url}/rest/v1/customer_requests?id=eq.${requestId}&select=customer_name,customer_email,customer_user_id,pickup_address,dropoff_address,pickup_at,dropoff_at,journey_duration_minutes,vehicle_category_name`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // ── Auth — admin only ─────────────────────────────────────────────────
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow } = await db
      .from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !["admin", "super_admin"].includes(adminRow.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // ── Load booking ──────────────────────────────────────────────────────
    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`
        id, partner_user_id, booking_status, request_id,
        job_number, currency, car_hire_price, fuel_price, amount,
        fuel_used_quarters, fuel_charge, fuel_refund,
        collection_fuel_level_partner, collection_fuel_level_driver,
        return_fuel_level_partner, return_fuel_level_driver,
        post_completion_refund_total
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr)    return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (booking.booking_status !== "completed") {
      return NextResponse.json({ error: "Statements can only be sent for completed bookings" }, { status: 400 });
    }

    // ── Load all post-completion refunds ──────────────────────────────────
    const { data: allRefunds } = await db
      .from("partner_booking_refunds")
      .select("id, amount, reason, stripe_refund_id, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    const postCompletionRefunds: PostCompletionRefund[] = (allRefunds ?? []).map((r: any) => ({
      id:               r.id,
      amount:           Number(r.amount),
      reason:           r.reason ?? null,
      stripe_refund_id: r.stripe_refund_id ?? null,
      created_at:       r.created_at,
    }));

    // ── Load request + partner ────────────────────────────────────────────
    const request = await fetchCustomerRequest(booking.request_id);

    if (!request?.customer_email) {
      return NextResponse.json({ error: "No customer email found for this booking" }, { status: 400 });
    }

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const companyName = partnerProfile?.company_name || "the car hire company";
    const currency    = booking.currency || "EUR";
    const locale      = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
    const fmt         = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
    const jobNo       = booking.job_number ? `#${booking.job_number}` : bookingId.slice(0, 8);

    // ── Customer locale ───────────────────────────────────────────────────
    let customerLocale: "en" | "es" = "en";
    try {
      if (request?.customer_user_id) {
        const { data: custProfile } = await db
          .from("customer_profiles")
          .select("communication_locale")
          .eq("user_id", request.customer_user_id)
          .maybeSingle();
        if (custProfile?.communication_locale === "es") customerLocale = "es";
      }
    } catch { /* fallback to en */ }

    // ── Build PDF ─────────────────────────────────────────────────────────
    const carHire    = Number(booking.car_hire_price ?? 0);
    const fuelDep    = Number(booking.fuel_price     ?? 0);
    const totalPaid  = Number(booking.amount         ?? carHire + fuelDep);
    const fuelCharge = Number(booking.fuel_charge    ?? 0);
    const usedQ      = Number(booking.fuel_used_quarters ?? 0);

    const collectionFuel =
      (booking.collection_fuel_level_partner as string | null) ||
      (booking.collection_fuel_level_driver  as string | null);
    const returnFuel =
      (booking.return_fuel_level_partner as string | null) ||
      (booking.return_fuel_level_driver  as string | null);

    const isAmended = postCompletionRefunds.length > 0;
    const totalRefunded = postCompletionRefunds.reduce((s, r) => s + r.amount, 0);
    const finalAmount = carHire + fuelCharge;
    const netFinal    = finalAmount - totalRefunded;

    let statementBase64: string | null = null;
    const statementFilename = isAmended
      ? `Camel-Amended-Statement-${booking.job_number ?? bookingId.slice(0, 8)}.pdf`
      : `Camel-Completion-Statement-${booking.job_number ?? bookingId.slice(0, 8)}.pdf`;

    try {
      const statementData: StatementData = {
        jobNumber:            booking.job_number,
        bookingId,
        customerName:         request?.customer_name    || null,
        pickupAddress:        request?.pickup_address   || null,
        dropoffAddress:       request?.dropoff_address  || null,
        pickupAt:             request?.pickup_at        || null,
        dropoffAt:            request?.dropoff_at       || null,
        durationMinutes:      request?.journey_duration_minutes || null,
        vehicleCategory:      request?.vehicle_category_name   || null,
        companyName,
        currency,
        carHire,
        fuelDeposit:          fuelDep,
        totalPaid,
        collectionFuel,
        returnFuel,
        usedQuarters:         usedQ,
        fuelCharge,
        fuelRefund:           Number(booking.fuel_refund ?? 0),
        issuedAt:             new Date().toISOString(),
        logoBase64:           getLogoBase64(),
        postCompletionRefunds,
      };
      const pdfBuffer = await generateCompletionStatementPDF(statementData);
      statementBase64 = pdfBuffer.toString("base64");
    } catch (pdfErr: any) {
      console.error("resend-statement: PDF generation failed", pdfErr?.message);
      return NextResponse.json({ error: `PDF generation failed: ${pdfErr?.message}` }, { status: 500 });
    }

    // ── Build email body ──────────────────────────────────────────────────
    const refundListHtml = postCompletionRefunds.map((r, i) =>
      `<tr><td style="padding:4px 0;color:#666;">Refund ${i + 1}${r.reason ? ` — ${r.reason}` : ""}</td><td style="text-align:right;color:#cc5500;font-weight:700;">− ${fmt(r.amount)}</td></tr>`
    ).join("");

    const adjustmentBlock = isAmended ? (customerLocale === "es" ? `
      <div style="background:#fff3e0;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
        <p style="margin:0 0 8px;font-weight:700;">Ajustes posteriores a la finalización</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#666;">Importe final original</td><td style="text-align:right;">${fmt(finalAmount)}</td></tr>
          ${refundListHtml}
          <tr style="border-top:2px solid #ff7a00;"><td style="padding:8px 0 4px;font-weight:700;">Importe neto final</td><td style="text-align:right;font-weight:700;">${fmt(netFinal)}</td></tr>
        </table>
      </div>
    ` : `
      <div style="background:#fff3e0;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
        <p style="margin:0 0 8px;font-weight:700;">Post-completion adjustments</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#666;">Original final amount</td><td style="text-align:right;">${fmt(finalAmount)}</td></tr>
          ${refundListHtml}
          <tr style="border-top:2px solid #ff7a00;"><td style="padding:8px 0 4px;font-weight:700;">Net final amount</td><td style="text-align:right;font-weight:700;">${fmt(netFinal)}</td></tr>
        </table>
      </div>
    `) : "";

    const subject = customerLocale === "es"
      ? `Tu resumen de finalización de reserva — ${jobNo}${isAmended ? " (enmendado)" : ""}`
      : `Your booking completion statement — ${jobNo}${isAmended ? " (amended)" : ""}`;

    const html = customerLocale === "es" ? `
      <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
        <div style="background:#000;padding:20px 28px;">
          <h2 style="color:#fff;margin:0;">${isAmended ? "Resumen de reserva enmendado" : "Resumen de finalización de reserva"}</h2>
          <p style="color:#999;margin:4px 0 0;font-size:13px;">Reserva ${jobNo}</p>
        </div>
        <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
          <p>Hola ${request.customer_name || ""},</p>
          <p>${isAmended
            ? `Adjunto encontrarás el resumen de finalización enmendado para tu reserva ${jobNo} con <strong>${companyName}</strong>. Este documento reemplaza cualquier resumen emitido anteriormente.`
            : `Adjunto encontrarás el resumen de finalización para tu reserva ${jobNo} con <strong>${companyName}</strong>.`
          }</p>
          ${adjustmentBlock}
          <p style="font-size:13px;color:#666;">Si tienes alguna pregunta, contáctanos en <a href="mailto:info@camel-global.com">info@camel-global.com</a>.</p>
          <a href="${siteUrl}/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">Ver mi reserva</a>
          <p style="margin-top:24px;color:#999;font-size:13px;">Saludos,<br/>El equipo de Camel Global</p>
        </div>
      </div>
    ` : `
      <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
        <div style="background:#000;padding:20px 28px;">
          <h2 style="color:#fff;margin:0;">${isAmended ? "Amended booking completion statement" : "Booking completion statement"}</h2>
          <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
        </div>
        <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
          <p>Hi ${request.customer_name || "there"},</p>
          <p>${isAmended
            ? `Please find attached the amended completion statement for your booking ${jobNo} with <strong>${companyName}</strong>. This document supersedes any previously issued statement.`
            : `Please find attached your completion statement for booking ${jobNo} with <strong>${companyName}</strong>.`
          }</p>
          ${adjustmentBlock}
          <p style="font-size:13px;color:#666;">If you have any questions please contact us at <a href="mailto:info@camel-global.com">info@camel-global.com</a>.</p>
          <a href="${siteUrl}/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View my booking</a>
          <p style="margin-top:24px;color:#999;font-size:13px;">Best Regards,<br/>The Camel Global Team</p>
        </div>
      </div>
    `;

    await sendEmail({
      to:      request.customer_email,
      subject,
      html,
      ...(statementBase64 ? {
        attachments: [{
          filename: statementFilename,
          content:  statementBase64,
          encoding: "base64",
        }],
      } : {}),
    });

    // ── Log to admin ──────────────────────────────────────────────────────
    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "")
      .split(",").map(e => e.trim()).filter(Boolean);

    for (const adminEmail of adminEmails) {
      await sendEmail({
        to:      adminEmail,
        subject: `[Admin] Statement resent — Booking ${jobNo}${isAmended ? " (amended)" : ""}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Completion statement manually resent by admin.</p>
            <p>
              <strong>Booking:</strong> ${jobNo}<br/>
              <strong>Customer:</strong> ${request.customer_name || "—"} (${request.customer_email})<br/>
              <strong>Partner:</strong> ${companyName}<br/>
              <strong>Amended:</strong> ${isAmended ? `Yes — ${postCompletionRefunds.length} refund(s) totalling ${fmt(totalRefunded)}` : "No — original statement"}<br/>
              <strong>Resent by admin:</strong> ${email}
            </p>
          </div>
        `,
      }).catch(e => console.error("resend-statement admin email failed:", e?.message));
    }

    return NextResponse.json({
      ok:       true,
      amended:  isAmended,
      sent_to:  request.customer_email,
    }, { status: 200 });

  } catch (e: any) {
    console.error("resend-statement route error:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}