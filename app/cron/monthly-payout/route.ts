import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { generateCommissionInvoice } from "@/lib/portal/generateCommissionInvoice";
import { generateMonthlyStatement } from "@/lib/portal/generateMonthlyStatementPDF";
import { coerceCurrency } from "@/lib/currency";

// Vercel cron — runs 1st of each month at 08:00 UTC
// vercel.json: { "path": "/api/cron/monthly-payout", "schedule": "0 8 1 * *" }
//
// Platform-hold model: the charge already settled to Camel's balance; this cron is
// the SINGLE partner payout (there is no charge-time transfer any more). It pays each
// partner the sum of their bookings' canonical settled_partner_net, one transfer per
// (partner, currency), reading stored values — never recomputing — so it reconciles
// to the cent with reports. Commission stays on Camel's balance.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleSupabaseClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const runDateLabel = now.toLocaleString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });

  // A booking's payout is tied to the month it actually SETTLED (completion or <48h
  // cancel = settled_at), never to the run date. We only pay bookings that settled in
  // an already-CLOSED month; anything settled in the current still-open month is
  // deferred to next month's run. This removes end-of-month cutoff ambiguity — a
  // cancellation at 30 Jun 23:59 lands in June, one at 1 Jul 00:01 lands in July.
  const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const monthKey = (ts: string | null): string => {
    const d = new Date(ts || nowIso);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = (ym: string): string => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
  };

  // ── Fetch all ready bookings ─────────────────────────────────────────────
  const { data: bookings, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, job_number, partner_user_id,
      car_hire_price, fuel_charge, fuel_refund, commission_rate, commission_amount,
      settled_partner_net,
      currency, charge_currency, conversion_rate,
      payout_status, payment_id,
      created_at, settled_at, booking_status, refund_status, cancellation_reason
    `)
    .eq("payout_status", "ready")
    .eq("payout_hold", false);

  if (bkErr) {
    console.error("monthly-payout: fetch error", bkErr.message);
    return NextResponse.json({ error: bkErr.message }, { status: 500 });
  }

  if (!bookings?.length) {
    console.log("monthly-payout: no ready bookings");
    return NextResponse.json({ ok: true, payouts: 0, skipped: 0, deferred: 0 });
  }

  // Defer bookings that settled in the current (still-open) month to next month's run.
  // Fall back to created_at only if settled_at is somehow missing (shouldn't happen —
  // completion and <48h cancel both stamp settled_at).
  const eligible = bookings.filter(b => new Date(b.settled_at || b.created_at) < startOfCurrentMonth);
  const deferred = bookings.length - eligible.length;
  if (deferred > 0) console.log(`monthly-payout: deferring ${deferred} booking(s) settled in the current open month`);

  if (!eligible.length) {
    console.log("monthly-payout: no bookings from a closed month to pay");
    return NextResponse.json({ ok: true, payouts: 0, skipped: 0, deferred });
  }

  // ── Group by partner + currency + settlement month ───────────────────────
  // Per-currency so we NEVER sum across currencies; per settlement-month so each
  // payout, commission invoice and statement is tied to the month work settled.
  const byGroup = new Map<string, typeof bookings>();
  for (const b of eligible) {
    const groupKey = `${b.partner_user_id}::${coerceCurrency(b.currency)}::${monthKey(b.settled_at)}`;
    const group = byGroup.get(groupKey) || [];
    group.push(b);
    byGroup.set(groupKey, group);
  }

  // ── Fetch partner profiles ───────────────────────────────────────────────
  const partnerIds = [...new Set(eligible.map(b => b.partner_user_id))];
  const { data: profiles, error: profErr } = await db
    .from("partner_profiles")
    .select(`
      user_id, company_name, contact_name,
      stripe_account_id, stripe_payouts_enabled, stripe_recipient_id, payout_rail,
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

  // ── Process each (partner, currency, settlement-month) group ─────────────
  for (const [groupKey, partnerBookings] of byGroup) {
    const [partnerUserId, payoutCurrency, periodMonth] = groupKey.split("::");
    const runLabel = monthLabel(periodMonth);   // the settlement month this group is paid for
    const profile = profileMap.get(partnerUserId);

    if (!profile) {
      console.warn(`monthly-payout: no profile for ${partnerUserId} — skipping`);
      skipped++;
      results.push({ partner: partnerUserId, status: "skipped — no profile" });
      continue;
    }

    const payoutRail = profile.payout_rail || "connect";

    // ── Sum the canonical settled net (stored at completion / <48h cancel) ──
    // Read, never recompute — this is what makes the payout tie out with reports.
    let totalPayout = 0;
    const bookingLines: string[] = [];
    for (const b of partnerBookings) {
      const net = Number(b.settled_partner_net || 0);
      totalPayout += net;

      const jobNo      = b.job_number ? `#${b.job_number}` : b.id.slice(0, 8);
      const fmt        = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: payoutCurrency }).format(n);
      const carHire    = Number(b.car_hire_price    || 0);
      const commission = Number(b.commission_amount || 0);
      const fuelCharge = Number(b.fuel_charge        || 0);
      bookingLines.push(`${jobNo}: car hire ${fmt(carHire)} − commission ${fmt(commission)} + fuel used ${fmt(fuelCharge)} = ${fmt(net)}`);
    }

    const totalCents = Math.round(totalPayout * 100);

    if (totalCents <= 0) {
      console.warn(`monthly-payout: ${profile.company_name} (${payoutCurrency}) — zero payout, skipping`);
      skipped++;
      results.push({ partner: profile.company_name, currency: payoutCurrency, status: "skipped — zero payout" });
      continue;
    }

    const bookingIds = partnerBookings.map(b => b.id);
    const paymentIds = partnerBookings.map(b => b.payment_id).filter(Boolean) as string[];

    // Idempotency key is derived from the EXACT set of bookings being paid (sorted,
    // hashed), not just (partner, period, currency). This keeps the true double-pay
    // guard — a re-run over the SAME still-'ready' set reuses the key and Stripe
    // returns the existing transfer rather than sending a second one — while making
    // sure a *failed* attempt (e.g. funds hadn't settled) can't poison the key: the
    // real dedup is the 'ready'→'paid' flip, so once the cause is fixed the retry
    // proceeds. Without this, a transient failure on the 1st blocks the partner for 24h.
    const bookingSetHash = crypto
      .createHash("sha1")
      .update([...bookingIds].sort().join(","))
      .digest("hex")
      .slice(0, 12);

    // ── AU/NZ Global Payouts rail — built in P5. Until then leave as 'ready'. ─
    if (payoutRail === "global_payouts") {
      console.warn(`monthly-payout: ${profile.company_name} (${payoutCurrency}) — Global Payouts (AU/NZ) rail not yet enabled, leaving ready`);
      skipped++;
      results.push({ partner: profile.company_name, currency: payoutCurrency, status: "skipped — Global Payouts (AU/NZ) not yet enabled" });
      continue;
    }

    // ── In-corridor: require a payouts-enabled connected account ────────────
    if (!profile.stripe_account_id || !profile.stripe_payouts_enabled) {
      console.warn(`monthly-payout: ${profile.company_name} — Stripe payouts not enabled, skipping`);
      skipped++;
      results.push({ partner: profile.company_name, currency: payoutCurrency, status: "skipped — Stripe payouts not enabled" });
      continue;
    }

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
          currency:        payoutCurrency,
          booking_ids:     bookingIds.slice(0, 5).join(","),
        },
      }, {
        // Same key on a re-run returns the SAME transfer — the cron can never
        // double-pay even if it re-runs or times out mid-batch.
        idempotencyKey: `payout_${partnerUserId}_${periodMonth}_${payoutCurrency}_${bookingSetHash}`,
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
    // The Stripe transfer id is TEXT (tr_...). It goes in payout_transfer_id — NOT
    // in payout_batch_id, which is a uuid column: writing tr_... there fails 22P02.
    // Because the money has ALREADY moved by this point, this update failing must
    // NOT be swallowed (it previously was, leaving money sent + booking still 'ready').
    const { error: bkUpdateErr } = await db
      .from("partner_bookings")
      .update({
        payout_status:      "paid",
        paid_out_at:        nowIso,
        payout_transfer_id: transferId,
      })
      .in("id", bookingIds);

    // ── Mark payments paid ─────────────────────────────────────────────────
    let pmtUpdateErr: string | null = null;
    if (paymentIds.length) {
      const { error } = await db
        .from("payments")
        .update({ payout_status: "paid", paid_out_at: nowIso, payout_transfer_id: transferId })
        .in("id", paymentIds);
      pmtUpdateErr = error?.message || null;
    }

    // Transfer succeeded but we couldn't record it → split-brain (money sent, rows
    // not marked paid). Alert loudly with the transfer id for manual reconciliation.
    // The booking-set idempotency key guarantees a later re-run returns the SAME
    // transfer (no double pay) once the DB issue is fixed.
    if (bkUpdateErr || pmtUpdateErr) {
      const dbErr = bkUpdateErr?.message || pmtUpdateErr;
      console.error(`monthly-payout: TRANSFER SENT (${transferId}) but DB update FAILED for ${profile.company_name}:`, dbErr);
      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: `[Admin] Payout SENT but not recorded — ${profile.company_name} — ${transferId}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <p><strong>The Stripe transfer succeeded but the database update failed.</strong> The money HAS moved.</p>
              <p><strong>Partner:</strong> ${profile.company_name}<br/>
              <strong>Transfer:</strong> ${transferId}<br/>
              <strong>Amount:</strong> ${new Intl.NumberFormat("en-GB", { style: "currency", currency: payoutCurrency }).format(totalPayout)}<br/>
              <strong>Bookings:</strong> ${bookingIds.join(", ")}<br/>
              <strong>DB error:</strong> ${dbErr}</p>
              <p>Set these bookings <code>payout_status='paid'</code>, <code>payout_transfer_id='${transferId}'</code> manually so reports reconcile.</p>
            </div>
          `,
        }).catch(() => {});
      }
    }

    payoutsTriggered++;
    results.push({ partner: profile.company_name, status: "paid", amount: totalPayout, currency: payoutCurrency });

    // ── Generate commission invoice ────────────────────────────────────────
    const invoiceBookings = partnerBookings.map(b => ({
      id:                  b.id,
      job_number:          b.job_number,
      created_at:          b.created_at,
      car_hire_price:      b.car_hire_price,
      commission_rate:     b.commission_rate,
      commission_amount:   b.commission_amount,
      currency:            b.currency,
      booking_status:      b.booking_status,
      refund_status:       b.refund_status,
      cancellation_reason: b.cancellation_reason,
    }));

    const invoiceResult = await generateCommissionInvoice(partnerUserId, periodMonth, invoiceBookings);
    if (!invoiceResult.ok) {
      console.error(`monthly-payout: invoice generation failed for ${profile.company_name}:`, invoiceResult.error);
    } else {
      console.log(`monthly-payout: invoice ${invoiceResult.invoice_number} generated for ${profile.company_name}`);
    }

    // ── Monthly statement PDF — full list of the period's transactions ─────
    const statementBookings = partnerBookings.map(b => ({
      id:                  b.id,
      job_number:          b.job_number,
      created_at:          b.created_at,
      car_hire_price:      b.car_hire_price,
      commission_amount:   b.commission_amount,
      fuel_charge:         b.fuel_charge,
      fuel_refund:         b.fuel_refund,
      settled_partner_net: b.settled_partner_net,
      currency:            b.currency,
      booking_status:      b.booking_status,
      refund_status:       b.refund_status,
    }));
    await generateMonthlyStatement(partnerUserId, periodMonth, statementBookings, payoutCurrency)
      .catch(e => console.error(`monthly-payout: statement generation failed for ${profile.company_name}:`, e?.message));

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
      subject: `[Admin] Monthly payout run complete — ${runDateLabel} — ${payoutsTriggered} paid, ${skipped} skipped`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <p>Monthly payout run executed on <strong>${runDateLabel}</strong> complete. Each payout below is labelled by the month its bookings settled.</p>
          <p><strong>Payouts triggered:</strong> ${payoutsTriggered}<br/>
          <strong>Skipped:</strong> ${skipped}<br/>
          <strong>Deferred (settled this month, pay next run):</strong> ${deferred}</p>
          <pre style="font-size:12px;background:#f4f4f4;padding:12px;">${results.map(r =>
            `${r.partner}: ${r.status}${r.amount ? ` — ${r.currency} ${r.amount.toFixed(2)}` : ""}`
          ).join("\n")}</pre>
        </div>
      `,
    }).catch(() => {});
  }

  console.log(`monthly-payout: done — ${payoutsTriggered} paid, ${skipped} skipped, ${deferred} deferred`);
  return NextResponse.json({ ok: true, payouts: payoutsTriggered, skipped, deferred, results });
}