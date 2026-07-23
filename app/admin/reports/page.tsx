"use client";

import { useEffect, useMemo, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD" | "AUD" | "NZD" | "CAD";

const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol:"€", locale:"es-ES", label:"EUR" },
  GBP: { symbol:"£", locale:"en-GB", label:"GBP" },
  USD: { symbol:"$", locale:"en-US", label:"USD" },
  AUD: { symbol:"A$", locale:"en-AU", label:"AUD" },
  NZD: { symbol:"NZ$", locale:"en-NZ", label:"NZD" },
  CAD: { symbol:"C$", locale:"en-CA", label:"CAD" },
};

function fmtCurr(amount: number, currency: string): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale,{style:"currency",currency,maximumFractionDigits:2}).format(amount);
}

function fmtAmt(amount: number|string|null, currency: string|null): string {
  const amt = Number(amount??0);
  if (!isFinite(amt)) return "—";
  return fmtCurr(amt, currency??"EUR");
}

type BookingRow = {
  id:string; request_id:string|null; partner_user_id:string|null;
  partner_company_name:string|null; partner_legal_company_name:string|null;
  partner_vat_number:string|null; partner_company_registration_number:string|null;
  partner_country:string|null;
  booking_status:string|null; amount:number|string|null; currency:Currency|null;
  charge_currency:string|null; conversion_rate:number|null;
  car_hire_price:number|string|null; fuel_price:number|string|null;
  fuel_used_quarters:number|null; fuel_charge:number|string|null; fuel_refund:number|string|null;
  commission_rate:number|null; commission_amount:number|string|null;
  partner_payout_amount:number|string|null; settled_partner_net:number|string|null;
  stripe_fee:number|null; stripe_fee_currency:string|null; exchange_rate:number|null;
  stripe_fee_total:number|string|null; stripe_fee_breakdown:Record<string,unknown>|null;
  payout_status:string|null; payout_hold?:boolean|null;
  cancelled_by:string|null; cancelled_at:string|null;
  cancellation_reason:string|null; refund_status:string|null;
  created_at:string|null; job_number:string|null;
  pickup_address:string|null; dropoff_address:string|null;
  pickup_at:string|null; dropoff_at:string|null;
  vehicle_category_name:string|null; customer_name:string|null;
  customer_email:string|null; customer_phone:string|null;
  driver_name:string|null; driver_vehicle:string|null;
  delivery_confirmed_at:string|null; collection_confirmed_at:string|null;
  collection_fuel_level_driver:string|null; collection_fuel_level_partner:string|null;
  return_fuel_level_driver:string|null; return_fuel_level_partner:string|null;
  collection_confirmed_by_customer:boolean; return_confirmed_by_customer:boolean;
  insurance_docs_confirmed_by_driver:boolean; insurance_docs_confirmed_by_customer:boolean;
  post_completion_refund_total:number|null;
};

type RequestRow = {
  id:string; job_number:string|null; pickup_address:string|null;
  dropoff_address:string|null; pickup_at:string|null; dropoff_at:string|null;
  vehicle_category_name:string|null; status:string|null;
  created_at:string|null; expires_at:string|null;
};

type InvoiceRow = {
  id:string; invoice_number:string; partner_user_id:string;
  partner_company_name:string|null; period_month:string;
  currency:string; total_commission:number; booking_count:number;
  generated_at:string; emailed_at:string|null; download_url:string|null;
};

const QUARTER_LABELS: Record<number,string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw:text }; }
}

function fmtDate(value?: string|null) { if (!value) return ""; try { return new Date(value).toLocaleDateString(); } catch { return value; } }
function fmtDateTime(value?: string|null) { if (!value) return ""; try { return new Date(value).toLocaleString(); } catch { return value; } }

function statusPillClasses(status?: string|null) {
  switch(String(status||"").toLowerCase()) {
    case "completed": case "confirmed": return "border-green-200 bg-green-50 text-green-700";
    case "collected": case "returned":  return "border-amber-200 bg-amber-50 text-amber-800";
    case "driver_assigned": case "en_route": case "arrived": return "border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]";
    case "cancelled": return "border-red-200 bg-red-50 text-red-700";
    case "disputed": return "border-amber-300 bg-amber-50 text-amber-700";
    default: return "border-black/10 bg-white text-black";
  }
}

function payoutPillClasses(status?: string|null) {
  switch(String(status||"").toLowerCase()) {
    case "held":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "ready": return "border-blue-200 bg-blue-50 text-blue-700";
    case "paid":  return "border-green-200 bg-green-50 text-green-700";
    case "cancelled": return "border-red-200 bg-red-50 text-red-600";
    default: return "border-black/10 bg-white text-black/50";
  }
}

function insurancePill(driver: boolean, customer: boolean) {
  const both = driver&&customer;
  return (
    <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${both?"border-green-200 bg-green-50 text-green-700":driver?"border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]":"border-amber-200 bg-amber-50 text-amber-700"}`}>
      {both?"✓ Confirmed":driver?"Driver ✓":"Pending"}
    </span>
  );
}

function matchesDateRange(value: string|null|undefined, from: string, to: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  if (from&&d<new Date(`${from}T00:00:00`)) return false;
  if (to&&d>new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function getMonthKey(value: string|null|undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function getCurrentMonthKey()  { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; }
function getPreviousMonthKey() { const n=new Date(); n.setMonth(n.getMonth()-1); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; }

function stripeFeeInBidCurrency(stripe_fee: number|null, stripe_fee_currency: string|null, bid_currency: string, exchange_rate: number|null): number {
  if (!stripe_fee || stripe_fee <= 0) return 0;
  if (!stripe_fee_currency || stripe_fee_currency.toUpperCase() === bid_currency.toUpperCase()) return stripe_fee;
  if (exchange_rate && exchange_rate > 0) return stripe_fee / exchange_rate;
  // Cannot convert a foreign-currency fee without a rate — return 0 rather than
  // adding a raw foreign amount into the bid-currency bucket (that silently
  // summed across currencies). Only affects legacy rows with no stripe_fee_total
  // and no exchange_rate; migrated rows use the stored stripe_fee_total.
  return 0;
}

function calcPayout(b: BookingRow): { hire:number; rate:number; commAmt:number; partnerPayout:number; camelNetComm:number; fuelRefund:number; feeInBid:number; pcRefundTotal:number; netFinal:number } {
  const isCancelled  = String(b.booking_status||"").toLowerCase()==="cancelled";
  const refundStatus = b.refund_status||null;
  const fuel         = Number(b.fuel_price??0);
  const bidCurr      = (b.currency??"EUR") as string;
  // Stripe fee: prefer stored canonical total; fall back to payment-derived fee for un-migrated rows
  const feeInBid     = b.stripe_fee_total!=null ? Number(b.stripe_fee_total) : stripeFeeInBidCurrency(b.stripe_fee, b.stripe_fee_currency, bidCurr, b.exchange_rate);
  const pcRefundTotal = Number(b.post_completion_refund_total ?? 0);
  if (isCancelled&&refundStatus==="full") return { hire:0, rate:0, commAmt:0, partnerPayout:0, camelNetComm:0, fuelRefund:fuel, feeInBid:0, pcRefundTotal:0, netFinal:0 };
  const hire          = Number(b.car_hire_price??0);
  const rate          = b.commission_rate??20;
  // Commission: prefer stored canonical amount; fall back to recompute for un-migrated rows
  const commAmt       = b.commission_amount!=null ? Number(b.commission_amount) : Math.max((hire*rate)/100, 10);
  const fuelCharge    = Number(b.fuel_charge??0);
  // Partner payout: prefer stored settled net; fall back to recompute for un-migrated rows
  const partnerPayout = b.settled_partner_net!=null ? Number(b.settled_partner_net) : Math.max(0, hire - commAmt + fuelCharge);
  const camelNetComm  = Math.max(0, commAmt - feeInBid);
  const fuelRefund    = (isCancelled&&refundStatus==="partial") ? fuel : Number(b.fuel_refund??0);
  const finalAmount   = hire + fuelCharge;
  const netFinal      = finalAmount - pcRefundTotal;
  return { hire, rate, commAmt, partnerPayout, camelNetComm, fuelRefund, feeInBid, pcRefundTotal, netFinal };
}

function escapeXml(v: unknown): string {
  return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildXls(sheets: { name:string; headers:string[]; rows:Array<Array<unknown>> }[]): Blob {
  const xmlSheets = sheets.map(sheet=>{
    const rowsXml=[
      `<Row ss:Index="1">${sheet.headers.map(h=>`<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`,
      ...sheet.rows.map((row,ri)=>`<Row ss:Index="${ri+2}">${row.map(cell=>{const v=cell??"";const isNum=typeof v==="number"||(typeof v==="string"&&v!==""&&!isNaN(Number(v))&&v.trim()!=="");return isNum?`<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>`:`<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;}).join("")}</Row>`),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#f0f0f0" ss:Pattern="Solid"/></Style></Styles>
  ${xmlSheets.join("\n")}
</Workbook>`;
  return new Blob([xml],{type:"application/vnd.ms-excel;charset=utf-8;"});
}

function downloadBlob(blob: Blob, filename: string) {
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

type CurrencyTotals = {
  total:number; carHire:number; fuelDeposit:number; fuelCharge:number; fuelRefund:number;
  commissionTotal:number; partnerPayoutTotal:number; stripeFeeTotal:number; camelNetCommTotal:number;
  pcRefundTotal:number;
  count:number; completed:number; cancelled:number;
};

function PayoutDrilldownTable({ bookings }: { bookings: BookingRow[] }) {
  const [visible, setVisible] = useState(15);
  return (
    <div className="mt-4 border border-black/10 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-black/80 text-white">
          <tr>
            {["Job","Partner","Date","Car Hire","Commission","Partner Payout","Post-Completion Refunds","Payout Status"].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {bookings.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-4 text-sm text-black/40">No bookings in this bucket.</td></tr>
          ) : bookings.slice(0, visible).map((b, i) => {
            const { hire, commAmt, partnerPayout, pcRefundTotal } = calcPayout(b);
            const curr = b.currency ?? "EUR";
            return (
              <tr key={b.id} className={`hover:bg-[#f0f0f0] ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                <td className="px-4 py-2.5 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                <td className="px-4 py-2.5 text-black/70 whitespace-nowrap">{b.partner_company_name||"—"}</td>
                <td className="px-4 py-2.5 text-black/60 whitespace-nowrap">{fmtDate(b.pickup_at||b.created_at)||"—"}</td>
                <td className="px-4 py-2.5 font-bold text-black/70 whitespace-nowrap">{fmtCurr(hire,curr)}</td>
                <td className="px-4 py-2.5 font-black text-[#ff7a00] whitespace-nowrap">{fmtCurr(commAmt,curr)}</td>
                <td className="px-4 py-2.5 font-black text-green-700 whitespace-nowrap">{fmtCurr(partnerPayout,curr)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {pcRefundTotal > 0
                    ? <span className="font-black text-amber-700">− {fmtCurr(pcRefundTotal,curr)}</span>
                    : <span className="text-black/30">—</span>}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${payoutPillClasses(b.payout_status)}`}>
                    {b.payout_status||"—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {bookings.length > visible && (
        <button type="button" onClick={() => setVisible(v => v+15)}
          className="w-full border-t border-black/10 bg-[#f8f8f8] py-2 text-xs font-black text-black/60 hover:bg-[#f0f0f0]">
          ▼ Show more ({bookings.length - visible} remaining)
        </button>
      )}
      {visible > 15 && bookings.length <= visible && (
        <button type="button" onClick={() => setVisible(15)}
          className="w-full border-t border-black/10 bg-[#f8f8f8] py-2 text-xs font-black text-black/60 hover:bg-[#f0f0f0]">
          ▲ Show less
        </button>
      )}
    </div>
  );
}

function PayoutStatusSection({ bookings }: { bookings: BookingRow[] }) {
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [partnerFilter, setPartnerFilter] = useState("all");

  const partners = useMemo(() => {
    const s = new Map<string,string>();
    for (const b of bookings) {
      if (b.partner_user_id) s.set(b.partner_user_id, b.partner_company_name||b.partner_user_id);
    }
    return Array.from(s.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  const filtered = useMemo(() =>
    partnerFilter==="all" ? bookings : bookings.filter(b => b.partner_user_id===partnerFilter),
    [bookings, partnerFilter]
  );

  const held  = filtered.filter(b => b.payout_status==="held");
  const ready = filtered.filter(b => b.payout_status==="ready");
  const paid  = filtered.filter(b => b.payout_status==="paid");

  if (bookings.filter(b => ["held","ready","paid"].includes(b.payout_status??"")).length===0) return null;

  const calcTotal = (rows: BookingRow[]) => {
    const byCurr: Record<string,number> = {};
    for (const b of rows) {
      const curr = b.currency??"EUR";
      const { partnerPayout } = calcPayout(b);
      byCurr[curr] = (byCurr[curr]??0) + partnerPayout;
    }
    return byCurr;
  };

  const buckets = [
    { key:"held",  label:"Held",  desc:"Payment received — hire not yet complete",      rows:held,  totals:calcTotal(held),  color:"text-amber-700", bg:"border-amber-200 bg-amber-50",  btnBg:"border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800" },
    { key:"ready", label:"Ready", desc:"Hire complete — queued for next monthly payout", rows:ready, totals:calcTotal(ready), color:"text-blue-700",  bg:"border-blue-200 bg-blue-50",    btnBg:"border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800"   },
    { key:"paid",  label:"Paid",  desc:"Payout transferred to partner Stripe account",   rows:paid,  totals:calcTotal(paid),  color:"text-green-700", bg:"border-green-200 bg-green-50",  btnBg:"border-green-300 bg-green-100 hover:bg-green-200 text-green-800" },
  ];

  return (
    <div className="border border-black/10 bg-white p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-black mb-1">Payout Status</h2>
          <p className="text-sm text-black/50">Network-wide breakdown by payout stage.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={partnerFilter} onChange={e => { setPartnerFilter(e.target.value); setExpanded({}); }}
            className="border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
            <option value="all">All partners</option>
            {partners.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          {partnerFilter!=="all" && (
            <button type="button" onClick={() => { setPartnerFilter("all"); setExpanded({}); }}
              className="border border-black/20 bg-white px-3 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear</button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {buckets.map(({ key, label, desc, rows, totals, color, bg, btnBg }) => (
          <div key={key} className={`border p-4 ${bg}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${color} mb-1`}>{label}</p>
            <p className="text-3xl font-black text-black">{rows.length}</p>
            <p className="text-xs font-bold text-black/40 mt-1 mb-3">{desc}</p>
            {Object.entries(totals).filter(([,v]) => v>0).map(([curr,val]) => (
              <p key={curr} className={`text-sm font-black ${color}`}>{fmtCurr(val,curr)} {curr}</p>
            ))}
            {Object.keys(totals).length===0 && <p className="text-sm font-bold text-black/30">—</p>}
            {rows.length>0 && (
              <button type="button" onClick={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}
                className={`mt-4 w-full border px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${btnBg}`}>
                {expanded[key] ? "▲ Hide bookings" : `▼ Show ${rows.length} booking${rows.length!==1?"s":""}`}
              </button>
            )}
          </div>
        ))}
      </div>
      {buckets.map(({ key, rows }) => expanded[key] ? (
        <div key={key} className="mt-4"><PayoutDrilldownTable bookings={rows} /></div>
      ) : null)}
    </div>
  );
}

function AdminInvoicesSection({ partners }: { partners: [string,string][] }) {
  const [invoices,       setInvoices]       = useState<InvoiceRow[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [invoiceError,   setInvoiceError]   = useState<string|null>(null);
  const [generating,     setGenerating]     = useState(false);
  const [genPartnerId,   setGenPartnerId]   = useState("");
  const [genMonth,       setGenMonth]       = useState("");
  const [genMsg,         setGenMsg]         = useState<{ ok:boolean; text:string }|null>(null);
  const [monthFilter,    setMonthFilter]    = useState("all");
  const [partnerFilter,  setPartnerFilter]  = useState("all");

  async function loadInvoices() {
    setInvoiceLoading(true); setInvoiceError(null);
    try {
      const params = new URLSearchParams();
      if (monthFilter  !=="all") params.set("month",      monthFilter);
      if (partnerFilter!=="all") params.set("partner_id", partnerFilter);
      const res  = await fetch(`/api/admin/invoices?${params}`, { cache:"no-store", credentials:"include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error||"Failed to load invoices");
      setInvoices(Array.isArray(json?.data) ? json.data : []);
    } catch(e:any) {
      setInvoiceError(e?.message||"Failed to load invoices");
    } finally { setInvoiceLoading(false); }
  }

  useEffect(() => { loadInvoices(); }, [monthFilter, partnerFilter]);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const inv of invoices) if (inv.period_month) s.add(inv.period_month);
    return Array.from(s).sort().reverse();
  }, [invoices]);

  async function handleGenerate() {
    if (!genPartnerId||!genMonth) { setGenMsg({ ok:false, text:"Select a partner and month." }); return; }
    setGenerating(true); setGenMsg(null);
    try {
      const res  = await fetch("/api/admin/invoices", {
        method:"POST", credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ partner_id:genPartnerId, period_month:genMonth }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error||"Generation failed");
      setGenMsg({ ok:true, text:`Invoice ${json.invoice_number||""} generated successfully.` });
      loadInvoices();
    } catch(e:any) {
      setGenMsg({ ok:false, text:e?.message||"Generation failed" });
    } finally { setGenerating(false); }
  }

  return (
    <div className="border border-black/10 bg-white p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-black text-black mb-1">Commission Invoices</h2>
        <p className="text-sm text-black/50">NTUK Ltd commission invoices issued to partners. Auto-generated on monthly payout run.</p>
      </div>
      <div className="border border-black/10 bg-[#f8f8f8] p-4">
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-3">Generate Invoice On-Demand</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Partner</label>
            <select value={genPartnerId} onChange={e => setGenPartnerId(e.target.value)}
              className="mt-1 block border border-black/20 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="">Select partner…</option>
              {partners.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Period (YYYY-MM)</label>
            <select value={genMonth} onChange={e => setGenMonth(e.target.value)}
              className="mt-1 block border border-black/20 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="">Select month…</option>
              {Array.from({ length: 24 }, (_, i) => {
                const now = new Date();
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return <option key={val} value={val}>{d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>;
              })}
            </select>
          </div>
          <button type="button" onClick={handleGenerate} disabled={generating}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-50">
            {generating ? "Generating…" : "Generate PDF"}
          </button>
        </div>
        {genMsg && (
          <p className={`mt-3 text-sm font-bold ${genMsg.ok?"text-green-700":"text-red-600"}`}>{genMsg.text}</p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-black/50">Month</label>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
            <option value="all">All months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-black/50">Partner</label>
          <select value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}
            className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
            <option value="all">All partners</option>
            {partners.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        {(monthFilter!=="all"||partnerFilter!=="all") && (
          <button type="button" onClick={() => { setMonthFilter("all"); setPartnerFilter("all"); }}
            className="border border-black/20 bg-white px-3 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear</button>
        )}
      </div>
      {invoiceError && <p className="text-sm font-bold text-red-600">{invoiceError}</p>}
      <div className="overflow-x-auto border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              {["Invoice #","Partner","Period","Currency","Commission","Bookings","Generated","Emailed","Download"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {invoiceLoading ? (
              <tr><td colSpan={9} className="px-4 py-4 text-sm text-black/40">Loading invoices…</td></tr>
            ) : invoices.length===0 ? (
              <tr><td colSpan={9} className="px-4 py-4 text-sm text-black/40">No invoices generated yet.</td></tr>
            ) : invoices.map((inv,i) => (
              <tr key={inv.id} className={`hover:bg-[#f0f0f0] ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                <td className="px-4 py-3 font-black text-black whitespace-nowrap">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-black/70 whitespace-nowrap">{inv.partner_company_name||"—"}</td>
                <td className="px-4 py-3 text-black/70 whitespace-nowrap">{inv.period_month}</td>
                <td className="px-4 py-3 text-black/60 whitespace-nowrap">{inv.currency}</td>
                <td className="px-4 py-3 font-black text-[#ff7a00] whitespace-nowrap">{fmtCurr(inv.total_commission,inv.currency)}</td>
                <td className="px-4 py-3 text-black/60">{inv.booking_count}</td>
                <td className="px-4 py-3 text-black/50 whitespace-nowrap text-xs">{fmtDate(inv.generated_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {inv.emailed_at
                    ? <span className="inline-flex border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-black text-green-700">✓ Sent</span>
                    : <span className="inline-flex border border-black/10 bg-[#f0f0f0] px-2 py-0.5 text-xs font-black text-black/40">Not sent</span>}
                </td>
                <td className="px-4 py-3">
                  {inv.download_url
                    ? <a href={inv.download_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex bg-black px-3 py-1.5 text-xs font-black text-white hover:opacity-80">⬇ PDF</a>
                    : <span className="text-xs text-black/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCurrencySection({ curr, t, bookings }: { curr:Currency; t:CurrencyTotals; bookings:BookingRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const { symbol } = CURRENCY_META[curr];
  const visible = showAll ? bookings : bookings.slice(0,10);

  return (
    <div className="border border-black/10 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="border border-black bg-black px-3 py-1 text-sm font-black text-white">{symbol} {curr}</span>
        <h2 className="text-xl font-black text-black">Revenue &amp; Fuel Reconciliation</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6 mb-4">
        {[
          { label:"Total Bookings",          value:t.count,              isMoney:false },
          { label:"Completed",               value:t.completed,          isMoney:false },
          { label:"Cancelled",               value:t.cancelled,          isMoney:false },
          { label:"Total Revenue",           value:t.total,              isMoney:true  },
          { label:"Car Hire Revenue",        value:t.carHire,            isMoney:true  },
          { label:"Stripe Fees",             value:t.stripeFeeTotal,     isMoney:true  },
          { label:"Fuel Charged",            value:t.fuelCharge,         isMoney:true  },
          { label:"Fuel Refunded",           value:t.fuelRefund,         isMoney:true  },
          { label:"Post-Completion Refunds", value:t.pcRefundTotal,      isMoney:true  },
          { label:"Camel Commission",        value:t.commissionTotal,    isMoney:true  },
          { label:"Camel Net Income",        value:t.camelNetCommTotal,  isMoney:true  },
          { label:"Partner Payout",          value:t.partnerPayoutTotal, isMoney:true  },
        ].map(({label:lbl,value,isMoney})=>(
          <div key={lbl} className={`border p-4 ${lbl==="Cancelled"&&(value as number)>0?"border-red-200 bg-red-50":lbl==="Stripe Fees"&&(value as number)>0?"border-amber-100 bg-amber-50":lbl==="Post-Completion Refunds"&&(value as number)>0?"border-amber-200 bg-amber-50":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{lbl}</p>
            <p className={`mt-1 text-lg font-black ${lbl==="Cancelled"&&(value as number)>0?"text-red-700":lbl==="Stripe Fees"?"text-amber-700":lbl==="Post-Completion Refunds"&&(value as number)>0?"text-amber-700":lbl==="Camel Net Income"?"text-green-700":"text-black"}`}>
              {isMoney?fmtCurr(value as number,curr):value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              {["Job","Partner","Customer","Status","Payout Status","Car Hire","Commission","Stripe Fee (Camel)","Camel Net Income","Total Paid","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Refund","Customer Final","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((b,i)=>{
              const usedQ=b.fuel_used_quarters;
              const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
              const { commAmt, partnerPayout, camelNetComm, rate, hire, fuelRefund, feeInBid, pcRefundTotal, netFinal } = calcPayout(b);
              return (
                <tr key={b.id} className={`hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                  <td className="px-4 py-3 text-black/70"><div>{b.partner_company_name||"—"}</div>{b.partner_vat_number&&<div className="text-xs text-black/40">{b.partner_vat_number}</div>}</td>
                  <td className="px-4 py-3 text-black/70">{b.customer_name||"—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? statusPillClasses("disputed") : statusPillClasses(b.booking_status)}`}>{b.payout_hold ? "Disputed" : String(b.booking_status||"—").replaceAll("_"," ")}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? "border-amber-300 bg-amber-50 text-amber-700" : payoutPillClasses(b.payout_status)}`}>{b.payout_hold ? "On Hold" : (b.payout_status||"—")}</span></td>
                  <td className={`px-4 py-3 ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,curr)}</td>
                  <td className="px-4 py-3">
                    {isCancelled&&b.refund_status==="full"
                      ? <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,curr)}</span>
                      : <><div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt,curr)}</div><div className="text-xs text-black/40">{rate}%</div></>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {feeInBid>0 ? <span className="font-black text-amber-700">− {fmtCurr(feeInBid,curr)}</span> : <span className="text-black/30">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isCancelled&&b.refund_status==="full"
                      ? <span className="text-black/30">—</span>
                      : <span className="text-xs font-black text-green-700">{fmtCurr(camelNetComm,curr)}</span>}
                  </td>
                  <td className={`px-4 py-3 font-black ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,curr)}</td>
                  <td className="px-4 py-3 text-black/70">{fmtAmt(b.fuel_price,curr)}</td>
                  <td className="px-4 py-3 text-black/70">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00]">{b.fuel_charge!==null?fmtAmt(b.fuel_charge,curr):"—"}</td>
                  <td className="px-4 py-3 font-black text-green-700">{fuelRefund>0?fmtCurr(fuelRefund,curr):"—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {pcRefundTotal>0 ? <span className="font-black text-amber-700">− {fmtCurr(pcRefundTotal,curr)}</span> : <span className="text-black/30">—</span>}
                  </td>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{fmtCurr(Math.max(0,Number(b.amount??0)-Number(b.fuel_refund??0)-pcRefundTotal),curr)}</td>
                  <td className={`px-4 py-3 font-black ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-green-700"}`}>{isCancelled&&b.refund_status==="full"?fmtCurr(0,curr):fmtCurr(partnerPayout,curr)}</td>
                  <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_by||"—"}</td>
                  <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_at?fmtDateTime(b.cancelled_at):"—"}</td>
                  <td className="px-4 py-3">{insurancePill(b.insurance_docs_confirmed_by_driver,b.insurance_docs_confirmed_by_customer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bookings.length>10&&(
        <button type="button" onClick={()=>setShowAll(s=>!s)} className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
          {showAll?"▲ Show less":`▼ Show all ${bookings.length} bookings`}
        </button>
      )}
    </div>
  );
}

function FinancialDashboard({ bookings }: { bookings: BookingRow[] }) {
  const [payoutFilter,  setPayoutFilter]  = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [dashVisible,   setDashVisible]   = useState(20);

  const plByCurr = useMemo(() => {
    const m: Record<string,{ revenue:number; commission:number; stripeFees:number; partnerPayout:number; camelNetComm:number; fuelCharge:number; fuelRefund:number; pcRefundTotal:number; count:number; disputed:number; disputedPayout:number }> = {};
    for (const b of bookings) {
      if (String(b.booking_status||"").toLowerCase()==="cancelled") continue;
      const curr = b.currency??"EUR";
      if (!m[curr]) m[curr] = { revenue:0, commission:0, stripeFees:0, partnerPayout:0, camelNetComm:0, fuelCharge:0, fuelRefund:0, pcRefundTotal:0, count:0, disputed:0, disputedPayout:0 };
      const { commAmt, partnerPayout, camelNetComm, feeInBid, fuelRefund, pcRefundTotal } = calcPayout(b);
      m[curr].revenue       += Number(b.amount??0);
      m[curr].commission    += commAmt;
      m[curr].stripeFees    += feeInBid;
      m[curr].partnerPayout += partnerPayout;
      m[curr].camelNetComm  += camelNetComm;
      m[curr].fuelCharge    += Number(b.fuel_charge??0);
      m[curr].fuelRefund    += fuelRefund;
      m[curr].pcRefundTotal += pcRefundTotal;
      m[curr].count++;
      if (b.payout_hold) { m[curr].disputed = (m[curr].disputed||0) + 1; m[curr].disputedPayout = (m[curr].disputedPayout||0) + partnerPayout; }
    }
    return m;
  }, [bookings]);

  const partners = useMemo(() => {
    const s = new Map<string,string>();
    for (const b of bookings) {
      if (b.partner_user_id) s.set(b.partner_user_id, b.partner_company_name||b.partner_user_id);
    }
    return Array.from(s.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  const filtered = useMemo(() => bookings.filter(b => {
    if (payoutFilter !=="all" && b.payout_status !==payoutFilter)  return false;
    if (partnerFilter!=="all" && b.partner_user_id!==partnerFilter) return false;
    return true;
  }), [bookings, payoutFilter, partnerFilter]);

  const currencies = Object.keys(plByCurr) as Currency[];

  return (
    <div className="space-y-4">
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black text-black mb-1">Financial Dashboard</h2>
        <p className="text-sm text-black/50 mb-5">Platform P&amp;L — all active bookings in the selected date range. Excludes cancelled bookings.</p>
        {currencies.length===0 ? (
          <p className="text-sm text-black/40">No financial data for this period.</p>
        ) : currencies.map(curr => {
          const pl = plByCurr[curr];
          return (
            <div key={curr} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="border border-black bg-black px-2 py-0.5 text-xs font-black text-white">{curr}</span>
                <span className="text-xs font-bold text-black/40">{pl.count} booking{pl.count!==1?"s":""}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                {[
                  { label:"Total Revenue",           value:pl.revenue,        color:"text-black",     bg:"border-black/10 bg-[#f0f0f0]" },
                  { label:"Camel Commission",         value:pl.commission,     color:"text-[#ff7a00]", bg:"border-[#ff7a00]/20 bg-[#fff7f0]" },
                  { label:"Stripe Fees",              value:pl.stripeFees,     color:"text-amber-700", bg:"border-amber-200 bg-amber-50" },
                  { label:"Camel Net Income",         value:pl.camelNetComm,   color:pl.camelNetComm>=0?"text-green-700":"text-red-600", bg:pl.camelNetComm>=0?"border-green-200 bg-green-50":"border-red-200 bg-red-50" },
                  { label:"Partner Payout",           value:pl.partnerPayout,  color:"text-black/70",  bg:"border-black/10 bg-[#f0f0f0]" },
                  { label:"Fuel Charges",             value:pl.fuelCharge,     color:"text-[#ff7a00]", bg:"border-black/10 bg-[#f0f0f0]" },
                  { label:"Fuel Refunds",             value:pl.fuelRefund,     color:"text-black/50",  bg:"border-black/10 bg-[#f0f0f0]" },
                  { label:"Post-Comp Refunds",        value:pl.pcRefundTotal,  color:pl.pcRefundTotal>0?"text-amber-700":"text-black/30", bg:pl.pcRefundTotal>0?"border-amber-300 bg-amber-50":"border-black/10 bg-[#f0f0f0]" },
                  { label:`Disputed (${pl.disputed??0})`, value:pl.disputedPayout??0, color:"text-amber-700", bg:"border-amber-300 bg-amber-50" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`border p-4 ${bg}`}>
                    <p className="text-xs font-black uppercase tracking-widest text-black/40 leading-tight mb-1">{label}</p>
                    <p className={`text-base font-black ${color}`}>{fmtCurr(value,curr)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-black">Payments</h2>
            <p className="text-sm text-black/50">All payments with commission, Stripe fees, post-completion refunds and payout status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={payoutFilter} onChange={e => { setPayoutFilter(e.target.value); setDashVisible(20); }}
              className="border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="all">All payout statuses</option>
              <option value="held">Held</option>
              <option value="ready">Ready</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={partnerFilter} onChange={e => { setPartnerFilter(e.target.value); setDashVisible(20); }}
              className="border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="all">All partners</option>
              {partners.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {(payoutFilter!=="all"||partnerFilter!=="all") && (
              <button type="button" onClick={() => { setPayoutFilter("all"); setPartnerFilter("all"); setDashVisible(20); }}
                className="border border-black/20 bg-white px-3 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear</button>
            )}
          </div>
        </div>
        <p className="text-xs font-bold text-black/40 mb-3">Showing {Math.min(dashVisible,filtered.length)} of {filtered.length} payments</p>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Job","Partner","Customer","Booking Status","Payout Status","Bid Curr","Car Hire","Commission","Stripe Fee (Camel)","Camel Net Income","Total","Partner Payout","Fuel Charge","Fuel Refund","Refund","Customer Final","Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.length===0 ? (
                <tr><td colSpan={17} className="px-4 py-6 text-sm text-black/40">No payments match the current filters.</td></tr>
              ) : filtered.slice(0,dashVisible).map((b,i) => {
                const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
                const { hire, commAmt, feeInBid, partnerPayout, camelNetComm, fuelRefund, pcRefundTotal, netFinal } = calcPayout(b);
                return (
                  <tr key={b.id} className={`hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/30":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                    <td className="px-4 py-3 text-black/70 whitespace-nowrap">{b.partner_company_name||"—"}</td>
                    <td className="px-4 py-3 text-black/70 whitespace-nowrap">{b.customer_name||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? statusPillClasses("disputed") : statusPillClasses(b.booking_status)}`}>{b.payout_hold ? "Disputed" : String(b.booking_status||"—").replaceAll("_"," ")}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? "border-amber-300 bg-amber-50 text-amber-700" : payoutPillClasses(b.payout_status)}`}>{b.payout_hold ? "On Hold" : (b.payout_status||"—")}</span></td>
                    <td className="px-4 py-3 text-xs font-bold text-black/60">{b.currency||"—"}</td>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,b.currency??"EUR")}</td>
                    <td className="px-4 py-3 font-black text-[#ff7a00] whitespace-nowrap">{isCancelled&&b.refund_status==="full"?<span className="line-through text-red-400">{fmtCurr(commAmt,b.currency??"EUR")}</span>:fmtCurr(commAmt,b.currency??"EUR")}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{feeInBid>0?<span className="font-black text-amber-700">− {fmtCurr(feeInBid,b.currency??"EUR")}</span>:<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 font-black whitespace-nowrap text-green-700">{isCancelled&&b.refund_status==="full"?<span className="text-black/30">—</span>:fmtCurr(camelNetComm,b.currency??"EUR")}</td>
                    <td className={`px-4 py-3 font-black whitespace-nowrap ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,b.currency)}</td>
                    <td className={`px-4 py-3 font-black whitespace-nowrap ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-green-700"}`}>{isCancelled&&b.refund_status==="full"?fmtCurr(0,b.currency??"EUR"):fmtCurr(Math.max(0,partnerPayout-pcRefundTotal),b.currency??"EUR")}</td>
                    <td className="px-4 py-3 font-black text-[#ff7a00] whitespace-nowrap">{Number(b.fuel_charge??0)>0?fmtCurr(Number(b.fuel_charge),b.currency??"EUR"):<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 font-black text-green-600 whitespace-nowrap">{fuelRefund>0?fmtCurr(fuelRefund,b.currency??"EUR"):<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{pcRefundTotal>0?<span className="font-black text-amber-700">− {fmtCurr(pcRefundTotal,b.currency??"EUR")}</span>:<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 font-black whitespace-nowrap">{fmtCurr(Math.max(0,Number(b.amount??0)-fuelRefund-pcRefundTotal),b.currency??"EUR")}</td>
                    <td className="px-4 py-3 text-xs text-black/50 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length>dashVisible && (
          <button type="button" onClick={() => setDashVisible(v => v+20)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▼ Show more ({filtered.length-dashVisible} remaining)
          </button>
        )}
        {dashVisible>20 && filtered.length<=dashVisible && (
          <button type="button" onClick={() => setDashVisible(20)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▲ Show less
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const supabase = useMemo(()=>createBrowserSupabaseClient(),[]);
  const router = useRouter();

  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string|null>(null);
  const [requests,          setRequests]          = useState<RequestRow[]>([]);
  const [bookings,          setBookings]          = useState<BookingRow[]>([]);
  const [dateFrom,          setDateFrom]          = useState("");
  const [dateTo,            setDateTo]            = useState("");
  const [exportPartner,     setExportPartner]     = useState("all");
  const [allBookingsVisible,setAllBookingsVisible] = useState(10);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data:userData, error:userErr } = await supabase.auth.getUser();
      if (userErr||!userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes  = await fetch("/api/admin/is-admin",{cache:"no-store",credentials:"include"});
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const [reqRes,bkRes] = await Promise.all([
        fetch("/api/partner/requests",{cache:"no-store",credentials:"include"}),
        fetch("/api/partner/bookings",{cache:"no-store",credentials:"include"}),
      ]);
      const reqJson = await safeJson(reqRes);
      const bkJson  = await safeJson(bkRes);
      if (!reqRes.ok) throw new Error(reqJson?.error||"Failed to load requests.");
      if (!bkRes.ok)  throw new Error(bkJson?.error||"Failed to load bookings.");
      setRequests(Array.isArray(reqJson?.data)?reqJson.data:[]);
      setBookings(Array.isArray(bkJson?.data)?bkJson.data:[]);
    } catch(e:any) {
      setError(e?.message||"Failed to load admin reporting data.");
      setRequests([]); setBookings([]);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);

  const filteredRequests  = requests.filter(r=>matchesDateRange(r.created_at,dateFrom,dateTo));
  const filteredBookings  = bookings.filter(r=>matchesDateRange(r.created_at,dateFrom,dateTo));
  const completedBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="completed");
  const cancelledBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="cancelled");

  const revenuesByCurrency = useMemo(()=>{
    const t = Object.fromEntries(CURRENCIES.map(c=>[c,
      { total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,stripeFeeTotal:0,camelNetCommTotal:0,pcRefundTotal:0,count:0,completed:0,cancelled:0 }
    ])) as Record<Currency,CurrencyTotals>;
    for (const b of filteredBookings) {
      const c: Currency = (b.currency as Currency)??"EUR";
      if (!t[c]) continue;
      const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
      const { commAmt, partnerPayout, camelNetComm, hire, fuelRefund, feeInBid, pcRefundTotal } = calcPayout(b);
      t[c].count++;
      if (!isCancelled) {
        t[c].total              += Number(b.amount??0);
        t[c].carHire            += hire;
        t[c].fuelDeposit        += Number(b.fuel_price??0);
        t[c].fuelCharge         += Number(b.fuel_charge??0);
        t[c].commissionTotal    += commAmt;
        t[c].partnerPayoutTotal += partnerPayout;
        t[c].stripeFeeTotal     += feeInBid;
        t[c].camelNetCommTotal  += camelNetComm;
        t[c].pcRefundTotal      += pcRefundTotal;
      }
      t[c].fuelRefund += fuelRefund;
      if (isCancelled) t[c].cancelled++;
      if (String(b.booking_status||"").toLowerCase()==="completed") t[c].completed++;
    }
    return t;
  },[filteredBookings]);

  const currentMonthKey  = getCurrentMonthKey();
  const previousMonthKey = getPreviousMonthKey();
  const bidsSubmitted    = filteredRequests.filter(r=>["bid_submitted","bid_successful","bid_unsuccessful"].includes(String(r.status||"").toLowerCase())).length;

  // Keyed by (partner, currency) — never sum money across currencies
  const partnerMap = new Map<string,{name:string;currency:string;bookings:number;revenue:number;commission:number;payout:number;stripeFees:number;camelNet:number;completed:number;cancelled:number;pcRefunds:number}>();
  for (const b of filteredBookings) {
    const pid  = String(b.partner_user_id||"unknown");
    const name = String(b.partner_company_name||"Unknown Partner");
    const curr = String(b.currency||"EUR");
    const key  = `${pid}|${curr}`;
    const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
    const { commAmt, partnerPayout, camelNetComm, hire, feeInBid, pcRefundTotal } = calcPayout(b);
    const cur = partnerMap.get(key)||{ name, currency:curr, bookings:0, revenue:0, commission:0, payout:0, stripeFees:0, camelNet:0, completed:0, cancelled:0, pcRefunds:0 };
    cur.bookings++;
    if (!isCancelled) {
      cur.revenue    += isFinite(Number(b.amount??0))?Number(b.amount??0):0;
      cur.commission += commAmt;
      cur.payout     += partnerPayout;
      cur.stripeFees += feeInBid;
      cur.camelNet   += camelNetComm;
      cur.pcRefunds  += pcRefundTotal;
    }
    if (isCancelled) cur.cancelled++;
    if (String(b.booking_status||"").toLowerCase()==="completed") cur.completed++;
    partnerMap.set(key,cur);
  }
  const partnerBreakdown = Array.from(partnerMap.values()).sort((a,b)=>a.name.localeCompare(b.name)||b.revenue-a.revenue);

  const vehicleBreakdown = Array.from(
    filteredBookings.reduce((map,r)=>{
      const key=String(r.vehicle_category_name||"Unknown");
      if (!map.has(key)) map.set(key,{category:key,count:0});
      map.get(key)!.count++;
      return map;
    },new Map<string,{category:string;count:number}>())
  ).map(([,v])=>v).sort((a,b)=>b.count-a.count);

  const exportPartners = useMemo(() => {
    const s = new Map<string,string>();
    for (const b of bookings) {
      if (b.partner_user_id) s.set(b.partner_user_id, b.partner_company_name||b.partner_user_id);
    }
    return Array.from(s.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const exportRows = exportPartner==="all"
      ? filteredBookings
      : filteredBookings.filter(b => b.partner_user_id===exportPartner);
    const partnerLabel = exportPartner==="all"
      ? "all-partners"
      : (exportPartners.find(([id]) => id===exportPartner)?.[1]??exportPartner).replace(/\s+/g,"-").toLowerCase();
    const filename = `camel-admin-report-${partnerLabel}-${dateStr}.xls`;

    const fuelHeaders = [
      "Job Number","Partner Company Name","Partner Country","Legal Company Name","Company Reg. No.","VAT / NIF Number",
      "Customer","Customer Email","Customer Phone","Pickup Address","Dropoff Address",
      "Scheduled Pickup At","Scheduled Dropoff At","Actual Pickup Date & Time","Actual Dropoff Date & Time","Completed Date",
      "Vehicle","Driver","Driver Vehicle","Bid Currency","Charge Currency",
      "Car Hire Price","Commission Rate (%)","Commission Amount",
      "Stripe Fee (Camel cost)","Stripe Fee Currency","Camel Net Commission (after Stripe)",
      "Full Fuel Deposit","Collection Fuel (Driver)","Collection Fuel (Partner Override)",
      "Return Fuel (Driver)","Return Fuel (Partner Override)","Quarters Used","Fuel Used Label",
      "Fuel Charge to Customer","Fuel Refund to Customer",
      "Refund","Customer Final",
      "Total Booking Amount","Partner Net Payout",
      "Customer Collection Confirmed","Customer Return Confirmed",
      "Insurance Driver Confirmed","Insurance Customer Confirmed",
      "Booking Status","Payout Status","Cancelled By","Cancelled At","Cancellation Reason","Refund Status","Created At",
    ];
    const fuelRows = exportRows.map(b=>{
      const usedQ=b.fuel_used_quarters;
      const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
      const { hire, rate, commAmt, partnerPayout, camelNetComm, fuelRefund, feeInBid, pcRefundTotal, netFinal } = calcPayout(b);
      const isCompleted=String(b.booking_status||"").toLowerCase()==="completed";
      return [
        b.job_number||"",b.partner_company_name||"",b.partner_country||"",b.partner_legal_company_name||"",
        b.partner_company_registration_number||"",b.partner_vat_number||"",
        b.customer_name||"",b.customer_email||"",b.customer_phone||"",
        b.pickup_address||"",b.dropoff_address||"",
        fmtDateTime(b.pickup_at),fmtDateTime(b.dropoff_at),
        fmtDateTime(b.delivery_confirmed_at),fmtDateTime(b.collection_confirmed_at),
        isCompleted?fmtDate(b.created_at):"",
        b.vehicle_category_name||"",b.driver_name||"",b.driver_vehicle||"",
        b.currency||"EUR",b.charge_currency||b.currency||"EUR",
        hire, rate, commAmt,
        feeInBid>0?Number(feeInBid.toFixed(4)):"", b.stripe_fee_currency||"", camelNetComm>0?Number(camelNetComm.toFixed(2)):"",
        Number(b.fuel_price??0),
        b.collection_fuel_level_driver||"—",b.collection_fuel_level_partner||"—",
        b.return_fuel_level_driver||"—",b.return_fuel_level_partner||"—",
        usedQ!==null&&usedQ!==undefined?usedQ:"—",
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0),fuelRefund,
        pcRefundTotal>0?pcRefundTotal:"",
        Number((Math.max(0,Number(b.amount??0)-fuelRefund-pcRefundTotal)).toFixed(2)),
        isCancelled?0:Number(b.amount??0), Math.max(0,partnerPayout-pcRefundTotal),
        b.collection_confirmed_by_customer?"Yes":"No",b.return_confirmed_by_customer?"Yes":"No",
        b.insurance_docs_confirmed_by_driver?"Yes":"No",b.insurance_docs_confirmed_by_customer?"Yes":"No",
        b.payout_hold ? "Disputed" : (b.booking_status||""), b.payout_hold ? "On Hold" : (b.payout_status||""), b.cancelled_by||"",
        b.cancelled_at?fmtDateTime(b.cancelled_at):"",
        b.cancellation_reason||"",b.refund_status||"",fmtDate(b.created_at),
      ];
    });
    const summaryHeaders = [
      "Currency","Total Bookings","Completed","Cancelled",
      "Total Revenue (excl. cancelled)","Car Hire Revenue",
      "Camel Commission","Stripe Fees (Camel cost)","Camel Net Income (after Stripe)",
      "Partner Net Payout","Fuel Deposits","Fuel Charges Billed","Fuel Refunds Issued",
      "Post-Completion Refunds Total",
    ];
    const summaryRows = (CURRENCIES).map(curr=>{
      const t=revenuesByCurrency[curr];
      return [`${curr} ${CURRENCY_META[curr].symbol}`,t.count,t.completed,t.cancelled,t.total,t.carHire,t.commissionTotal,t.stripeFeeTotal,t.camelNetCommTotal,t.partnerPayoutTotal,t.fuelDeposit,t.fuelCharge,t.fuelRefund,t.pcRefundTotal];
    });
    const partnerHeaders = ["Partner","Currency","Total Bookings","Completed","Cancelled","Total Revenue","Camel Commission","Stripe Fees (Camel)","Camel Net Income","Partner Net Payout","Post-Completion Refunds"];
    const partnerRows = partnerBreakdown.map(p=>[p.name,p.currency,p.bookings,p.completed,p.cancelled,p.revenue,p.commission,p.stripeFees,p.camelNet,p.payout,p.pcRefunds]);
    const allHeaders = [
      "Job","Partner","Partner Country","Customer","Booking Status","Payout Status","Bid Currency",
      "Car Hire","Commission Rate (%)","Commission Amount",
      "Stripe Fee (Camel cost)","Camel Net Income",
      "Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund",
      "Refund","Customer Final",
      "Total","Partner Net Payout",
      "Cancelled By","Cancelled At","Refund Status","Insurance","Created At",
    ];
    const allRows = exportRows.map(b=>{
      const usedQ=b.fuel_used_quarters;
      const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
      const { hire, rate, commAmt, partnerPayout, camelNetComm, fuelRefund, feeInBid, pcRefundTotal, netFinal } = calcPayout(b);
      return [
        b.job_number||"",b.partner_company_name||"",b.partner_country||"",b.customer_name||"",
        b.payout_hold ? "Disputed" : (b.booking_status||""), b.payout_hold ? "On Hold" : (b.payout_status||""), b.currency||"EUR",
        hire, rate, commAmt,
        feeInBid>0?Number(feeInBid.toFixed(4)):"", camelNetComm>0?Number(camelNetComm.toFixed(2)):"",
        Number(b.fuel_price??0),
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0), fuelRefund,
        pcRefundTotal>0?pcRefundTotal:"",
        Number((Math.max(0,Number(b.amount??0)-fuelRefund-pcRefundTotal)).toFixed(2)),
        isCancelled?0:Number(b.amount??0), Math.max(0,partnerPayout-pcRefundTotal),
        b.cancelled_by||"", b.cancelled_at?fmtDateTime(b.cancelled_at):"",
        b.refund_status||"",
        b.insurance_docs_confirmed_by_driver&&b.insurance_docs_confirmed_by_customer?"Confirmed":"Pending",
        fmtDate(b.created_at),
      ];
    });
    const blob = buildXls([
      { name:"Fuel Reconciliation", headers:fuelHeaders, rows:fuelRows },
      { name:"Currency Summary",    headers:summaryHeaders, rows:summaryRows },
      { name:"Partner Breakdown",   headers:partnerHeaders, rows:partnerRows },
      { name:"All Bookings",        headers:allHeaders, rows:allRows },
    ]);
    downloadBlob(blob, filename);
  }

  if (loading) return <div className="border border-black/10 bg-white p-8"><p className="text-black/50">Loading reports…</p></div>;

  return (
    <div className="space-y-6">
      {error&&<div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-2xl font-black text-black">Admin Reports</h2>
        <p className="mt-1 text-sm text-black/50 mb-4">Full network-wide reconciliation. Stripe fees shown as Camel cost — not deducted from partner payout.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Date from</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black"/>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Date to</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black"/>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Export partner</label>
            <select value={exportPartner} onChange={e => setExportPartner(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="all">All partners</option>
              {exportPartners.map(([id,name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <button type="button" onClick={exportExcel}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90">⬇ Export Excel</button>
          <button type="button" onClick={()=>{setDateFrom("");setDateTo("");setExportPartner("all");}}
            className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label:"Total Bookings", value:filteredBookings.length,  color:"text-black" },
          { label:"Completed",      value:completedBookings.length, color:"text-black" },
          { label:"Cancelled",      value:cancelledBookings.length, color:cancelledBookings.length>0?"text-red-600":"text-black/30" },
          { label:"Total Requests", value:filteredRequests.length,  color:"text-black" },
          { label:"Bids Submitted", value:bidsSubmitted,            color:"text-[#ff7a00]" },
        ].map(({label,value,color})=>(
          <div key={label} className={`border p-5 ${label==="Cancelled"&&cancelledBookings.length>0?"border-red-200 bg-red-50":"border-black/10 bg-white"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label:"This Month Requests", value:filteredRequests.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length,  prev:filteredRequests.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"This Month Bookings", value:filteredBookings.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length,  prev:filteredBookings.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"Open Requests",       value:filteredRequests.filter(r=>String(r.status||"").toLowerCase()==="open").length, prev:null },
        ].map(({label,value,prev})=>(
          <div key={label} className="border border-black/10 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className="mt-2 text-3xl font-black text-black">{value}</p>
            {prev!==null&&<p className="mt-1 text-xs font-bold text-black/40">Previous month: {prev}</p>}
          </div>
        ))}
      </div>

      <FinancialDashboard bookings={filteredBookings} />

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-black">All Bookings</h2>
          <p className="text-sm text-black/50">Showing <span className="font-black text-black">{Math.min(allBookingsVisible,filteredBookings.length)}</span> of <span className="font-black text-black">{filteredBookings.length}</span></p>
        </div>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Job","Partner","Customer","Status","Payout Status","Car Hire","Commission","Stripe Fee (Camel)","Camel Net Income","Total Paid","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Refund","Customer Final","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredBookings.length===0 ? (
                <tr><td colSpan={19} className="px-4 py-4 text-black/50">No bookings found.</td></tr>
              ) : filteredBookings.slice(0,allBookingsVisible).map((b,i)=>{
                const usedQ=b.fuel_used_quarters;
                const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
                const { commAmt, partnerPayout, camelNetComm, rate, hire, fuelRefund, feeInBid, pcRefundTotal, netFinal } = calcPayout(b);
                return (
                  <tr key={b.id} className={`hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                    <td className="px-4 py-3 text-black/70"><div>{b.partner_company_name||"—"}</div>{b.partner_vat_number&&<div className="text-xs text-black/40">{b.partner_vat_number}</div>}</td>
                    <td className="px-4 py-3 text-black/70">{b.customer_name||"—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? statusPillClasses("disputed") : statusPillClasses(b.booking_status)}`}>{b.payout_hold ? "Disputed" : String(b.booking_status||"—").replaceAll("_"," ")}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? "border-amber-300 bg-amber-50 text-amber-700" : payoutPillClasses(b.payout_status)}`}>{b.payout_hold ? "On Hold" : (b.payout_status||"—")}</span></td>
                    <td className={`px-4 py-3 ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,b.currency??"EUR")}</td>
                    <td className="px-4 py-3">
                      {isCancelled&&b.refund_status==="full"
                        ? <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,b.currency??"EUR")}</span>
                        : <><div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt,b.currency??"EUR")}</div><div className="text-xs text-black/40">{rate}%</div></>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{feeInBid>0?<span className="font-black text-amber-700">− {fmtCurr(feeInBid,b.currency??"EUR")}</span>:<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{isCancelled&&b.refund_status==="full"?<span className="text-black/30">—</span>:<span className="text-xs font-black text-green-700">{fmtCurr(camelNetComm,b.currency??"EUR")}</span>}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,b.currency)}</td>
                    <td className="px-4 py-3 text-black/70">{fmtAmt(b.fuel_price,b.currency)}</td>
                    <td className="px-4 py-3 text-black/70">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                    <td className="px-4 py-3 font-black text-[#ff7a00]">{b.fuel_charge!==null?fmtAmt(b.fuel_charge,b.currency):"—"}</td>
                    <td className="px-4 py-3 font-black text-green-600">{fuelRefund>0?fmtCurr(fuelRefund,b.currency??"EUR"):"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{pcRefundTotal>0?<span className="font-black text-amber-700">− {fmtCurr(pcRefundTotal,b.currency??"EUR")}</span>:<span className="text-black/30">—</span>}</td>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{fmtCurr(Math.max(0,Number(b.amount??0)-Number(b.fuel_refund??0)-pcRefundTotal),b.currency??"EUR")}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-green-700"}`}>{isCancelled&&b.refund_status==="full"?fmtCurr(0,b.currency??"EUR"):fmtCurr(partnerPayout,b.currency??"EUR")}</td>
                    <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_by||"—"}</td>
                    <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_at?fmtDateTime(b.cancelled_at):"—"}</td>
                    <td className="px-4 py-3">{insurancePill(b.insurance_docs_confirmed_by_driver,b.insurance_docs_confirmed_by_customer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredBookings.length>allBookingsVisible&&(
          <button type="button" onClick={()=>setAllBookingsVisible(v=>v+10)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▼ Show more ({filteredBookings.length-allBookingsVisible} remaining)
          </button>
        )}
        {allBookingsVisible>10&&filteredBookings.length<=allBookingsVisible&&(
          <button type="button" onClick={()=>setAllBookingsVisible(10)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▲ Show less
          </button>
        )}
      </div>

      {(CURRENCIES).map(curr=>{
        const t=revenuesByCurrency[curr];
        if (t.count===0) return null;
        const currBookings=filteredBookings.filter(b=>(b.currency??"EUR")===curr);
        return <AdminCurrencySection key={curr} curr={curr} t={t} bookings={currBookings}/>;
      })}

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black text-black mb-1">Partner Breakdown</h2>
        <p className="text-sm text-black/50 mb-4">Revenue, commission, Stripe fees and payout performance by partner. One row per partner per currency — money is never summed across currencies.</p>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Partner","Currency","Bookings","Completed","Cancelled","Total Revenue","Camel Commission","Stripe Fees (Camel)","Camel Net Income","Partner Net Payout","Post-Comp Refunds"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {partnerBreakdown.length===0 ? (
                <tr><td colSpan={11} className="px-4 py-4 text-black/50">No partner data.</td></tr>
              ) : partnerBreakdown.map((p,i)=>(
                <tr key={i} className={`hover:bg-[#f0f0f0] ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black">{p.name}</td>
                  <td className="px-4 py-3 font-bold text-black/60">{p.currency}</td>
                  <td className="px-4 py-3 text-black/70">{p.bookings}</td>
                  <td className="px-4 py-3 text-black/70">{p.completed}</td>
                  <td className={`px-4 py-3 font-bold ${p.cancelled>0?"text-red-600":"text-black/30"}`}>{p.cancelled}</td>
                  <td className="px-4 py-3 font-black text-black">{fmtCurr(p.revenue,p.currency)}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00]">{fmtCurr(p.commission,p.currency)}</td>
                  <td className="px-4 py-3 font-black text-amber-700">{fmtCurr(p.stripeFees,p.currency)}</td>
                  <td className="px-4 py-3 font-black text-green-700">{fmtCurr(p.camelNet,p.currency)}</td>
                  <td className="px-4 py-3 font-black text-black/70">{fmtCurr(p.payout,p.currency)}</td>
                  <td className="px-4 py-3 font-black text-amber-700">{p.pcRefunds>0?fmtCurr(p.pcRefunds,p.currency):<span className="text-black/30">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PayoutStatusSection bookings={filteredBookings} />

      <AdminInvoicesSection partners={exportPartners} />

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black text-black mb-4">Vehicle Category Breakdown</h2>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Vehicle Category</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {vehicleBreakdown.length===0 ? (
                <tr><td colSpan={2} className="px-4 py-4 text-black/50">No data.</td></tr>
              ) : vehicleBreakdown.map((r,i)=>(
                <tr key={r.category} className={`hover:bg-[#f0f0f0] ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black">{r.category}</td>
                  <td className="px-4 py-3 text-black/70">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
