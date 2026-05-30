import Stripe from "stripe";
import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { calculateFuelCharge, normalizeFuel } from "@/lib/portal/calculateFuelCharge";
import { sendEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia" as any,
});

// ── PDF styles ────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  page:        { fontFamily:"Helvetica", fontSize:9, color:"#222", backgroundColor:"#fff", paddingBottom:40 },
  topBar:      { backgroundColor:"#ff7a00", height:8 },
  header:      { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", padding:"16 24 12 24", borderBottom:"1 solid #e5e5e5" },
  logo:        { width:104, height:34, objectFit:"contain" },
  headerRight: { alignItems:"flex-end" },
  headerSub:   { fontSize:7, color:"#888", marginBottom:2 },
  headerDate:  { fontSize:8, color:"#555" },
  body:        { padding:"20 24" },
  title:       { fontSize:18, fontFamily:"Helvetica-Bold", color:"#111", marginBottom:4 },
  subtitle:    { fontSize:9, color:"#888", marginBottom:16 },
  section:     { marginBottom:14 },
  sectionHead: { fontSize:7, fontFamily:"Helvetica-Bold", color:"#ff7a00", textTransform:"uppercase", letterSpacing:1, marginBottom:6, borderBottom:"1 solid #f0f0f0", paddingBottom:3 },
  row:         { flexDirection:"row", justifyContent:"space-between", paddingVertical:3, borderBottom:"1 solid #f5f5f5" },
  rowLabel:    { color:"#555", flex:1 },
  rowValue:    { fontFamily:"Helvetica-Bold", color:"#111", textAlign:"right", flex:1 },
  totalBox:    { flexDirection:"row", justifyContent:"space-between", backgroundColor:"#f0f0f0", padding:"8 10", marginTop:6 },
  totalLabel:  { fontFamily:"Helvetica-Bold", color:"#111", fontSize:10 },
  totalValue:  { fontFamily:"Helvetica-Bold", color:"#111", fontSize:10 },
  note:        { fontSize:7.5, color:"#888", marginTop:8, lineHeight:1.5 },
  footer:      { position:"absolute", bottom:0, left:0, right:0, borderTop:"1 solid #e5e5e5", padding:"6 24", flexDirection:"row", justifyContent:"space-between" },
  footerText:  { fontSize:7, color:"#aaa" },
});

const QUARTER_LABELS: Record<number,string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

function fuelLabel(v: string|null): string {
  switch(v) {
    case "empty": return "Empty"; case "quarter": return "¼ Tank";
    case "half": return "½ Tank"; case "3/4": return "¾ Tank";
    case "full": return "Full Tank"; default: return v||"—";
  }
}

function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  if (minutes >= 1440) {
    const days = Math.ceil(minutes / 1440);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

interface StatementData {
  jobNumber:        number|null;
  bookingId:        string;
  customerName:     string|null;
  pickupAddress:    string|null;
  dropoffAddress:   string|null;
  pickupAt:         string|null;
  dropoffAt:        string|null;
  durationMinutes:  number|null;
  vehicleCategory:  string|null;
  companyName:      string|null;
  currency:         string;
  carHire:          number;
  fuelDeposit:      number;
  totalPaid:        number;
  collectionFuel:   string|null;
  returnFuel:       string|null;
  usedQuarters:     number;
  fuelCharge:       number;
  fuelRefund:       number;
  issuedAt:         string;
  logoBase64:       string|null;
}

function StatementDocument({ d }: { d: StatementData }) {
  const cur = d.currency;
  const locale = cur==="GBP"?"en-GB":cur==="USD"?"en-US":"es-ES";
  const fmt = (n: number) => new Intl.NumberFormat(locale,{style:"currency",currency:cur}).format(n);
  const ref = d.jobNumber ? `#${d.jobNumber}` : d.bookingId.slice(0,8).toUpperCase();
  const dateStr = new Date(d.issuedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const finalAmount = d.carHire + d.fuelCharge;

  return (
    <Document>
      <Page size="A4" style={ps.page}>
        <View style={ps.topBar}/>
        <View style={ps.header}>
          {d.logoBase64
            ? <Image src={`data:image/png;base64,${d.logoBase64}`} style={ps.logo}/>
            : <Text style={{fontSize:13,fontFamily:"Helvetica-Bold",color:"#ff7a00"}}>CAMEL GLOBAL</Text>
          }
          <View style={ps.headerRight}>
            <Text style={ps.headerSub}>BOOKING COMPLETION STATEMENT</Text>
            <Text style={ps.headerDate}>Issued: {dateStr}</Text>
            <Text style={ps.headerDate}>Ref: {ref}</Text>
          </View>
        </View>

        <View style={ps.body}>
          <Text style={ps.title}>Booking Completion Statement</Text>
          <Text style={ps.subtitle}>
            {ref} · {d.pickupAddress||"—"} · Settled in {cur}
          </Text>

          <View style={ps.section}>
            <Text style={ps.sectionHead}>Booking Details</Text>
            <View style={ps.row}><Text style={ps.rowLabel}>Booking reference</Text><Text style={ps.rowValue}>{ref}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Status</Text><Text style={ps.rowValue}>Completed</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Car hire company</Text><Text style={ps.rowValue}>{d.companyName||"—"}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Pickup address</Text><Text style={ps.rowValue}>{d.pickupAddress||"—"}</Text></View>
            {d.dropoffAddress
              ? <View style={ps.row}><Text style={ps.rowLabel}>Drop-off address</Text><Text style={ps.rowValue}>{d.dropoffAddress}</Text></View>
              : null}
            {d.pickupAt
              ? <View style={ps.row}><Text style={ps.rowLabel}>Pickup time</Text><Text style={ps.rowValue}>{new Date(d.pickupAt).toLocaleString("en-GB")}</Text></View>
              : null}
            {d.dropoffAt
              ? <View style={ps.row}><Text style={ps.rowLabel}>Drop-off time</Text><Text style={ps.rowValue}>{new Date(d.dropoffAt).toLocaleString("en-GB")}</Text></View>
              : null}
            {d.durationMinutes
              ? <View style={ps.row}><Text style={ps.rowLabel}>Duration</Text><Text style={ps.rowValue}>{fmtDuration(d.durationMinutes)}</Text></View>
              : null}
            {d.vehicleCategory
              ? <View style={ps.row}><Text style={ps.rowLabel}>Vehicle</Text><Text style={ps.rowValue}>{d.vehicleCategory}</Text></View>
              : null}
            <View style={ps.row}><Text style={ps.rowLabel}>Settlement currency</Text><Text style={ps.rowValue}>{cur}</Text></View>
          </View>

          <View style={ps.section}>
            <Text style={ps.sectionHead}>Payment Breakdown</Text>
            <View style={ps.row}><Text style={ps.rowLabel}>Car hire</Text><Text style={ps.rowValue}>{fmt(d.carHire)}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Full tank deposit paid</Text><Text style={ps.rowValue}>{fmt(d.fuelDeposit)}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Total paid</Text><Text style={ps.rowValue}>{fmt(d.totalPaid)}</Text></View>
          </View>

          <View style={ps.section}>
            <Text style={ps.sectionHead}>Fuel Settlement</Text>
            <View style={ps.row}><Text style={ps.rowLabel}>Delivery fuel level</Text><Text style={ps.rowValue}>{fuelLabel(d.collectionFuel)}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Collection fuel level</Text><Text style={ps.rowValue}>{fuelLabel(d.returnFuel)}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Fuel used</Text><Text style={ps.rowValue}>{QUARTER_LABELS[d.usedQuarters]??`${d.usedQuarters}/4`}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Fuel charge to you</Text><Text style={ps.rowValue}>{fmt(d.fuelCharge)}</Text></View>
            <View style={ps.row}><Text style={ps.rowLabel}>Fuel refund to you</Text><Text style={ps.rowValue}>{d.fuelRefund>0?fmt(d.fuelRefund):"None"}</Text></View>
          </View>

          <View style={ps.totalBox}>
            <Text style={ps.totalLabel}>Final amount (car hire + fuel charge)</Text>
            <Text style={ps.totalValue}>{fmt(finalAmount)}</Text>
          </View>

          {d.fuelRefund>0 && (
            <Text style={ps.note}>
              A fuel deposit refund of {fmt(d.fuelRefund)} has been issued to your original payment method.
              Please allow 5–10 business days for it to appear.
            </Text>
          )}
          <Text style={[ps.note, {marginTop:6}]}>
            To view your booking, visit camel-global.com/bookings/{d.bookingId}
          </Text>
        </View>

        <View style={ps.footer} fixed>
          <Text style={ps.footerText}>Camel Global · NTUK Ltd · Office 7, 35-37 Ludgate Hill, London EC4M 7JN · Company No. 08765474</Text>
          <Text style={ps.footerText}>camel-global.com</Text>
        </View>
      </Page>
    </Document>
  );
}

async function generateCompletionStatementPDF(d: StatementData): Promise<Buffer> {
  return renderToBuffer(<StatementDocument d={d} />);
}

// ── Main export ───────────────────────────────────────────────────────────────
export type CompleteBookingResult =
  | { ok: true; already_processed: true }
  | { ok: true; fuel_used_quarters: number; fuel_charge: number; fuel_refund: number; stripe_refund_id: string | null }
  | { ok: false; error: string; status: number };

export async function completeBooking(bookingId: string): Promise<CompleteBookingResult> {
  const db = createServiceRoleSupabaseClient();

  const { data: booking, error: bkErr } = await db
    .from("partner_bookings")
    .select(`
      id, partner_user_id, booking_status,
      fuel_price, car_hire_price, amount, currency,
      job_number, request_id, payment_id,
      collection_fuel_level_partner, collection_fuel_level_driver,
      return_fuel_level_partner, return_fuel_level_driver,
      fuel_used_quarters, payout_status
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (bkErr)    return { ok: false, error: bkErr.message, status: 400 };
  if (!booking) return { ok: false, error: "Booking not found", status: 404 };

  if (booking.booking_status !== "completed") {
    return { ok: false, error: "Booking is not yet completed", status: 400 };
  }

  if (booking.payout_status === "ready" || booking.payout_status === "paid") {
    return { ok: true, already_processed: true };
  }

  const collectionFuel =
    normalizeFuel(booking.collection_fuel_level_partner) ||
    normalizeFuel(booking.collection_fuel_level_driver);

  const returnFuel =
    normalizeFuel(booking.return_fuel_level_partner) ||
    normalizeFuel(booking.return_fuel_level_driver);

  if (!collectionFuel || !returnFuel) {
    return { ok: false, error: "Cannot complete — fuel levels not recorded for collection or return", status: 400 };
  }

  const fullTankPrice = Number(booking.fuel_price || 0);
  const fuelCalc = calculateFuelCharge({ collectionFuel, returnFuel, fullTankPrice });

  if (!fuelCalc) {
    return { ok: false, error: "Failed to calculate fuel charge — invalid fuel levels", status: 400 };
  }

  const { used_quarters, fuel_charge, fuel_refund } = fuelCalc;

  const { data: payment, error: pmtErr } = await db
    .from("payments")
    .select("id, stripe_payment_intent_id, amount_fuel_deposit, fuel_refunded_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (pmtErr) return { ok: false, error: pmtErr.message, status: 400 };

  if (!payment) {
    await db.from("partner_bookings").update({
      fuel_used_quarters: used_quarters,
      fuel_charge,
      fuel_refund,
      payout_status: "ready",
    }).eq("id", bookingId);

    console.log(`completeBooking: no payment record for ${bookingId} — marked ready without Stripe refund`);
    return { ok: true, fuel_used_quarters: used_quarters, fuel_charge, fuel_refund, stripe_refund_id: null };
  }

  if (payment.fuel_refunded_at) {
    return { ok: true, already_processed: true };
  }

  // ── Load partner info early — needed for refund metadata ─────────────────
  const { data: partnerProfile } = await db
    .from("partner_profiles")
    .select("company_name, contact_name")
    .eq("user_id", booking.partner_user_id)
    .maybeSingle();

  const currency    = booking.currency || "EUR";
  const locale      = currency==="GBP"?"en-GB":currency==="USD"?"en-US":"es-ES";
  const fmt         = (n: number) => new Intl.NumberFormat(locale, { style:"currency", currency }).format(n);
  const fmtRaw      = (n: number) => `${currency} ${n.toFixed(2)}`;
  const jobNo       = booking.job_number ? `#${booking.job_number}` : "";
  const companyName = partnerProfile?.company_name || "the car hire company";
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL   || "https://camel-global.com";
  const portalUrl   = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";

  let stripeRefundId: string | null = null;
  const refundCents = Math.round(fuel_refund * 100);

  if (refundCents > 0 && payment.stripe_payment_intent_id) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: {
          refund_type:       "fuel_refund",
          job_number:        jobNo,
          booking_id:        bookingId,
          partner_name:      companyName,
          fuel_used:         QUARTER_LABELS[used_quarters] ?? `${used_quarters}/4 tank`,
          delivery_fuel:     fuelLabel(collectionFuel),
          collection_fuel:   fuelLabel(returnFuel),
          full_tank_deposit: fmtRaw(fullTankPrice),
          fuel_charge:       fmtRaw(fuel_charge),
          fuel_refund:       fmtRaw(fuel_refund),
        },
      });
      stripeRefundId = refund.id;
    } catch (stripeErr: any) {
      console.error("Stripe refund error:", stripeErr?.message);
      return { ok: false, error: `Stripe refund failed: ${stripeErr?.message}`, status: 500 };
    }
  }

  const now = new Date().toISOString();

  const { error: bkUpdateErr } = await db
    .from("partner_bookings")
    .update({ fuel_used_quarters: used_quarters, fuel_charge, fuel_refund, payout_status: "ready" })
    .eq("id", bookingId);

  if (bkUpdateErr) return { ok: false, error: bkUpdateErr.message, status: 500 };

  const { error: pmtUpdateErr } = await db
    .from("payments")
    .update({
      fuel_refund_amount:    fuel_refund,
      fuel_refund_stripe_id: stripeRefundId,
      fuel_refunded_at:      now,
      payout_status:         "ready",
    })
    .eq("id", payment.id);

  if (pmtUpdateErr) return { ok: false, error: pmtUpdateErr.message, status: 500 };

  // ── Load request from DB ─────────────────────────────────────────────────
  const { data: request } = await db
    .from("customer_requests")
    .select("customer_name, customer_email, pickup_address, dropoff_address, pickup_at, dropoff_at, journey_duration_minutes, vehicle_category_name")
    .eq("id", booking.request_id)
    .maybeSingle();

  const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
  const partnerEmail = partnerAuthData?.user?.email || null;

  const carHire    = Number(booking.car_hire_price || 0);
  const fuelDep    = Number(booking.fuel_price     || 0);
  const totalPaid  = Number(booking.amount         || carHire + fuelDep);
  const finalAmount = carHire + fuel_charge;

  // ── Generate completion statement PDF ─────────────────────────────────────
  let statementBase64: string | null = null;
  try {
    let logoBase64: string | null = null;
    try {
      const logoUrl = `https://www.camel-global.com/camel-invoice-logo.png`;
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const buf = await logoRes.arrayBuffer();
        logoBase64 = Buffer.from(buf).toString("base64");
      }
    } catch { /* logo optional */ }

    const statementData: StatementData = {
      jobNumber:       booking.job_number,
      bookingId,
      customerName:    request?.customer_name || null,
      pickupAddress:   request?.pickup_address || null,
      dropoffAddress:  request?.dropoff_address || null,
      pickupAt:        request?.pickup_at || null,
      dropoffAt:       request?.dropoff_at || null,
      durationMinutes: request?.journey_duration_minutes || null,
      vehicleCategory: request?.vehicle_category_name || null,
      companyName,
      currency,
      carHire,
      fuelDeposit:     fuelDep,
      totalPaid,
      collectionFuel,
      returnFuel,
      usedQuarters:    used_quarters,
      fuelCharge:      fuel_charge,
      fuelRefund:      fuel_refund,
      issuedAt:        now,
      logoBase64,
    };

    const pdfBuffer = await generateCompletionStatementPDF(statementData);
    statementBase64 = pdfBuffer.toString("base64");
  } catch (pdfErr: any) {
    console.error("Completion statement PDF generation failed:", pdfErr?.message);
  }

  const statementFilename = `Camel-Completion-Statement-${booking.job_number ?? bookingId.slice(0,8)}.pdf`;

  // ── Email customer ────────────────────────────────────────────────────────
  if (request?.customer_email) {
    await sendEmail({
      to: request.customer_email,
      subject: `Your Camel Global booking is now completed - ${jobNo}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">Booking completed</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>Hi ${request.customer_name || "there"},</p>
            <p>The Camel Global team thank you for your completed car hire with <strong>${companyName}</strong>. We hope your experience was everything you expected.</p>
            <p>Please find your Booking Completion Statement attached to this email.</p>
            <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">Fuel Summary</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">Delivery fuel level</td><td style="text-align:right;">${fuelLabel(collectionFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Collection fuel level</td><td style="text-align:right;">${fuelLabel(returnFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fuel used</td><td style="text-align:right;">${QUARTER_LABELS[used_quarters]??`${used_quarters}/4 tank`}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fuel charge</td><td style="text-align:right;">${fmt(fuel_charge)}</td></tr>
                <tr style="border-top:1px solid #ddd;">
                  <td style="padding:8px 0 4px;font-weight:700;">Final amount (car hire + fuel)</td>
                  <td style="text-align:right;font-weight:700;">${fmt(finalAmount)}</td>
                </tr>
              </table>
              ${fuel_refund > 0
                ? `<p style="margin:8px 0 0;font-size:13px;color:#22a06b;font-weight:600;">A fuel deposit refund of <strong>${fmt(fuel_refund)}</strong> has been issued to your original payment method. Please allow 5–10 business days for it to appear.</p>`
                : `<p style="margin:8px 0 0;font-size:13px;color:#666;">No fuel refund is due — the full tank deposit covered the fuel used.</p>`
              }
            </div>
            <p style="font-size:13px;color:#666;">If you have any questions please contact us at <a href="mailto:info@camel-global.com">info@camel-global.com</a>. We look forward to welcoming you again.</p>
            <a href="${siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Bookings</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">Best Regards,<br/>The Camel Global Team</p>
          </div>
        </div>
      `,
      ...(statementBase64 ? {
        attachments: [{
          filename: statementFilename,
          content:  statementBase64,
          encoding: "base64",
        }],
      } : {}),
    }).catch(e => console.error("Completion customer email failed:", e?.message));
  }

  // ── Email partner ─────────────────────────────────────────────────────────
  if (partnerEmail) {
    await sendEmail({
      to: partnerEmail,
      subject: `Booking ${jobNo} completed — payout ready`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">Booking Completed</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>Hi ${partnerProfile?.contact_name || companyName},</p>
            <p>Booking ${jobNo} has been marked as completed. Your payout has been queued for the next monthly run.</p>
            <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">Fuel Summary</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">Delivery fuel level</td><td style="text-align:right;">${fuelLabel(collectionFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Collection fuel level</td><td style="text-align:right;">${fuelLabel(returnFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fuel used</td><td style="text-align:right;">${QUARTER_LABELS[used_quarters]??`${used_quarters}/4 tank`}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fuel charge to customer</td><td style="text-align:right;">${fmt(fuel_charge)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Fuel refund to customer</td><td style="text-align:right;">${fuel_refund>0?fmt(fuel_refund):"None"}</td></tr>
              </table>
            </div>
            <a href="${portalUrl}/partner/bookings/${bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View Booking</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
          </div>
        </div>
      `,
    }).catch(e => console.error("Completion partner email failed:", e?.message));
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
            <strong>Fuel used:</strong> ${QUARTER_LABELS[used_quarters]??`${used_quarters}/4`} (${fuelLabel(collectionFuel)} → ${fuelLabel(returnFuel)})<br/>
            <strong>Fuel charge:</strong> ${fmt(fuel_charge)}<br/>
            <strong>Fuel refund:</strong> ${fmt(fuel_refund)}<br/>
            <strong>Final amount:</strong> ${fmt(finalAmount)}<br/>
            <strong>Stripe refund ID:</strong> ${stripeRefundId || "none (refund = 0)"}<br/>
            <strong>Payout status:</strong> ready
          </p>
        </div>
      `,
    }).catch(e => console.error("Completion admin email failed:", e?.message));
  }

  console.log(`completeBooking: ${bookingId} — refund ${fmt(fuel_refund)}, stripe ${stripeRefundId || "none"}`);
  return { ok: true, fuel_used_quarters: used_quarters, fuel_charge, fuel_refund, stripe_refund_id: stripeRefundId };
}