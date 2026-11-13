/**
 * Prepaid Booking Voucher PDF — camel-portal
 * Server-side only. Uses @react-pdf/renderer. Always English (NTUK legal, CLAUDE.md rule 3).
 *
 * What a partner's counter staff attach to their rental contract to release the vehicle:
 * the customer has paid the hire in full to Camel Global, so the contract is recorded as
 * prepaid via Camel Global (an agency/broker voucher, like any other broker), and Camel pays
 * the partner in the monthly settlement. Not a VAT invoice and not a payment to the partner.
 */

import React from "react";
import { currencyLocale } from "@/lib/currency";
import {
  Document, Page, Text, View, Image,
  StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(currencyLocale(currency), { style: "currency", currency }).format(amount);
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Madrid",
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 40 },
  topBar:      { backgroundColor: "#ff7a00", height: 8 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "16 24 12 24", borderBottom: "1 solid #e5e5e5" },
  logo:        { width: 90, height: 28, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerSub:   { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:  { fontSize: 8, color: "#555" },
  body:        { padding: "20 24" },
  titleRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title:       { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111" },
  voucherNo:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ff7a00", marginTop: 3 },
  stamp:       { borderWidth: 2, borderStyle: "solid", padding: "6 12", alignItems: "center" },
  stampText:   { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  stampSub:    { fontSize: 7, marginTop: 2 },
  instrBox:    { backgroundColor: "#fff4e8", borderLeft: "3 solid #ff7a00", padding: "8 10", marginBottom: 14 },
  instrHead:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#b45309", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  instrText:   { fontSize: 8, color: "#333", lineHeight: 1.5, marginBottom: 2 },
  section:     { marginBottom: 12 },
  sectionHead: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1 solid #f5f5f5" },
  rowLabel:    { color: "#555", flex: 1 },
  rowValue:    { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1.4 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:  { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:  { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  note:        { fontSize: 7.5, color: "#777", marginTop: 6, lineHeight: 1.5 },
  footer:      { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1 solid #e5e5e5", padding: "6 24", flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 7, color: "#aaa" },
});

export interface BookingVoucherParams {
  jobNumber:        number | null;
  bookingId:        string;
  bookingStatus:    string;
  partnerCompany:   string | null;
  partnerVat:       string | null;
  customerName:     string | null;
  customerPhone:    string | null;
  pickupAddress:    string | null;
  dropoffAddress:   string | null;
  pickupAt:         string | null;
  dropoffAt:        string | null;
  vehicleCategory:  string | null;
  passengers:       number | null;
  driverAge:        number | null;
  additionalDrivers: number;
  currency:         string;
  carHire:          number;
  fuelDeposit:      number;
  paidAt:           string | null;
  paymentReference: string | null;
  issuedAt:         string;
}

function VoucherDocument({ p, logoBase64 }: { p: BookingVoucherParams; logoBase64: string | null }) {
  const cur       = p.currency;
  const fmt       = (n: number) => fmtMoney(n, cur);
  const ref       = p.jobNumber ? `#${p.jobNumber}` : p.bookingId.slice(0, 8).toUpperCase();
  const cancelled = p.bookingStatus === "cancelled";
  const stampCol  = cancelled ? "#b91c1c" : "#15803d";
  const row = (label: string, value: string | null | undefined) =>
    value ? <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View> : null;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          {logoBase64
            ? <Image src={`data:image/png;base64,${logoBase64}`} style={s.logo} />
            : <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>}
          <View style={s.headerRight}>
            <Text style={s.headerSub}>PREPAID BOOKING VOUCHER</Text>
            <Text style={s.headerDate}>Issued: {fmtDateShort(p.issuedAt)}</Text>
            <Text style={s.headerDate}>Voucher: {ref}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.titleRow}>
            <View>
              <Text style={s.title}>Prepaid Booking Voucher</Text>
              <Text style={s.voucherNo}>Voucher / booking no. {ref}</Text>
            </View>
            <View style={[s.stamp, { borderColor: stampCol }]}>
              <Text style={[s.stampText, { color: stampCol }]}>{cancelled ? "CANCELLED" : "PAID IN FULL"}</Text>
              <Text style={[s.stampSub, { color: stampCol }]}>
                {cancelled ? "Do not release a vehicle" : `Prepaid via Camel Global · ${fmtDateShort(p.paidAt)}`}
              </Text>
            </View>
          </View>

          {!cancelled && (
            <View style={s.instrBox}>
              <Text style={s.instrHead}>For the rental desk</Text>
              <Text style={s.instrText}>
                The customer has paid this hire in full to Camel Global. Do not charge the customer for the car hire.
              </Text>
              <Text style={s.instrText}>
                Record the rental contract as prepaid. Payment method: Camel Global (agency voucher). Reference: {ref}. Amount: {fmt(p.carHire)}.
              </Text>
              <Text style={s.instrText}>
                Camel Global pays you for this booking in the monthly settlement after the hire is completed.
                The vehicle security deposit is not included and is taken by you at handover under your own terms.
              </Text>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionHead}>Supplier</Text>
            {row("Issued to", p.partnerCompany || "—")}
            {row("VAT / tax number", p.partnerVat)}
          </View>

          <View style={s.section}>
            <Text style={s.sectionHead}>Customer and hire</Text>
            {row("Lead driver", p.customerName || "—")}
            {row("Phone", p.customerPhone)}
            {row("Main driver age", p.driverAge != null ? String(p.driverAge) : null)}
            {row("Additional drivers", p.additionalDrivers > 0 ? String(p.additionalDrivers) : "None")}
            {row("Vehicle", p.vehicleCategory)}
            {row("Passengers", p.passengers != null ? String(p.passengers) : null)}
            {row("Delivery address", p.pickupAddress || "—")}
            {row("Delivery date / time", fmtDateTime(p.pickupAt))}
            {row("Collection address", p.dropoffAddress)}
            {row("Collection date / time", p.dropoffAt ? fmtDateTime(p.dropoffAt) : null)}
          </View>

          <View style={s.section} wrap={false}>
            <Text style={s.sectionHead}>Payment received by Camel Global</Text>
            {row("Car hire", fmt(p.carHire))}
            {row("Fuel deposit", fmt(p.fuelDeposit))}
            {row("Currency", cur)}
            {row("Paid on", fmtDateTime(p.paidAt))}
            {row("Payment reference", p.paymentReference)}
            {row("Received by", "NTUK Ltd t/a Camel Global")}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total paid by customer</Text>
              <Text style={s.totalValue}>{fmt(p.carHire + p.fuelDeposit)}</Text>
            </View>
            <Text style={s.note}>
              The fuel deposit is held by Camel Global. When the hire is completed, the fuel used is added to your
              settlement and the unused balance is refunded to the customer by Camel Global. Fuel is not charged at the desk.
            </Text>
          </View>

          <Text style={s.note}>
            This voucher confirms payment for the booking above. It is not a VAT invoice. You remain the supplier of the
            hire and issue your own invoice to the customer (Camel Global partner terms, clause 9). Check the current
            status of this booking at portal.camel-global.com before handover.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Camel Global · NTUK Ltd · Office 7, 35-37 Ludgate Hill, London EC4M 7JN · Company No. 08765474</Text>
          <Text style={s.footerText}>camel-global.com</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateBookingVoucherPDF(params: BookingVoucherParams): Promise<Buffer> {
  const LOGO_URL = "https://portal.camel-global.com/camel-invoice-logo.png";
  let logoBase64: string | null = null;
  try {
    const logoRes = await fetch(LOGO_URL);
    if (logoRes.ok) logoBase64 = Buffer.from(await logoRes.arrayBuffer()).toString("base64");
  } catch (e) {
    console.warn("generateBookingVoucherPDF: logo fetch failed", e);
  }
  return renderToBuffer(<VoucherDocument p={params} logoBase64={logoBase64} />);
}
