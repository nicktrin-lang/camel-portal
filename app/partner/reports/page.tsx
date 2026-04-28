"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";

const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};

function fmtCurr(amount: number, currency: Currency): string {
  const { locale } = CURRENCY_META[currency] ?? CURRENCY_META.EUR;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function fmtAmt(amount: number | string | null, currency: Currency | null): string {
  const amt = Number(amount ?? 0);
  if (!isFinite(amt)) return "—";
  return fmtCurr(amt, currency ?? "EUR");
}

type BookingRow = {
  id: string; booking_status: string | null; amount: number | string | null;
  currency: Currency | null; car_hire_price: number | null; fuel_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  commission_rate: number | null; commission_amount: number | null; partner_payout_amount: number | null;
  cancelled_by: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; refund_status: string | null;
  created_at: string | null; job_number: string | null; pickup_address: string | null;
  dropoff_address: string | null; pickup_at: string | null; dropoff_at: string | null;
  vehicle_category_name: string | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  driver_name: string | null; driver_vehicle: string | null;
  delivery_confirmed_at: string | null; collection_confirmed_at: string | null;
  collection_fuel_level_driver: string | null; collection_fuel_level_partner: string | null;
  return_fuel_level_driver: string | null; return_fuel_level_partner: string | null;
  collection_confirmed_by_customer: boolean; return_confirmed_by_customer: boolean;
  partner_legal_company_name: string | null; partner_vat_number: string | null;
  partner_company_registration_number: string | null;
};

type RequestRow = {
  id: string; job_number: string | null; pickup_address: string | null;
  dropoff_address: string | null; pickup_at: string | null; dropoff_at: string | null;
  vehicle_category_name: string | null; status: string | null;
  created_at: string | null; expires_at: string | null;
};

const QUARTER_LABELS: Record<number, string> = {
  0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank",
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function fmtDateTime(value?: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "completed": case "confirmed": case "bid_successful": return "border-green-200 bg-green-50 text-green-700";
    case "open": case "bid_submitted": return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired": return "border-black/10 bg-[#f0f0f0] text-black/50";
    case "cancelled": case "bid_unsuccessful": case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-black/10 bg-white text-black/60";
  }
}

function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to   && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function getMonthKey(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function getCurrentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
}

function getPreviousMonthKey() {
  const n = new Date(); n.setMonth(n.getMonth()-1);
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
}

function escapeXml(v: unknown): string {
  return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildXls(sheets: { name: string; headers: string[]; rows: Array<Array<unknown>> }[]): Blob {
  const xmlSheets = sheets.map(sheet => {
    const rowsXml = [
      `<Row ss:Index="1">${sheet.headers.map(h=>`<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`,
      ...sheet.rows.map((row,ri)=>
        `<Row ss:Index="${ri+2}">${row.map(cell=>{
          const v=cell??"";
          const isNum=typeof v==="number"||(typeof v==="string"&&v!==""&&!isNaN(Number(v))&&v.trim()!=="");
          return isNum?`<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>`:`<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
        }).join("")}</Row>`
      ),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style></Styles>
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

// Cancellation-aware financials
function calcCommission(b: BookingRow): { rate: number; amount: number; payout: number; fuelRefund: number } {
  const isCancelled  = String(b.booking_status||"").toLowerCase()==="cancelled";
  const refundStatus = b.refund_status||null;
  const fuel         = Number(b.fuel_price??0);

  if (isCancelled && refundStatus==="full") {
    return { rate:0, amount:0, payout:0, fuelRefund:fuel };
  }

  const hire   = Number(b.car_hire_price??0);
  const rate   = b.commission_rate??20;
  const amount = b.commission_amount??Math.max((hire*rate)/100,10);
  const payout = b.partner_payout_amount??Math.max(0,hire-amount);
  const fuelRefund = (isCancelled&&refundStatus==="partial") ? fuel : Number(b.fuel_refund??0);
  return { rate, amount, payout, fuelRefund };
}

type CurrencyTotals = {
  total:number; carHire:number; fuelDeposit:number;
  fuelCharge:number; fuelRefund:number;
  commissionTotal:number; partnerPayoutTotal:number;
  count:number; completed:number; cancelled:number;
};

function CurrencySection({ curr, t, bookings }: { curr:Currency; t:CurrencyTotals; bookings:BookingRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const { symbol } = CURRENCY_META[curr];
  const visible = showAll ? bookings : bookings.slice(0,10);

  return (
    <div className="border border-black/5 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="border border-black/20 bg-black text-white px-3 py-1 text-sm font-black">{symbol}</span>
        <h2 className="text-lg font-black text-black">Revenue &amp; Fuel Reconciliation</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9 mb-4">
        {[
          { label:"Total Bookings",      value:t.count,                             isMoney:false },
          { label:"Completed",           value:t.completed,                         isMoney:false },
          { label:"Cancelled",           value:t.cancelled,                         isMoney:false },
          { label:"Total Revenue",       value:t.total,                             isMoney:true  },
          { label:"Car Hire Revenue",    value:t.carHire,                           isMoney:true  },
          { label:"Fuel Charged",        value:t.fuelCharge,                        isMoney:true  },
          { label:"Camel Commission",    value:t.commissionTotal,                   isMoney:true  },
          { label:"Your Net Payout",     value:t.partnerPayoutTotal+t.fuelCharge,   isMoney:true  },
          { label:"Fuel Refunds Issued", value:t.fuelRefund,                        isMoney:true  },
        ].map(({label:lbl,value,isMoney})=>(
          <div key={lbl} className={`border p-4 ${lbl==="Cancelled"&&(value as number)>0?"border-red-200 bg-red-50":"border-black/5 bg-[#f0f0f0]"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{lbl}</p>
            <p className={`mt-1 text-lg font-black ${lbl==="Cancelled"&&(value as number)>0?"text-red-700":"text-black"}`}>
              {isMoney?fmtCurr(value as number,curr):value}
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-white text-left">
            <tr>
              {["Job","Customer","Status","Car Hire","Commission","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Your Payout","Cancelled By","Cancelled At"].map(h=>(
                <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((b,i)=>{
              const usedQ=b.fuel_used_quarters;
              const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
              const { rate, amount:commAmt, payout, fuelRefund } = calcCommission(b);
              const netPayout = payout+Number(b.fuel_charge??0);
              const hire = isCancelled&&b.refund_status==="full"?0:Number(b.car_hire_price??0);
              return (
                <tr key={b.id} className={`transition-colors hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{b.customer_name||"—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-black ${statusPillClasses(b.booking_status)}`}>
                      {String(b.booking_status||"—").replaceAll("_"," ")}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,curr)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isCancelled&&b.refund_status==="full"?(
                      <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,curr)}</span>
                    ):(
                      <>
                        <div className="text-xs font-black text-amber-700">− {fmtCurr(commAmt,curr)}</div>
                        <div className="text-xs font-bold text-black/40">{rate}%</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmtAmt(b.fuel_price,curr)}</td>
                  <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00] whitespace-nowrap">{b.fuel_charge!==null?fmtAmt(b.fuel_charge,curr):"—"}</td>
                  <td className="px-4 py-3 font-black text-green-600 whitespace-nowrap">{fuelRefund>0?fmtCurr(fuelRefund,curr):"—"}</td>
                  <td className={`px-4 py-3 font-black whitespace-nowrap ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,curr)}</td>
                  <td className={`px-4 py-3 font-black whitespace-nowrap ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-black"}`}>
                    {isCancelled&&b.refund_status==="full"?fmtCurr(0,curr):fmtCurr(netPayout,curr)}
                  </td>
                  <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_by||"—"}</td>
                  <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_at?fmtDate(b.cancelled_at):"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bookings.length>10&&(
        <button type="button" onClick={()=>setShowAll(s=>!s)}
          className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
          {showAll?"▲ Show less":`▼ Show all ${bookings.length} bookings`}
        </button>
      )}
    </div>
  );
}

export default function PartnerReportsPage() {
  const supabase = useMemo(()=>createBrowserSupabaseClient(),[]);
  const router   = useRouter();

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string|null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data:userData, error:userErr } = await supabase.auth.getUser();
      if (userErr||!userData?.user) { router.replace("/partner/login?reason=not_signed_in"); return; }
      const [reqRes,bkRes] = await Promise.all([
        fetch("/api/partner/requests",{ cache:"no-store", credentials:"include" }),
        fetch("/api/partner/bookings",{ cache:"no-store", credentials:"include" }),
      ]);
      const reqJson = await safeJson(reqRes);
      const bkJson  = await safeJson(bkRes);
      if (!reqRes.ok) throw new Error(reqJson?.error||"Failed to load requests.");
      if (!bkRes.ok)  throw new Error(bkJson?.error||"Failed to load bookings.");
      setRequests(Array.isArray(reqJson?.data)?reqJson.data:[]);
      setBookings(Array.isArray(bkJson?.data)?bkJson.data:[]);
    } catch(e:any) {
      setError(e?.message||"Failed to load report data.");
      setRequests([]); setBookings([]);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);

  const filteredRequests = requests.filter(r=>!dateFrom&&!dateTo?true:matchesDateRange(r.created_at,dateFrom,dateTo));
  const filteredBookings = bookings.filter(r=>!dateFrom&&!dateTo?true:matchesDateRange(r.created_at,dateFrom,dateTo));
  const completedBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="completed");
  const cancelledBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="cancelled");

  const revenuesByCurrency = useMemo(()=>{
    const t: Record<Currency,CurrencyTotals> = {
      EUR:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,count:0,completed:0,cancelled:0 },
      GBP:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,count:0,completed:0,cancelled:0 },
      USD:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,count:0,completed:0,cancelled:0 },
    };
    for (const b of filteredBookings) {
      const c: Currency = (b.currency as Currency)??"EUR";
      if (!t[c]) continue;
      const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
      const { amount:commAmt, payout, fuelRefund } = calcCommission(b);
      t[c].count++;
      if (!isCancelled) {
        t[c].total           += Number(b.amount??0);
        t[c].carHire         += Number(b.car_hire_price??0);
        t[c].fuelDeposit     += Number(b.fuel_price??0);
        t[c].fuelCharge      += Number(b.fuel_charge??0);
        t[c].commissionTotal += commAmt;
        t[c].partnerPayoutTotal += payout;
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
  const acceptedBids     = filteredRequests.filter(r=>String(r.status||"").toLowerCase()==="bid_successful").length;
  const conversionRate   = bidsSubmitted>0?Math.round((acceptedBids/bidsSubmitted)*100):0;

  const vehicleBreakdown = Array.from(
    filteredBookings.reduce((map,r)=>{
      const key=String(r.vehicle_category_name||"Unknown");
      if (!map.has(key)) map.set(key,{category:key,count:0});
      map.get(key)!.count++;
      return map;
    },new Map<string,{category:string;count:number}>())
  ).map(([,v])=>v).sort((a,b)=>b.count-a.count);

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const fuelHeaders = [
      "Job Number","Legal Company Name","Company Reg. No.","VAT / NIF Number",
      "Customer","Customer Email","Customer Phone",
      "Pickup Address","Dropoff Address",
      "Scheduled Pickup At","Scheduled Dropoff At",
      "Actual Pickup Date & Time","Actual Dropoff Date & Time","Completed Date",
      "Vehicle","Driver","Driver Vehicle","Currency",
      "Car Hire Price","Commission Rate (%)","Commission Amount",
      "Full Fuel Deposit","Collection Fuel (Driver)","Collection Fuel (Partner Override)",
      "Return Fuel (Driver)","Return Fuel (Partner Override)",
      "Quarters Used","Fuel Used Label",
      "Fuel Charge to Customer","Fuel Refund to Customer",
      "Total Booking Amount","Your Payout",
      "Customer Collection Confirmed","Customer Return Confirmed",
      "Booking Status","Cancelled By","Cancelled At","Cancellation Reason","Refund Status",
      "Created At",
    ];
    const fuelRows = filteredBookings.map(b=>{
      const usedQ=b.fuel_used_quarters;
      const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
      const { rate, amount:commAmt, payout, fuelRefund } = calcCommission(b);
      const netPayout=payout+Number(b.fuel_charge??0);
      const hire=isCancelled&&b.refund_status==="full"?0:Number(b.car_hire_price??0);
      const isCompleted=String(b.booking_status||"").toLowerCase()==="completed";
      return [
        b.job_number||"",b.partner_legal_company_name||"",b.partner_company_registration_number||"",b.partner_vat_number||"",
        b.customer_name||"",b.customer_email||"",b.customer_phone||"",
        b.pickup_address||"",b.dropoff_address||"",
        fmtDateTime(b.pickup_at),fmtDateTime(b.dropoff_at),
        fmtDateTime(b.delivery_confirmed_at),fmtDateTime(b.collection_confirmed_at),
        isCompleted?fmtDate(b.created_at):"",
        b.vehicle_category_name||"",b.driver_name||"",b.driver_vehicle||"",
        b.currency||"EUR",
        hire,rate,commAmt,
        Number(b.fuel_price??0),
        b.collection_fuel_level_driver||"—",b.collection_fuel_level_partner||"—",
        b.return_fuel_level_driver||"—",b.return_fuel_level_partner||"—",
        usedQ!==null&&usedQ!==undefined?usedQ:"—",
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0),fuelRefund,
        isCancelled?0:Number(b.amount??0),
        isCancelled&&b.refund_status==="full"?0:netPayout,
        b.collection_confirmed_by_customer?"Yes":"No",
        b.return_confirmed_by_customer?"Yes":"No",
        b.booking_status||"",
        b.cancelled_by||"",
        b.cancelled_at?fmtDateTime(b.cancelled_at):"",
        b.cancellation_reason||"",
        b.refund_status||"",
        fmtDate(b.created_at),
      ];
    });
    const blob = buildXls([{ name:"Fuel Reconciliation", headers:fuelHeaders, rows:fuelRows }]);
    downloadBlob(blob,`camel-report-${dateStr}.xls`);
  }

  if (loading) return (
    <div className="border border-black/5 bg-white p-8">
      <p className="text-sm font-bold text-black/50">Loading reports…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error&&<div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="border border-black/5 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-black">Reports</h1>
            <p className="mt-1 text-sm font-bold text-black/50">Full reconciliation including commission, fuel charges, refunds and cancellations.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black/40">Date from</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="mt-1 block border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black"/>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black/40">Date to</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                className="mt-1 block border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black"/>
            </div>
            <button type="button" onClick={()=>{setDateFrom("");setDateTo("");}}
              className="border border-black/20 bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
              Clear Filters
            </button>
            <button type="button" onClick={exportExcel}
              className="bg-black px-5 py-2.5 text-sm font-black text-white hover:opacity-80 transition-opacity">
              ⬇ Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label:"Total Bookings",  value:filteredBookings.length,  color:"text-black" },
          { label:"Completed",       value:completedBookings.length, color:"text-black" },
          { label:"Cancelled",       value:cancelledBookings.length, color:cancelledBookings.length>0?"text-red-600":"text-black/30" },
          { label:"Bids Submitted",  value:bidsSubmitted,            color:"text-black" },
          { label:"Conversion Rate", value:`${conversionRate}%`,     color:"text-[#ff7a00]" },
        ].map(({label,value,color})=>(
          <div key={label} className={`border p-5 ${label==="Cancelled"&&cancelledBookings.length>0?"border-red-200 bg-red-50":"border-black/5 bg-white"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label:"This Month Requests", value:filteredRequests.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length, prev:filteredRequests.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"This Month Bookings", value:filteredBookings.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length, prev:filteredBookings.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"Open Requests",       value:filteredRequests.filter(r=>String(r.status||"").toLowerCase()==="open").length, prev:null },
        ].map(({label,value,prev})=>(
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            <p className="mt-2 text-2xl font-black text-black">{value}</p>
            {prev!==null&&<p className="mt-1 text-xs font-bold text-black/40">Previous month: {prev}</p>}
          </div>
        ))}
      </div>

      {(["EUR","GBP","USD"] as Currency[]).map(curr=>{
        const t = revenuesByCurrency[curr];
        if (t.count===0) return null;
        const currBookings = filteredBookings.filter(b=>(b.currency??"EUR")===curr);
        return <CurrencySection key={curr} curr={curr} t={t} bookings={currBookings}/>;
      })}

      <div className="border border-black/5 bg-white p-6">
        <h2 className="text-lg font-black text-black mb-4">Vehicle Category Breakdown</h2>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">Vehicle Category</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {vehicleBreakdown.length===0?(
                <tr><td colSpan={2} className="px-4 py-4 text-sm font-bold text-black/50">No data.</td></tr>
              ):vehicleBreakdown.map((r,i)=>(
                <tr key={r.category} className={`hover:bg-[#f0f0f0] transition-colors ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black">{r.category}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}