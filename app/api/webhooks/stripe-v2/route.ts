import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getOutboundPayment, classifyOutboundPaymentStatus, sumQuoteFees } from "@/lib/portal/stripeGlobalPayouts";
import { sendEmail } from "@/lib/email";

// ─────────────────────────────────────────────────────────────────────────────
// Stripe v2 webhook endpoint — AU/NZ Global Payouts (OutboundPayment lifecycle).
//
// SEPARATE from the v1 endpoint on purpose: v2 delivers "thin events" (a minimal
// envelope naming the object, not the object itself) and is configured with its
// own signing secret. Mixing them would mean one bad secret breaks both rails.
//
// Why this endpoint is load-bearing: an OutboundPayment is ASYNCHRONOUS. The
// cron creates it and gets back `created`/`processing` — the money is in flight,
// NOT delivered. Local bank settlement takes 1-7 days and can still fail or be
// returned on bad bank details. Without this handler the booking would sit at
// "paid" forever while the partner never received a cent.
//
// Bookings are therefore left at `paying` by the cron and only promoted to
// `paid` here, on `posted`. A failure returns them to `ready` so the next run
// retries, and alerts an admin.
// ─────────────────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const adminEmails = () =>
  String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

async function alertAdmin(subject: string, html: string) {
  for (const to of adminEmails()) {
    await sendEmail({ to, subject, html }).catch(e =>
      console.error("v2 webhook admin email failed:", e?.message)
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  // v2 endpoints get their own signing secret; fall back to the v1 secret only
  // if a dedicated one has not been configured yet.
  const secret = process.env.STRIPE_V2_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET!;

  // The signing scheme is identical to v1, so constructEvent validates it. The
  // PAYLOAD shape differs (thin event), hence the `any`.
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret) as any;
  } catch (e: any) {
    console.error("v2 webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = String(event?.type || "");

  // Ignore anything that is not an OutboundPayment lifecycle event, but 200 it —
  // a non-2xx makes Stripe retry an event we are never going to care about.
  if (!type.startsWith("v2.money_management.outbound_payment")) {
    console.log(`v2 webhook: ignoring ${type}`);
    return NextResponse.json({ received: true });
  }

  try {
    // Thin event: read the id off the envelope, then fetch the authoritative
    // object. Never trust status from the envelope — always re-read.
    const obpId: string | null =
      event?.related_object?.id || event?.data?.object?.id || event?.data?.id || null;

    if (!obpId) {
      console.error(`v2 webhook: ${type} carried no OutboundPayment id`);
      return NextResponse.json({ received: true });
    }

    const payment  = await getOutboundPayment(obpId);
    const status   = payment?.status ?? null;
    const outcome  = classifyOutboundPaymentStatus(status);
    const failure  = payment?.failure_reason || payment?.status_details?.failure_reason || null;

    // Which bookings does this payout cover? Written by the cron at dispatch.
    const { data: bookings, error: lookupErr } = await supabase
      .from("partner_bookings")
      .select("id, job_number, partner_user_id, payout_status, currency, settled_partner_net, payment_id")
      .eq("outbound_payment_id", obpId);

    if (lookupErr) {
      console.error("v2 webhook: booking lookup failed:", lookupErr.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    if (!bookings?.length) {
      // Not necessarily wrong — could be a payout made outside this system (e.g.
      // settled by hand in the dashboard). Log loudly; do not fail the webhook.
      console.warn(`v2 webhook: ${type} for ${obpId} matched no bookings (manual payout?)`);
      return NextResponse.json({ received: true });
    }

    const bookingIds = bookings.map(b => b.id);
    const paymentIds = bookings.map(b => b.payment_id).filter(Boolean) as string[];
    const nowIso     = new Date().toISOString();

    // ── Money delivered ───────────────────────────────────────────────────────
    if (outcome === "paid") {
      // Idempotent: replaying a `posted` event over an already-paid booking is a
      // no-op, so Stripe retries are safe.
      await supabase
        .from("partner_bookings")
        .update({ payout_status: "paid", paid_out_at: nowIso, outbound_payment_status: status, outbound_payment_failure: null })
        .in("id", bookingIds);
      if (paymentIds.length) {
        await supabase
          .from("payments")
          .update({ payout_status: "paid", paid_out_at: nowIso })
          .in("id", paymentIds);
      }
      console.log(`v2 webhook: ${obpId} posted — ${bookingIds.length} booking(s) marked paid`);
      return NextResponse.json({ received: true });
    }

    // ── Failed / returned / canceled — the partner does NOT have the money ────
    if (outcome === "failed") {
      // Back to `ready` so the next monthly run retries. Clear the outbound ids:
      // leaving them set would make the booking look settled in reports and
      // would collide with the next payout's idempotency key.
      await supabase
        .from("partner_bookings")
        .update({
          payout_status:           "ready",
          paid_out_at:             null,
          outbound_payment_id:     null,
          outbound_quote_id:       null,
          outbound_payment_status: status,
          outbound_payment_failure: failure || status,
        })
        .in("id", bookingIds);
      if (paymentIds.length) {
        await supabase
          .from("payments")
          .update({ payout_status: "ready", paid_out_at: null })
          .in("id", paymentIds);
      }

      const jobs = bookings.map(b => (b.job_number ? `#${b.job_number}` : b.id.slice(0, 8))).join(", ");
      console.error(`v2 webhook: ${obpId} ${status} — reverted ${bookingIds.length} booking(s) to ready`);
      await alertAdmin(
        `[Admin] Global Payout ${String(status).toUpperCase()} — ${bookingIds.length} booking(s) NOT paid`,
        `<div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
           <p><strong>An AU/NZ payout did not reach the partner.</strong></p>
           <p><strong>OutboundPayment:</strong> ${obpId}<br/>
              <strong>Status:</strong> ${status}<br/>
              <strong>Reason:</strong> ${failure || "not given"}<br/>
              <strong>Bookings:</strong> ${jobs}</p>
           <p>These bookings are back at <code>payout_status='ready'</code> and will be retried on the
              next monthly run. If the cause is bad bank details, the partner must fix them in Stripe
              onboarding first — otherwise the retry fails the same way.</p>
         </div>`
      );
      return NextResponse.json({ received: true });
    }

    // ── Still in flight — record the status, change nothing else ──────────────
    await supabase
      .from("partner_bookings")
      .update({ outbound_payment_status: status })
      .in("id", bookingIds);

    console.log(`v2 webhook: ${obpId} ${status} — in flight, ${bookingIds.length} booking(s) left as-is`);
    return NextResponse.json({ received: true });
  } catch (e: any) {
    // 500 so Stripe retries — losing a `posted` or `failed` event would leave a
    // booking stuck at `paying` with no correction.
    console.error("v2 webhook handler error:", e?.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
