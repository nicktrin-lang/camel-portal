"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";
const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};
type Rates = { GBP: number; USD: number };

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
  cancellation_reason: string | null; refund_status: string | null;
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
  vehicle_category_name: string | null; notes: string | null; status: string | null; created_at: string | null;
};

type BookingApiResponse = { booking: BookingRow; payment: PaymentData; request: RequestRow | null; role: string | null };
type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

const PRE_COLLECTION = ["confirmed","driver_assigned","en_route","arrived"];
const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

function fmtCurr(amount: number, curr: Currency | string): string {
  const locale = curr === "GBP" ? "en-GB" : curr === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
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
function fuelLabel(v: unknown): string {
  switch(normalizeFuel(v)) {
    case "empty": return "Empty"; case "quarter": return "¼ Tank";
    case "half": return "½ Tank"; case "3/4": return "¾ Tank";
    case "full": return "Full Tank"; default: return "—";
  }
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
function statusLabel(s?: string|null) {
  switch(String(s||"").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed"; case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}
function sportEquipmentLabel(v: string|null): string {
  if (!v||v==="none") return "None";
  const map: Record<string,string> = {
    golf_single:"Golf clubs — 1 bag",golf_two:"Golf clubs — 2 bags",golf_three:"Golf clubs — 3 bags",golf_four:"Golf clubs — 4+ bags",
    skis_pair:"Skis / snowboard — 1 set",skis_two:"Skis / snowboard — 2 sets",skis_three:"Skis / snowboard — 3+ sets",
    bikes_one:"Bikes — 1",bikes_two:"Bikes — 2",bikes_three:"Bikes — 3+",other:"Other large equipment",
  };
  return map[v]||v;
}
function effectiveFuel(driverFuel: unknown, partnerFuel: unknown): string|null {
  return normalizeFuel(partnerFuel)||normalizeFuel(driverFuel);
}
function isLocked(opts: { driverOrPartnerFuel:string|null; customerConfirmed:boolean|null|undefined; customerFuel:string|null|undefined }): boolean {
  return !!opts.driverOrPartnerFuel&&!!opts.customerConfirmed&&normalizeFuel(opts.customerFuel)===opts.driverOrPartnerFuel;
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

// ── Payment Fees Card ─────────────────────────────────────────────────────────
function PaymentFeesCard({ payment, bidCurrency, booking, rates }: { payment: PaymentData; bidCurrency: Currency; booking: BookingRow; rates: Rates }) {
  if (!payment) return null;

  // Determine charge currency — check all sources
  const chargeCurr = (
    payment.charge_currency ||
    payment.stripe_fee_currency ||
    booking.charge_currency ||
    bidCurrency
  ) as string;
  const hasCurrConv = chargeCurr.toUpperCase() !== bidCurrency.toUpperCase();
  const fmtB = (n: number) => fmtCurr(n, bidCurrency);
  const fmtC = (n: number) => fmtCurr(n, chargeCurr);

  // Convert stripe_fee from charge currency → bid currency using live rates
  // Live rates are always EUR-based: rates.GBP = EUR→GBP, rates.USD = EUR→USD
  // So to convert any currency to EUR: amount / rate
  // To convert EUR to any currency: amount * rate
  // General: fee_in_bid = fee_in_charge * (charge_rate / bid_rate)
  // where EUR rate = 1, GBP rate = rates.GBP, USD rate = rates.USD
  const feeInBid = (() => {
    if (!payment.stripe_fee || payment.stripe_fee <= 0) return 0;
    if (!hasCurrConv) return payment.stripe_fee;
    const getRate = (c: string) => c.toUpperCase() === "EUR" ? 1 : c.toUpperCase() === "GBP" ? rates.GBP : c.toUpperCase() === "USD" ? rates.USD : null;
    const chargeRate = getRate(chargeCurr);
    const bidRate    = getRate(bidCurrency);
    if (chargeRate && bidRate) return payment.stripe_fee * (bidRate / chargeRate);
    // Fallback: stored exchange_rate is bid→charge, so divide to get bid
    const storedRate = payment.exchange_rate || booking.conversion_rate;
    if (storedRate && storedRate > 0) return payment.stripe_fee / storedRate;
    return payment.stripe_fee;
  })();

  const hire       = Number(booking.car_hire_price ?? 0);
  const rate       = booking.commission_rate ?? 20;
  const commAmt    = Math.max((hire * rate) / 100, 10);
  const fuelCharge = Number(booking.fuel_charge ?? 0);
  const netPayout  = Math.max(0, hire - commAmt + fuelCharge - feeInBid);

  return (
    <div className="border border-black/10 bg-[#f8f8f8] p-6">
      <h2 className="text-base font-black text-black mb-1">Payment & Fee Breakdown</h2>
      <p className="text-xs font-bold text-black/40 mb-4">
        All amounts shown in your bid currency ({bidCurrency}).
        {hasCurrConv && <span className="ml-1 text-amber-700">Customer paid in {chargeCurr} — Stripe applied currency conversion.</span>}
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-black/60">Car hire</span>
          <span className="font-black text-black">{fmtB(hire)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-black/60">Commission ({rate}%)</span>
          <span className="font-black text-amber-700">− {fmtB(commAmt)}</span>
        </div>
        {fuelCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">Fuel charge</span>
            <span className="font-black text-[#ff7a00]">+ {fmtB(fuelCharge)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-black/10 pt-2">
          <span className="font-semibold text-black/60">
            Stripe fees (processing{hasCurrConv ? " + currency conversion" : ""})
            <span className="ml-1 text-xs text-black/30">incl. in fee below</span>
          </span>
          <span className="font-black text-amber-700">− {fmtB(feeInBid)}</span>
        </div>
        {payment.fuel_refund_amount != null && payment.fuel_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              Fuel refund to customer
              {payment.fuel_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.fuel_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-green-700">− {fmtC(payment.fuel_refund_amount)}</span>
          </div>
        )}
        {payment.cancellation_refund_amount != null && payment.cancellation_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              Cancellation refund to customer
              {payment.cancellation_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.cancellation_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-red-600">− {fmtC(payment.cancellation_refund_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black border-t border-black pt-2 mt-2">
          <span className="text-black">Your net payout</span>
          <span className="text-green-700">{fmtB(netPayout)}</span>
        </div>
      </div>
      {hasCurrConv && (
        <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          ⚠ Customer paid in {chargeCurr}. Stripe applied a currency conversion. The Stripe fee includes both the processing fee and the currency conversion fee. See your <a href="/partner/terms" className="underline">partner terms</a> for details.
        </div>
      )}
      {!hasCurrConv && (
        <p className="mt-3 text-xs font-bold text-black/40">
          Stripe fees are typically ~1.5% + €0.25 per transaction. See your <a href="/partner/terms" className="underline">partner terms</a> for full fee disclosure.
        </p>
      )}
    </div>
  );
}

function CancellationSummary({ bk, rates }: { bk: BookingRow; rates: Rates }) {
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
  const cancelledByLabel      = bk.cancelled_by==="customer"?"Customer":bk.cancelled_by==="partner"?"Partner":"Camel Global Admin";
  return (
    <div className="border border-red-200 bg-red-50 p-6 space-y-4">
      <div>
        <p className="text-base font-black text-red-800">❌ Booking Cancelled</p>
        <p className="text-sm font-semibold text-red-600 mt-1">Cancelled by: <strong>{cancelledByLabel}</strong> on {fmt(bk.cancelled_at)}</p>
        {bk.cancellation_reason&&<p className="text-sm font-semibold text-red-600">Reason: {bk.cancellation_reason}</p>}
        <p className="text-sm font-semibold text-red-600 mt-1">Refund type: <strong>{isFull?"Full refund":isPartial?"Partial refund (within 48hrs of pickup)":"No refund"}</strong></p>
      </div>
      <div className="bg-white border border-red-100 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">Original Booking Amounts</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Car hire</span><span className="font-black text-black">{fmtCurr(carHire,stored)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Commission ({commRate}%)</span><span className="font-black text-amber-700">− {fmtCurr(commAmt,stored)}</span></div>
          <div className="flex justify-between text-sm border-t border-black/10 pt-2"><span className="font-semibold text-black/60">Your payout (excl. fuel)</span><span className="font-black text-black">{fmtCurr(basePayout,stored)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Full tank deposit</span><span className="font-black text-black">{fmtCurr(fuel,stored)}</span></div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black/60">Total collected from customer</span><span className="text-black">{fmtCurr(carHire+fuel,stored)}</span></div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-white border border-red-200 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-3">Customer Refund</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Car hire refund</span><span className={`font-black ${customerCarHireRefund>0?"text-green-700":"text-red-500"}`}>{customerCarHireRefund>0?fmtCurr(customerCarHireRefund,stored):"Not refunded"}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Fuel deposit refund</span><span className="font-black text-green-700">{fmtCurr(customerFuelRefund,stored)}</span></div>
            <div className="flex justify-between text-sm font-black border-t border-red-100 pt-2"><span className="text-red-800">Total refund to customer</span><span className="text-red-800">{fmtCurr(customerTotalRefund,stored)}</span></div>
          </div>
        </div>
        <div className={`p-4 border ${isPartial?"bg-amber-50 border-amber-200":"bg-white border-red-200"}`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">Your Financial Position</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Car hire you keep</span><span className={`font-black ${partnerKeepsCarHire>0?"text-black":"text-red-500"}`}>{partnerKeepsCarHire>0?fmtCurr(partnerKeepsCarHire,stored):"None"}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Commission payable</span><span className={`font-black ${partnerKeepsComm>0?"text-amber-700":"text-black/30"}`}>{partnerKeepsComm>0?`− ${fmtCurr(partnerKeepsComm,stored)}`:"None"}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold text-black/60">Fuel deposit (returned to customer)</span><span className="font-black text-black/40">— {fmtCurr(fuel,stored)}</span></div>
            <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2"><span className="text-black">Your net payout</span><span className={partnerNetPayout>0?"text-green-700":"text-red-600"}>{partnerNetPayout>0?fmtCurr(partnerNetPayout,stored):`${fmtCurr(0,stored)} — no payout`}</span></div>
          </div>
          {isPartial&&<p className="mt-3 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-2">⚠ Customer cancelled within 48hrs of pickup — you retain the car hire fee minus commission.</p>}
          {isFull&&<p className="mt-3 text-xs font-bold text-red-700 bg-red-100 px-3 py-2">Full refund issued — no payout due to you for this booking.</p>}
        </div>
      </div>
    </div>
  );
}

function InsuranceStatusCard({ booking }: { booking: BookingRow }) {
  const driverConfirmed   = !!booking.insurance_docs_confirmed_by_driver;
  const customerConfirmed = !!booking.insurance_docs_confirmed_by_customer;
  const bothConfirmed     = driverConfirmed&&customerConfirmed;
  return (
    <div className={`border p-6 ${bothConfirmed?"border-[#1a1a1a] bg-[#1a1a1a]":"border-black/10 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3"><span className="text-2xl">📄</span><h3 className={`text-base font-black ${bothConfirmed?"text-white":"text-black"}`}>Insurance Documents</h3></div>
        {bothConfirmed&&<span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Confirmed</span>}
      </div>
      <p className={`text-xs font-bold mb-4 ${bothConfirmed?"text-white/50":"text-black/50"}`}>Driver confirms handover at delivery. Customer confirms receipt. Both must agree.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`border p-4 ${driverConfirmed&&bothConfirmed?"border-white/10 bg-white/5":"border-black/10 bg-[#f0f0f0]"}`}>
          <p className={`text-xs font-black uppercase tracking-widest ${bothConfirmed?"text-white/40":"text-black/40"}`}>Driver</p>
          {driverConfirmed?<><p className={`mt-1 font-black ${bothConfirmed?"text-white":"text-black"}`}>✓ Handed over</p><p className={`mt-0.5 text-xs ${bothConfirmed?"text-white/40":"text-black/40"}`}>{fmt(booking.insurance_docs_confirmed_by_driver_at)}</p></>:<p className="mt-1 text-sm font-bold italic text-black/40">Not yet confirmed</p>}
        </div>
        <div className={`border p-4 ${customerConfirmed&&bothConfirmed?"border-white/10 bg-white/5":"border-black/10 bg-[#f0f0f0]"}`}>
          <p className={`text-xs font-black uppercase tracking-widest ${bothConfirmed?"text-white/40":"text-black/40"}`}>Customer</p>
          {customerConfirmed?<><p className={`mt-1 font-black ${bothConfirmed?"text-white":"text-black"}`}>✓ Received</p><p className={`mt-0.5 text-xs ${bothConfirmed?"text-white/40":"text-black/40"}`}>{fmt(booking.insurance_docs_confirmed_by_customer_at)}</p></>:<p className="mt-1 text-sm font-bold italic text-black/40">Not yet confirmed</p>}
        </div>
      </div>
      <div className={`mt-4 border p-3 text-sm font-bold ${bothConfirmed?"border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]":"border-black/10 bg-[#f0f0f0] text-black/60"}`}>
        {bothConfirmed?"✓ Both driver and customer confirm insurance documents were handed over at delivery.":!driverConfirmed&&!customerConfirmed?"Awaiting confirmation from driver and customer.":!driverConfirmed?"Awaiting driver confirmation.":"Awaiting customer confirmation."}
      </div>
    </div>
  );
}

function BookingSummaryCard({ booking, rates, isLive }: { booking:BookingRow; rates:Rates; isLive:boolean }) {
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
  return (
    <div className="bg-[#1a1a1a] p-8 text-white">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-black text-white">Booking Summary</h2><span className="border border-white/30 px-3 py-1 text-xs font-black text-white">Finalised</span></div>
      <div className="bg-white/10 p-5 mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-white/50">Total booking value</p>
        <p className="mt-1 text-4xl font-black">{primary(totalAmt)} <span className="text-xl font-bold opacity-60">{sec(totalAmt)}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black uppercase tracking-widest text-white/50">Car hire</p><p className="mt-0.5 font-black">{primary(carHireAmt)}</p><p className="text-xs text-white/40">{sec(carHireAmt)}</p></div>
          <div className="bg-white/10 px-3 py-2"><p className="text-xs font-black uppercase tracking-widest text-white/50">Full tank deposit</p><p className="mt-0.5 font-black">{primary(fullTankAmt)}</p><p className="text-xs text-white/40">{sec(fullTankAmt)}</p></div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        {[{label:"Delivery fuel",value:fuelLabel(collFuel),bar:collFuel},{label:"Collection fuel",value:fuelLabel(retFuel),bar:retFuel},{label:"Fuel used",value:usedQuarters!==null?(QUARTER_LABELS[usedQuarters]??`${usedQuarters}/4`):"—",bar:null},{label:"Per quarter",value:primary(perQtrAmt),bar:null}].map(({label,value,bar})=>(
          <div key={label} className="bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-widest text-white/50">{label}</p><p className="mt-1 text-lg font-black">{value}</p>{bar&&<FuelBar level={bar}/>}</div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-[#ff7a00]/30 border border-[#ff7a00]/50 p-5"><p className="text-xs font-black uppercase tracking-widest text-white/70">Fuel charge to customer</p><p className="mt-2 text-3xl font-black">{fuelCharge!=null?primary(fuelCharge):"—"} {fuelCharge!=null&&<span className="text-xl font-bold opacity-60">{sec(fuelCharge)}</span>}</p></div>
        <div className="bg-green-500/20 border border-green-400/40 p-5"><p className="text-xs font-black uppercase tracking-widest text-white/70">Refund to customer</p><p className="mt-2 text-3xl font-black">{fuelRefund!=null?primary(fuelRefund):"—"} {fuelRefund!=null&&<span className="text-xl font-bold opacity-60">{sec(fuelRefund)}</span>}</p></div>
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-black ${isLive?"bg-white/5 text-white":"bg-white/5 text-white/40"}`}>
        <span className={`h-2 w-2 ${isLive?"bg-[#ff7a00]":"bg-white/30"}`}/>{rateBadge}{isLive?" · Live rate (frankfurter.app)":""}
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
  const hasOverride       = !!savedPartnerFuel&&savedPartnerFuel!==driverFuel;
  return (
    <div className={`border p-6 ${locked?"border-[#1a1a1a] bg-[#1a1a1a] text-white":"border-black/5 bg-white"}`}>
      <div className="flex items-center justify-between mb-4"><h3 className={`text-base font-black ${locked?"text-white":"text-black"}`}>{title}</h3>{locked&&<span className="border border-[#ff7a00] px-3 py-1 text-xs font-black text-[#ff7a00]">✓ Locked</span>}</div>
      <div className={`border p-4 mb-3 ${driverConfirmed?"border-white/20 bg-white/10":"border-black/10 bg-[#f0f0f0]"}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${locked?"text-white/40":"text-black/40"}`}>Driver recorded</p>
        {driverConfirmed&&driverFuel?<><p className={`mt-1 text-lg font-black ${locked?"text-white":"text-black"}`}>{fuelLabel(driverFuel)}</p><FuelBar level={driverFuel}/><p className={`mt-1 text-xs ${locked?"text-white/40":"text-black/40"}`}>{fmt(driverAt)}</p></>:<p className={`mt-1 text-sm font-bold italic ${locked?"text-white/40":"text-black/40"}`}>Driver has not yet recorded fuel level</p>}
      </div>
      <div className={`border p-4 mb-3 ${customerConfirmed?"border-white/20 bg-white/10":"border-black/10 bg-[#f0f0f0]"}`}>
        <p className={`text-xs font-black uppercase tracking-widest ${locked?"text-white/40":"text-black/40"}`}>Customer confirmed</p>
        {customerConfirmed?<><p className={`mt-1 text-lg font-black ${locked?"text-white":"text-black"}`}>{fuelLabel(customerFuel)} ✓</p><p className={`mt-1 text-xs ${locked?"text-white/40":"text-black/40"}`}>{fmt(customerAt)}</p>{customerNotes&&<p className={`mt-1 text-xs ${locked?"text-white/50":"text-black/50"}`}>Note: {customerNotes}</p>}</>:<p className={`mt-1 text-sm font-bold italic ${locked?"text-white/40":"text-black/40"}`}>Waiting for customer to confirm</p>}
      </div>
      {locked?(
        <div className="border border-[#ff7a00]/30 bg-[#ff7a00]/10 p-3 text-sm font-black text-[#ff7a00]">✓ Both driver and customer agree on {fuelLabel(effectiveFuel(driverFuel,savedPartnerFuel))}</div>
      ):(
        <>
          <div className="border border-amber-200 bg-amber-50 p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">Office override{hasOverride?` — currently set to ${fuelLabel(savedPartnerFuel)}`:""}</p>
            <p className="text-xs font-bold text-amber-600 mb-3">Use this if the driver is unavailable or you need to correct their reading.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Fuel level</label>
                <select value={fuelValue} onChange={e=>onFuelChange(e.target.value as FuelLevel)} disabled={locked} className="mt-1 w-full border border-black/10 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-black disabled:opacity-60">
                  <option value="full">Full</option><option value="3/4">¾ Tank</option><option value="half">½ Tank</option><option value="quarter">¼ Tank</option><option value="empty">Empty</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-black">
                  <input type="checkbox" checked={confirmed} onChange={e=>onConfirmedChange(e.target.checked)} disabled={locked} className="h-4 w-4 accent-[#ff7a00]"/>Office confirms
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={notes} onChange={e=>onNotesChange(e.target.value)} disabled={locked} className="mt-1 w-full border border-black/10 bg-[#f0f0f0] px-3 py-2 text-sm font-bold outline-none focus:border-black disabled:opacity-60" placeholder="Reason for override, depot drop-off, out of hours, etc."/>
            </div>
            {savedPartnerAt&&<p className="mt-2 text-xs font-bold text-amber-600">Last saved: {fuelLabel(savedPartnerFuel)} at {fmt(savedPartnerAt)}</p>}
          </div>
          <button type="button" onClick={onSave} disabled={saving||locked} className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">{saving?"Saving…":`Save ${title} Update`}</button>
        </>
      )}
    </div>
  );
}

export default function PartnerBookingDetailPage() {
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
    if (!bookingId) { setLoading(false); setError("Missing booking ID."); return; }
    if (showSpinner) setLoading(true);
    try {
      const res  = await fetch(`/api/partner/bookings/${bookingId}`,{cache:"no-store",credentials:"include"});
      const json = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to load booking.");
      setData(json); if (hydrate) hydrateForm(json);
    } catch(e:any) { setError(e?.message||"Failed to load booking."); }
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
    const t=setInterval(()=>loadBooking(false,false),10000); return ()=>clearInterval(t);
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
      if (!res.ok) throw new Error(json?.error||"Failed to update.");
      setOk("Driver details saved."); await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||"Failed to update."); } finally { setSavingSection(null); }
  }

  async function saveFuelSection(section:"collection"|"return") {
    setSavingSection(section); setError(null); setOk(null);
    try {
      const isC=section==="collection";
      const res=await fetch(`/api/partner/bookings/${bookingId}/update`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({booking_status:data?.booking.booking_status,assigned_driver_id:data?.booking.assigned_driver_id,driver_name:data?.booking.driver_name,driver_phone:data?.booking.driver_phone,driver_vehicle:data?.booking.driver_vehicle,driver_notes:data?.booking.driver_notes,collection_fuel_level_partner:isC?collectionFuel:data?.booking.collection_fuel_level_partner,collection_confirmed_by_partner:isC?collectionConfirmed:data?.booking.collection_confirmed_by_partner,collection_partner_notes:isC?collectionNotes:data?.booking.collection_partner_notes,return_fuel_level_partner:!isC?returnFuel:data?.booking.return_fuel_level_partner,return_confirmed_by_partner:!isC?returnConfirmed:data?.booking.return_confirmed_by_partner,return_partner_notes:!isC?returnNotes:data?.booking.return_partner_notes})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to update.");
      setOk(`${section==="collection"?"Delivery":"Collection"} fuel saved.`); await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||"Failed to update."); } finally { setSavingSection(null); }
  }

  async function cancelBooking() {
    if (!bookingId) return;
    setCancelling(true); setError(null); setOk(null);
    try {
      const res=await fetch(`/api/partner/bookings/${bookingId}/cancel`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:cancelReason})});
      const json=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(json?.error||"Failed to cancel booking.");
      setOk("Booking cancelled. All parties have been notified by email.");
      setShowCancel(false); await loadBooking(false,false);
    } catch(e:any) { setError(e?.message||"Failed to cancel."); } finally { setCancelling(false); }
  }

  if (loading) return <div className="border border-black/5 bg-white p-8"><p className="text-sm font-bold text-black/50">Loading booking…</p></div>;
  if (!data?.booking) return <div className="border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{error||"Booking not found"}</div>;

  const bk  = data.booking;
  const req = data.request;
  const stored: Currency = (bk.currency==="EUR"||bk.currency==="GBP"||bk.currency==="USD")?bk.currency:"EUR";
  const { symbol, label: currLabel } = CURRENCY_META[stored];
  const collEffective    = effectiveFuel(bk.collection_fuel_level_driver,bk.collection_fuel_level_partner);
  const retEffective     = effectiveFuel(bk.return_fuel_level_driver,bk.return_fuel_level_partner);
  const collectionLocked = isLocked({driverOrPartnerFuel:collEffective,customerConfirmed:bk.collection_confirmed_by_customer,customerFuel:bk.collection_fuel_level_customer});
  const returnLocked     = isLocked({driverOrPartnerFuel:retEffective,customerConfirmed:bk.return_confirmed_by_customer,customerFuel:bk.return_fuel_level_customer});
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

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Booking Detail</h1>
          <p className="mt-1 text-sm font-bold text-black/50">View and manage this booking.</p>
        </div>
        <Link href="/partner/bookings" className="border border-black/20 px-5 py-2 text-sm font-black text-black hover:bg-black/5 transition-colors">Back to Bookings</Link>
      </div>

      {isCancelled && <CancellationSummary bk={bk} rates={rates} />}

      {canCancel && (
        <div className="border border-red-200 bg-red-50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-red-800">Cancel This Booking</h2>
              <p className="mt-1 text-sm font-semibold text-red-600">Cancelling as a partner always gives the customer a full refund. This cannot be undone.</p>
            </div>
            {!showCancel&&<button type="button" onClick={()=>setShowCancel(true)} className="shrink-0 border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">Cancel Booking</button>}
          </div>
          {showCancel&&(
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-red-700">Reason (optional)</label>
                <textarea rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="e.g. Vehicle unavailable, staff illness…" className="mt-1 w-full border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none focus:border-red-400 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={cancelBooking} disabled={cancelling} className="bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{cancelling?"Cancelling…":"Confirm Cancellation"}</button>
                <button type="button" onClick={()=>setShowCancel(false)} disabled={cancelling} className="border border-black/20 px-6 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">Keep Booking</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Booking Information</h2>
          <div className="space-y-3">
            <Field label="Job No.">{bk.job_number??req?.job_number??"—"}</Field>
            <Field label="Status">{statusLabel(bk.booking_status)}</Field>
            <Field label="Original Car Hire"><Amt amount={bk.car_hire_price} stored={stored} rates={rates}/></Field>
            <Field label="Commission">
              <span className="text-amber-700">− {fmtCurr(commissionAmount,stored)}</span>
              <span className="ml-2 text-xs font-bold text-black/40">{commissionRate}% Camel commission</span>
            </Field>
            <Field label="Original Payout (excl. fuel)">
              <span className="font-black text-black">{fmtCurr(partnerPayout,stored)}</span>
            </Field>
            <Field label="Fuel Deposit"><Amt amount={bk.fuel_price} stored={stored} rates={rates}/></Field>
            {bk.charge_currency && bk.charge_currency.toUpperCase() !== stored.toUpperCase() && (
              <Field label="Customer Paid In">
                <span className="text-amber-700">{bk.charge_currency}</span>
                <span className="ml-2 text-xs font-bold text-black/40">— Stripe conversion fee applies</span>
              </Field>
            )}
            {(!bk.charge_currency || bk.charge_currency.toUpperCase() === stored.toUpperCase()) && (
              <Field label="Customer Paid In">
                <span className="text-black/60">{stored} — same as bid currency, no conversion fee</span>
              </Field>
            )}
            <Field label="Created">{fmt(bk.created_at)}</Field>
            <Field label="Notes">{bk.notes||"—"}</Field>
            <div className={`mt-2 inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-black ${rateIsLive?"border-black/20 bg-black text-white":"border-black/10 bg-[#f0f0f0] text-black/60"}`}>
              <span className={`h-2 w-2 ${rateIsLive?"bg-[#ff7a00]":"bg-black/30"}`}/>{rateBadgeText}{rateIsLive?" · Live rate (frankfurter.app)":""}
            </div>
            <div className="inline-flex items-center gap-1.5 border border-black/20 bg-[#f0f0f0] px-3 py-1 text-xs font-black text-black">{symbol} Booking currency: {currLabel}</div>
          </div>
        </div>
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Journey Information</h2>
          <div className="space-y-3">
            <Field label="Customer">{req?.customer_name||"—"}</Field>
            <Field label="Email">{req?.customer_email||"—"}</Field>
            <Field label="Phone">{req?.customer_phone||"—"}</Field>
            <Field label="Pickup">{req?.pickup_address||"—"}</Field>
            <Field label="Dropoff">{req?.dropoff_address||"—"}</Field>
            <Field label="Pickup time">{fmt(req?.pickup_at)}</Field>
            <Field label="Dropoff time">{fmt(req?.dropoff_at)}</Field>
            <Field label="Duration">{fmtDuration(req?.journey_duration_minutes)}</Field>
            <Field label="Passengers">{req?.passengers??"—"}</Field>
            <Field label="Suitcases">{req?.suitcases??"—"}</Field>
            <Field label="Sport equipment">{sportEquipmentLabel(req?.sport_equipment??null)}</Field>
            <Field label="Vehicle">{req?.vehicle_category_name||"—"}</Field>
            {req?.notes&&<Field label="Notes">{req.notes}</Field>}
          </div>
        </div>
      </div>

      <PaymentFeesCard payment={data.payment} bidCurrency={stored} booking={bk} rates={rates} />

      {!isCancelled&&(
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-2">Driver Assignment</h2>
          <div className="inline-flex items-center gap-2 border border-black/10 bg-[#f0f0f0] px-4 py-2 text-sm font-bold text-black mb-5">
            <span className="text-black/50">Current status:</span> {statusLabel(bk.booking_status)}
          </div>
          <form onSubmit={saveDetails} className="space-y-5">
            <div>
              <label className={labelCls}>Assign driver</label>
              <select value={selectedDriverId} onChange={e=>handleDriverSelect(e.target.value)} className={`mt-2 ${inputCls} bg-white`}>
                <option value="">No driver selected</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}{d.phone?` (${d.phone})`:""}</option>)}
              </select>
              {loadingDrivers&&<p className="mt-1 text-xs font-bold text-black/40">Loading drivers…</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div><label className={labelCls}>Driver name</label><input value={driverName} onChange={e=>setDriverName(e.target.value)} className={`mt-2 ${inputCls}`} placeholder="John Smith"/></div>
              <div><label className={labelCls}>Driver phone</label><input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} className={`mt-2 ${inputCls}`} placeholder="+34 600 000 000"/></div>
              <div><label className={labelCls}>Vehicle</label><input value={driverVehicle} onChange={e=>setDriverVehicle(e.target.value)} className={`mt-2 ${inputCls}`} placeholder="Mercedes E-Class / AB12 CDE"/></div>
            </div>
            <div>
              <label className={labelCls}>Driver notes</label>
              <textarea rows={3} value={driverNotes} onChange={e=>setDriverNotes(e.target.value)} className={`mt-2 ${inputCls} resize-none`} placeholder="Optional notes about this assignment"/>
            </div>
            <button type="submit" disabled={savingSection==="details"} className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">{savingSection==="details"?"Saving…":"Save Driver Details"}</button>
          </form>
        </div>
      )}

      {collectionLocked&&returnLocked&&<BookingSummaryCard booking={bk} rates={rates} isLive={rateIsLive}/>}

      <div className="border border-black/5 bg-white p-6">
        <h2 className="text-lg font-black text-black mb-1">Driver Audit Trail</h2>
        <p className="text-xs font-bold text-black/40 mb-5">Exact record of who delivered and collected the vehicle and when.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`border p-5 ${bk.delivery_driver_name?"border-[#1a1a1a] bg-[#1a1a1a] text-white":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.delivery_driver_name?"text-white/40":"text-black/40"}`}>🚗 Delivery driver</p>
            {bk.delivery_driver_name?<><p className="mt-2 text-lg font-black text-white">{bk.delivery_driver_name}</p><p className="mt-1 text-xs font-bold text-white/40">Delivered at</p><p className="text-sm font-bold text-white/70">{fmt(bk.delivery_confirmed_at)}</p>{bk.delivery_driver_id!==bk.assigned_driver_id&&<p className="mt-2 text-xs font-black text-[#ff7a00]">⚠ Different driver to current assignment</p>}</>:<p className="mt-2 text-sm font-bold italic text-black/40">Not yet delivered</p>}
          </div>
          <div className={`border p-5 ${bk.collection_driver_name?"border-[#1a1a1a] bg-[#1a1a1a] text-white":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${bk.collection_driver_name?"text-white/40":"text-black/40"}`}>🏁 Collection driver</p>
            {bk.collection_driver_name?<><p className="mt-2 text-lg font-black text-white">{bk.collection_driver_name}</p><p className="mt-1 text-xs font-bold text-white/40">Collected at</p><p className="text-sm font-bold text-white/70">{fmt(bk.collection_confirmed_at)}</p>{bk.delivery_driver_id&&bk.collection_driver_id&&bk.delivery_driver_id!==bk.collection_driver_id&&<p className="mt-2 text-xs font-black text-[#ff7a00]">⚠ Different driver to delivery</p>}</>:<p className="mt-2 text-sm font-bold italic text-black/40">Not yet collected</p>}
          </div>
        </div>
      </div>

      {!isCancelled&&(
        <>
          <div>
            <h2 className="text-lg font-black text-black mb-1">Insurance Documents</h2>
            <p className="text-xs font-bold text-black/40 mb-4">Driver confirms handover at delivery via their app. Customer confirms receipt on their portal. <span className="text-black/30">(Refreshes every 10s)</span></p>
            <InsuranceStatusCard booking={bk}/>
          </div>
          <div>
            <h2 className="text-lg font-black text-black mb-1">Fuel Tracking</h2>
            <p className="text-xs font-bold text-black/40 mb-4">Driver records fuel level via their app. Use the office override if needed. Customer confirms to lock each stage. <span className="text-black/30">(Refreshes every 10s)</span></p>
            <div className="grid gap-6 xl:grid-cols-2">
              <FuelStageCard title="Delivery" booking={bk} stage="collection" fuelValue={collectionFuel} onFuelChange={setCollectionFuel} confirmed={collectionConfirmed} onConfirmedChange={setCollectionConfirmed} notes={collectionNotes} onNotesChange={setCollectionNotes} onSave={()=>saveFuelSection("collection")} saving={savingSection==="collection"} locked={collectionLocked}/>
              <FuelStageCard title="Collection" booking={bk} stage="return" fuelValue={returnFuel} onFuelChange={setReturnFuel} confirmed={returnConfirmed} onConfirmedChange={setReturnConfirmed} notes={returnNotes} onNotesChange={setReturnNotes} onSave={()=>saveFuelSection("return")} saving={savingSection==="return"} locked={returnLocked}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
}