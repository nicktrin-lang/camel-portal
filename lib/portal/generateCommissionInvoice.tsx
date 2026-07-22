import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { currencyLocale } from "@/lib/currency";
import { sendEmail } from "@/lib/email";
import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceBooking = {
  id: string;
  job_number: string | null;
  created_at: string | null;
  car_hire_price: number | null;
  commission_rate: number | null;
  commission_amount?: number | null;
  currency: string | null;
  booking_status: string | null;
  refund_status: string | null;
  cancellation_reason: string | null;
};

export type InvoicePartner = {
  user_id: string;
  company_name: string | null;
  legal_company_name: string | null;
  vat_number: string | null;
  company_registration_number: string | null;
  address: string | null;
  country: string | null;
  email: string | null;
  default_currency: string | null;
};

export type GenerateInvoiceResult = {
  ok: boolean;
  invoice_id?: string;
  invoice_number?: string;
  storage_path?: string;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcCommission(carHirePrice: number, rate: number): number {
  return Math.max((carHirePrice * rate) / 100, 10);
}

function fmtCurr(amount: number, currency: string): string {
  const locale = currencyLocale(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("en-GB"); } catch { return value; }
}

function periodLabel(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ── Atomic invoice number via DB sequence ─────────────────────────────────────
async function nextInvoiceNumber(db: any, periodMonth: string): Promise<string> {
  const [year, mon] = periodMonth.split("-");
  const prefix = `NTUK-${year}-${mon}-`;
  const { data, error } = await db.rpc("nextval_commission_invoice");
  if (error || data == null) {
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
  return `${prefix}${String(data).padStart(3, "0")}`;
}

// ── VAT logic ─────────────────────────────────────────────────────────────────
function vatTreatment(partnerCountry: string | null): { rate: number; label: string; note: string } {
  const country = (partnerCountry || "").toLowerCase().trim();
  const isUK = ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland"].includes(country);
  if (isUK) {
    return {
      rate: 0,
      label: "VAT (pending registration)",
      note: "NTUK Ltd VAT registration pending. VAT will be charged at 20% once registered.",
    };
  }
  return {
    rate: 0,
    label: "VAT — Reverse Charge",
    note: "No UK VAT charged. Reverse charge applies — customer must account for VAT in their own country.",
  };
}

// ── PDF builder ───────────────────────────────────────────────────────────────
async function buildPdf(params: {
  invoiceNumber: string;
  periodMonth: string;
  partner: InvoicePartner;
  bookings: InvoiceBooking[];
  totalCommission: number;
  currency: string;
}): Promise<Buffer> {
  const { Document, Page, Text, View, Image, StyleSheet, pdf } =
    await import("@react-pdf/renderer");

  const { invoiceNumber, periodMonth, partner, bookings, totalCommission, currency } = params;
  const vat        = vatTreatment(partner.country);
  const vatAmount  = (totalCommission * vat.rate) / 100;
  const grandTotal = totalCommission + vatAmount;
  const label      = periodLabel(periodMonth);

  // Load logo
  let logoBase64: string | null = null;
  try {
    const logoPath   = path.join(process.cwd(), "public", "camel-invoice-logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch { /* logo not critical */ }

  const styles = StyleSheet.create({
    page:            { fontFamily: "Helvetica", fontSize: 9, color: "#222", padding: 40, backgroundColor: "#fff" },
    header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
    logo:            { width: 180, height: 80, objectFit: "contain" },
    invoiceTitle:    { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
    invoiceNum:      { fontSize: 9, color: "#888" },
    section:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    block:           { width: "45%" },
    blockLabel:      { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    blockText:       { fontSize: 9, color: "#333", lineHeight: 1.5 },
    blockBold:       { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
    divider:         { borderBottomWidth: 1, borderBottomColor: "#e5e5e5", marginBottom: 16 },
    tableHeader:     { flexDirection: "row", backgroundColor: "#000", padding: "6 8" },
    tableHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
    tableRow:        { flexDirection: "row", padding: "5 8", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    tableRowAlt:     { flexDirection: "row", padding: "5 8", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fafafa" },
    tableCell:       { fontSize: 8, color: "#444" },
    totalsSection:   { marginTop: 16, alignItems: "flex-end" },
    totalsRow:       { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
    totalsLabel:     { fontSize: 9, color: "#666", width: 160, textAlign: "right", paddingRight: 16 },
    totalsValue:     { fontSize: 9, color: "#222", width: 100, textAlign: "right" },
    totalsBold:      { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#000", width: 100, textAlign: "right" },
    totalsBoldLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#000", width: 160, textAlign: "right", paddingRight: 16 },
    vatNote:         { marginTop: 20, padding: 10, backgroundColor: "#f8f8f8", borderLeftWidth: 3, borderLeftColor: "#ff7a00" },
    vatNoteText:     { fontSize: 8, color: "#555", lineHeight: 1.5 },
    footer:          { position: "absolute", bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText:      { fontSize: 7, color: "#aaa" },
    orangeBar:       { height: 4, backgroundColor: "#ff7a00", marginBottom: 24 },
  });

  // Column widths — includes date column
  const COL = { job: 55, date: 60, desc: 160, rate: 40, hire: 70, comm: 75 };

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.orangeBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceTitle}>Commission Invoice</Text>
            <Text style={styles.invoiceNum}>Invoice No. {invoiceNumber}</Text>
          </View>
          {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
        </View>

        {/* From / To */}
        <View style={styles.section}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>From</Text>
            <Text style={styles.blockBold}>NTUK Ltd (trading as Camel Global)</Text>
            <Text style={styles.blockText}>Office 7, 35-37 Ludgate Hill{"\n"}London, England, EC4M 7JN{"\n"}Company No: 08765474</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>To</Text>
            <Text style={styles.blockBold}>{partner.legal_company_name || partner.company_name || "—"}</Text>
            {partner.address ? <Text style={styles.blockText}>{partner.address}</Text> : null}
            {partner.vat_number ? <Text style={styles.blockText}>VAT/NIF: {partner.vat_number}</Text> : null}
            {partner.company_registration_number ? <Text style={styles.blockText}>Reg: {partner.company_registration_number}</Text> : null}
          </View>
        </View>

        {/* Invoice meta */}
        <View style={styles.section}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Invoice Period</Text>
            <Text style={styles.blockBold}>{label}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Issue Date</Text>
            <Text style={styles.blockText}>{fmtDate(new Date().toISOString())}</Text>
            <Text style={{ ...styles.blockLabel, marginTop: 8 }}>Currency</Text>
            <Text style={styles.blockText}>{currency}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, width: COL.job }}>Job #</Text>
          <Text style={{ ...styles.tableHeaderCell, width: COL.date }}>Date</Text>
          <Text style={{ ...styles.tableHeaderCell, width: COL.desc }}>Description</Text>
          <Text style={{ ...styles.tableHeaderCell, width: COL.rate, textAlign: "right" }}>Rate</Text>
          <Text style={{ ...styles.tableHeaderCell, width: COL.hire, textAlign: "right" }}>Car Hire</Text>
          <Text style={{ ...styles.tableHeaderCell, width: COL.comm, textAlign: "right" }}>Commission</Text>
        </View>

        {/* Table rows — all bookings shown, including zero-commission cancelled */}
        {bookings.map((b, i) => {
          const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
          const fullRefund  = isCancelled && b.refund_status === "full";
          const hire        = fullRefund ? 0 : Number(b.car_hire_price ?? 0);
          const rate        = b.commission_rate ?? 20;
          // Use the stored commission (what was actually charged/retained), not a
          // recompute — falls back to the formula only for un-migrated rows.
          const comm        = fullRefund ? 0 : (b.commission_amount != null ? Number(b.commission_amount) : calcCommission(hire, rate));
          const curr        = b.currency || currency;
          const desc        = fullRefund
            ? `Cancelled — full refund${b.cancellation_reason ? ` (${b.cancellation_reason})` : ""}`
            : isCancelled
            ? "Cancelled — commission retained"
            : "Car hire commission";
          const isZero = fullRefund;
          return (
            <View key={b.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.tableCell, width: COL.job }}>{b.job_number || b.id.slice(0, 8)}</Text>
              <Text style={{ ...styles.tableCell, width: COL.date, color: isZero ? "#aaa" : "#444" }}>{fmtDate(b.created_at)}</Text>
              <Text style={{ ...styles.tableCell, width: COL.desc, color: isZero ? "#aaa" : "#444" }}>{desc}</Text>
              <Text style={{ ...styles.tableCell, width: COL.rate, textAlign: "right", color: isZero ? "#aaa" : "#444" }}>{isZero ? "—" : `${rate}%`}</Text>
              <Text style={{ ...styles.tableCell, width: COL.hire, textAlign: "right", color: isZero ? "#aaa" : "#444" }}>{isZero ? "—" : fmtCurr(hire, curr)}</Text>
              <Text style={{ ...styles.tableCell, width: COL.comm, textAlign: "right", color: isZero ? "#aaa" : "#000", fontFamily: isZero ? "Helvetica" : "Helvetica-Bold" }}>
                {isZero ? "£0.00 (nil)" : fmtCurr(comm, curr)}
              </Text>
            </View>
          );
        })}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmtCurr(totalCommission, currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{vat.label} ({vat.rate}%)</Text>
            <Text style={styles.totalsValue}>{fmtCurr(vatAmount, currency)}</Text>
          </View>
          <View style={{ ...styles.totalsRow, marginTop: 6 }}>
            <Text style={styles.totalsBoldLabel}>Total Due</Text>
            <Text style={styles.totalsBold}>{fmtCurr(grandTotal, currency)}</Text>
          </View>
        </View>

        {/* VAT note */}
        <View style={styles.vatNote}>
          <Text style={styles.vatNoteText}>{vat.note}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NTUK Ltd · Company No: 08765474 · Office 7, 35-37 Ludgate Hill, London EC4M 7JN</Text>
          <Text style={styles.footerText}>{invoiceNumber} · {label}</Text>
        </View>
      </Page>
    </Document>
  );

  const instance = pdf(doc);
  const blob     = await instance.toBlob();
  const ab       = await blob.arrayBuffer();
  return Buffer.from(ab);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateCommissionInvoice(
  partnerUserId: string,
  periodMonth: string,
  bookings: InvoiceBooking[],
): Promise<GenerateInvoiceResult> {
  const db = createServiceRoleSupabaseClient();

  try {
    // ── Fetch partner profile ──────────────────────────────────────────────
    const { data: profile, error: profErr } = await db
      .from("partner_profiles")
      .select("user_id, company_name, legal_company_name, vat_number, company_registration_number, address, base_country, default_currency")
      .eq("user_id", partnerUserId)
      .single();

    if (profErr || !profile) return { ok: false, error: `Partner profile not found: ${profErr?.message}` };

    const { data: authUser } = await db.auth.admin.getUserById(partnerUserId);
    const partnerEmail = authUser?.user?.email || null;

    const partner: InvoicePartner = {
      user_id:                     profile.user_id,
      company_name:                profile.company_name,
      legal_company_name:          profile.legal_company_name,
      vat_number:                  profile.vat_number,
      company_registration_number: profile.company_registration_number,
      address:                     profile.address,
      country:                     profile.base_country,
      email:                       partnerEmail,
      default_currency:            profile.default_currency,
    };

    const currency = profile.default_currency || "EUR";

    // ── Calculate total commission (full-refund cancelled = zero) ──────────
    let totalCommission = 0;
    for (const b of bookings) {
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const fullRefund  = isCancelled && b.refund_status === "full";
      if (fullRefund) continue;
      totalCommission += b.commission_amount != null
        ? Number(b.commission_amount)
        : calcCommission(Number(b.car_hire_price ?? 0), b.commission_rate ?? 20);
    }

    // ── Generate atomic invoice number via DB sequence ─────────────────────
    const invoiceNumber = await nextInvoiceNumber(db, periodMonth);

    // ── Build PDF ──────────────────────────────────────────────────────────
    const pdfBuffer = await buildPdf({ invoiceNumber, periodMonth, partner, bookings, totalCommission, currency });

    // ── Upload to Supabase Storage ─────────────────────────────────────────
    const storagePath = `${partnerUserId}/${periodMonth}/${invoiceNumber}.pdf`;
    const { error: uploadErr } = await db.storage
      .from("commission-invoices")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) return { ok: false, error: `Storage upload failed: ${uploadErr.message}` };

    // ── Insert DB record ───────────────────────────────────────────────────
    const [pYear, pMon] = periodMonth.split("-").map(Number);
    const periodStart   = new Date(pYear, pMon - 1, 1).toISOString().slice(0, 10);
    const periodEnd     = new Date(pYear, pMon, 0).toISOString().slice(0, 10);

    const { data: invoiceRow, error: insertErr } = await db
      .from("commission_invoices")
      .insert({
        invoice_number:  invoiceNumber,
        partner_user_id: partnerUserId,
        partner_id:      partnerUserId,
        period_start:    periodStart,
        period_end:      periodEnd,
        currency,
        subtotal:        totalCommission,
        total:           totalCommission,
        booking_count:   bookings.length,
        storage_path:    storagePath,
        issued_at:       new Date().toISOString(),
        status:          "issued",
        partner_name:    partner.company_name || "",
        partner_address: partner.address || "",
        partner_tax_id:  partner.vat_number || "",
        vat_rate:        0,
        vat_amount:      0,
        line_items:      JSON.stringify(bookings.map(b => ({ job: b.job_number, amount: b.car_hire_price }))),
      })
      .select("id")
      .single();

    if (insertErr) return { ok: false, error: `DB insert failed: ${insertErr.message}` };

    // ── Email PDF to partner ───────────────────────────────────────────────
    if (partnerEmail) {
      const label = periodLabel(periodMonth);
      await sendEmail({
        to: partnerEmail,
        subject: `Your Camel Global commission invoice — ${label} — ${invoiceNumber}`,
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">Commission Invoice</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">${label}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>Hi ${profile.company_name},</p>
              <p>Please find attached your Camel Global commission invoice for <strong>${label}</strong>.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
                <tr><td style="padding:6px 0;color:#666;">Invoice number</td><td style="font-weight:700;">${invoiceNumber}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">Period</td><td style="font-weight:700;">${label}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">Bookings</td><td style="font-weight:700;">${bookings.length}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">Total commission</td><td style="font-weight:700;">${fmtCurr(totalCommission, currency)}</td></tr>
              </table>
              <p style="font-size:13px;color:#666;">You can also download this invoice at any time from your partner portal under Reports.</p>
              <p style="margin-top:24px;color:#999;font-size:12px;">NTUK Ltd · Company No: 08765474 · Office 7, 35-37 Ludgate Hill, London EC4M 7JN</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `${invoiceNumber}.pdf`,
          content:  pdfBuffer.toString("base64"),
          encoding: "base64",
        }],
      }).catch(e => console.error("Invoice email failed:", e?.message));

      await db.from("commission_invoices").update({ emailed_at: new Date().toISOString() }).eq("id", invoiceRow.id);
    }

    return { ok: true, invoice_id: invoiceRow.id, invoice_number: invoiceNumber, storage_path: storagePath };
  } catch (e: any) {
    console.error("generateCommissionInvoice error:", e?.message);
    return { ok: false, error: e?.message || "Unknown error" };
  }
}