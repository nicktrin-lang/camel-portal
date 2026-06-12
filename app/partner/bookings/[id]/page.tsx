"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Currency = "EUR" | "GBP" | "USD";
const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};
type Rates = { GBP: number; USD: number };

type PostCompletionRefund = {
  id: string;
  amount: number;
  reason: string | null;
  stripe_refund_id: string | null;
  created_at: string;
};

type DriverRow = {
  id: string; partner_user_id: string; auth_user_id: string | null;
  full_name: string; email: string; phone: string | null;
  is_active: boolean; created_at: string;
};

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  commission_rate: number | null; commission_amount: number | null; partner_payout_amount: number | null;
  currency: Currency; charge_currency: string | null; conversion_rate: number | null;
  cancelled_by: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; refund_status: string | null | undefined;
  collection_confirmed_by_driver?: boolean | null; collection_confirmed_by_driver_at?: string | null;
  collection_fuel_level_driver?: string | null;
  return_confirmed_by_driver?: boolean | null; return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
  collection_confirmed_by_partner?: boolean | null; collection_confirmed_by_partner_at?: string | null;
  collection_fuel_level_partner?: string | null; collection_partner_notes?: string | null;
  return_confirmed_by_partner?: boolean | null; return_confirmed_by_partner_at?: string | null;
  return_fuel_level_partner?: string | null; return_partner_notes?: string | null;
  collection_confirmed_by_customer?: boolean | null; collection_confirmed_by_customer_at?: string | null;
  collection_fuel_level_customer?: string | null; collection_customer_notes?: string | null;
  return_confirmed_by_customer?: boolean | null; return_confirmed_by_customer_at?: string | null;
  return_fuel_level_customer?: string | null; return_customer_notes?: string | null;
  insurance_docs_confirmed_by_driver?: boolean | null; insurance_docs_confirmed_by_driver_at?: string | null;
  insurance_docs_confirmed_by_customer?: boolean | null; insurance_docs_confirmed_by_customer_at?: string | null;
  delivery_driver_id?: string | null; delivery_driver_name?: string | null; delivery_confirmed_at?: string | null;
  collection_driver_id?: string | null; collection_driver_name?: string | null; collection_confirmed_at?: string | null;
  payment_id?: string | null;
  payout_hold?: boolean | null;
  payout_hold_reason?: string | null;
  post_completion_refund_total?: number | null;
  partner_company_name?: string | null;
};

type PaymentData = {
  stripe_fee: number | null; stripe_fee_currency: string | null;
  exchange_rate: number | null; charge_currency: string | null;
  amount_total: number | null; amount_car_hire: number | null; amount_fuel_deposit: number | null;
  cancellation_refund_amount: number | null; cancellation_refund_stripe_id: string | null;
  cancelled_refunded_at: string | null;
  fuel_refund_amount: number | null; fuel_refund_stripe_id: string | null;
} | null;

type RequestRow = {
  id: string; job_number: number | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  sport_equipment: string | null;
  driver_age: number | null;
  additional_drivers: number;
  additional_driver_ages: string | null;
  vehicle_category_name: string | null; notes: string | null; status: string | null; created_at: string | null;
  customer_billing_address: string | null;
  customer_tax_id: string | null;
};

type BookingApiResponse = {
  booking: BookingRow;
  payment: PaymentData;
  request: RequestRow | null;
  role: string | null;
  postCompletionRefunds?: PostCompletionRefund[];
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

const PRE_COLLECTION = ["confirmed","driver_assigned","en_route","arrived"];
const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

function fmtCurr(amount: number, curr: Currency | string): string {
  const locale = curr === "GBP" ? "en-GB" : curr === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
}
function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return v; }
}
function toEur(amount: number, stored: Currency, rates: Rates): number {
  if (stored==="EUR") return amount;
  if (stored==="GBP") return Math.round((amount/rates.GBP)*100)/100;
  return Math.round((amount/rates.USD)*100)/100;
}
function fromEur(amountEur: number, target: Currency, rates: Rates): number {
  if (target==="EUR") return amountEur;
  if (target==="GBP") return Math.round(amountEur*rates.GBP*100)/100;
  return Math.round(amountEur*rates.USD*100)/100;
}
function Amt({ amount, stored, rates }: { amount:number|null|undefined; stored:Currency; rates:Rates }) {
  if (amount==null||isNaN(amount)) return <span>—</span>;
  const sec1: Currency = stored==="USD"?"EUR":stored==="GBP"?"EUR":"GBP";
  const sec2: Currency = stored==="EUR"?"USD":stored==="GBP"?"USD":"GBP";
  const inEur = toEur(amount,stored,rates);
  return (
    <span>
      {fmtCurr(amount,stored)}{" "}
      <span className="opacity-60 text-[0.85em] font-normal">
        ({fmtCurr(fromEur(inEur,sec1,rates),sec1)} · {fmtCurr(fromEur(inEur,sec2,rates),sec2)})
      </span>
    </span>
  );
}
function normalizeFuel(v: unknown): string|null {
  if (!v) return null;
  const s=String(v).toLowerCase().trim();
  if (s==="empty") return "empty"; if (s==="quarter") return "quarter";
  if (s==="half") return "half"; if (s==="three_quarter"||s==="3/4") return "3/4";
  if (s==="full") return "full"; return null;
}
const FUEL_BARS: Record<string,number> = { empty:0, quarter:1, half:2, "3/4":3, full:4 };
function FuelBar({ level }: { level: unknown }) {
  const n=normalizeFuel(level); const filled=n?(FUEL_BARS[n]??0):0;
  return (
    <div className="flex gap-1 mt-1">
      {[0,1,2,3].map(i=>(
        <div key={i} className={["h-2.5 flex-1",i<filled?filled>=3?"bg-green-500":filled===2?"bg-yellow-400":"bg-red-400":"bg-black/10"].join(" ")}/>
      ))}
    </div>
  );
}
function fmt(v?: string|null) { if (!v) return "—"; try { return new Date(v).toLocaleString(); } catch { return v; } }
function fmtDuration(m?: number|null) {
  if (!m) return "—";
  if (m>=1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m<60) return `${m} min`;
  const h=Math.floor(m/60),mins=m%60; return mins?`${h}h ${mins}m`:`${h}h`;
}
function effectiveFuel(driverFuel: unknown, partnerFuel: unknown): string|null {
  return normalizeFuel(partnerFuel) || normalizeFuel(driverFuel);
}
function isLocked(opts: {
  driverFuel: string|null; partnerFuel: string|null|undefined;
  customerConfirmed: boolean|null|undefined; customerFuel: string|null|undefined;
}): boolean {
  const effective = normalizeFuel(opts.partnerFuel) || normalizeFuel(opts.driverFuel);
  return !!effective && !!opts.customerConfirmed && effective === normalizeFuel(opts.customerFuel);
}
const QUARTER_LABELS: Record<number,string> = { 0:"Empty",1:"¼ Tank",2:"½ Tank",3:"¾ Tank",4:"Full Tank" };

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-black uppercase tracking-widest text-black/40">{label}</span>
      <span className="text-sm font-bold text-black">{children}</span>
    </div>
  );
}

// ── Invoice data PDF download ─────────────────────────────────────────────────
async function downloadInvoiceData(booking: BookingRow, req: RequestRow | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 15;
  const usableW = pageW - margin * 2;
  let y = margin;

  const currency = booking.currency ?? "EUR";
  const jobRef   = booking.job_number ? `#${booking.job_number}` : booking.id.slice(0, 8).toUpperCase();
  const dateStr  = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  function fmtMoney(amount: number | null | undefined): string {
    if (amount == null) return "—";
    const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  }

  function fmtDateStr(iso: string | null | undefined): string {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("en-GB"); } catch { return iso; }
  }

  function addLine(label: string, value: string, bold = false) {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFontSize(9); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(value || "—", usableW - 52);
    doc.text(lines, margin + 52, y);
    y += lines.length * 5 + 2;
  }

  function addSectionHeader(title: string) {
    if (y > 260) { doc.addPage(); y = margin; }
    y += 4;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 3, usableW, 8, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), margin + 2, y + 2);
    y += 10;
  }

  function addDivider() {
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("CAMEL GLOBAL", margin, 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Booking Data for Invoice Purposes", margin, 13);
  doc.text(`Generated: ${dateStr}`, pageW - margin, 7, { align: "right" });
  doc.text(`Booking ref: ${jobRef}`, pageW - margin, 13, { align: "right" });

  y = 28;

  // ── Notice box ───────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, usableW, 16, "F");
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(margin, y, usableW, 16, "S");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
  doc.text("NOTICE", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  const noticeText = doc.splitTextToSize(
    "This document contains booking data provided by Camel Global to assist you in preparing a VAT invoice for your customer. It is not itself a VAT invoice. You are responsible for issuing a compliant invoice directly to your customer in accordance with applicable tax legislation.",
    usableW - 6
  );
  doc.text(noticeText, margin + 3, y + 10);
  y += 22;

  // ── Booking reference ────────────────────────────────────────────────────
  addSectionHeader("Booking Reference");
  addLine("Booking ref",     jobRef, true);
  addLine("Job number",      booking.job_number ? String(booking.job_number) : "—");
  addLine("Booking status",  String(booking.booking_status ?? "—").replaceAll("_", " "));
  addLine("Booking created", fmtDateStr(booking.created_at));
  addDivider();

  // ── Customer details ─────────────────────────────────────────────────────
  addSectionHeader("Customer Details");
  addLine("Full name",       req?.customer_name   || "—");
  addLine("Email",           req?.customer_email  || "—");
  addLine("Phone",           req?.customer_phone  || "—");

  if (req?.customer_billing_address) {
    addLine("Billing address", req.customer_billing_address);
  } else {
    addLine("Billing address", "Not provided by customer");
  }

  if (req?.customer_tax_id) {
    addLine("Tax ID / VAT No.", req.customer_tax_id);
  } else {
    addLine("Tax ID / VAT No.", "Not provided by customer");
  }
  addDivider();

  // ── Hire details ─────────────────────────────────────────────────────────
  addSectionHeader("Hire Details");
  addLine("Pickup address",  req?.pickup_address  || "—");
  addLine("Dropoff address", req?.dropoff_address || "—");
  addLine("Pickup date/time",  fmtDateStr(req?.pickup_at));
  addLine("Dropoff date/time", fmtDateStr(req?.dropoff_at));
  addLine("Duration",        fmtDuration(req?.journey_duration_minutes));
  addLine("Vehicle type",    req?.vehicle_category_name || "—");
  addLine("Passengers",      req?.passengers != null ? String(req.passengers) : "—");
  addLine("Main driver age", req?.driver_age != null ? String(req.driver_age) : "—");
  if ((req?.additional_drivers ?? 0) > 0) {
    addLine("Additional drivers", `${req!.additional_drivers}${req!.additional_driver_ages ? ` (ages: ${req!.additional_driver_ages})` : ""}`);
  }
  addDivider();

  // ── Financial summary ─────────────────────────────────────────────────────
  addSectionHeader("Financial Summary (for invoice reference)");
  const hire       = Number(booking.car_hire_price ?? 0);
  const fuelDep    = Number(booking.fuel_price ?? 0);
  const fuelCharge = Number(booking.fuel_charge ?? 0);
  const fuelRefund = Number(booking.fuel_refund ?? 0);
  const total      = hire + fuelCharge;

  addLine("Currency",           currency);
  addLine("Car hire amount",    fmtMoney(hire), true);
  addLine("Fuel deposit",       fmtMoney(fuelDep));
  if (fuelCharge > 0) addLine("Fuel charge (actual)", fmtMoney(fuelCharge));
  if (fuelRefund > 0) addLine("Fuel refunded",        fmtMoney(fuelRefund));
  addLine("Total (hire + fuel charged)", fmtMoney(total), true);

  doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(120, 120, 120);
  const noteLines = doc.splitTextToSize(
    "Note: The car hire amount above is the gross amount paid by the customer through the Camel Global platform before Camel's commission is deducted. For your VAT invoice to the customer, the taxable supply is the full car hire amount. Camel Global's commission is a separate platform fee charged to you — it does not reduce the value of the supply to the customer.",
    usableW
  );
  doc.text(noteLines, margin, y);
  y += noteLines.length * 4 + 4;
  addDivider();

  // ── Supplier details (partner fills in) ──────────────────────────────────
  addSectionHeader("Your Details (to complete on your invoice)");
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  const supplierNote = doc.splitTextToSize(
    "The following fields must be completed by you on your VAT invoice: your company name, registered address, VAT/tax registration number, your own invoice number (sequential series), date of issue, and your applicable VAT rate and amount.",
    usableW
  );
  doc.text(supplierNote, margin, y);
  y += supplierNote.length * 4.5 + 4;

  // Blank fields for manual completion
  const blankFields = [
    "Your company name",
    "Your registered address",
    "Your VAT / tax number",
    "Your invoice number",
    "Date of issue",
    "VAT rate applicable",
    "VAT amount",
  ];
  blankFields.forEach(field => {
    if (y > 272) { doc.addPage(); y = margin; }
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
    doc.text(field.toUpperCase(), margin, y);
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
    doc.line(margin + 52, y, pageW - margin, y);
    y += 8;
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global — Booking Data for Invoice Purposes — Ref ${jobRef} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Invoice-Data-${jobRef.replace("#", "")}.pdf`);
}

function PaymentFeesCard({ payment, bidCurrency, booking, postCompletionRefunds }: {
  payment: PaymentData;
  bidCurrency: Currency;
  booking: BookingRow;
  postCompletionRefunds: PostCompletionRefund[];
}) {
  const { t } = useTranslation();
  if (!payment) return null;
  const fmtB = (n: number) => fmtCurr(n, bidCurrency);
  const hire        = Number(booking.car_hire_price ?? 0);
  const rate        = booking.commission_rate ?? 20;
  const commAmt     = Math.max((hire * rate) / 100, 10);
  const fuelDeposit = Number(booking.fuel_price ?? 0);
  const fuelCharge  = Number(booking.fuel_charge ?? 0);
  const netPayout   = (booking.booking_status === "cancelled" && booking.refund_status === "full") ? 0 : Math.max(0, hire - commAmt + fuelCharge);
  const pcTotal     = Number(booking.post_completion_refund_total ?? 0);
  const finalAmount = hire + fuelCharge;
  const netFinal    = finalAmount - pcTotal;

  return (
    <div className="border border-black/10 bg-[#f8f8f8] p-6">
      <h2 className="text-base font-black text-black mb-1">{t("bookings.detail.payment.title")}</h2>
      <p className="text-xs font-bold text-black/40 mb-4">{t("bookings.detail.payment.subtitle", { currency: bidCurrency })}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.payment.carHire")}</span><span className="font-black text-black">{fmtB(hire)}</span></div>
        <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.payment.fuelDeposit")}</span><span className="font-black text-black">{fmtB(fuelDeposit)}</span></div>
        <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.payment.commission", { rate: String(rate) })}</span><span className="font-black text-amber-700">− {fmtB(commAmt)}</span></div>
        {fuelCharge > 0 && (
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.payment.fuelCharge")}</span><span className="font-black text-[#ff7a00]">+ {fmtB(fuelCharge)}</span></div>
        )}
        {payment.fuel_refund_amount != null && payment.fuel_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              {t("bookings.detail.payment.fuelRefund")}
              {payment.fuel_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.fuel_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-green-700">− {fmtB(payment.fuel_refund_amount)}</span>
          </div>
        )}
        {payment.cancellation_refund_amount != null && payment.cancellation_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              {t("bookings.detail.payment.cancelRefund")}
              {payment.cancellation_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.cancellation_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-red-600">− {fmtB(payment.cancellation_refund_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black border-t border-black pt-2 mt-2">
          <span className="text-black">{t("bookings.detail.payment.netPayout")}</span>
          <span className={netPayout > 0 ? "text-green-700" : "text-black/40"}>{fmtB(netPayout)}</span>
        </div>
        {(booking.booking_status === "cancelled" && booking.refund_status === "full") && (
          <p className="text-xs font-bold text-red-600 mt-2">{t("bookings.detail.payment.fullRefundNote")}</p>
        )}
      </div>

      {/* Post-completion refunds — read-only for partner */}
      {postCompletionRefunds.length > 0 && (
        <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">
            Post-Completion Adjustments
          </p>
          {postCompletionRefunds.map((r, i) => (
            <div key={r.id} className="flex items-start justify-between py-2 border-b border-amber-100 last:border-0">
              <span className="text-sm font-semibold text-amber-800">
                Refund {i + 1}{r.reason ? ` — ${r.reason}` : ""}
                <span className="ml-2 text-xs text-amber-600">{fmtDate(r.created_at)}</span>
              </span>
              <span className="text-sm font-black text-amber-700 ml-4 shrink-0">− {fmtB(r.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-amber-300">
            <span className="text-sm font-black text-amber-800">Total refunded to customer</span>
            <span className="text-sm font-black text-amber-700">− {fmtB(pcTotal)}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-black text-black">Net final amount (after adjustments)</span>
            <span className="text-sm font-black text-black">{fmtB(netFinal)}</span>
          </div>
          <p className="mt-3 text-xs font-bold text-amber-600">
            These post-completion adjustments were issued by Camel Global. Contact us at info@camel-global.com if you have any questions.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs font-bold text-black/40">
        {t("bookings.detail.payment.stripeNote")}{" "}
        <a href="/partner/terms" className="underline">{t("bookings.detail.payment.stripeNoteLink")}</a>{" "}
        {t("bookings.detail.payment.stripeNoteEnd")}
      </p>
    </div>
  );
}

function CancellationSummary({ bk, rates }: { bk: BookingRow; rates: Rates }) {
  const { t } = useTranslation();
  const stored     = bk.currency;
  const carHire    = Number(bk.car_hire_price||0);
  const fuel       = Number(bk.fuel_price||0);
  const commRate   = bk.commission_rate??20;
  const commAmt    = Math.max((carHire*commRate)/100,10);
  const basePayout = Math.max(0,carHire-commAmt);
  const isFull     = bk.refund_status==="full";
  const isPartial  = bk.refund_status==="partial";
  const customerCarHireRefund = isFull ? carHire : 0;
  const customerFuelRefund    = fuel;
  const customerTotalRefund   = customerCarHireRefund+customerFuelRefund;
  const partnerKeepsCarHire   = isPartial ? carHire : 0;
  const partnerKeepsComm      = isPartial ? commAmt : 0;
  const partnerNetPayout      = isPartial ? basePayout : 0;
  const cancelledByLabel =
    bk.cancelled_by==="customer" ? t("bookings.detail.cancellation.cancelledByCustomer") :
    bk.cancelled_by==="partner"  ? t("bookings.detail.cancellation.cancelledByPartner") :
    t("bookings.detail.cancellation.cancelledByAdmin");
  return (
    <div className="border border-red-200 bg-red-50 p-6 space-y-4">
      <div>
        <p className="text-base font-black text-red-800">{t("bookings.detail.cancellation.title")}</p>
        <p className="text-sm font-semibold text-red-600 mt-1">{t("bookings.detail.cancellation.cancelledBy")} <strong>{cancelledByLabel}</strong> {t("bookings.detail.cancellation.on")} {fmt(bk.cancelled_at)}</p>
        {bk.cancellation_reason&&<p className="text-sm font-semibold text-red-600">{t("bookings.detail.cancellation.reason")} {bk.cancellation_reason}</p>}
        <p className="text-sm font-semibold text-red-600 mt-1">{t("bookings.detail.cancellation.refundType")} <strong>{isFull ? t("bookings.detail.cancellation.fullRefund") : isPartial ? t("bookings.detail.cancellation.partialRefund") : t("bookings.detail.cancellation.noRefund")}</strong></p>
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">{t("bookings.detail.cancellation.originalAmounts")}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.carHire")}</span><span className="font-black text-black">{fmtCurr(carHire,stored)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.commission", { rate: String(commRate) })}</span><span className="font-black text-amber-700">− {fmtCurr(commAmt,stored)}</span></div>
          <div className="flex justify-between text-sm border-t border-black/10 pt-2"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.payoutExclFuel")}</span><span className="font-black text-black">{fmtCurr(basePayout,stored)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.fuelDeposit")}</span><span className="font-black text-black">{fmtCurr(fuel,stored)}</span></div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black/60">{t("bookings.detail.cancellation.totalCollected")}</span><span className="text-black">{fmtCurr(carHire+fuel,stored)}</span></div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-white border border-red-200 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-3">{t("bookings.detail.cancellation.customerRefund")}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.carHireRefund")}</span><span className={`font-black ${customerCarHireRefund>0?"text-green-700":"text-red-500"}`}>{customerCarHireRefund>0?fmtCurr(customerCarHireRefund,stored):t("bookings.detail.cancellation.notRefunded")}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.fuelDepositRefund")}</span><span className="font-black text-green-700">{fmtCurr(customerFuelRefund,stored)}</span></div>
            <div className="flex justify-between text-sm font-black border-t border-red-100 pt-2"><span className="text-red-800">{t("bookings.detail.cancellation.totalRefund")}</span><span className="text-red-800">{fmtCurr(customerTotalRefund,stored)}</span></div>
          </div>
        </div>
        <div className={`p-4 border ${isPartial?"bg-amber-50 border-amber-200":"bg-white border-red-200"}`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">{t("bookings.detail.cancellation.yourPosition")}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.carHireKeep")}</span><span className={`font-black ${partnerKeepsCarHire>0?"text-black":"text-red-500"}`}>{partnerKeepsCarHire>0?fmtCurr(partnerKeepsCarHire,stored):t("bookings.detail.cancellation.none")}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.commissionPayable")}</span><span className={`font-black ${partnerKeepsComm>0?"text-amber-700":"text-black/30"}`}>{partnerKeepsComm>0?`− ${fmtCurr(partnerKeepsComm,stored)}`:t("bookings.detail.cancellation.none")}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">{t("bookings.detail.cancellation.fuelReturned")}</span><span className="font-black text-black/40">— {fmtCurr(fuel,stored)}</span></div>
            <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black">{t("bookings.detail.cancellation.netPayout")}</span><span className={partnerNetPayout>0?"text-green-700":"text-red-600"}>{partnerNetPayout>0?fmtCurr(partnerNetPayout,stored):`${fmtCurr(0,stored)} — ${t("bookings.detail.cancellation.noPayout")}`}</span></div>
          </div>
          {isPartial&&<p className="mt-3 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-2">{t("bookings.detail.cancellation.partialNote")}</p>}
          {isFull&&<p className="mt-3 text-xs font-bold text-red-700 bg-red-100 px-3 py-2">{t("bookings.detail.cancellation.fullNote")}</p>}
        </div>
      </div>
    </div>
  );
}

function InsuranceStatusCard({ booking }: { booking: BookingRow }) {
  const { t } = useTranslation();
  const driverConfirmed   = !!booking.insurance_docs_confirmed_by_driver;
  const customerConfirmed = !!booking.insurance_docs_confirmed_by_customer;
  const bothConfirmed     = driverConfirmed&&customerConfirmed;
  return (
    <div className={`border p-6 ${bothConfirmed?"border-[#1a1a1a] bg-[#1a1a1a]":"border-black/10 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3"><span className="text-2xl">📄</span><h3 className={`text-base font-black ${bothConfirmed?"text-white":"text-black"}`}>{t("bookings.detail.insurance.title")}</h3></div>
        {bothConfirmed&&<span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">{t("bookings.detail.insurance.confirmed")}</span>}
      </div>
      <p className={`text-xs font-bold mb-4 ${bothConfirmed?"text-white/50":"text-black/50"}`}>{t("bookings.detail.insurance.subtitle")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`border p-4 ${driverConfirmed&&bothConfirmed?"border-white/10 bg-white/5":"border-black/10 bg-[#f0f0f0]"}`}>
          <p className={`text-xs font-black uppercase tracking-widest ${bothConfirmed?"text-white/40":"text-black/40"}`}>{t("bookings.detail.insurance.driverLabel")}</p>
          {driverConfirmed?<><p className={`mt-1 font-black ${bothConfirmed?"text-white":"text-black"}`}>{t("bookings.detail.insurance.handedOver")}</p><p className={`mt-0.5 text-xs ${bothConfirmed?"text-white/40":"text-black/40"}`}>{fmt(booking.insurance_docs_confirmed_by_driver_at)}</p></>:<p className="mt-1 text-sm font-bold italic text-black/40">{t("bookings.detail.insurance.notConfirmed")}</p>}
        </div>
        <div className={`border p-4 ${customerConfirmed&&bothConfirmed?"border-white/10 bg-white/5":"border-black/10 bg-[#f0f0f0]"}`}>
          <p className={`text-xs font-black uppercase tracking-widest ${bothConfirmed?"text-white/40":"text-black/40"}`}>{t("bookings.detail.insurance.customerLabel")}</p>
          {customerConfirmed?<><p className={`mt-1 font-black ${bothConfirmed?"text-white":"text-black"}`}>{t("bookings.detail.insurance.received")}</p><p className={`mt-0.5 text-xs ${bothConfirmed?"text-white/40":"text-black/40"}`}>{fmt(booking.insurance_docs_confirmed_by_customer_at)}</p></>:<p className="mt-1 text-sm font-bold italic text-black/40">{t("bookings.detail.insurance.notConfirmed")}</p>}
        </div>
      </div>
      <div className={`mt-4 border p-3 text-sm font-bold ${bothConfirmed?"border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]":"border-black/10 bg-[#f0f0f0] text-black/60"}`}>
        {bothConfirmed ? t("bookings.detail.insurance.bothConfirmed") : !driverConfirmed&&!customerConfirmed ? t("bookings.detail.insurance.waitingBoth") : !driverConfirmed ? t("bookings.detail.insurance.waitingDriver") : t("bookings.detail.insurance.waitingCustomer")}
      </div>
    </div>
  );
}

function BookingSummaryCard({ booking, rates, isLive }: { booking:BookingRow; rates:Rates; isLive:boolean }) {
  const { t } = useTranslation();
  const stored: Currency    = booking.currency??"EUR";
  const secondary: Currency = stored==="USD"?"EUR":stored==="GBP"?"EUR":"GBP";
  const tertiary: Currency  = stored==="EUR"?"USD":stored==="GBP"?"USD":"GBP";
  const carHireAmt   = Number(booking.car_hire_price||0);
  const fullTankAmt  = Number(booking.fuel_price||0);
  const totalAmt     = Number(booking.amount||0);
  const fuelCharge   = booking.fuel_charge??null;
  const fuelRefund   = booking.fuel_refund??null;
  const perQtrAmt    = fullTankAmt/4;
  const usedQuarters = booking.fuel_used_quarters??null;
  const collFuel = normalizeFuel(booking.collection_fuel_level_partner)||normalizeFuel(booking.collection_fuel_level_driver)||normalizeFuel(booking.collection_fuel_level_customer);
  const retFuel  = normalizeFuel(booking.return_fuel_level_partner)||normalizeFuel(booking.return_fuel_level_driver)||normalizeFuel(booking.return_fuel_level_customer);
  const primary = (v:number)=>fmtCurr(v,stored);
  const sec = (v:number)=>{ const inEur=toEur(v,stored,rates); return `(${fmtCurr(fromEur(inEur,secondary,rates),secondary)} · ${fmtCurr(fromEur(inEur,tertiary,rates),tertiary)})`; };
  const rateBadge = `1€ = ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(rates.GBP)} · 1€ = ${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(rates.USD)}`;
  function fuelLevelLabel(v: unknown): string {
    switch(normalizeFuel(v)) {
      case "empty":   return t("bookings.detail.fuel.level.empty");
      case "quarter": return t("bookings.detail.fuel.level.quarter");
      case "half":    return t("bookings.detail.fuel.level.half");
      case "3/4":     return t("bookings.detail.fuel.level.threequarter");
      case "full":    return t("bookings.detail.fuel.level.full");
      default:        return "—";
    }
  }
  return (
    <div className="bg-[#1a1a1a] p-8 text-white">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-black text-white">{t("bookings.detail.summary.title")}</h2><span className="border border-white/30 px-3 py-1 text-xs font-black text-white">{t("bookings.detail.summary.finalised")}</span></div>
      <div className="bg-white/10 p-5 mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-white/50">{t("bookings.detail.summary.totalValue")}</p>
        <p className="mt-1 text-4xl font-black">{primary(totalAmt)} <span className="text-xl font-bold opacity-60">{sec(totalAmt)}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black uppercase tracking-widest text-white/50">{t("bookings.detail.summary.carHire")}</p><p className="mt-0.5 font-black">{primary(carHireAmt)}</p><p className="text-xs text-white/40">{sec(carHireAmt)}</p></div>
          <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black uppercase tracking-widest text-white/50">{t("bookings.detail.summary.fuelDeposit")}</p><p className="mt-0.5 font-black">{primary(fullTankAmt)}</p><p className="text-xs text-white/40">{sec(fullTankAmt)}</p></div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        {[
          {label:t("bookings.detail.summary.deliveryFuel"),  value:fuelLevelLabel(collFuel), bar:collFuel},
          {label:t("bookings.detail.summary.collectionFuel"),value:fuelLevelLabel(retFuel),  bar:retFuel},
          {label:t("bookings.detail.summary.fuelUsed"),      value:usedQuarters!==null?(QUARTER_LABELS[usedQuarters]??`${usedQuarters}/4`):"—", bar:null},
          {label:t("bookings.detail.summary.perQuarter"),    value:primary(perQtrAmt), bar:null},
        ].map(({label,value,bar})=>(
          <div key={label} className="bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-widest text-white/50">{label}</p><p className="mt-1 text-lg font-black">{value}</p>{bar&&<FuelBar level={bar}/>}</div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-[#ff7a00]/30 border border-[#ff7a00]/50 p-5"><p className="text-xs font-black uppercase tracking-widest text-white/70">{t("bookings.detail.summary.fuelCharge")}</p><p className="mt-2 text-3xl font-black">{fuelCharge!=null?primary(fuelCharge):"—"} {fuelCharge!=null&&<span className="text-xl font-bold opacity-60">{sec(fuelCharge)}</span>}</p></div>
        <div className="bg-green-500/20 border border-green-400/40 p-5"><p className="text-xs font-black uppercase tracking-widest text-white/70">{t("bookings.detail.summary.fuelRefund")}</p><p className="mt-2 text-3xl font-black">{fuelRefund!=null?primary(fuelRefund):"—"} {fuelRefund!=null&&<span className="text-xl font-bold opacity-60">{sec(fuelRefund)}</span>}</p></div>
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-black ${isLive?"bg-white/5 text-white":"bg-white/5 text-white/40"}`}>
        <span className={`h-2 w-2 ${isLive?"bg-[#ff7a00]":"bg-white/30"}`}/>{rateBadge}{isLive?` ${t("bookings.detail.info.liveRate")}` : ""}
      </div>
    </div>
  );
}

function FuelStageCard({ title,booking,stage,fuelValue,onFuelChange,confirmed,onConfirmedChange,notes,onNotesChange,onSave,saving,locked }: {
  title:string; booking:BookingRow; stage:"collection"|"return";
  fuelValue:FuelLevel; onFuelChange:(v:FuelLevel)=>void;
  confirmed:boolean; onConfirmedChange:(v:boolean)=>void;
  notes:string; onNotesChange:(v:string)=>void;
  onSave:()=>void; saving:boolean; locked:boolean;
}) {
  const { t } = useTranslation();
  function fuelLabel(v: unknown): string {
    switch(normalizeFuel(v)) {
      case "empty":   return t("bookings.detail.fuel.level.empty");
      case "quarter": return t("bookings.detail.fuel.level.quarter");
      case "half":    return t("bookings.detail.fuel.level.half");
      case "3/4":     return t("bookings.detail.fuel.level.threequarter");
      case "full":    return t("bookings.detail.fuel.level.full");
      default:        return "—";
    }
  }
  const isC               = stage==="collection";
  const driverConfirmed   = isC?!!booking.collection_confirmed_by_driver:!!booking.return_confirmed_by_driver;
  const driverFuel        = isC?booking.collection_fuel_level_driver:booking.return_fuel_level_driver;
  const driverAt          = isC?booking.collection_confirmed_by_driver_at:booking.return_confirmed_by_driver_at;
  const customerConfirmed = isC?!!booking.collection_confirmed_by_customer:!!booking.return_confirmed_by_customer;
  const customerFuel      = isC?booking.collection_fuel_level_customer:booking.return_fuel_level_customer;
  const customerAt        = isC?booking.collection_confirmed_by_customer_at:booking.return_confirmed_by_customer_at;
  const customerNotes     = isC?booking.collection_customer_notes:booking.return_customer_notes;
  const savedPartnerFuel  = isC?booking.collection_fuel_level_partner:booking.return_fuel_level_partner;
  const savedPartnerAt    = isC?booking.collection_confirmed_by_partner_at:booking.return_confirmed_by_partner_at;
  const hasOverride       = !!savedPartnerFuel && savedPartnerFuel !== driverFuel;
  const effective         = effectiveFuel(driverFuel, savedPartnerFuel);
  const cardBg    = locked ? "border-[#1a1a1a] bg-[#1a1a1a]"  : "border-black/5 bg-white";
  const titleCol  = locked ? "text-white"                       : "text-black";
  const labelCol  = locked ? "text-white/40"                    : "text-black/40";
  const valueCol  = locked ? "text-white"                       : "text-black";
  const italicCol = locked ? "text-white/40"                    : "text-black/40";
  const noteCol   = locked ? "text-white/50"                    : "text-black/50";
  const rowBgFill = (filled: boolean) => locked
    ? (filled ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5")
    : (filled ? "border-black/20 bg-[#f0f0f0]" : "border-black/10 bg-[#f0f0f0]");
  return (
    <div className={`border p-6 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-black ${titleCol}`}>{title}</h3>
        {locked&&<span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Locked</span>}
      </div>
      <div className={`border p-4 mb-3 ${rowBgFill((driverConfirmed&&!!driverFuel)||!!savedPartnerFuel)}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${labelCol}`}>
          {savedPartnerFuel ? t("bookings.detail.fuel.officeOverride") : t("bookings.detail.fuel.driverRecorded")}
        </p>
        {savedPartnerFuel
          ? <><p className={`mt-1 text-lg font-black ${valueCol}`}>{fuelLabel(savedPartnerFuel)}</p><FuelBar level={savedPartnerFuel}/><p className="mt-1 text-xs text-[#ff7a00]">{t("bookings.detail.fuel.setByOffice")}{savedPartnerAt ? ` ${t("bookings.detail.fuel.at")} ${fmt(savedPartnerAt)}` : ""}</p>{driverFuel&&<p className={`mt-1 text-xs ${labelCol}`}>{t("bookings.detail.fuel.driverRecordedAs")} {fuelLabel(driverFuel)}</p>}</>
          : driverConfirmed&&driverFuel
            ? <><p className={`mt-1 text-lg font-black ${valueCol}`}>{fuelLabel(driverFuel)}</p><FuelBar level={driverFuel}/><p className={`mt-1 text-xs ${labelCol}`}>{fmt(driverAt)}</p></>
            : <p className={`mt-1 text-sm font-bold italic ${italicCol}`}>{t("bookings.detail.fuel.driverNotRecorded")}</p>}
      </div>
      <div className={`border p-4 mb-3 ${rowBgFill(customerConfirmed)}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${labelCol}`}>{t("bookings.detail.fuel.customerConfirmed")}</p>
        {customerConfirmed
          ? <><p className={`mt-1 text-lg font-black ${valueCol}`}>{fuelLabel(customerFuel)} ✓</p><p className={`mt-1 text-xs ${labelCol}`}>{fmt(customerAt)}</p>{customerNotes&&<p className={`mt-1 text-xs ${noteCol}`}>Note: {customerNotes}</p>}</>
          : <p className={`mt-1 text-sm font-bold italic ${italicCol}`}>{t("bookings.detail.fuel.customerWaiting")}</p>}
      </div>
      {locked?(
        <div className="border border-[#ff7a00]/30 bg-[#ff7a00]/10 p-3 text-sm font-black text-[#ff7a00]">{t("bookings.detail.fuel.locked", { level: fuelLabel(effective) })}</div>
      ):(
        <>
          <div className="border border-amber-200 bg-amber-50 p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">
              {hasOverride ? t("bookings.detail.fuel.overrideSetTo", { value: fuelLabel(savedPartnerFuel) }) : t("bookings.detail.fuel.officeOverride")}
            </p>
            <p className="text-xs font-bold text-amber-600 mb-3">{t("bookings.detail.fuel.overrideHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t("bookings.detail.fuel.levelLabel")}</label>
                <select value={fuelValue} onChange={e=>onFuelChange(e.target.value as FuelLevel)} disabled={locked} className="mt-1 w-full border border-black/10 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-black disabled:opacity-60">
                  <option value="full">{t("bookings.detail.fuel.option.full")}</option>
                  <option value="3/4">{t("bookings.detail.fuel.option.threequarter")}</option>
                  <option value="half">{t("bookings.detail.fuel.option.half")}</option>
                  <option value="quarter">{t("bookings.detail.fuel.option.quarter")}</option>
                  <option value="empty">{t("bookings.detail.fuel.option.empty")}</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-black">
                  <input type="checkbox" checked={confirmed} onChange={e=>onConfirmedChange(e.target.checked)} disabled={locked} className="h-4 w-4 accent-[#ff7a00]"/>{t("bookings.detail.fuel.officeConfirms")}
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>{t("bookings.detail.fuel.notesLabel")}</label>
              <textarea rows={2} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked} className="mt-1 w-full border border-black/10 bg-[#f0f0f0] px-3 py-2 text-sm font-bold outline-none focus:border-black disabled:opacity-60" placeholder={t("bookings.detail.fuel.notesPlaceholder")}/>
            </div>
            {savedPartnerAt&&<p className="mt-2 text-xs font-bold text-amber-600">{t("bookings.detail.fuel.lastSaved", { level: fuelLabel(savedPartnerFuel), time: fmt(savedPartnerAt) })}</p>}
          </div>
          <button type="button" onClick={onSave} disabled={saving||locked} className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? t("bookings.detail.fuel.saving") : t("bookings.detail.fuel.saveBtn", { title })}
          </button>
        </>
      )}
    </div>
  );
}

export default function PartnerBookingDetailPage() {
  const { t } = useTranslation();
  const params    = useParams<{ id: string }>();
  const bookingId = String(params?.id||"");

  const [loading,        setLoading]        = useState(true);
  const [savingSection,  setSavingSection]  = useState<"details"|"collection"|"return"|null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error,          setError]          = useState<string|null>(null);
  const [ok,             setOk]             = useState<string|null>(null);
  const [data,           setData]           = useState<BookingApiResponse|null>(null);
  const [drivers,        setDrivers]        = useState<DriverRow[]>([]);
  const [rates,          setRates]          = useState<Rates>({ GBP:0.85, USD:1.08 });
  const [rateIsLive,     setRateIsLive]     = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName,       setDriverName]       = useState("");
  const [driverPhone,      setDriverPhone]      = useState("");
  const [driverVehicle,    setDriverVehicle]    = useState("");
  const [driverNotes,      setDriverNotes]      = useState("");
  const [collectionFuel,      setCollectionFuel]      = useState<FuelLevel>("full");
  const [collectionConfirmed, setCollectionConfirmed] = useState(false);
  const [collectionNotes,     setCollectionNotes]     = useState("");
  const [returnFuel,          setReturnFuel]          = useState<FuelLevel>("full");
  const [returnConfirmed,     setReturnConfirmed]     = useState(false);
  const [returnNotes,         setReturnNotes]         = useState("");
  const [showCancel,   setShowCancel]   = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling,   setCancelling]   = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  function hydrateForm(d: BookingApiResponse) {
    const b=d.booking;
    setDriverName(b.driver_name||""); setDriverPhone(b.driver_phone||"");
    setDriverVehicle(b.driver_vehicle||""); setDriverNotes(b.driver_notes||"");
    setSelectedDriverId(b.assigned_driver_id||"");
    setCollectionFuel((normalizeFuel(b.collection_fuel_level_partner)||normalizeFuel(b.collection_fuel_level_driver)||"full") as FuelLevel);
    setCollectionConfirmed(!!b.collection_confirmed_by_partner);
    setCollectionNotes(b.collection_partner_notes||"");
    setReturnFuel((normalizeFuel(b.return_fuel_level_partner)||normalizeFuel(b.return_fuel_level_driver)||"full") as FuelLevel);
    setReturnConfirmed(!!b.return_confirmed_by_partner);
    setReturnNotes(b.return_partner_notes||"");
  }

  async function loadBooking(showSpinner=false,hydrate=false) {
    if (!bookingId) { setLoading(false); setError(t("bookings.error.missingId")); return; }
    if (showSpinner) setLoading(true);
    try {
      const res  = await fetch(`/api/partner/bookings/${bookingId}`,{cache:"no-store",credentials:"include"});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||t("bookings.error.load"));
      setData(json); if (hydrate) hydrateForm(json);
    } catch(e:any) { setError(e?.message||t("bookings.error.load")); }
    finally { if (showSpinner) setLoading(false); }
  }

  async function loadDrivers() {
    setLoadingDrivers(true);
    try {
      const res  = await fetch("/api/partner/drivers",{cache:"no-store",credentials:"include"});
      const json = await res.json().catch(()=>null);
      if (res.ok) setDrivers((json?.data||[]).filter((d:DriverRow)=>d.is_active));
    } catch { setDrivers([]); } finally { setLoadingDrivers(false); }
  }

  async function loadRates() {
    try {
      const res  = await fetch("/api/currency/rate",{cache:"no-store"});
      const json = await res.json().catch(()=>null);
      if (json?.rates) { setRates({GBP:Number(json.rates.GBP)||0.85,USD:Number(json.rates.USD)||1.08}); setRateIsLive(!!json.live); }
    } catch {}
  }

  useEffect(()=>{ loadBooking(true,true); loadDrivers(); loadRates(); },[bookingId]);
  useEffect(()=>{
    if (!bookingId) return;
    const interval=setInterval(()=>loadBooking(false,false),10000); return ()=>clearInterval(interval);
  },[bookingId]);

  function handleDriverSelect(id: string) {
    setSelectedDriverId(id); if (!id) return;
    const d=drivers.find(d=>d.id===id);
    if (d) { setDriverName(d.full_name||""); setDriverPhone(d.phone||""); }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault(); setSavingSection("details"); setError(null); setOk(null);
    try {
      const res=await fetch(`/api/partner/bookings/${bookingId}/update`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({booking_status:data?.booking.booking_status,assigned_driver_id:selectedDriverId||null,driver_name:driverName,driver_phone:driverPhone,driver_vehicle:driverVehicle,driver_notes:driverNotes,collection_fuel_level_partner:data?.booking.collection_fuel_level_partner,collection_confirmed_by_partner:data?.booking.collection_confirmed_by_partner,collection_partner_notes:data?.booking.collection_partner_notes,return_fuel_level_partner:data?.booking.return_fuel_level_partner,return_confirmed_by_partner:data?.booking.return_confirmed_by_partner,return_partner_notes:data?.booking.return_partner_notes})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||t("bookings.error.update"));
      setOk(t("bookings.detail.driver.saved")); await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||t("bookings.error.update")); } finally { setSavingSection(null); }
  }

  async function saveFuelSection(section:"collection"|"return") {
    setSavingSection(section); setError(null); setOk(null);
    try {
      const isC=section==="collection";
      const res=await fetch(`/api/partner/bookings/${bookingId}/update`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({booking_status:data?.booking.booking_status,assigned_driver_id:data?.booking.assigned_driver_id,driver_name:data?.booking.driver_name,driver_phone:data?.booking.driver_phone,driver_vehicle:data?.booking.driver_vehicle,driver_notes:data?.booking.driver_notes,collection_fuel_level_partner:isC?collectionFuel:data?.booking.collection_fuel_level_partner,collection_confirmed_by_partner:isC?collectionConfirmed:data?.booking.collection_confirmed_by_partner,collection_partner_notes:isC?collectionNotes:data?.booking.collection_partner_notes,return_fuel_level_partner:!isC?returnFuel:data?.booking.return_fuel_level_partner,return_confirmed_by_partner:!isC?returnConfirmed:data?.booking.return_confirmed_by_partner,return_partner_notes:!isC?returnNotes:data?.booking.return_partner_notes})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||t("bookings.error.update"));
      setOk(section==="collection" ? t("bookings.detail.fuel.saved.delivery") : t("bookings.detail.fuel.saved.collection"));
      await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||t("bookings.error.update")); } finally { setSavingSection(null); }
  }

  async function cancelBooking() {
    if (!bookingId) return;
    setCancelling(true); setError(null); setOk(null);
    try {
      const res=await fetch(`/api/partner/bookings/${bookingId}/cancel`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:cancelReason})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||t("bookings.error.cancel"));
      setOk(t("bookings.detail.cancel.success"));
      setShowCancel(false); await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||t("bookings.error.cancel")); } finally { setCancelling(false); }
  }

  async function handleDownloadInvoiceData() {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      await downloadInvoiceData(data.booking, data.request);
    } catch (e: any) {
      setError("Failed to generate PDF: " + (e?.message || "Unknown error"));
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loading) return <div className="border border-black/5 bg-white p-8"><p className="text-sm font-bold text-black/50">{t("bookings.loading")}</p></div>;
  if (!data?.booking) return <div className="border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{error||t("bookings.error.notFound")}</div>;

  const bk  = data.booking;
  const req = data.request;
  const postCompletionRefunds = data.postCompletionRefunds ?? [];
  const stored: Currency = (bk.currency==="EUR"||bk.currency==="GBP"||bk.currency==="USD")?bk.currency:"EUR";
  const { symbol, label: currLabel } = CURRENCY_META[stored];

  function statusLabel(s?: string|null) {
    switch(String(s||"").toLowerCase()) {
      case "confirmed": case "driver_assigned": case "en_route": case "arrived": return t("bookings.status.awaiting");
      case "collected": case "returned": return t("bookings.status.onHire");
      case "completed": return t("bookings.status.completed");
      case "cancelled": return t("bookings.status.cancelled");
      default: return String(s||"—").replaceAll("_"," ");
    }
  }

  function sportEquipmentLabel(v: string|null): string {
    if (!v||v==="none") return t("bookings.sport.none");
    const key = `bookings.sport.${v}` as any;
    const result = t(key);
    return result !== key ? result : v;
  }

  const collectionLocked = isLocked({
    driverFuel:        normalizeFuel(bk.collection_fuel_level_driver),
    partnerFuel:       bk.collection_fuel_level_partner,
    customerConfirmed: bk.collection_confirmed_by_customer,
    customerFuel:      bk.collection_fuel_level_customer,
  });
  const returnLocked = isLocked({
    driverFuel:        normalizeFuel(bk.return_fuel_level_driver),
    partnerFuel:       bk.return_fuel_level_partner,
    customerConfirmed: bk.return_confirmed_by_customer,
    customerFuel:      bk.return_fuel_level_customer,
  });

  const rateBadgeText    = `1€ = ${new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(rates.GBP)} · 1€ = ${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(rates.USD)}`;
  const commissionRate   = bk.commission_rate ?? 20;
  const carHire          = Number(bk.car_hire_price || 0);
  const commissionAmount = Math.max((carHire * commissionRate) / 100, 10);
  const partnerPayout    = Math.max(0, carHire - commissionAmount);
  const isCancelled      = bk.booking_status==="cancelled";
  const canCancel        = !isCancelled&&PRE_COLLECTION.includes(bk.booking_status);

  return (
    <div className="space-y-6">
      {error&&<div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok&&<div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      {bk?.payout_hold && (
        <div className="border border-amber-300 bg-amber-50 px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-black text-amber-800">{t("bookings.detail.hold.title")}</p>
            <p className="text-xs font-bold text-amber-600 mt-0.5">{t("bookings.detail.hold.body")}</p>
          </div>
        </div>
      )}

      {postCompletionRefunds.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 px-5 py-3 flex items-center gap-3">
          <span className="text-xl">↩</span>
          <div>
            <p className="text-sm font-black text-amber-800">
              Post-completion refund{postCompletionRefunds.length !== 1 ? "s" : ""} issued on this booking
            </p>
            <p className="text-xs font-bold text-amber-600 mt-0.5">
              Total refunded to customer: {fmtCurr(Number(bk.post_completion_refund_total ?? 0), stored)} — see Payment &amp; Fee Breakdown below
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">{t("bookings.detail.title")}</h1>
          <p className="mt-1 text-sm font-bold text-black/50">{t("bookings.detail.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadInvoiceData}
            disabled={downloadingPdf}
            className="border border-black/20 px-5 py-2 text-sm font-black text-black hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            {downloadingPdf ? "Generating…" : "↓ Invoice Data"}
          </button>
          <Link href="/partner/bookings" className="border border-black/20 px-5 py-2 text-sm font-black text-black hover:bg-black/5 transition-colors">{t("bookings.detail.backBtn")}</Link>
        </div>
      </div>

      {isCancelled && <CancellationSummary bk={bk} rates={rates} />}

      {canCancel && (
        <div className="border border-red-200 bg-red-50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-red-800">{t("bookings.detail.cancel.title")}</h2>
              <p className="mt-1 text-sm font-semibold text-red-600">{t("bookings.detail.cancel.subtitle")}</p>
            </div>
            {!showCancel&&<button type="button" onClick={()=>setShowCancel(true)} className="shrink-0 border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">{t("bookings.detail.cancel.btn")}</button>}
          </div>
          {showCancel&&(
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-red-700">{t("bookings.detail.cancel.reasonLabel")}</label>
                <textarea rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder={t("bookings.detail.cancel.reasonPlaceholder")} className="mt-1 w-full border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-red-400 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={cancelBooking} disabled={cancelling} className="bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{cancelling ? t("bookings.detail.cancel.confirming") : t("bookings.detail.cancel.confirm")}</button>
                <button type="button" onClick={()=>setShowCancel(false)} disabled={cancelling} className="border border-black/20 px-6 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">{t("bookings.detail.cancel.keep")}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">{t("bookings.detail.info.title")}</h2>
          <div className="space-y-3">
            <Field label={t("bookings.detail.info.jobNo")}>{bk.job_number??req?.job_number??"—"}</Field>
            <Field label={t("bookings.detail.info.status")}>{statusLabel(bk.booking_status)}</Field>
            <Field label={t("bookings.detail.info.carHire")}><Amt amount={bk.car_hire_price} stored={stored} rates={rates}/></Field>
            <Field label={t("bookings.detail.info.commission")}>
              <span className="text-amber-700">− {fmtCurr(commissionAmount,stored)}</span>
              <span className="ml-2 text-xs font-bold text-black/40">{commissionRate}% {t("bookings.detail.info.commissionNote")}</span>
            </Field>
            <Field label={t("bookings.detail.info.payout")}><span className="font-black text-black">{fmtCurr(partnerPayout,stored)}</span></Field>
            <Field label={t("bookings.detail.info.fuelDeposit")}><Amt amount={bk.fuel_price} stored={stored} rates={rates}/></Field>
            <Field label={t("bookings.detail.info.created")}>{fmt(bk.created_at)}</Field>
            <Field label={t("bookings.detail.info.notes")}>{bk.notes||"—"}</Field>
            <div className={`mt-2 inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-black ${rateIsLive?"border-black/20 bg-black text-white":"border-black/10 bg-[#f0f0f0] text-black/60"}`}>
              <span className={`h-2 w-2 ${rateIsLive?"bg-[#ff7a00]":"bg-black/30"}`}/>{rateBadgeText}{rateIsLive?` ${t("bookings.detail.info.liveRate")}` : ""}
            </div>
            <div className="inline-flex items-center gap-1.5 border border-black/20 bg-[#f0f0f0] px-3 py-1 text-xs font-black text-black">{symbol} {t("bookings.detail.info.currency")} {currLabel}</div>
          </div>
        </div>

        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">{t("bookings.detail.journey.title")}</h2>
          <div className="space-y-3">
            <Field label={t("bookings.detail.journey.customer")}>{req?.customer_name||"—"}</Field>
            <Field label={t("bookings.detail.journey.email")}>{req?.customer_email||"—"}</Field>
            <Field label={t("bookings.detail.journey.phone")}>{req?.customer_phone||"—"}</Field>
            <Field label={t("bookings.detail.journey.pickup")}>{req?.pickup_address||"—"}</Field>
            <Field label={t("bookings.detail.journey.dropoff")}>{req?.dropoff_address||"—"}</Field>
            <Field label={t("bookings.detail.journey.pickupTime")}>{fmt(req?.pickup_at)}</Field>
            <Field label={t("bookings.detail.journey.dropoffTime")}>{fmt(req?.dropoff_at)}</Field>
            <Field label={t("bookings.detail.journey.duration")}>{fmtDuration(req?.journey_duration_minutes)}</Field>
            <Field label={t("bookings.detail.journey.passengers")}>{req?.passengers??"—"}</Field>
            <Field label={t("bookings.detail.journey.suitcases")}>{req?.suitcases??"—"}</Field>
            <Field label={t("bookings.detail.journey.sport")}>{sportEquipmentLabel(req?.sport_equipment??null)}</Field>
            <Field label={t("bookings.detail.journey.driverAge")}>{req?.driver_age ?? "—"}</Field>
            <Field label={t("bookings.detail.journey.additionalDrivers")}>
              {(req?.additional_drivers ?? 0) > 0
                ? t("bookings.detail.journey.additionalDriversValue", { count: String(req!.additional_drivers), ages: req!.additional_driver_ages || "—" })
                : t("bookings.detail.journey.additionalDriversNone")}
            </Field>
            <Field label={t("bookings.detail.journey.vehicle")}>{req?.vehicle_category_name||"—"}</Field>
            {req?.notes&&<Field label={t("bookings.detail.info.notes")}>{req.notes}</Field>}

            {/* Customer billing details — only shown when populated */}
            {(req?.customer_billing_address || req?.customer_tax_id) && (
              <div className="mt-4 border-t border-black/10 pt-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-black/30">Customer Invoice Details</p>
                {req?.customer_billing_address && (
                  <Field label="Billing Address">
                    <span className="whitespace-pre-line">{req.customer_billing_address}</span>
                  </Field>
                )}
                {req?.customer_tax_id && (
                  <Field label="Tax ID / VAT No.">{req.customer_tax_id}</Field>
                )}
                <p className="text-xs font-bold text-black/30">
                  Provided by customer for VAT invoice purposes. Use the ↓ Invoice Data button to download a full data sheet.
                </p>
              </div>
            )}

            {/* Prompt when no billing details provided */}
            {!req?.customer_billing_address && !req?.customer_tax_id && (
              <div className="mt-4 border-t border-black/10 pt-4">
                <p className="text-xs font-black uppercase tracking-widest text-black/30 mb-1">Customer Invoice Details</p>
                <p className="text-xs font-bold text-black/30">
                  Not provided. If this customer requires a VAT invoice, ask them to add their billing address and tax ID in their Camel Global account settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentFeesCard
        payment={data.payment}
        bidCurrency={stored}
        booking={bk}
        postCompletionRefunds={postCompletionRefunds}
      />

      {!isCancelled&&(
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-2">{t("bookings.detail.driver.title")}</h2>
          <div className="inline-flex items-center gap-2 border border-black/10 bg-[#f0f0f0] px-4 py-2 text-sm font-bold text-black mb-5">
            <span className="text-black/50">{t("bookings.detail.driver.currentStatus")}</span> {statusLabel(bk.booking_status)}
          </div>
          <form onSubmit={saveDetails} className="space-y-5">
            <div>
              <label className={labelCls}>{t("bookings.detail.driver.assignLabel")}</label>
              <select value={selectedDriverId} onChange={e=>handleDriverSelect(e.target.value)} className={`mt-2 ${inputCls} bg-white`}>
                <option value="">{t("bookings.detail.driver.noDriver")}</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}{d.phone?` (${d.phone})`:""}</option>)}
              </select>
              {loadingDrivers&&<p className="mt-1 text-xs font-bold text-black/40">{t("bookings.detail.driver.loadingDrivers")}</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div><label className={labelCls}>{t("bookings.detail.driver.nameLabel")}</label><input value={driverName} onChange={e=>setDriverName(e.target.value)} className={`mt-2 ${inputCls}`} placeholder={t("bookings.detail.driver.namePlaceholder")}/></div>
              <div><label className={labelCls}>{t("bookings.detail.driver.phoneLabel")}</label><input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} className={`mt-2 ${inputCls}`} placeholder={t("bookings.detail.driver.phonePlaceholder")}/></div>
              <div><label className={labelCls}>{t("bookings.detail.driver.vehicleLabel")}</label><input value={driverVehicle} onChange={e=>setDriverVehicle(e.target.value)} className={`mt-2 ${inputCls}`} placeholder={t("bookings.detail.driver.vehiclePlaceholder")}/></div>
            </div>
            <div>
              <label className={labelCls}>{t("bookings.detail.driver.notesLabel")}</label>
              <textarea rows={3} value={driverNotes} onChange={e=>setDriverNotes(e.target.value)} className={`mt-2 ${inputCls} resize-none`} placeholder={t("bookings.detail.driver.notesPlaceholder")}/>
            </div>
            <button type="submit" disabled={savingSection==="details"} className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">{savingSection==="details" ? t("bookings.detail.driver.saving") : t("bookings.detail.driver.saveBtn")}</button>
          </form>
        </div>
      )}

      {collectionLocked&&returnLocked&&<BookingSummaryCard booking={bk} rates={rates} isLive={rateIsLive}/>}

      <div className="border border-black/5 bg-white p-6">
        <h2 className="text-lg font-black text-black mb-1">{t("bookings.detail.audit.title")}</h2>
        <p className="text-xs font-bold text-black/40 mb-5">{t("bookings.detail.audit.subtitle")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`border p-5 ${bk.delivery_driver_name?"border-[#1a1a1a] bg-[#1a1a1a] text-white":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.delivery_driver_name?"text-white/40":"text-black/40"}`}>{t("bookings.detail.audit.delivery")}</p>
            {bk.delivery_driver_name?<><p className="mt-2 text-lg font-black text-white">{bk.delivery_driver_name}</p><p className="mt-1 text-xs font-bold text-white/40">{t("bookings.detail.audit.deliveredAt")}</p><p className="text-sm font-bold text-white/70">{fmt(bk.delivery_confirmed_at)}</p>{bk.delivery_driver_id!==bk.assigned_driver_id&&<p className="mt-2 text-xs font-black text-[#ff7a00]">{t("bookings.detail.audit.differentDriver")}</p>}</>:<p className="mt-2 text-sm font-bold italic text-black/40">{t("bookings.detail.audit.notDelivered")}</p>}
          </div>
          <div className={`border p-5 ${bk.collection_driver_name?"border-[#1a1a1a] bg-[#1a1a1a] text-white":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.collection_driver_name?"text-white/40":"text-black/40"}`}>{t("bookings.detail.audit.collection")}</p>
            {bk.collection_driver_name?<><p className="mt-2 text-lg font-black text-white">{bk.collection_driver_name}</p><p className="mt-1 text-xs font-bold text-white/40">{t("bookings.detail.audit.collectedAt")}</p><p className="text-sm font-bold text-white/70">{fmt(bk.collection_confirmed_at)}</p>{bk.delivery_driver_id&&bk.collection_driver_id&&bk.delivery_driver_id!==bk.collection_driver_id&&<p className="mt-2 text-xs font-black text-[#ff7a00]">{t("bookings.detail.audit.differentFromDelivery")}</p>}</>:<p className="mt-2 text-sm font-bold italic text-black/40">{t("bookings.detail.audit.notCollected")}</p>}
          </div>
        </div>
      </div>

      {!isCancelled&&(
        <>
          <div>
            <h2 className="text-lg font-black text-black mb-1">{t("bookings.detail.insurance.title")}</h2>
            <p className="text-xs font-bold text-black/40 mb-4">{t("bookings.detail.insurance.subtitle")} <span className="text-black/30">{t("bookings.detail.insurance.refreshNote")}</span></p>
            <InsuranceStatusCard booking={bk}/>
          </div>
          <div>
            <h2 className="text-lg font-black text-black mb-1">{t("bookings.detail.fuel.title")}</h2>
            <p className="text-xs font-bold text-black/40 mb-4">{t("bookings.detail.fuel.subtitle")} <span className="text-black/30">{t("bookings.detail.fuel.refreshNote")}</span></p>
            <div className="grid gap-6 xl:grid-cols-2">
              <FuelStageCard title={t("bookings.detail.fuel.stage.delivery")} booking={bk} stage="collection" fuelValue={collectionFuel} onFuelChange={setCollectionFuel} confirmed={collectionConfirmed} onConfirmedChange={setCollectionConfirmed} notes={collectionNotes} onNotesChange={setCollectionNotes} onSave={()=>saveFuelSection("collection")} saving={savingSection==="collection"} locked={collectionLocked}/>
              <FuelStageCard title={t("bookings.detail.fuel.stage.collection")} booking={bk} stage="return" fuelValue={returnFuel} onFuelChange={setReturnFuel} confirmed={returnConfirmed} onConfirmedChange={setReturnConfirmed} notes={returnNotes} onNotesChange={setReturnNotes} onSave={()=>saveFuelSection("return")} saving={savingSection==="return"} locked={returnLocked}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
