import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  generateCompletionStatementPDF,
  getLogoBase64,
  StatementData,
  PostCompletionRefund,
} from "@/lib/portal/completeBooking";
import { sendEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

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
  req: NextRequest,
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

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    const amount: number = Number(body?.amount ?? 0);
    const reason: string = String(body?.reason ?? "").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    // ── Load booking ──────────────────────────────────────────────────────
    const { data: booking, error: bkErr } = await db
      .from("partner_bookings")
      .select(`
        id, partner_user_id, booking_status, request_id, payment_id,
        job_number, currency, car_hire_price, fuel_price, amount,
        fuel_used_quarters, fuel_charge, fuel_refund,
        collection_fuel_level_partner, collection_fuel_level_driver,
        return_fuel_level_partner, return_fuel_level_driver,
        post_completion_refund_total, commission_rate
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bkErr)    return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (booking.booking_status !== "completed") {
      return NextResponse.json({ error: "Post-completion refunds can only be issued on completed bookings" }, { status: 400 });
    }

    // ── Cap check: total refunded must not exceed final amount ────────────
    const carHire     = Number(booking.car_hire_price ?? 0);
    const fuelCharge  = Number(booking.fuel_charge ?? 0);
    const finalAmount = carHire + fuelCharge;
    const existingTotal = Number(booking.post_completion_refund_total ?? 0);
    const newTotal = existingTotal + amount;

    if (newTotal > finalAmount) {
      return NextResponse.json({
        error: `Refund would exceed final amount. Final amount: ${finalAmount.toFixed(2)}, already refunded: ${existingTotal.toFixed(2)}, maximum additional: ${(finalAmount - existingTotal).toFixed(2)}`,
      }, { status: 400 });
    }

    // ── Load payment for Stripe intent ────────────────────────────────────
    const { data: payment } = await db
      .from("payments")
      .select("id, stripe_payment_intent_id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!payment?.stripe_payment_intent_id) {
      return NextResponse.json({ error: "No Stripe payment intent found for this booking" }, { status: 400 });
    }

    const jobNo = booking.job_number ? `#${booking.job_number}` : bookingId.slice(0, 8);
    let stripeRefundId: string | null = null;
    let reversalAmount = 0;

    try {
      // ── Fetch payment intent and transfer ────────────────────────────────
      const pi = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
        { expand: ["latest_charge"] }
      );
      const charge     = pi.latest_charge as any;
      const transferId = charge?.transfer as string | null;

      if (transferId) {
        // ── Fetch the actual transfer from Stripe to get real available balance
        // This is the source of truth — avoids any calculation errors
        const transfer = await stripe.transfers.retrieve(transferId, {
          expand: ["reversals"],
        });

        const transferAmountCents  = transfer.amount;                          // total sent to partner
        const alreadyReversedCents = transfer.amount_reversed;                 // already pulled back
        const availableCents       = transferAmountCents - alreadyReversedCents; // what's still with partner
        const requestedCents       = Math.round(amount * 100);
        const reversalCents        = Math.min(requestedCents, availableCents); // only reverse what's there

        reversalAmount = reversalCents / 100;

        if (reversalCents > 0) {
          await stripe.transfers.createReversal(transferId, {
            amount: reversalCents,
            metadata: {
              refund_type:     "post_completion_refund",
              booking_id:      bookingId,
              job_number:      jobNo,
              reason:          reason || "Post-completion adjustment",
              issued_by:       email,
              reversal_amount: String(reversalAmount),
              refund_amount:   String(amount),
              camel_absorbs:   String(amount - reversalAmount),
            },
          });
        } else {
          console.warn(`post-refund: transfer ${transferId} has no remaining balance — refunding entirely from Camel balance`);
        }
      } else {
        console.warn(`post-refund: no transfer found on payment intent ${payment.stripe_payment_intent_id} — skipping transfer reversal`);
      }

      // ── Refund the full amount to the customer from Camel's balance ──────
      // Any shortfall (amount - reversalAmount) comes from Camel's commission
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: Math.round(amount * 100),
        reason: "requested_by_customer",
        metadata: {
          refund_type:     "post_completion_refund",
          booking_id:      bookingId,
          job_number:      jobNo,
          reason:          reason || "Post-completion adjustment",
          issued_by:       email,
          reversal_amount: String(reversalAmount),
          camel_absorbs:   String(amount - reversalAmount),
        },
      });
      stripeRefundId = refund.id;

    } catch (stripeErr: any) {
      return NextResponse.json({ error: `Stripe refund failed: ${stripeErr?.message}` }, { status: 500 });
    }

    const camelAbsorbs = amount - reversalAmount;

    // ── Insert into partner_booking_refunds ───────────────────────────────
    const { data: refundRow, error: insertErr } = await db
      .from("partner_booking_refunds")
      .insert({
        booking_id:       bookingId,
        amount,
        reason:           reason || null,
        stripe_refund_id: stripeRefundId,
      })
      .select("id, booking_id, amount, reason, stripe_refund_id, created_at")
      .single();

    if (insertErr) {
      console.error("post-refund: DB insert failed", insertErr.message);
      return NextResponse.json({ error: `DB insert failed: ${insertErr.message}` }, { status: 500 });
    }

    // ── Update post_completion_refund_total on partner_bookings ───────────
    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({ post_completion_refund_total: newTotal })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("post-refund: booking update failed", updateErr.message);
    }

    // ── Fetch ALL refunds for this booking (for amended PDF) ──────────────
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

    // ── Load request + partner profile ────────────────────────────────────
    const request = await fetchCustomerRequest(booking.request_id);

    const { data: partnerProfile } = await db
      .from("partner_profiles")
      .select("company_name, contact_name, communication_locale")
      .eq("user_id", booking.partner_user_id)
      .maybeSingle();

    const companyName = partnerProfile?.company_name || "the car hire company";
    const currency    = booking.currency || "EUR";
    const locale      = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
    const fmt         = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";

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

    // ── Generate amended PDF ──────────────────────────────────────────────
    const fuelDep   = Number(booking.fuel_price ?? 0);
    const totalPaid = Number(booking.amount ?? carHire + fuelDep);
    const usedQ     = Number(booking.fuel_used_quarters ?? 0);

    const collectionFuel =
      (booking.collection_fuel_level_partner as string | null) ||
      (booking.collection_fuel_level_driver  as string | null);
    const returnFuel =
      (booking.return_fuel_level_partner as string | null) ||
      (booking.return_fuel_level_driver  as string | null);

    let statementBase64: string | null = null;
    const statementFilename = `Camel-Amended-Statement-${booking.job_number ?? bookingId.slice(0, 8)}.pdf`;

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
      console.error("post-refund: PDF generation failed", pdfErr?.message);
    }

    const totalRefunded = postCompletionRefunds.reduce((s, r) => s + r.amount, 0);
    const netFinal = finalAmount - totalRefunded;

    // ── Email customer ────────────────────────────────────────────────────
    if (request?.customer_email) {
      const custSubject = customerLocale === "es"
        ? `Resumen de reserva actualizado — reembolso emitido — ${jobNo}`
        : `Updated booking statement — refund issued — ${jobNo}`;

      const refundListHtml = postCompletionRefunds.map((r, i) =>
        `<tr><td style="padding:4px 0;color:#666;">Refund ${i + 1}${r.reason ? ` — ${r.reason}` : ""}</td><td style="text-align:right;color:#cc5500;font-weight:700;">− ${fmt(r.amount)}</td></tr>`
      ).join("");

      const custHtml = customerLocale === "es" ? `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">Resumen de reserva actualizado</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">Reserva ${jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>Hola ${request.customer_name || ""},</p>
            <p>Hemos emitido un reembolso para tu reserva ${jobNo} con <strong>${companyName}</strong>. Por favor encuentra el resumen actualizado adjunto.</p>
            <div style="background:#fff3e0;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">Ajustes posteriores a la finalización</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">Importe final original</td><td style="text-align:right;">${fmt(finalAmount)}</td></tr>
                ${refundListHtml}
                <tr style="border-top:2px solid #ff7a00;"><td style="padding:8px 0 4px;font-weight:700;">Importe neto final</td><td style="text-align:right;font-weight:700;">${fmt(netFinal)}</td></tr>
              </table>
              <p style="margin:8px 0 0;font-size:13px;color:#cc5500;">Se ha emitido un reembolso de <strong>${fmt(amount)}</strong> en tu método de pago original. Por favor permite 5–10 días laborables para que aparezca.</p>
            </div>
            <p style="font-size:13px;color:#666;">Si tienes alguna pregunta, contáctanos en <a href="mailto:info@camel-global.com">info@camel-global.com</a>.</p>
            <a href="${siteUrl}/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">Ver mi reserva</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">Saludos,<br/>El equipo de Camel Global</p>
          </div>
        </div>
      ` : `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">Updated booking statement</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>Hi ${request.customer_name || "there"},</p>
            <p>We have issued a refund on your booking ${jobNo} with <strong>${companyName}</strong>. Please find your updated completion statement attached.</p>
            <div style="background:#fff3e0;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">Post-completion adjustments</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">Original final amount</td><td style="text-align:right;">${fmt(finalAmount)}</td></tr>
                ${refundListHtml}
                <tr style="border-top:2px solid #ff7a00;"><td style="padding:8px 0 4px;font-weight:700;">Net final amount</td><td style="text-align:right;font-weight:700;">${fmt(netFinal)}</td></tr>
              </table>
              <p style="margin:8px 0 0;font-size:13px;color:#cc5500;">A refund of <strong>${fmt(amount)}</strong> has been issued to your original payment method. Please allow 5–10 business days for it to appear.</p>
            </div>
            <p style="font-size:13px;color:#666;">If you have any questions please contact us at <a href="mailto:info@camel-global.com">info@camel-global.com</a>.</p>
            <a href="${siteUrl}/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View my booking</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">Best Regards,<br/>The Camel Global Team</p>
          </div>
        </div>
      `;

      await sendEmail({
        to:      request.customer_email,
        subject: custSubject,
        html:    custHtml,
        ...(statementBase64 ? {
          attachments: [{
            filename: statementFilename,
            content:  statementBase64,
            encoding: "base64",
          }],
        } : {}),
      }).catch(e => console.error("post-refund customer email failed:", e?.message));
    }

    // ── Email admin ───────────────────────────────────────────────────────
    const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "")
      .split(",").map(e => e.trim()).filter(Boolean);

    for (const adminEmail of adminEmails) {
      await sendEmail({
        to:      adminEmail,
        subject: `[Admin] Post-completion refund issued — Booking ${jobNo} — ${fmt(amount)}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>A post-completion refund has been issued.</p>
            <p>
              <strong>Booking:</strong> ${jobNo}<br/>
              <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
              <strong>Partner:</strong> ${companyName}<br/>
              <strong>Refund amount:</strong> ${fmt(amount)}<br/>
              <strong>Reason:</strong> ${reason || "—"}<br/>
              <strong>Stripe refund ID:</strong> ${stripeRefundId || "—"}<br/>
              <strong>Issued by admin:</strong> ${email}<br/>
              <strong>Total post-completion refunded:</strong> ${fmt(newTotal)}<br/>
              <strong>Original final amount:</strong> ${fmt(finalAmount)}<br/>
              <strong>Net final amount:</strong> ${fmt(netFinal)}<br/>
              <strong>Reversed from partner:</strong> ${fmt(reversalAmount)}<br/>
              <strong>Absorbed by Camel (from commission):</strong> ${fmt(camelAbsorbs)}
            </p>
          </div>
        `,
      }).catch(e => console.error("post-refund admin email failed:", e?.message));
    }

    return NextResponse.json({
      ok: true,
      refund_id:             refundRow.id,
      stripe_refund_id:      stripeRefundId,
      amount,
      new_total:             newTotal,
      net_final:             netFinal,
      reversed_from_partner: reversalAmount,
      absorbed_by_camel:     camelAbsorbs,
    }, { status: 200 });

  } catch (e: any) {
    console.error("post-refund route error:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
