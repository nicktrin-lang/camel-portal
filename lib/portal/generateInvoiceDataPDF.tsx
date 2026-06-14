/**
 * Booking Invoice Data PDF generator — camel-portal
 * Server-side only. Uses @react-pdf/renderer.
 * Generates a data sheet to help partners produce a VAT invoice.
 * Not itself a VAT invoice.
 */

import React from "react";
import {
  Document, Page, Text, View, Image,
  StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

function fmtMoney(amount: number, currency: string): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
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

const s = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 40 },
  topBar:       { backgroundColor: "#ff7a00", height: 8 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "16 24 12 24", borderBottom: "1 solid #e5e5e5" },
  logo:         { width: 90, height: 28, objectFit: "contain" },
  headerRight:  { alignItems: "flex-end" },
  headerSub:    { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:   { fontSize: 8, color: "#555" },
  body:         { padding: "20 24" },
  title:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 4 },
  subtitle:     { fontSize: 9, color: "#888", marginBottom: 14 },
  noticeBox:    { backgroundColor: "#f5f5f5", borderLeft: "3 solid #999", padding: "8 10", marginBottom: 14 },
  noticeLabel:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  noticeText:   { fontSize: 7.5, color: "#444", lineHeight: 1.5 },
  section:      { marginBottom: 14 },
  sectionHead:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  row:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1 solid #f5f5f5" },
  rowLabel:     { color: "#555", flex: 1.2 },
  rowValue:     { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1 },
  totalRow:     { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:   { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:   { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  refundBox:    { backgroundColor: "#fffbeb", borderLeft: "3 solid #f59e0b", padding: "8 10", marginTop: 8, marginBottom: 6 },
  refundHead:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#b45309", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  refundRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, borderBottom: "1 solid #fde68a" },
  refundLabel:  { color: "#92400e", flex: 1.2, fontSize: 8 },
  refundValue:  { fontFamily: "Helvetica-Bold", color: "#92400e", textAlign: "right", flex: 1, fontSize: 8 },
  refundTotal:  { flexDirection: "row", justifyContent: "space-between", marginTop: 5, paddingTop: 4, borderTop: "1 solid #f59e0b" },
  refundTotalL: { fontFamily: "Helvetica-Bold", color: "#b45309", flex: 1.2, fontSize: 8 },
  refundTotalV: { fontFamily: "Helvetica-Bold", color: "#b45309", textAlign: "right", flex: 1, fontSize: 8 },
  netRow:       { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1a1a1a", padding: "8 10", marginTop: 4 },
  netLabel:     { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  netValue:     { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  note:         { fontSize: 7.5, color: "#888", marginTop: 6, lineHeight: 1.5 },
  blankRow:     { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  blankLabel:   { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#555", textTransform: "uppercase", width: 120 },
  blankLine:    { flex: 1, borderBottom: "1 solid #ccc", height: 12 },
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1 solid #e5e5e5", padding: "6 24", flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 7, color: "#aaa" },
});

export type InvoiceDataRefund = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export interface InvoiceDataParams {
  jobNumber:              number | null;
  bookingId:              string;
  bookingStatus:          string;
  bookingCreatedAt:       string | null;
  customerName:           string | null;
  customerEmail:          string | null;
  customerPhone:          string | null;
  customerBillingAddress: string | null;
  customerTaxId:          string | null;
  pickupAddress:          string | null;
  dropoffAddress:         string | null;
  pickupAt:               string | null;
  dropoffAt:              string | null;
  durationMinutes:        number | null;
  vehicleCategory:        string | null;
  passengers:             number | null;
  driverAge:              number | null;
  additionalDrivers:      number;
  additionalDriverAges:   string | null;
  currency:               string;
  carHire:                number;
  fuelDeposit:            number;
  fuelCharge:             number;
  fuelRefund:             number;
  postCompletionRefunds:  InvoiceDataRefund[];
  issuedAt:               string;
}

function InvoiceDataDocument({ p, logoBase64 }: { p: InvoiceDataParams; logoBase64: string | null }) {
  const cur        = p.currency;
  const fmt        = (n: number) => fmtMoney(n, cur);
  const ref        = p.jobNumber ? `#${p.jobNumber}` : p.bookingId.slice(0, 8).toUpperCase();
  const grossTotal = p.carHire + p.fuelCharge;
  const pcTotal    = p.postCompletionRefunds.reduce((sum, r) => sum + r.amount, 0);
  const netTotal   = Math.max(0, grossTotal - pcTotal);
  const hasRefunds = p.postCompletionRefunds.length > 0;

  const additionalDriversText = p.additionalDrivers > 0
    ? `${p.additionalDrivers}${p.additionalDriverAges ? ` (ages: ${p.additionalDriverAges})` : ""}`
    : "None";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          {logoBase64
            ? <Image src={`data:image/png;base64,${logoBase64}`} style={s.logo} />
            : <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.headerSub}>BOOKING DATA FOR INVOICE PURPOSES</Text>
            <Text style={s.headerDate}>Generated: {fmtDateShort(p.issuedAt)}</Text>
            <Text style={s.headerDate}>Ref: {ref}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>Booking Data for Invoice Purposes</Text>
          <Text style={s.subtitle}>{ref} · {cur} · Generated {fmtDateShort(p.issuedAt)}</Text>

          <View style={s.noticeBox}>
            <Text style={s.noticeLabel}>Notice</Text>
            <Text style={s.noticeText}>
              This document contains booking data provided by Camel Global to assist you in preparing a VAT invoice for your customer.
              It is not itself a VAT invoice. You are responsible for issuing a compliant invoice directly to your customer in accordance with applicable tax legislation.
            </Text>
          </View>

          {/* Booking reference */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Booking Reference</Text>
            <View style={s.row}><Text style={s.rowLabel}>Booking reference</Text><Text style={s.rowValue}>{ref}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Job number</Text><Text style={s.rowValue}>{p.jobNumber ? String(p.jobNumber) : "—"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Booking status</Text><Text style={s.rowValue}>{String(p.bookingStatus || "—").replaceAll("_", " ")}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Booking created</Text><Text style={s.rowValue}>{fmtDateTime(p.bookingCreatedAt)}</Text></View>
          </View>

          {/* Customer details */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Customer Details</Text>
            <View style={s.row}><Text style={s.rowLabel}>Full name</Text><Text style={s.rowValue}>{p.customerName || "—"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Email</Text><Text style={s.rowValue}>{p.customerEmail || "—"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Phone</Text><Text style={s.rowValue}>{p.customerPhone || "—"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Billing address</Text><Text style={s.rowValue}>{p.customerBillingAddress || "Not provided by customer"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Tax ID / VAT No.</Text><Text style={s.rowValue}>{p.customerTaxId || "Not provided by customer"}</Text></View>
          </View>

          {/* Hire details */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Hire Details</Text>
            <View style={s.row}><Text style={s.rowLabel}>Pickup address</Text><Text style={s.rowValue}>{p.pickupAddress || "—"}</Text></View>
            {p.dropoffAddress ? <View style={s.row}><Text style={s.rowLabel}>Drop-off address</Text><Text style={s.rowValue}>{p.dropoffAddress}</Text></View> : null}
            <View style={s.row}><Text style={s.rowLabel}>Pickup date / time</Text><Text style={s.rowValue}>{fmtDateTime(p.pickupAt)}</Text></View>
            {p.dropoffAt ? <View style={s.row}><Text style={s.rowLabel}>Drop-off date / time</Text><Text style={s.rowValue}>{fmtDateTime(p.dropoffAt)}</Text></View> : null}
            {p.durationMinutes ? <View style={s.row}><Text style={s.rowLabel}>Duration</Text><Text style={s.rowValue}>{fmtDuration(p.durationMinutes)}</Text></View> : null}
            {p.vehicleCategory ? <View style={s.row}><Text style={s.rowLabel}>Vehicle type</Text><Text style={s.rowValue}>{p.vehicleCategory}</Text></View> : null}
            {p.passengers != null ? <View style={s.row}><Text style={s.rowLabel}>Passengers</Text><Text style={s.rowValue}>{p.passengers}</Text></View> : null}
            {p.driverAge != null ? <View style={s.row}><Text style={s.rowLabel}>Main driver age</Text><Text style={s.rowValue}>{p.driverAge}</Text></View> : null}
            <View style={s.row}><Text style={s.rowLabel}>Additional drivers</Text><Text style={s.rowValue}>{additionalDriversText}</Text></View>
          </View>

          {/* ── Financial data rows — can flow freely ── */}
          <Text style={s.sectionHead}>Financial Summary (for invoice reference)</Text>
          <View style={s.row}><Text style={s.rowLabel}>Currency</Text><Text style={s.rowValue}>{cur}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Car hire amount</Text><Text style={s.rowValue}>{fmt(p.carHire)}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Fuel deposit</Text><Text style={s.rowValue}>{fmt(p.fuelDeposit)}</Text></View>
          {p.fuelCharge > 0 ? <View style={s.row}><Text style={s.rowLabel}>Fuel charge (actual)</Text><Text style={s.rowValue}>{fmt(p.fuelCharge)}</Text></View> : null}
          {p.fuelRefund > 0 ? <View style={s.row}><Text style={s.rowLabel}>Fuel refunded</Text><Text style={s.rowValue}>{fmt(p.fuelRefund)}</Text></View> : null}

          {/* ── wrap={false}: gross total bar + refunds + net total + notes ──
              All kept together as one atomic unit. If they don't fit below
              the data rows they move to page 2 as a complete block. ── */}
          <View wrap={false}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{hasRefunds ? "Gross total (hire + fuel charged)" : "Total (hire + fuel charged)"}</Text>
              <Text style={s.totalValue}>{fmt(grossTotal)}</Text>
            </View>

            {hasRefunds && (
              <View>
                <View style={s.refundBox}>
                  <Text style={s.refundHead}>Post-Completion Refunds Issued by Camel Global</Text>
                  {p.postCompletionRefunds.map((r, i) => (
                    <View key={r.id} style={s.refundRow}>
                      <Text style={s.refundLabel}>
                        {`Refund ${i + 1}${r.reason ? ` — ${r.reason}` : ""}${r.created_at ? ` (${new Date(r.created_at).toLocaleDateString("en-GB")})` : ""}`}
                      </Text>
                      <Text style={s.refundValue}>- {fmt(r.amount)}</Text>
                    </View>
                  ))}
                  <View style={s.refundTotal}>
                    <Text style={s.refundTotalL}>Total refunded to customer</Text>
                    <Text style={s.refundTotalV}>- {fmt(pcTotal)}</Text>
                  </View>
                </View>
                <View style={s.netRow}>
                  <Text style={s.netLabel}>Net total after refunds</Text>
                  <Text style={s.netValue}>{fmt(netTotal)}</Text>
                </View>
                <Text style={s.note}>
                  Post-completion refunds were issued by Camel Global directly to the customer. The taxable supply on your VAT invoice is the gross car hire amount.
                  If you have issued a credit note to account for a partial refund of services, include that reference on your invoice.
                </Text>
              </View>
            )}

            <Text style={s.note}>
              Note: The car hire amount above is the gross amount paid by the customer through the Camel Global platform before Camel's commission is deducted.
              For your VAT invoice to the customer, the taxable supply is the full car hire amount.
              Camel Global's commission is a separate platform fee charged to you — it does not reduce the value of the supply to the customer.
            </Text>
          </View>

          {/* Blank fields for partner to complete */}
          <View style={[s.section, { marginTop: 16 }]}>
            <Text style={s.sectionHead}>Your Details (to complete on your invoice)</Text>
            <Text style={[s.note, { marginBottom: 8, marginTop: 0 }]}>
              The following fields must be completed by you on your VAT invoice: your company name, registered address,
              VAT/tax registration number, your own sequential invoice number, date of issue, and your applicable VAT rate and amount.
            </Text>
            {[
              "Your company name",
              "Your registered address",
              "Your VAT / tax number",
              "Your invoice number",
              "Date of issue",
              "VAT rate applicable",
              "VAT amount",
            ].map(field => (
              <View key={field} style={s.blankRow}>
                <Text style={s.blankLabel}>{field.toUpperCase()}</Text>
                <View style={s.blankLine} />
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Camel Global · NTUK Ltd · Office 7, 35-37 Ludgate Hill, London EC4M 7JN · Company No. 08765474</Text>
          <Text style={s.footerText}>camel-global.com</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoiceDataPDF(params: InvoiceDataParams): Promise<Buffer> {
  const LOGO_URL = "https://portal.camel-global.com/camel-invoice-logo.png";
  let logoBase64: string | null = null;
  try {
    const logoRes = await fetch(LOGO_URL);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      logoBase64 = Buffer.from(buf).toString("base64");
    }
  } catch (e) {
    console.warn("generateInvoiceDataPDF: logo fetch failed", e);
  }
  return renderToBuffer(<InvoiceDataDocument p={params} logoBase64={logoBase64} />);
}
