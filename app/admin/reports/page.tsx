"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";

const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol:"€", locale:"es-ES", label:"EUR" },
  GBP: { symbol:"£", locale:"en-GB", label:"GBP" },
  USD: { symbol:"$", locale:"en-US", label:"USD" },
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
  booking_status:string|null; amount:number|string|null; currency:Currency|null;
  charge_currency:string|null; conversion_rate:number|null;
  car_hire_price:number|string|null; fuel_price:number|string|null;
  fuel_used_quarters:number|null; fuel_charge:number|string|null; fuel_refund:number|string|null;
  commission_rate:number|null; commission_amount:number|string|null;
  partner_payout_amount:number|string|null;
  stripe_fee:number|null; stripe_fee_currency:string|null; exchange_rate:number|null;
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
};

type RequestRow = {
  id:string; job_number:string|null; pickup_address:string|null;
  dropoff_address:string|null; pickup_at:string|null; dropoff_at:string|null;
  vehicle_category_name:string|null; status:string|null;
  created_at:string|null; expires_at:string|null;
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
    default: return "border-black/10 bg-white text-black";
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
function getCurrentMonthKey() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; }
function getPreviousMonthKey() { const n=new Date(); n.setMonth(n.getMonth()-1); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; }

function calcPayout(b: BookingRow): { hire:number; rate:number; commAmt:number; payout:number; fuelRefund:number; feeInBid:number } {
  const isCancelled  = String(b.booking_status||"").toLowerCase()==="cancelled";
  const refundStatus = b.refund_status||null;
  const fuel         = Number(b.fuel_price??0);
  const bidCurr      = (b.currency??"EUR") as string;
  const feeInBid     = stripeFeeInBidCurrency(b.stripe_fee, b.stripe_fee_currency, bidCurr, b.exchange_rate);
  if (isCancelled&&refundStatus==="full") return { hire:0, rate:0, commAmt:0, payout:0, fuelRefund:fuel, feeInBid:0 };
  const hire    = Number(b.car_hire_price??0);
  const rate    = b.commission_rate??20;
  const commAmt = Math.max((hire*rate)/100, 10);
  const payout  = Math.max(0, hire-commAmt+Number(b.fuel_charge??0)-feeInBid);
  const fuelRefund = (isCancelled&&refundStatus==="partial") ? fuel : Number(b.fuel_refund??0);
  return { hire, rate, commAmt, payout, fuelRefund, feeInBid };
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
  commissionTotal:number; partnerPayoutTotal:number; stripeFeeTotal:number;
  count:number; completed:number; cancelled:number;
};

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 mb-4">
        {[
          { label:"Total Bookings",   value:t.count,              isMoney:false },
          { label:"Completed",        value:t.completed,          isMoney:false },
          { label:"Cancelled",        value:t.cancelled,          isMoney:false },
          { label:"Total Revenue",    value:t.total,              isMoney:true  },
          { label:"Car Hire Revenue", value:t.carHire,            isMoney:true  },
          { label:"Stripe Fees",      value:t.stripeFeeTotal,     isMoney:true  },
          { label:"Fuel Charged",     value:t.fuelCharge,         isMoney:true  },
          { label:"Fuel Refunded",    value:t.fuelRefund,         isMoney:true  },
          { label:"Camel Commission", value:t.commissionTotal,    isMoney:true  },
          { label:"Partner Payout",   value:t.partnerPayoutTotal, isMoney:true  },
        ].map(({label:lbl,value,isMoney})=>(
          <div key={lbl} className={`border p-4 ${lbl==="Cancelled"&&(value as number)>0?"border-red-200 bg-red-50":lbl==="Stripe Fees"&&(value as number)>0?"border-amber-100 bg-amber-50":"border-black/10 bg-[#f0f0f0]"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{lbl}</p>
            <p className={`mt-1 text-lg font-black ${lbl==="Cancelled"&&(value as number)>0?"text-red-700":lbl==="Stripe Fees"?"text-amber-700":"text-black"}`}>
              {isMoney?fmtCurr(value as number,curr):value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              {["Job","Partner","Customer","Status","Car Hire","Commission","Stripe Fee","Conv. Rate","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((b,i)=>{
              const usedQ=b.fuel_used_quarters;
              const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
              const { commAmt, payout, rate, hire, fuelRefund, feeInBid } = calcPayout(b);
              const hasCurrConv = b.charge_currency && b.charge_currency !== (b.currency ?? "EUR");
              return (
                <tr key={b.id} className={`hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                  <td className="px-4 py-3 text-black/70"><div>{b.partner_company_name||"—"}</div>{b.partner_vat_number&&<div className="text-xs text-black/40">{b.partner_vat_number}</div>}</td>
                  <td className="px-4 py-3 text-black/70">{b.customer_name||"—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusPillClasses(b.booking_status)}`}>{String(b.booking_status||"—").replaceAll("_"," ")}</span></td>
                  <td className={`px-4 py-3 ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,curr)}</td>
                  <td className="px-4 py-3">
                    {isCancelled&&b.refund_status==="full"?(
                      <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,curr)}</span>
                    ):(
                      <><div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt,curr)}</div><div className="text-xs text-black/40">{rate}%</div></>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {feeInBid > 0
                      ? <span className="font-black text-amber-700">− {fmtCurr(feeInBid, curr)}</span>
                      : <span className="text-black/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-black/50 whitespace-nowrap">
                    {hasCurrConv && b.conversion_rate
                      ? <span title={`${b.currency} → ${b.charge_currency}`}>{Number(b.conversion_rate).toFixed(4)}</span>
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-black/70">{fmtAmt(b.fuel_price,curr)}</td>
                  <td className="px-4 py-3 text-black/70">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00]">{b.fuel_charge!==null?fmtAmt(b.fuel_charge,curr):"—"}</td>
                  <td className="px-4 py-3 font-black text-green-700">{fuelRefund>0?fmtCurr(fuelRefund,curr):"—"}</td>
                  <td className={`px-4 py-3 font-black ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,curr)}</td>
                  <td className={`px-4 py-3 font-black ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-green-700"}`}>{isCancelled&&b.refund_status==="full"?fmtCurr(0,curr):fmtCurr(payout,curr)}</td>
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

export default function AdminReportsPage() {
  const supabase = useMemo(()=>createBrowserSupabaseClient(),[]);
  const router = useRouter();

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [bookings,setBookings]=useState<BookingRow[]>([]);
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [allBookingsVisible,setAllBookingsVisible]=useState(10);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data:userData, error:userErr } = await supabase.auth.getUser();
      if (userErr||!userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes = await fetch("/api/admin/is-admin",{cache:"no-store",credentials:"include"});
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

  const filteredRequests = requests.filter(r=>matchesDateRange(r.created_at,dateFrom,dateTo));
  const filteredBookings = bookings.filter(r=>matchesDateRange(r.created_at,dateFrom,dateTo));
  const completedBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="completed");
  const cancelledBookings = filteredBookings.filter(r=>String(r.booking_status||"").toLowerCase()==="cancelled");

  const revenuesByCurrency = useMemo(()=>{
    const t: Record<Currency,CurrencyTotals> = {
      EUR:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,stripeFeeTotal:0,count:0,completed:0,cancelled:0 },
      GBP:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,stripeFeeTotal:0,count:0,completed:0,cancelled:0 },
      USD:{ total:0,carHire:0,fuelDeposit:0,fuelCharge:0,fuelRefund:0,commissionTotal:0,partnerPayoutTotal:0,stripeFeeTotal:0,count:0,completed:0,cancelled:0 },
    };
    for (const b of filteredBookings) {
      const c: Currency = (b.currency as Currency)??"EUR";
      if (!t[c]) continue;
      const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
      const { commAmt, payout, hire, fuelRefund, feeInBid } = calcPayout(b);
      t[c].count++;
      if (!isCancelled) {
        t[c].total              += Number(b.amount??0);
        t[c].carHire            += hire;
        t[c].fuelDeposit        += Number(b.fuel_price??0);
        t[c].fuelCharge         += Number(b.fuel_charge??0);
        t[c].commissionTotal    += commAmt;
        t[c].partnerPayoutTotal += payout;
        t[c].stripeFeeTotal     += feeInBid;
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

  const partnerMap = new Map<string,{name:string;bookings:number;revenue:number;commission:number;payout:number;stripeFees:number;completed:number;cancelled:number}>();
  for (const b of filteredBookings) {
    const pid  = String(b.partner_user_id||"unknown");
    const name = String(b.partner_company_name||"Unknown Partner");
    const isCancelled = String(b.booking_status||"").toLowerCase()==="cancelled";
    const { commAmt, payout, hire, feeInBid } = calcPayout(b);
    const cur = partnerMap.get(pid)||{ name, bookings:0, revenue:0, commission:0, payout:0, stripeFees:0, completed:0, cancelled:0 };
    cur.bookings++;
    if (!isCancelled) {
      cur.revenue    += isFinite(Number(b.amount??0))?Number(b.amount??0):0;
      cur.commission += commAmt;
      cur.payout     += payout;
      cur.stripeFees += feeInBid;
    }
    if (isCancelled) cur.cancelled++;
    if (String(b.booking_status||"").toLowerCase()==="completed") cur.completed++;
    partnerMap.set(pid,cur);
  }
  const partnerBreakdown = Array.from(partnerMap.values()).sort((a,b)=>b.revenue-a.revenue);

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
      "Job Number","Partner Company Name","Legal Company Name","Company Reg. No.","VAT / NIF Number",
      "Customer","Customer Email","Customer Phone",
      "Pickup Address","Dropoff Address",
      "Scheduled Pickup At","Scheduled Dropoff At",
      "Actual Pickup Date & Time","Actual Dropoff Date & Time","Completed Date",
      "Vehicle","Driver","Driver Vehicle",
      "Bid Currency","Charge Currency",
      "Car Hire Price","Commission Rate (%)","Commission Amount",
      "Stripe Processing Fee","Stripe Fee Currency","Exchange Rate (Bid→Charge)",
      "Full Fuel Deposit","Collection Fuel (Driver)","Collection Fuel (Partner Override)",
      "Return Fuel (Driver)","Return Fuel (Partner Override)",
      "Quarters Used","Fuel Used Label",
      "Fuel Charge to Customer","Fuel Refund to Customer",
      "Total Booking Amount","Partner Payout",
      "Customer Collection Confirmed","Customer Return Confirmed",
      "Insurance Driver Confirmed","Insurance Customer Confirmed",
      "Booking Status","Cancelled By","Cancelled At","Cancellation Reason","Refund Status",
      "Created At",
    ];
    const fuelRows = filteredBookings.map(b=>{
      const usedQ=b.fuel_used_quarters;
      const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
      const { hire, rate, commAmt, payout, fuelRefund, feeInBid } = calcPayout(b);
      const isCompleted=String(b.booking_status||"").toLowerCase()==="completed";
      return [
        b.job_number||"",b.partner_company_name||"",b.partner_legal_company_name||"",
        b.partner_company_registration_number||"",b.partner_vat_number||"",
        b.customer_name||"",b.customer_email||"",b.customer_phone||"",
        b.pickup_address||"",b.dropoff_address||"",
        fmtDateTime(b.pickup_at),fmtDateTime(b.dropoff_at),
        fmtDateTime(b.delivery_confirmed_at),fmtDateTime(b.collection_confirmed_at),
        isCompleted?fmtDate(b.created_at):"",
        b.vehicle_category_name||"",b.driver_name||"",b.driver_vehicle||"",
        b.currency||"EUR",
        b.charge_currency||b.currency||"EUR",
        hire,rate,commAmt,
        feeInBid>0?feeInBid.toFixed(4):"",
        b.stripe_fee_currency||"",
        b.exchange_rate||b.conversion_rate||"",
        Number(b.fuel_price??0),
        b.collection_fuel_level_driver||"—",b.collection_fuel_level_partner||"—",
        b.return_fuel_level_driver||"—",b.return_fuel_level_partner||"—",
        usedQ!==null&&usedQ!==undefined?usedQ:"—",
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0),fuelRefund,
        isCancelled?0:Number(b.amount??0),payout,
        b.collection_confirmed_by_customer?"Yes":"No",
        b.return_confirmed_by_customer?"Yes":"No",
        b.insurance_docs_confirmed_by_driver?"Yes":"No",
        b.insurance_docs_confirmed_by_customer?"Yes":"No",
        b.booking_status||"",
        b.cancelled_by||"",
        b.cancelled_at?fmtDateTime(b.cancelled_at):"",
        b.cancellation_reason||"",
        b.refund_status||"",
        fmtDate(b.created_at),
      ];
    });
    const summaryHeaders = [
      "Currency","Total Bookings","Completed","Cancelled",
      "Total Revenue (excl. cancelled)","Car Hire Revenue",
      "Camel Commission","Stripe Fees Total","Partner Payout Total",
      "Fuel Deposits","Fuel Charges Billed","Fuel Refunds Issued",
    ];
    const summaryRows = (["EUR","GBP","USD"] as Currency[]).map(curr=>{
      const t=revenuesByCurrency[curr];
      return [`${curr} ${CURRENCY_META[curr].symbol}`,t.count,t.completed,t.cancelled,t.total,t.carHire,t.commissionTotal,t.stripeFeeTotal,t.partnerPayoutTotal,t.fuelDeposit,t.fuelCharge,t.fuelRefund];
    });
    const partnerHeaders = ["Partner","Total Bookings","Completed","Cancelled","Total Revenue","Camel Commission","Stripe Fees","Partner Payout"];
    const partnerRows = partnerBreakdown.map(p=>[p.name,p.bookings,p.completed,p.cancelled,p.revenue,p.commission,p.stripeFees,p.payout]);
    const allHeaders = [
      "Job","Partner","Customer","Status","Bid Currency","Charge Currency",
      "Car Hire","Commission Rate (%)","Commission Amount",
      "Stripe Fee","Exchange Rate",
      "Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout",
      "Cancelled By","Cancelled At","Refund Status","Insurance","Created At",
    ];
    const allRows = filteredBookings.map(b=>{
      const usedQ=b.fuel_used_quarters;
      const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
      const { hire, rate, commAmt, payout, fuelRefund } = calcPayout(b);
      return [
        b.job_number||"",b.partner_company_name||"",b.customer_name||"",b.booking_status||"",
        b.currency||"EUR",b.charge_currency||b.currency||"EUR",
        hire,rate,commAmt,
        b.stripe_fee??"",b.exchange_rate||b.conversion_rate||"",
        Number(b.fuel_price??0),
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0),fuelRefund,
        isCancelled?0:Number(b.amount??0),payout,
        b.cancelled_by||"",
        b.cancelled_at?fmtDateTime(b.cancelled_at):"",
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
    downloadBlob(blob,`camel-admin-report-${dateStr}.xls`);
  }

  if (loading) return <div className="border border-black/10 bg-white p-8"><p className="text-black/50">Loading reports…</p></div>;

  return (
    <div className="space-y-6">
      {error&&<div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-black">Admin Reports</h2>
            <p className="mt-1 text-sm text-black/50">Full network-wide reconciliation including Stripe fees, currency conversions, cancellations, commission, and multi-currency revenue.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Date from</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black"/>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Date to</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black"/>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={()=>{setDateFrom("");setDateTo("");}} className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear Filters</button>
          <button type="button" onClick={exportExcel} className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90">⬇ Export Excel</button>
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
          { label:"This Month Requests", value:filteredRequests.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length, prev:filteredRequests.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"This Month Bookings", value:filteredBookings.filter(r=>getMonthKey(r.created_at)===currentMonthKey).length, prev:filteredBookings.filter(r=>getMonthKey(r.created_at)===previousMonthKey).length },
          { label:"Open Requests",       value:filteredRequests.filter(r=>String(r.status||"").toLowerCase()==="open").length, prev:null },
        ].map(({label,value,prev})=>(
          <div key={label} className="border border-black/10 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className="mt-2 text-3xl font-black text-black">{value}</p>
            {prev!==null&&<p className="mt-1 text-xs font-bold text-black/40">Previous month: {prev}</p>}
          </div>
        ))}
      </div>

      {/* All Bookings */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-black">All Bookings</h2>
          <p className="text-sm text-black/50">Showing <span className="font-black text-black">{Math.min(allBookingsVisible,filteredBookings.length)}</span> of <span className="font-black text-black">{filteredBookings.length}</span></p>
        </div>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Job","Partner","Customer","Status","Car Hire","Commission","Stripe Fee","Conv. Rate","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredBookings.length===0?(
                <tr><td colSpan={17} className="px-4 py-4 text-black/50">No bookings found.</td></tr>
              ):filteredBookings.slice(0,allBookingsVisible).map((b,i)=>{
                const usedQ=b.fuel_used_quarters;
                const isCancelled=String(b.booking_status||"").toLowerCase()==="cancelled";
                const { commAmt, payout, rate, hire, fuelRefund, feeInBid } = calcPayout(b);
                const hasCurrConv = b.charge_currency && b.charge_currency !== (b.currency ?? "EUR");
                return (
                  <tr key={b.id} className={`hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number||"—"}</td>
                    <td className="px-4 py-3 text-black/70"><div>{b.partner_company_name||"—"}</div>{b.partner_vat_number&&<div className="text-xs text-black/40">{b.partner_vat_number}</div>}</td>
                    <td className="px-4 py-3 text-black/70">{b.customer_name||"—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusPillClasses(b.booking_status)}`}>{String(b.booking_status||"—").replaceAll("_"," ")}</span></td>
                    <td className={`px-4 py-3 ${isCancelled&&b.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire,b.currency??"EUR")}</td>
                    <td className="px-4 py-3">
                      {isCancelled&&b.refund_status==="full"?(
                        <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,b.currency??"EUR")}</span>
                      ):(
                        <><div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt,b.currency??"EUR")}</div><div className="text-xs text-black/40">{rate}%</div></>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {feeInBid > 0
                        ? <span className="font-black text-amber-700">− {fmtCurr(feeInBid, b.stripe_fee_currency||b.currency||"EUR")}</span>
                        : <span className="text-black/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-black/50 whitespace-nowrap">
                      {hasCurrConv && b.conversion_rate ? Number(b.conversion_rate).toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-3 text-black/70">{fmtAmt(b.fuel_price,b.currency)}</td>
                    <td className="px-4 py-3 text-black/70">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                    <td className="px-4 py-3 font-black text-[#ff7a00]">{b.fuel_charge!==null?fmtAmt(b.fuel_charge,b.currency):"—"}</td>
                    <td className="px-4 py-3 font-black text-green-600">{fuelRefund>0?fmtCurr(fuelRefund,b.currency??"EUR"):"—"}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(b.amount,b.currency)}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled&&b.refund_status==="full"?"text-red-600":"text-green-700"}`}>{isCancelled&&b.refund_status==="full"?fmtCurr(0,b.currency??"EUR"):fmtCurr(payout,b.currency??"EUR")}</td>
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
          <button type="button" onClick={()=>setAllBookingsVisible(v=>v+10)} className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">▼ Show more ({filteredBookings.length-allBookingsVisible} remaining)</button>
        )}
        {allBookingsVisible>10&&filteredBookings.length<=allBookingsVisible&&(
          <button type="button" onClick={()=>setAllBookingsVisible(10)} className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">▲ Show less</button>
        )}
      </div>

      {(["EUR","GBP","USD"] as Currency[]).map(curr=>{
        const t=revenuesByCurrency[curr];
        if (t.count===0) return null;
        const currBookings=filteredBookings.filter(b=>(b.currency??"EUR")===curr);
        return <AdminCurrencySection key={curr} curr={curr} t={t} bookings={currBookings}/>;
      })}

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black text-black mb-1">Partner Breakdown</h2>
        <p className="text-sm text-black/50 mb-4">Revenue, commission, Stripe fees and payout performance by partner.</p>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Partner","Bookings","Completed","Cancelled","Total Revenue","Camel Commission","Stripe Fees","Partner Payout"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {partnerBreakdown.length===0?(
                <tr><td colSpan={8} className="px-4 py-4 text-black/50">No partner data.</td></tr>
              ):partnerBreakdown.map((p,i)=>(
                <tr key={i} className={`hover:bg-[#f0f0f0] ${i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black">{p.name}</td>
                  <td className="px-4 py-3 text-black/70">{p.bookings}</td>
                  <td className="px-4 py-3 text-black/70">{p.completed}</td>
                  <td className={`px-4 py-3 font-bold ${p.cancelled>0?"text-red-600":"text-black/30"}`}>{p.cancelled}</td>
                  <td className="px-4 py-3 font-black text-black">{p.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00]">{p.commission.toFixed(2)}</td>
                  <td className="px-4 py-3 font-black text-amber-700">{p.stripeFees.toFixed(2)}</td>
                  <td className="px-4 py-3 font-black text-green-700">{p.payout.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              {vehicleBreakdown.length===0?(
                <tr><td colSpan={2} className="px-4 py-4 text-black/50">No data.</td></tr>
              ):vehicleBreakdown.map((r,i)=>(
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