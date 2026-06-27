import Stripe from "stripe";
import React from "react";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { calculateFuelCharge, normalizeFuel } from "@/lib/portal/calculateFuelCharge";
import { sendEmail, coerceEmailLocale, type EmailLocale } from "@/lib/email";

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
    console.log("completeBooking: customer request fetch status", res.status, "rows", rows?.length);
    return rows?.[0] ?? null;
  } catch (e: any) {
    console.error("completeBooking: customer request fetch failed", e?.message);
    return null;
  }
}

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
  amendedBox:  { flexDirection:"row", justifyContent:"space-between", backgroundColor:"#fff3e0", padding:"8 10", marginTop:6, borderLeft:"3 solid #ff7a00" },
  amendedLabel:{ fontFamily:"Helvetica-Bold", color:"#cc5500", fontSize:10 },
  amendedValue:{ fontFamily:"Helvetica-Bold", color:"#cc5500", fontSize:10 },
  note:        { fontSize:7.5, color:"#888", marginTop:8, lineHeight:1.5 },
  amendNote:   { fontSize:7.5, color:"#cc5500", marginTop:8, lineHeight:1.5, backgroundColor:"#fff3e0", padding:"4 6" },
  footer:      { position:"absolute", bottom:0, left:0, right:0, borderTop:"1 solid #e5e5e5", padding:"6 24", flexDirection:"row", justifyContent:"space-between" },
  footerText:  { fontSize:7, color:"#aaa" },
});

const QUARTER_LABELS: Record<number,string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

export function fuelLabel(v: string|null): string {
  switch(v) {
    case "empty":   return "Empty";
    case "quarter": return "¼ Tank";
    case "half":    return "½ Tank";
    case "3/4":     return "¾ Tank";
    case "full":    return "Full Tank";
    default:        return v||"—";
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

export type PostCompletionRefund = {
  id: string;
  amount: number;
  reason: string | null;
  stripe_refund_id: string | null;
  created_at: string;
};

export interface StatementData {
  jobNumber:              number|null;
  bookingId:              string;
  customerName:           string|null;
  pickupAddress:          string|null;
  dropoffAddress:         string|null;
  pickupAt:               string|null;
  dropoffAt:              string|null;
  durationMinutes:        number|null;
  vehicleCategory:        string|null;
  companyName:            string|null;
  currency:               string;
  carHire:                number;
  fuelDeposit:            number;
  totalPaid:              number;
  collectionFuel:         string|null;
  returnFuel:             string|null;
  usedQuarters:           number;
  fuelCharge:             number;
  fuelRefund:             number;
  issuedAt:               string;
  logoBase64:             string|null;
  postCompletionRefunds?: PostCompletionRefund[];
}

export function StatementDocument({ d }: { d: StatementData }) {
  const cur       = d.currency;
  const locale    = cur==="GBP"?"en-GB":cur==="USD"?"en-US":"es-ES";
  const fmt       = (n: number) => new Intl.NumberFormat(locale,{style:"currency",currency:cur}).format(n);
  const ref       = d.jobNumber ? `#${d.jobNumber}` : d.bookingId.slice(0,8).toUpperCase();
  const dateStr   = new Date(d.issuedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const finalAmount = d.carHire + d.fuelCharge;

  const refunds        = d.postCompletionRefunds ?? [];
  const totalRefunded  = refunds.reduce((s, r) => s + r.amount, 0);
  const netFinalAmount = finalAmount - totalRefunded;
  const isAmended      = refunds.length > 0;

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
            <Text style={ps.headerSub}>
              {isAmended ? "AMENDED BOOKING COMPLETION STATEMENT" : "BOOKING COMPLETION STATEMENT"}
            </Text>
            <Text style={ps.headerDate}>Issued: {dateStr}</Text>
            <Text style={ps.headerDate}>Ref: {ref}</Text>
            {isAmended && <Text style={{...ps.headerDate, color:"#cc5500"}}>AMENDED — supersedes previous statement</Text>}
          </View>
        </View>

        <View style={ps.body}>
          <Text style={ps.title}>
            {isAmended ? "Amended Booking Completion Statement" : "Booking Completion Statement"}
          </Text>
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

          {isAmended && (
            <View style={ps.section}>
              <Text style={{...ps.sectionHead, color:"#cc5500", marginTop:12}}>Post-Completion Adjustments</Text>
              {refunds.map((r, i) => (
                <View key={r.id} style={ps.row}>
                  <Text style={{...ps.rowLabel, color:"#cc5500"}}>
                    Refund {i+1}{r.reason ? ` — ${r.reason}` : ""}
                    {r.created_at ? ` (${new Date(r.created_at).toLocaleDateString("en-GB")})` : ""}
                  </Text>
                  <Text style={{...ps.rowValue, color:"#cc5500"}}>− {fmt(r.amount)}</Text>
                </View>
              ))}
              <View style={ps.amendedBox}>
                <Text style={ps.amendedLabel}>Net amount after adjustments</Text>
                <Text style={ps.amendedValue}>{fmt(netFinalAmount)}</Text>
              </View>
              <Text style={ps.amendNote}>
                This is an amended statement. Post-completion refunds totalling {fmt(totalRefunded)} have been issued to your original payment method.
                Please allow 5–10 business days for refunds to appear. This statement supersedes any previously issued statement for this booking.
              </Text>
            </View>
          )}

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

export function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "camel-invoice-logo.png");
    return fs.readFileSync(logoPath).toString("base64");
  } catch (e) {
    console.warn("completeBooking: could not read logo from disk", e);
    return null;
  }
}

export async function generateCompletionStatementPDF(d: StatementData): Promise<Buffer> {
  return renderToBuffer(<StatementDocument d={d} />);
}

// ── Localized completion emails ─────────────────────────────────────────────
// Notification emails are localized to the recipient's communication_locale
// (6 locales, EN fallback). Fuel level values (QUARTER_LABELS / fuelLabel) and
// the attached PDF stay English — only labels and prose are localized.

const SIG_REGARDS: Record<EmailLocale, string> = {
  en: "Best Regards,", es: "Saludos,", fr: "Cordialement,", it: "Cordiali saluti,", pt: "Com os melhores cumprimentos,", de: "Mit freundlichen Grüßen,",
};
const SIG_TEAM: Record<EmailLocale, string> = {
  en: "The Camel Global Team", es: "El equipo de Camel Global", fr: "L'équipe Camel Global", it: "Il team di Camel Global", pt: "A equipa Camel Global", de: "Das Camel Global Team",
};
const HELLO: Record<EmailLocale, string> = { en: "Hi", es: "Hola", fr: "Bonjour", it: "Salve", pt: "Olá", de: "Hallo" };
const TANK_WORD: Record<EmailLocale, string> = { en: "tank", es: "depósito", fr: "réservoir", it: "serbatoio", pt: "depósito", de: "Tank" };

function pickL<T>(m: Record<EmailLocale, T>, l: EmailLocale): T { return m[l] ?? m.en; }

function greetLine(name: string | null | undefined, locale: EmailLocale): string {
  const hello = pickL(HELLO, locale);
  const n = (name || "").trim();
  if (n) return `${hello} ${n},`;
  return locale === "en" ? `${hello} there,` : `${hello},`;
}

function usedLabel(q: number, locale: EmailLocale): string {
  return QUARTER_LABELS[q] ?? `${q}/4 ${pickL(TANK_WORD, locale)}`;
}

function buildCustomerCompletionEmail(opts: {
  locale: EmailLocale;
  jobNo: string;
  customerName: string | null;
  companyName: string;
  deliveryFuel: string | null;
  collectionFuel: string | null;
  usedQuarters: number;
  fuelChargeFmt: string;
  finalAmountFmt: string;
  fuelRefund: number;
  fuelRefundFmt: string;
  siteUrl: string;
}): { subject: string; html: string } {
  const L = opts.locale;
  const subject: Record<EmailLocale, string> = {
    en: `Your Camel Global booking is now completed - ${opts.jobNo}`,
    es: `Tu reserva de Camel Global ha sido completada - ${opts.jobNo}`,
    fr: `Votre réservation Camel Global est maintenant finalisée - ${opts.jobNo}`,
    it: `La tua prenotazione Camel Global è ora completata - ${opts.jobNo}`,
    pt: `A sua reserva Camel Global foi concluída - ${opts.jobNo}`,
    de: `Ihre Camel Global Buchung ist jetzt abgeschlossen - ${opts.jobNo}`,
  };
  const heading: Record<EmailLocale, string> = {
    en: "Booking completed", es: "Reserva completada", fr: "Réservation finalisée", it: "Prenotazione completata", pt: "Reserva concluída", de: "Buchung abgeschlossen",
  };
  const subLabel: Record<EmailLocale, string> = { en: "Booking", es: "Reserva", fr: "Réservation", it: "Prenotazione", pt: "Reserva", de: "Buchung" };
  const intro1: Record<EmailLocale, string> = {
    en: `The Camel Global team thank you for your completed car hire with <strong>${opts.companyName}</strong>. We hope your experience was everything you expected.`,
    es: `El equipo de Camel Global te agradece tu alquiler de coche completado con <strong>${opts.companyName}</strong>. Esperamos que tu experiencia haya sido todo lo que esperabas.`,
    fr: `L'équipe Camel Global vous remercie pour votre location de voiture finalisée avec <strong>${opts.companyName}</strong>. Nous espérons que votre expérience a été à la hauteur de vos attentes.`,
    it: `Il team di Camel Global ti ringrazia per il noleggio auto completato con <strong>${opts.companyName}</strong>. Speriamo che la tua esperienza sia stata all'altezza delle aspettative.`,
    pt: `A equipa da Camel Global agradece o seu aluguer de automóvel concluído com <strong>${opts.companyName}</strong>. Esperamos que a sua experiência tenha correspondido às suas expectativas.`,
    de: `Das Camel Global Team dankt Ihnen für Ihre abgeschlossene Autovermietung mit <strong>${opts.companyName}</strong>. Wir hoffen, Ihre Erfahrung hat Ihre Erwartungen erfüllt.`,
  };
  const intro2: Record<EmailLocale, string> = {
    en: "Please find your Booking Completion Statement attached to this email.",
    es: "Encontrarás tu Resumen de Finalización de Reserva adjunto a este correo.",
    fr: "Vous trouverez votre relevé de finalisation de réservation en pièce jointe à cet email.",
    it: "In allegato a questa email trovi il tuo Riepilogo di Completamento della Prenotazione.",
    pt: "Em anexo a este email encontra o seu Resumo de Conclusão da Reserva.",
    de: "Ihre Buchungsabschlussübersicht finden Sie im Anhang dieser E-Mail.",
  };
  const fuelTitle: Record<EmailLocale, string> = { en: "Fuel Summary", es: "Resumen de combustible", fr: "Récapitulatif du carburant", it: "Riepilogo carburante", pt: "Resumo do combustível", de: "Kraftstoffübersicht" };
  const rDelivery: Record<EmailLocale, string> = { en: "Delivery fuel level", es: "Nivel combustible entrega", fr: "Niveau de carburant à la livraison", it: "Livello carburante alla consegna", pt: "Nível de combustível na entrega", de: "Kraftstoffstand bei Lieferung" };
  const rCollection: Record<EmailLocale, string> = { en: "Collection fuel level", es: "Nivel combustible recogida", fr: "Niveau de carburant à la restitution", it: "Livello carburante al ritiro", pt: "Nível de combustível na recolha", de: "Kraftstoffstand bei Abholung" };
  const rUsed: Record<EmailLocale, string> = { en: "Fuel used", es: "Combustible usado", fr: "Carburant utilisé", it: "Carburante utilizzato", pt: "Combustível usado", de: "Verbrauchter Kraftstoff" };
  const rCharge: Record<EmailLocale, string> = { en: "Fuel charge", es: "Cargo combustible", fr: "Frais de carburant", it: "Costo carburante", pt: "Custo do combustível", de: "Kraftstoffkosten" };
  const finalLabel: Record<EmailLocale, string> = { en: "Final amount (car hire + fuel)", es: "Importe final (alquiler + combustible)", fr: "Montant final (location + carburant)", it: "Importo finale (noleggio + carburante)", pt: "Montante final (aluguer + combustível)", de: "Endbetrag (Miete + Kraftstoff)" };
  const refundYes: Record<EmailLocale, string> = {
    en: `A fuel deposit refund of <strong>${opts.fuelRefundFmt}</strong> has been issued to your original payment method. Please allow 5–10 business days for it to appear.`,
    es: `Se ha emitido un reembolso del depósito de combustible de <strong>${opts.fuelRefundFmt}</strong> en tu método de pago original. Por favor, permite 5–10 días laborables para que aparezca.`,
    fr: `Un remboursement du dépôt de carburant de <strong>${opts.fuelRefundFmt}</strong> a été émis sur votre moyen de paiement d'origine. Veuillez compter 5–10 jours ouvrés pour qu'il apparaisse.`,
    it: `Un rimborso del deposito carburante di <strong>${opts.fuelRefundFmt}</strong> è stato emesso sul tuo metodo di pagamento originale. Attendi 5–10 giorni lavorativi affinché venga visualizzato.`,
    pt: `Foi emitido um reembolso do depósito de combustível de <strong>${opts.fuelRefundFmt}</strong> para o seu método de pagamento original. Aguarde 5–10 dias úteis até que apareça.`,
    de: `Eine Erstattung der Kraftstoffkaution von <strong>${opts.fuelRefundFmt}</strong> wurde auf Ihr ursprüngliches Zahlungsmittel veranlasst. Bitte rechnen Sie mit 5–10 Werktagen, bis sie erscheint.`,
  };
  const refundNo: Record<EmailLocale, string> = {
    en: "No fuel refund is due — the full tank deposit covered the fuel used.",
    es: "No hay reembolso de combustible — el depósito completo cubrió el combustible usado.",
    fr: "Aucun remboursement de carburant n'est dû — le dépôt du plein a couvert le carburant utilisé.",
    it: "Nessun rimborso carburante dovuto — il deposito per il pieno ha coperto il carburante utilizzato.",
    pt: "Não há reembolso de combustível — o depósito do depósito cheio cobriu o combustível usado.",
    de: "Es ist keine Kraftstofferstattung fällig — die Kaution für den vollen Tank deckte den verbrauchten Kraftstoff.",
  };
  const contact: Record<EmailLocale, string> = {
    en: `If you have any questions please contact us at <a href="mailto:info@camel-global.com">info@camel-global.com</a>. We look forward to welcoming you again.`,
    es: `Si tienes alguna pregunta, contáctanos en <a href="mailto:info@camel-global.com">info@camel-global.com</a>. Esperamos volverte a ver pronto.`,
    fr: `Pour toute question, contactez-nous à <a href="mailto:info@camel-global.com">info@camel-global.com</a>. Au plaisir de vous accueillir à nouveau.`,
    it: `Per qualsiasi domanda contattaci a <a href="mailto:info@camel-global.com">info@camel-global.com</a>. Saremo lieti di accoglierti di nuovo.`,
    pt: `Para qualquer questão contacte-nos em <a href="mailto:info@camel-global.com">info@camel-global.com</a>. Esperamos voltar a recebê-lo em breve.`,
    de: `Bei Fragen erreichen Sie uns unter <a href="mailto:info@camel-global.com">info@camel-global.com</a>. Wir freuen uns, Sie wieder begrüßen zu dürfen.`,
  };
  const cta: Record<EmailLocale, string> = { en: "View My Bookings", es: "Ver mis reservas", fr: "Voir mes réservations", it: "Visualizza le mie prenotazioni", pt: "Ver as minhas reservas", de: "Meine Buchungen anzeigen" };

  const refundLine = opts.fuelRefund > 0
    ? `<p style="margin:8px 0 0;font-size:13px;color:#22a06b;font-weight:600;">${pickL(refundYes, L)}</p>`
    : `<p style="margin:8px 0 0;font-size:13px;color:#666;">${pickL(refundNo, L)}</p>`;

  const html = `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">${pickL(heading, L)}</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">${pickL(subLabel, L)} ${opts.jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>${greetLine(opts.customerName, L)}</p>
            <p>${pickL(intro1, L)}</p>
            <p>${pickL(intro2, L)}</p>
            <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">${pickL(fuelTitle, L)}</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">${pickL(rDelivery, L)}</td><td style="text-align:right;">${fuelLabel(opts.deliveryFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rCollection, L)}</td><td style="text-align:right;">${fuelLabel(opts.collectionFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rUsed, L)}</td><td style="text-align:right;">${usedLabel(opts.usedQuarters, L)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rCharge, L)}</td><td style="text-align:right;">${opts.fuelChargeFmt}</td></tr>
                <tr style="border-top:1px solid #ddd;">
                  <td style="padding:8px 0 4px;font-weight:700;">${pickL(finalLabel, L)}</td>
                  <td style="text-align:right;font-weight:700;">${opts.finalAmountFmt}</td>
                </tr>
              </table>
              ${refundLine}
            </div>
            <p style="font-size:13px;color:#666;">${pickL(contact, L)}</p>
            <a href="${opts.siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">${pickL(cta, L)}</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">${pickL(SIG_REGARDS, L)}<br/>${pickL(SIG_TEAM, L)}</p>
          </div>
        </div>
      `;

  return { subject: pickL(subject, L), html };
}

function buildPartnerCompletionEmail(opts: {
  locale: EmailLocale;
  jobNo: string;
  contactName: string;
  companyName: string;
  deliveryFuel: string | null;
  collectionFuel: string | null;
  usedQuarters: number;
  fuelChargeFmt: string;
  fuelRefund: number;
  fuelRefundFmt: string;
  carHireFmt: string;
  commRate: number;
  commAmtFmt: string;
  partnerPayoutFmt: string;
  portalUrl: string;
  bookingId: string;
}): { subject: string; html: string } {
  const L = opts.locale;
  const subject: Record<EmailLocale, string> = {
    en: `Booking ${opts.jobNo} completed — payout ready`,
    es: `Reserva ${opts.jobNo} completada — pago listo`,
    fr: `Réservation ${opts.jobNo} finalisée — paiement prêt`,
    it: `Prenotazione ${opts.jobNo} completata — pagamento pronto`,
    pt: `Reserva ${opts.jobNo} concluída — pagamento pronto`,
    de: `Buchung ${opts.jobNo} abgeschlossen — Auszahlung bereit`,
  };
  const heading: Record<EmailLocale, string> = { en: "Booking Completed", es: "Reserva completada", fr: "Réservation finalisée", it: "Prenotazione completata", pt: "Reserva concluída", de: "Buchung abgeschlossen" };
  const subLabel: Record<EmailLocale, string> = { en: "Booking", es: "Reserva", fr: "Réservation", it: "Prenotazione", pt: "Reserva", de: "Buchung" };
  const intro: Record<EmailLocale, string> = {
    en: `Booking ${opts.jobNo} has been marked as completed. Your payout has been queued for the next monthly run.`,
    es: `La reserva ${opts.jobNo} ha sido marcada como completada. Tu pago ha sido añadido a la cola para el próximo pago mensual.`,
    fr: `La réservation ${opts.jobNo} a été marquée comme finalisée. Votre paiement a été ajouté à la file pour le prochain versement mensuel.`,
    it: `La prenotazione ${opts.jobNo} è stata contrassegnata come completata. Il tuo pagamento è stato messo in coda per il prossimo versamento mensile.`,
    pt: `A reserva ${opts.jobNo} foi marcada como concluída. O seu pagamento foi colocado em fila para o próximo pagamento mensal.`,
    de: `Buchung ${opts.jobNo} wurde als abgeschlossen markiert. Ihre Auszahlung wurde für den nächsten monatlichen Lauf eingeplant.`,
  };
  const fuelTitle: Record<EmailLocale, string> = { en: "Fuel Summary", es: "Resumen de combustible", fr: "Récapitulatif du carburant", it: "Riepilogo carburante", pt: "Resumo do combustível", de: "Kraftstoffübersicht" };
  const rDelivery: Record<EmailLocale, string> = { en: "Delivery fuel level", es: "Nivel combustible entrega", fr: "Niveau de carburant à la livraison", it: "Livello carburante alla consegna", pt: "Nível de combustível na entrega", de: "Kraftstoffstand bei Lieferung" };
  const rCollection: Record<EmailLocale, string> = { en: "Collection fuel level", es: "Nivel combustible recogida", fr: "Niveau de carburant à la restitution", it: "Livello carburante al ritiro", pt: "Nível de combustível na recolha", de: "Kraftstoffstand bei Abholung" };
  const rUsed: Record<EmailLocale, string> = { en: "Fuel used", es: "Combustible usado", fr: "Carburant utilisé", it: "Carburante utilizzato", pt: "Combustível usado", de: "Verbrauchter Kraftstoff" };
  const rChargeCust: Record<EmailLocale, string> = { en: "Fuel charge to customer", es: "Cargo combustible al cliente", fr: "Frais de carburant facturés au client", it: "Costo carburante addebitato al cliente", pt: "Custo de combustível ao cliente", de: "Kraftstoffkosten für den Kunden" };
  const rRefundCust: Record<EmailLocale, string> = { en: "Fuel refund to customer", es: "Reembolso combustible al cliente", fr: "Remboursement carburant au client", it: "Rimborso carburante al cliente", pt: "Reembolso de combustível ao cliente", de: "Kraftstofferstattung an den Kunden" };
  const none: Record<EmailLocale, string> = { en: "None", es: "Ninguno", fr: "Aucun", it: "Nessuno", pt: "Nenhum", de: "Keine" };
  const payoutTitle: Record<EmailLocale, string> = { en: "Payout Summary", es: "Resumen de pago", fr: "Récapitulatif du paiement", it: "Riepilogo pagamento", pt: "Resumo do pagamento", de: "Auszahlungsübersicht" };
  const rCarHire: Record<EmailLocale, string> = { en: "Car hire price", es: "Precio alquiler", fr: "Prix de la location", it: "Prezzo del noleggio", pt: "Preço do aluguer", de: "Mietpreis" };
  const rCommission: Record<EmailLocale, string> = {
    en: `Camel commission (${opts.commRate}%)`, es: `Comisión Camel (${opts.commRate}%)`, fr: `Commission Camel (${opts.commRate}%)`, it: `Commissione Camel (${opts.commRate}%)`, pt: `Comissão Camel (${opts.commRate}%)`, de: `Camel-Provision (${opts.commRate}%)`,
  };
  const rFuelCharge: Record<EmailLocale, string> = { en: "Fuel charge", es: "Cargo combustible", fr: "Frais de carburant", it: "Costo carburante", pt: "Custo do combustível", de: "Kraftstoffkosten" };
  const rNetPayout: Record<EmailLocale, string> = { en: "Your net payout", es: "Tu pago neto", fr: "Votre paiement net", it: "Il tuo pagamento netto", pt: "O seu pagamento líquido", de: "Ihre Nettoauszahlung" };
  const cta: Record<EmailLocale, string> = { en: "View Booking", es: "Ver reserva", fr: "Voir la réservation", it: "Visualizza prenotazione", pt: "Ver reserva", de: "Buchung ansehen" };

  const refundCustVal = opts.fuelRefund > 0 ? opts.fuelRefundFmt : pickL(none, L);

  const html = `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;">${pickL(heading, L)}</h2>
            <p style="color:#999;margin:4px 0 0;font-size:13px;">${pickL(subLabel, L)} ${opts.jobNo}</p>
          </div>
          <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
            <p>${greetLine(opts.contactName || opts.companyName, L)}</p>
            <p>${pickL(intro, L)}</p>
            <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
              <p style="margin:0 0 8px;font-weight:700;">${pickL(fuelTitle, L)}</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">${pickL(rDelivery, L)}</td><td style="text-align:right;">${fuelLabel(opts.deliveryFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rCollection, L)}</td><td style="text-align:right;">${fuelLabel(opts.collectionFuel)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rUsed, L)}</td><td style="text-align:right;">${usedLabel(opts.usedQuarters, L)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rChargeCust, L)}</td><td style="text-align:right;">${opts.fuelChargeFmt}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rRefundCust, L)}</td><td style="text-align:right;">${refundCustVal}</td></tr>
              </table>
            </div>
            <div style="background:#f0fff0;padding:16px;margin:16px 0;border-left:4px solid #22c55e;">
              <p style="margin:0 0 8px;font-weight:700;">${pickL(payoutTitle, L)}</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#666;">${pickL(rCarHire, L)}</td><td style="text-align:right;">${opts.carHireFmt}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rCommission, L)}</td><td style="text-align:right;">− ${opts.commAmtFmt}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">${pickL(rFuelCharge, L)}</td><td style="text-align:right;">+ ${opts.fuelChargeFmt}</td></tr>
                <tr style="font-weight:700;border-top:1px solid #ddd;"><td style="padding:6px 0;">${pickL(rNetPayout, L)}</td><td style="text-align:right;">${opts.partnerPayoutFmt}</td></tr>
              </table>
            </div>
            <a href="${opts.portalUrl}/partner/bookings/${opts.bookingId}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">${pickL(cta, L)}</a>
            <p style="margin-top:24px;color:#999;font-size:13px;">${pickL(SIG_TEAM, L)}</p>
          </div>
        </div>
      `;

  return { subject: pickL(subject, L), html };
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
      fuel_used_quarters, payout_status, commission_rate
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

  // ── Load partner info ─────────────────────────────────────────────────────
  const { data: partnerProfile } = await db
    .from("partner_profiles")
    .select("company_name, contact_name, communication_locale")
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
      // Step 1: Reverse the transfer to the partner — pulls money back before refunding customer
      const pi = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
        { expand: ["latest_charge"] }
      );
      const charge = pi.latest_charge as any;
      const transferId = charge?.transfer as string | null;

      if (transferId) {
        await stripe.transfers.createReversal(transferId, {
          amount: refundCents,
          metadata: {
            refund_type: "fuel_refund",
            booking_id:  bookingId,
            job_number:  jobNo,
          },
        });
      } else {
        console.warn(`completeBooking: no transfer found on PI ${payment.stripe_payment_intent_id} — skipping transfer reversal`);
      }

      // Step 2: Refund the customer from Camel's main account
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

  // ── Load request from customer DB via direct REST fetch ───────────────────
  const request = await fetchCustomerRequest(booking.request_id);

  const { data: partnerAuthData } = await db.auth.admin.getUserById(booking.partner_user_id);
  const partnerEmail = partnerAuthData?.user?.email || null;

  const carHire       = Number(booking.car_hire_price || 0);
  const fuelDep       = Number(booking.fuel_price     || 0);
  const totalPaid     = Number(booking.amount         || carHire + fuelDep);
  const finalAmount   = carHire + fuel_charge;
  const commRate      = Number(booking.commission_rate ?? 20);
  const commAmt       = Math.max((carHire * commRate) / 100, 10);
  const partnerPayout = Math.max(0, carHire - commAmt + fuel_charge);
  const partnerLocale = coerceEmailLocale(partnerProfile?.communication_locale);

  // ── Look up customer communication locale ─────────────────────────────────
  let customerLocale: EmailLocale = "en";
  try {
    if (request?.customer_user_id) {
      const { data: custProfile } = await db
        .from("customer_profiles")
        .select("communication_locale")
        .eq("user_id", request.customer_user_id)
        .maybeSingle();
      customerLocale = coerceEmailLocale(custProfile?.communication_locale);
    }
  } catch (e) {
    console.error("completeBooking: failed to fetch customer locale:", e);
  }

  // ── Generate completion statement PDF ─────────────────────────────────────
  let statementBase64: string | null = null;
  try {
    const statementData: StatementData = {
      jobNumber:       booking.job_number,
      bookingId,
      customerName:    request?.customer_name    || null,
      pickupAddress:   request?.pickup_address   || null,
      dropoffAddress:  request?.dropoff_address  || null,
      pickupAt:        request?.pickup_at        || null,
      dropoffAt:       request?.dropoff_at       || null,
      durationMinutes: request?.journey_duration_minutes || null,
      vehicleCategory: request?.vehicle_category_name   || null,
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
      logoBase64:      getLogoBase64(),
      postCompletionRefunds: [],
    };

    const pdfBuffer = await generateCompletionStatementPDF(statementData);
    statementBase64 = pdfBuffer.toString("base64");
  } catch (pdfErr: any) {
    console.error("Completion statement PDF generation failed:", pdfErr?.message);
  }

  const statementFilename = `Camel-Completion-Statement-${booking.job_number ?? bookingId.slice(0,8)}.pdf`;

  // ── Email customer ────────────────────────────────────────────────────────
  if (request?.customer_email) {
    const { subject: custSubject, html: custHtml } = buildCustomerCompletionEmail({
      locale:          customerLocale,
      jobNo,
      customerName:    request.customer_name || null,
      companyName,
      deliveryFuel:    collectionFuel,
      collectionFuel:  returnFuel,
      usedQuarters:    used_quarters,
      fuelChargeFmt:   fmt(fuel_charge),
      finalAmountFmt:  fmt(finalAmount),
      fuelRefund:      fuel_refund,
      fuelRefundFmt:   fmt(fuel_refund),
      siteUrl,
    });

    await sendEmail({
      to: request.customer_email,
      subject: custSubject,
      html: custHtml,
      ...(statementBase64 ? {
        attachments: [{
          filename: statementFilename,
          content:  statementBase64,
          encoding: "base64",
        }],
      } : {}),
    }).catch(e => console.error("Completion customer email failed:", e?.message));
  } else {
    console.error("completeBooking: no customer_email found for request", booking.request_id);
  }

  // ── Email partner ─────────────────────────────────────────────────────────
  if (partnerEmail) {
    const { subject: partnerSubject, html: partnerHtml } = buildPartnerCompletionEmail({
      locale:           partnerLocale,
      jobNo,
      contactName:      partnerProfile?.contact_name || "",
      companyName,
      deliveryFuel:     collectionFuel,
      collectionFuel:   returnFuel,
      usedQuarters:     used_quarters,
      fuelChargeFmt:    fmt(fuel_charge),
      fuelRefund:       fuel_refund,
      fuelRefundFmt:    fmt(fuel_refund),
      carHireFmt:       fmt(carHire),
      commRate,
      commAmtFmt:       fmt(commAmt),
      partnerPayoutFmt: fmt(partnerPayout),
      portalUrl,
      bookingId,
    });

    await sendEmail({
      to:      partnerEmail,
      subject: partnerSubject,
      html:    partnerHtml,
    }).catch(e => console.error("Completion partner email failed:", e?.message));
  }

  // ── Email admin ───────────────────────────────────────────────────────────
  const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "")
    .split(",").map(e => e.trim()).filter(Boolean);

  for (const adminEmail of adminEmails) {
    await sendEmail({
      to:      adminEmail,
      subject: `[Admin] Booking ${jobNo} completed — fuel refund ${fmt(fuel_refund)}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <p>Booking <strong>${jobNo}</strong> marked completed.</p>
          <p>
            <strong>Partner:</strong> ${companyName}<br/>
            <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
            <strong>Customer email locale:</strong> ${customerLocale}<br/>
            <strong>Fuel used:</strong> ${QUARTER_LABELS[used_quarters]??`${used_quarters}/4`} (${fuelLabel(collectionFuel)} → ${fuelLabel(returnFuel)})<br/>
            <strong>Fuel charge:</strong> ${fmt(fuel_charge)}<br/>
            <strong>Fuel refund:</strong> ${fmt(fuel_refund)}<br/>
            <strong>Car hire price:</strong> ${fmt(carHire)}<br/>
            <strong>Camel commission (${commRate}%):</strong> ${fmt(commAmt)}<br/>
            <strong>Partner net payout:</strong> ${fmt(partnerPayout)}<br/>
            <strong>Final amount charged:</strong> ${fmt(finalAmount)}<br/>
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
