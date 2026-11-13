/**
 * Prepaid Booking Voucher PDF — camel-portal
 * Server-side only. Uses @react-pdf/renderer.
 *
 * Language: English, or bilingual when the partner's communication_locale isn't English —
 * their language first for the desk staff, the English text under it. This is the one
 * deliberate exception to "PDFs are always English" (CLAUDE.md rule 3): it is an operational
 * document for the rental counter, and the English text stays on it and prevails.
 *
 * What a partner's counter staff attach to their rental contract to release the vehicle:
 * the customer has paid the hire in full to Camel Global, so the contract is recorded as
 * prepaid via Camel Global (an agency/broker voucher, like any other broker), and Camel pays
 * the partner in the monthly settlement. Not a VAT invoice and not a payment to the partner.
 */

import React from "react";
import { currencyLocale } from "@/lib/currency";
import STRINGS from "@/lib/portal/bookingVoucherStrings.json";
import {
  Document, Page, Text, View, Image,
  StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(currencyLocale(currency), { style: "currency", currency }).format(amount);
}

export type VoucherLocale = "en" | "es" | "fr" | "it" | "pt" | "de";
type Strings = typeof STRINGS.en;
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const DATE_LOCALE: Record<VoucherLocale, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-PT", de: "de-DE" };

function fmtDateTime(iso: string | null | undefined, locale: VoucherLocale = "en"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(DATE_LOCALE[locale], {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Madrid",
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null | undefined, locale: VoucherLocale = "en"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 30 },
  topBar:      { backgroundColor: "#ff7a00", height: 8 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "12 24 10 24", borderBottom: "1 solid #e5e5e5" },
  logo:        { width: 90, height: 28, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerSub:   { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:  { fontSize: 8, color: "#555" },
  body:        { padding: "16 24" },
  titleRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title:       { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111" },
  voucherNo:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ff7a00", marginTop: 3 },
  stamp:       { borderWidth: 2, borderStyle: "solid", padding: "6 12", alignItems: "center" },
  stampText:   { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  stampSub:    { fontSize: 7, marginTop: 2 },
  instrBox:    { backgroundColor: "#fff4e8", borderLeft: "3 solid #ff7a00", padding: "8 10", marginBottom: 10 },
  instrHead:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#b45309", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  instrText:   { fontSize: 8, color: "#333", lineHeight: 1.4, marginBottom: 1 },
  section:     { marginBottom: 9 },
  sectionHead: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottom: "1 solid #f5f5f5" },
  rowLabel:    { color: "#555", flex: 1 },
  rowValue:    { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1.4 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:  { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:  { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  note:        { fontSize: 7.5, color: "#777", marginTop: 5, lineHeight: 1.4 },
  en:          { fontSize: 6.5, color: "#999", fontFamily: "Helvetica-Oblique" },
  enPara:      { fontSize: 6.5, color: "#999", fontFamily: "Helvetica-Oblique", lineHeight: 1.3, marginBottom: 2 },
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
  locale?:          VoucherLocale;
}

function VoucherDocument({ p, logoBase64 }: { p: BookingVoucherParams; logoBase64: string | null }) {
  const locale    = p.locale ?? "en";
  const L: Strings = STRINGS[locale] ?? STRINGS.en;
  const E: Strings = STRINGS.en;
  const bi        = locale !== "en";
  const cur       = p.currency;
  const fmt       = (n: number) => fmtMoney(n, cur);
  const ref       = p.jobNumber ? `#${p.jobNumber}` : p.bookingId.slice(0, 8).toUpperCase();
  const cancelled = p.bookingStatus === "cancelled";
  const stampCol  = cancelled ? "#b91c1c" : "#15803d";
  const vars      = { ref, amount: fmt(p.carHire), date: fmtDateShort(p.paidAt, locale) };

  // Label in the partner's language, with the English under it when they differ.
  const label = (k: keyof Strings) => (
    <Text style={s.rowLabel}>
      {L[k]}{bi && <Text style={s.en}>{`  ${E[k]}`}</Text>}
    </Text>
  );
  const row = (k: keyof Strings, value: string | null | undefined) =>
    value ? <View style={s.row}>{label(k)}<Text style={s.rowValue}>{value}</Text></View> : null;
  const para = (k: keyof Strings, style: any) => (
    <View>
      <Text style={style}>{fill(L[k], vars)}</Text>
      {bi && <Text style={s.enPara}>{fill(E[k], vars)}</Text>}
    </View>
  );
  const head = (k: keyof Strings) => <Text style={s.sectionHead}>{bi ? `${L[k]} · ${E[k]}` : E[k]}</Text>;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          {logoBase64
            ? <Image src={`data:image/png;base64,${logoBase64}`} style={s.logo} />
            : <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>}
          <View style={s.headerRight}>
            <Text style={s.headerSub}>{L.headerSub}</Text>
            {bi && <Text style={s.headerSub}>{E.headerSub}</Text>}
            <Text style={s.headerDate}>{L.issued}: {fmtDateShort(p.issuedAt, locale)}</Text>
            <Text style={s.headerDate}>{L.voucher}: {ref}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.titleRow}>
            <View>
              <Text style={s.title}>{L.title}</Text>
              {bi && <Text style={[s.en, { fontSize: 9 }]}>{E.title}</Text>}
              <Text style={s.voucherNo}>{L.voucherNo} {ref}</Text>
            </View>
            <View style={[s.stamp, { borderColor: stampCol }]}>
              <Text style={[s.stampText, { color: stampCol }]}>{cancelled ? L.cancelled : L.paid}</Text>
              {bi && <Text style={[s.stampSub, { color: stampCol }]}>{cancelled ? E.cancelled : E.paid}</Text>}
              <Text style={[s.stampSub, { color: stampCol }]}>
                {cancelled ? L.doNotRelease : fill(L.prepaidVia, vars)}
              </Text>
            </View>
          </View>

          {!cancelled && (
            <View style={s.instrBox}>
              <Text style={s.instrHead}>{bi ? `${L.deskHead} · ${E.deskHead}` : E.deskHead}</Text>
              {para("desk1", s.instrText)}
              {para("desk2", s.instrText)}
              {para("desk3", s.instrText)}
            </View>
          )}

          <View style={s.section}>
            {head("supplier")}
            {row("issuedTo", p.partnerCompany || "—")}
            {row("vat", p.partnerVat)}
          </View>

          <View style={s.section}>
            {head("customerHire")}
            {row("leadDriver", p.customerName || "—")}
            {row("phone", p.customerPhone)}
            {row("driverAge", p.driverAge != null ? String(p.driverAge) : null)}
            {row("addDrivers", p.additionalDrivers > 0 ? String(p.additionalDrivers) : L.none)}
            {row("vehicle", p.vehicleCategory)}
            {row("passengers", p.passengers != null ? String(p.passengers) : null)}
            {row("delAddr", p.pickupAddress || "—")}
            {row("delTime", fmtDateTime(p.pickupAt, locale))}
            {row("colAddr", p.dropoffAddress)}
            {row("colTime", p.dropoffAt ? fmtDateTime(p.dropoffAt, locale) : null)}
          </View>

          <View style={s.section} wrap={false}>
            {head("paymentHead")}
            {row("carHire", fmt(p.carHire))}
            {row("fuelDeposit", fmt(p.fuelDeposit))}
            {row("currency", cur)}
            {row("paidOn", fmtDateTime(p.paidAt, locale))}
            {row("payRef", p.paymentReference)}
            {row("receivedBy", "NTUK Ltd t/a Camel Global")}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{bi ? `${L.total} · ${E.total}` : E.total}</Text>
              <Text style={s.totalValue}>{fmt(p.carHire + p.fuelDeposit)}</Text>
            </View>
            {para("fuelNote", s.note)}
          </View>

          {para("footNote", s.note)}
          {bi && <Text style={s.enPara}>The English text on this voucher prevails in the event of any conflict.</Text>}
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
