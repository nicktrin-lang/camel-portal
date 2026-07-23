import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { currencyLocale } from "@/lib/currency";
import { sendEmail, coerceEmailLocale, EmailLocale } from "@/lib/email";
import fs from "fs";
import path from "path";

// Monthly partner statement — a full English PDF of every transaction for the
// period (car hire, fuel used, customer fuel refund, commission, net payout),
// emailed to the partner alongside the commission invoice at month-end. English
// only (NTUK legal rule); shares the commission-invoice branding.

export type StatementBooking = {
  id: string;
  job_number: string | null;
  created_at: string | null;
  car_hire_price: number | null;
  commission_amount: number | null;
  fuel_charge: number | null;       // fuel actually used (kept by the partner)
  fuel_refund: number | null;       // unused fuel refunded to the customer
  settled_partner_net: number | null;
  currency: string | null;
  booking_status: string | null;
  refund_status: string | null;
};

export type GenerateStatementResult = {
  ok: boolean;
  storage_path?: string;
  error?: string;
};

function fmtCurr(amount: number, currency: string): string {
  return new Intl.NumberFormat(currencyLocale(currency), { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("en-GB"); } catch { return value; }
}

function periodLabel(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

async function buildPdf(params: {
  periodMonth: string;
  companyName: string;
  legalName: string;
  address: string | null;
  vatNumber: string | null;
  bookings: StatementBooking[];
  currency: string;
}): Promise<Buffer> {
  const { Document, Page, Text, View, Image, StyleSheet, pdf } = await import("@react-pdf/renderer");
  const { periodMonth, companyName, legalName, address, vatNumber, bookings, currency } = params;
  const label = periodLabel(periodMonth);

  let logoBase64: string | null = null;
  try {
    const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "camel-invoice-logo.png"));
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch { /* logo not critical */ }

  // Totals (single currency per statement — never summed across currencies)
  let totCarHire = 0, totFuelUsed = 0, totFuelRefund = 0, totCommission = 0, totNet = 0;
  for (const b of bookings) {
    totCarHire    += Number(b.car_hire_price      || 0);
    totFuelUsed   += Number(b.fuel_charge          || 0);
    totFuelRefund += Number(b.fuel_refund          || 0);
    totCommission += Number(b.commission_amount    || 0);
    totNet        += Number(b.settled_partner_net  || 0);
  }

  const styles = StyleSheet.create({
    page:            { fontFamily: "Helvetica", fontSize: 8, color: "#222", padding: 32, backgroundColor: "#fff" },
    orangeBar:       { height: 4, backgroundColor: "#ff7a00", marginBottom: 20 },
    header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    title:           { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
    sub:             { fontSize: 9, color: "#888" },
    logo:            { width: 150, height: 66, objectFit: "contain" },
    section:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    block:           { width: "45%" },
    blockLabel:      { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    blockText:       { fontSize: 8, color: "#333", lineHeight: 1.5 },
    blockBold:       { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
    divider:         { borderBottomWidth: 1, borderBottomColor: "#e5e5e5", marginBottom: 12 },
    tableHeader:     { flexDirection: "row", backgroundColor: "#000", padding: "5 6" },
    th:              { fontFamily: "Helvetica-Bold", fontSize: 6.5, color: "#fff", textTransform: "uppercase", letterSpacing: 0.4 },
    tableRow:        { flexDirection: "row", padding: "4 6", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    tableRowAlt:     { flexDirection: "row", padding: "4 6", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fafafa" },
    td:              { fontSize: 7.5, color: "#444" },
    totalsRow:       { flexDirection: "row", padding: "6 6", backgroundColor: "#f4f4f4", borderTopWidth: 1, borderTopColor: "#000" },
    totalsCell:      { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#000" },
    note:            { marginTop: 16, padding: 10, backgroundColor: "#f8f8f8", borderLeftWidth: 3, borderLeftColor: "#ff7a00" },
    noteText:        { fontSize: 7.5, color: "#555", lineHeight: 1.5 },
    footer:          { position: "absolute", bottom: 24, left: 32, right: 32, borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText:      { fontSize: 7, color: "#aaa" },
  });

  // landscape columns
  const C = { job: 60, date: 65, hire: 90, fuel: 90, refund: 100, comm: 90, net: 100 };

  const doc = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.orangeBar} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Monthly Statement</Text>
            <Text style={styles.sub}>{label} · {currency}</Text>
          </View>
          {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
        </View>

        <View style={styles.section}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Statement for</Text>
            <Text style={styles.blockBold}>{legalName || companyName || "—"}</Text>
            {address ? <Text style={styles.blockText}>{address}</Text> : null}
            {vatNumber ? <Text style={styles.blockText}>VAT/Tax no: {vatNumber}</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Issued by</Text>
            <Text style={styles.blockBold}>NTUK Ltd (trading as Camel Global)</Text>
            <Text style={styles.blockText}>Office 7, 35-37 Ludgate Hill{"\n"}London, England, EC4M 7JN{"\n"}Company No: 08765474</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={{ ...styles.th, width: C.job }}>Job #</Text>
          <Text style={{ ...styles.th, width: C.date }}>Date</Text>
          <Text style={{ ...styles.th, width: C.hire, textAlign: "right" }}>Car Hire</Text>
          <Text style={{ ...styles.th, width: C.fuel, textAlign: "right" }}>Fuel Used</Text>
          <Text style={{ ...styles.th, width: C.refund, textAlign: "right" }}>Cust. Fuel Refund</Text>
          <Text style={{ ...styles.th, width: C.comm, textAlign: "right" }}>Commission</Text>
          <Text style={{ ...styles.th, width: C.net, textAlign: "right" }}>Your Net Payout</Text>
        </View>

        {bookings.map((b, i) => {
          const curr = b.currency || currency;
          const cancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
          const label2 = cancelled ? ` (cancelled)` : "";
          return (
            <View key={b.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.td, width: C.job }}>{(b.job_number || b.id.slice(0, 8)) + label2}</Text>
              <Text style={{ ...styles.td, width: C.date }}>{fmtDate(b.created_at)}</Text>
              <Text style={{ ...styles.td, width: C.hire, textAlign: "right" }}>{fmtCurr(Number(b.car_hire_price || 0), curr)}</Text>
              <Text style={{ ...styles.td, width: C.fuel, textAlign: "right" }}>{fmtCurr(Number(b.fuel_charge || 0), curr)}</Text>
              <Text style={{ ...styles.td, width: C.refund, textAlign: "right" }}>{fmtCurr(Number(b.fuel_refund || 0), curr)}</Text>
              <Text style={{ ...styles.td, width: C.comm, textAlign: "right" }}>− {fmtCurr(Number(b.commission_amount || 0), curr)}</Text>
              <Text style={{ ...styles.td, width: C.net, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#000" }}>{fmtCurr(Number(b.settled_partner_net || 0), curr)}</Text>
            </View>
          );
        })}

        <View style={styles.totalsRow}>
          <Text style={{ ...styles.totalsCell, width: C.job + C.date }}>Totals ({bookings.length})</Text>
          <Text style={{ ...styles.totalsCell, width: C.hire, textAlign: "right" }}>{fmtCurr(totCarHire, currency)}</Text>
          <Text style={{ ...styles.totalsCell, width: C.fuel, textAlign: "right" }}>{fmtCurr(totFuelUsed, currency)}</Text>
          <Text style={{ ...styles.totalsCell, width: C.refund, textAlign: "right" }}>{fmtCurr(totFuelRefund, currency)}</Text>
          <Text style={{ ...styles.totalsCell, width: C.comm, textAlign: "right" }}>− {fmtCurr(totCommission, currency)}</Text>
          <Text style={{ ...styles.totalsCell, width: C.net, textAlign: "right" }}>{fmtCurr(totNet, currency)}</Text>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Your Net Payout = Car Hire − Commission + Fuel Used. The Customer Fuel Refund column is the unused fuel returned
            to the customer and is shown for transparency only — it does not affect your payout. This statement is issued in {currency};
            amounts are never converted. The total net payout above matches the transfer made to your account for {label}.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>NTUK Ltd · Company No: 08765474 · Office 7, 35-37 Ludgate Hill, London EC4M 7JN</Text>
          <Text style={styles.footerText}>Monthly Statement · {label} · {currency}</Text>
        </View>
      </Page>
    </Document>
  );

  const instance = pdf(doc);
  const ab = await (await instance.toBlob()).arrayBuffer();
  return Buffer.from(ab);
}

export async function generateMonthlyStatement(
  partnerUserId: string,
  periodMonth: string,
  bookings: StatementBooking[],
  currency: string,
): Promise<GenerateStatementResult> {
  const db = createServiceRoleSupabaseClient();
  try {
    const { data: profile } = await db
      .from("partner_profiles")
      .select("company_name, legal_company_name, vat_number, address, communication_locale")
      .eq("user_id", partnerUserId)
      .maybeSingle();

    const { data: authUser } = await db.auth.admin.getUserById(partnerUserId);
    const partnerEmail = authUser?.user?.email || null;
    const companyName  = profile?.company_name || "Partner";
    const label        = periodLabel(periodMonth);
    // Covering email is localized to the partner; the attached statement PDF
    // stays English (NTUK finance document).
    const emailLocale  = coerceEmailLocale(profile?.communication_locale);
    const tL = <T,>(m: Record<EmailLocale, T>) => m[emailLocale] ?? m.en;

    const pdfBuffer = await buildPdf({
      periodMonth,
      companyName,
      legalName: profile?.legal_company_name || companyName,
      address:   profile?.address || null,
      vatNumber: profile?.vat_number || null,
      bookings,
      currency,
    });

    const storagePath = `${partnerUserId}/${periodMonth}/statement-${currency}.pdf`;
    const { error: uploadErr } = await db.storage
      .from("monthly-statements")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (uploadErr) console.error("Monthly statement upload failed:", uploadErr.message);

    if (partnerEmail) {
      const subjectL: Record<EmailLocale, string> = {
        en: `Your Camel Global statement — ${label} (${currency})`,
        es: `Tu extracto de Camel Global — ${label} (${currency})`,
        fr: `Votre relevé Camel Global — ${label} (${currency})`,
        it: `Il tuo estratto conto Camel Global — ${label} (${currency})`,
        pt: `O seu extrato Camel Global — ${label} (${currency})`,
        de: `Ihre Camel Global Abrechnung — ${label} (${currency})`,
      };
      const headL: Record<EmailLocale, string> = { en: "Monthly Statement", es: "Extracto mensual", fr: "Relevé mensuel", it: "Estratto conto mensile", pt: "Extrato mensal", de: "Monatliche Abrechnung" };
      const hiL: Record<EmailLocale, string> = { en: `Hi ${companyName},`, es: `Hola ${companyName},`, fr: `Bonjour ${companyName},`, it: `Ciao ${companyName},`, pt: `Olá ${companyName},`, de: `Hallo ${companyName},` };
      const p1L: Record<EmailLocale, string> = {
        en: `Please find attached your full Camel Global statement for <strong>${label}</strong> — every transaction for the period, with your net payout. Your commission invoice is attached to a separate email.`,
        es: `Adjunto encontrarás tu extracto completo de Camel Global para <strong>${label}</strong>: todas las transacciones del período, con tu pago neto. Tu factura de comisión se envía en un correo aparte.`,
        fr: `Veuillez trouver ci-joint votre relevé Camel Global complet pour <strong>${label}</strong> — toutes les transactions de la période, avec votre paiement net. Votre facture de commission est jointe à un e-mail distinct.`,
        it: `In allegato trovi il tuo estratto conto Camel Global completo per <strong>${label}</strong>: tutte le transazioni del periodo, con il tuo pagamento netto. La tua fattura di commissione è allegata a un'email separata.`,
        pt: `Em anexo encontra o seu extrato Camel Global completo para <strong>${label}</strong> — todas as transações do período, com o seu pagamento líquido. A sua fatura de comissão é enviada num email separado.`,
        de: `Anbei finden Sie Ihre vollständige Camel Global Abrechnung für <strong>${label}</strong> — alle Transaktionen des Zeitraums mit Ihrer Nettoauszahlung. Ihre Provisionsrechnung erhalten Sie in einer separaten E-Mail.`,
      };
      const dlL: Record<EmailLocale, string> = {
        en: "You can also download this any time from your partner portal under Reports.",
        es: "También puedes descargarlo en cualquier momento desde tu portal de socios, en Informes.",
        fr: "Vous pouvez également le télécharger à tout moment depuis votre portail partenaire, dans Rapports.",
        it: "Puoi scaricarlo in qualsiasi momento dal tuo portale partner, nella sezione Report.",
        pt: "Também pode transferi-lo a qualquer momento a partir do seu portal de parceiro, em Relatórios.",
        de: "Sie können sie jederzeit in Ihrem Partnerportal unter Berichte herunterladen.",
      };
      await sendEmail({
        to: partnerEmail,
        subject: tL(subjectL),
        html: `
          <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
            <div style="background:#000;padding:20px 28px;">
              <h2 style="color:#fff;margin:0;">${tL(headL)}</h2>
              <p style="color:#999;margin:4px 0 0;font-size:13px;">${label} · ${currency}</p>
            </div>
            <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
              <p>${tL(hiL)}</p>
              <p>${tL(p1L)}</p>
              <p style="font-size:13px;color:#666;">${tL(dlL)}</p>
              <p style="margin-top:24px;color:#999;font-size:12px;">NTUK Ltd · Company No: 08765474 · Office 7, 35-37 Ludgate Hill, London EC4M 7JN</p>
            </div>
          </div>`,
        attachments: [{ filename: `camel-statement-${periodMonth}-${currency}.pdf`, content: pdfBuffer.toString("base64"), encoding: "base64" }],
      }).catch(e => console.error("Monthly statement email failed:", e?.message));
    }

    return { ok: true, storage_path: storagePath };
  } catch (e: any) {
    console.error("generateMonthlyStatement error:", e?.message);
    return { ok: false, error: e?.message || "Unknown error" };
  }
}
