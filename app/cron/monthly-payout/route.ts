import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { invoiceGenerator } from "@/lib/portal/invoiceGenerator";

// Vercel cron — runs 1st of each month at 08:00 UTC
// vercel.json: { "path": "/api/cron/monthly-payout", "schedule": "0 8 1 * *" }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

function calcCommission(carHirePrice: number, commissionRate: number): number {
  return Math.max((carHirePrice * commissionRate) / 100, 10);
}

function calcPartnerPayout(carHirePrice: number, commissionRate: number, fuelCharge: number): number {
  const commission = calcCommission(carHirePrice, commissionRate);
  return Math.max(0, carHirePrice - commission + fuelCharge);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleSupabaseClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const runLabel = now.toLocaleString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });

  // Period month = previous month (cron runs on 1st, invoices cover the month just ended)
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  // ── Fetch all ready bookings ─────────────────────────────────────────────
  const { data: bookings, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, job_number, partner_user_id,
      car_hire_price, fuel_charge, commission_rate,
      currency, charge_currency, conversion_rate,
      payout_status, payment_id,
      pickup_at, booking_status, refund_status, cancellation_reason
    `)
    .eq("payout_status", "ready");

  if (bkErr) {
    console.error("monthly-payout: fetch error", bkErr.message);
    return NextResponse.json({ error: bkErr.message }, { status: 500 });
  }

  if (!bookings?.length) {
    console.log("monthly-payout: no ready bookings");
    return NextResponse.json({ ok: true, payouts: 0, skipped: 0 });
  }

  // ── Group by partner ─────────────────────────────────────────────────────
  const byPartner = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const group = byPartner.get(b.partner_user_id) || [];
    group.push(b);
    byPartner.set(b.partner_user_id, group);
  }

  // ── Fetch partner profiles ───────────────────────────────────────────────
  const partnerIds = [...byPartner.keys()];
  const { data: profiles, error: profErr } = await db
    .from("partner_profiles")
    .select(`
      user_id, company_name, contact_name,
      stripe_account_id, stripe_payouts_enabled,
      default_currency, commission_rate
    `)
    .in("user_id", partnerIds);

  if (profErr) {
    console.error("monthly-payout: profile fetch error", profErr.message);
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "")
    .split(",").map(e => e.trim()).filter(Boolean);

  let payoutsTriggered = 0;
  let skipped = 0;
  const results: Array<{ partner: string; status: string; amount?: number; currency?: string; error?: string }> = [];

  // ── Process each partner ─────────────────────────────────────────────────
  for (const [partnerUserId, partnerBookings] of byPartner) {
    const profile = profileMap.get(partnerUserId);

    if (!profile) {
      console.warn(`monthly-payout: no profile for ${partnerUserId} — skipping`);
      skipped++;
      results.push({ partner: partnerUserId, status: "skipped — no profile" });
      continue;
    }

    if (!profile.stripe_account_id || !profile.stripe_payouts_enabled) {
      console.warn(`monthly-payout: ${profile.company_name} — Stripe not ready, skipping`);
      skipped++;
      results.push({ partner: profile.company_name, status: "skipped — Stripe payouts not enabled" });
      continue;
    }

    const payoutCurrency = (profile.default_currency || "EUR").toUpperCase();

    // ── Calculate total payout ─────────────────────────────────────────────
    let totalPayout = 0;
    const bookingLines: string[] = [];

    for (const b of partnerBookings) {
      const carHire    = Number(b.car_hire_price || 0);
      const fuelCharge = Number(b.fuel_charge    || 0);
      const commRate   = Number(b.commission_rate ?? profile.commission_rate ?? 20);
      const commission = calcCommission(carHire, commRate);
      const payout     = calcPartnerPayout(carHire, commRate, fuelCharge);
      totalPayout += payout;

      const jobNo = b.job_number ? `#${b.job_number}` : b.id.slice(0, 8);
      const curr  = b.currency || payoutCurrency;
      const fmt   = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: curr }).format(n);
      bookingLines.push(`${jobNo}: car hire ${fmt(carHire)} − commission ${fmt(commission)} + fuel ${fmt(fuelCharge)} = ${fmt(payout)}`);
    }

    const totalCents = Math.round(totalPayout * 100);

    if (totalCents <= 0) {
      console.warn(`monthly-payout: ${profile.company_name} — payout is £0, skipping`);
      skipped++;
      results.push({ partner: profile.company_name, status: "skipped — zero payout" });
      continue;
    }

    const bookingIds = partnerBookings.map(b => b.id);
    const paymentIds = partnerBookings.map(b => b.payment_id).filter(Boolean) as string[];

    // ── Trigger Stripe transfer ────────────────────────────────────────────
    let transferId: string | null = null;
    try {
      const transfer = await stripe.transfers.create({
        amount:      totalCents,
        currency:    payoutCurrency.toLowerCase(),
        destination: profile.stripe_account_id,
        description: `Camel Global payout — ${runLabel} — ${partnerBookings.length} booking(s)`,
        metadata: {
          partner_user_id: partnerUserId,
          booking_count:   String(partnerBookings.length),
          payout_month:    runLabel,
          booking_ids:     bookingIds.slice(0, 5).join(","),
        },
      });
      transferId = transfer.id;
      console.log(`monthly-payout: ${profile.company_name} — transfer ${transferId} — ${payoutCurrency} ${totalPayout}`);
    } catch (stripeErr: any) {
      console.error(`monthly-payout: Stripe transfer failed for ${profile.company_name}:`, stripeErr?.message);
      skipped++;
      results.push({ partner: profile.company_name, status: `failed — ${stripeErr?.message}` });

      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: `[Admin] Payout FAILED — ${profile.company_name} — ${runLabel}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <p><strong>Stripe transfer failed</strong> for <strong>${profile.company_name}</strong> during the ${runLabel} payout run.</p>
              <p><strong>Amount:</strong> ${new Intl.NumberFormat("en-GB", { style: "currency", currency: payoutCurrency }).format(totalPayout)}<br/>
              <strong>Error:</strong> ${stripeErr?.message}</p>
              <p>Please resolve manually in the Stripe dashboard.</p>
            </div>
          `,
        }).catch(() => {});
      }
      continue;
    }

    // ── Mark bookings paid ─────────────────────────────────────────────────
    const { error: bkUpdateErr } = await db
      .from("partner_bookings")
      .update({
        payout_status:   "paid",
        paid_out_at:     nowIso,
        payout_batch_id: transferId,
      })
      .in("id", bookingIds);

    if (bkUpdateErr) {
      console.error(`monthly-payout: failed to mark bookings paid for ${profile.company_name}:`, bkUpdateErr.message);
    }

    // ── Mark payments paid ─────────────────────────────────────────────────
    if (paymentIds.length) {
      await db
        .from("payments")
        .update({ payout_status: "paid", paid_out_at: nowIso })
        .in("id", paymentIds);
    }

    payoutsTriggered++;
    results.push({ partner: profile.company_name, status: "paid", amount: totalPayout, currency: payoutCurrency });

    // ── Generate commission invoice ────────────────────────────────────────
    const invoiceBookings = partnerBookings.map(b => ({
      id:                  b.id,
      job_number:          b.job_number,
      pickup_at:           b.pickup_at,
      car_hire_price:      b.car_hire_price,
      commission_rate:     b.commission_rate,
      currency:            b.currency,
      booking_status:      b.booking_status,
      refund_status:       b.refund_status,
      cancellation_reason: b.cancellation_reason,
    }));

    const invoiceResult = await invoiceGenerator(partnerUserId, periodMonth, invoiceBookings);
    if (!invoiceResult.ok) {
      console.error(`monthly-payout: invoice generation failed for ${profile.company_name}:`, invoiceResult.error);
    } else {
      console.log(`monthly-payout: invoice ${invoiceResult.invoice_number} generated for ${profile.company_name}`);
    }

    // ── Email partner payout notification ─────────────────────────────────
    const { data: partnerAuthData } = await db.auth.admin.getUserById(partnerUserId);
    const partnerEmail = partnerAuthData?.user?.email || null;
    const fmt = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: payoutCurrency }).format(n);

    if (partnerEmail) {
      await sendEmail({
        to: partnerEmail,
        subject: `Your Camel Global payout for ${runLabel} — ${fmt(totalPayout)}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Monthly Payout</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">${runLabel}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${profile.contact_name || profile.company_name},</p>
              <p>Your payout for <strong>${runLabel}</strong> has been processed. Your commission invoice has been sent separately.</p>
              <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
                <p style="margin:0 0 12px;font-weight:700;">Payout Summary</p>
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                  ${bookingLines.map(line => `<tr><td style="padding:3px 0;color:#444;">${line}</td></tr>`).join("")}
                  <tr style="border-top:1px solid #ddd;">
                    <td style="padding:8px 0 4px;font-weight:700;font-size:15px;">Total: ${fmt(totalPayout)}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size:13px;color:#666;">The transfer has been sent to your Stripe account and should arrive within 2–5 business days.</p>
              <p style="font-size:13px;color:#666;">Stripe transfer reference: <code>${transferId}</code></p>
              <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team — NTUK Ltd</p>
            </div>
          </div>
        `,
      }).catch(e => console.error("Partner payout email failed:", e?.message));
    }

    // ── Email admin summary ────────────────────────────────────────────────
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `[Admin] Payout sent — ${profile.company_name} — ${fmt(totalPayout)} — ${runLabel}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <p>Payout processed for <strong>${profile.company_name}</strong>.</p>
            <p>
              <strong>Amount:</strong> ${fmt(totalPayout)}<br/>
              <strong>Currency:</strong> ${payoutCurrency}<br/>
              <strong>Bookings:</strong> ${partnerBookings.length}<br/>
              <strong>Stripe transfer:</strong> ${transferId}<br/>
              <strong>Invoice:</strong> ${invoiceResult.invoice_number || "generation failed"}
            </p>
            <pre style="font-size:12px;background:#f4f4f4;padding:12px;">${bookingLines.join("\n")}</pre>
          </div>
        `,
      }).catch(e => console.error("Admin payout email failed:", e?.message));
    }
  }

  // ── Final admin summary ────────────────────────────────────────────────────
  for (const adminEmail of adminEmails) {
    await sendEmail({
      to: adminEmail,
      subject: `[Admin] Monthly payout run complete — ${runLabel} — ${payoutsTriggered} paid, ${skipped} skipped`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <p>Monthly payout run for <strong>${runLabel}</strong> complete.</p>
          <p><strong>Payouts triggered:</strong> ${payoutsTriggered}<br/>
          <strong>Skipped:</strong> ${skipped}</p>
          <pre style="font-size:12px;background:#f4f4f4;padding:12px;">${results.map(r =>
            `${r.partner}: ${r.status}${r.amount ? ` — ${r.currency} ${r.amount.toFixed(2)}` : ""}`
          ).join("\n")}</pre>
        </div>
      `,
    }).catch(() => {});
  }

  console.log(`monthly-payout: done — ${payoutsTriggered} paid, ${skipped} skipped`);
  return NextResponse.json({ ok: true, payouts: payoutsTriggered, skipped, results });
}