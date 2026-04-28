"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Currency = "EUR" | "GBP" | "USD";

type BookingRow = {
  id: string;
  request_id: string | null;
  partner_user_id: string | null;
  partner_company_name: string | null;
  partner_legal_company_name: string | null;
  partner_vat_number: string | null;
  partner_company_registration_number: string | null;
  booking_status: string | null;
  amount: number | string | null;
  currency: Currency | null;
  car_hire_price: number | string | null;
  fuel_price: number | string | null;
  fuel_used_quarters: number | null;
  fuel_charge: number | string | null;
  fuel_refund: number | string | null;
  commission_rate: number | null;
  commission_amount: number | string | null;
  partner_payout_amount: number | string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_status: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_status: string | null;
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  driver_name: string | null;
  driver_vehicle: string | null;
  delivery_confirmed_at: string | null;
  collection_confirmed_at: string | null;
  collection_fuel_level_driver: string | null;
  collection_fuel_level_partner: string | null;
  return_fuel_level_driver: string | null;
  return_fuel_level_partner: string | null;
  collection_confirmed_by_customer: boolean;
  return_confirmed_by_customer: boolean;
  insurance_docs_confirmed_by_driver: boolean;
  insurance_docs_confirmed_by_customer: boolean;
};

const CURRENCY_CONFIG: Record<Currency, { locale: string; label: string; symbol: string }> = {
  EUR: { locale: "es-ES", label: "EUR", symbol: "€" },
  GBP: { locale: "en-GB", label: "GBP", symbol: "£" },
  USD: { locale: "en-US", label: "USD", symbol: "$" },
};

const QUARTER_LABELS: Record<number, string> = {
  0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank",
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function fmtCurr(amount: number, currency: Currency): string {
  const { locale } = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.EUR;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function fmtAmt(amount: number | string | null, currency: Currency | null): string {
  const amt = Number(amount ?? 0);
  if (!isFinite(amt)) return "—";
  return fmtCurr(amt, currency ?? "EUR");
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "confirmed": case "completed": return "border-green-200 bg-green-50 text-green-700";
    case "collected": case "returned":  return "border-amber-200 bg-amber-50 text-amber-800";
    case "driver_assigned": case "en_route": case "arrived": return "border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]";
    case "cancelled": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-black/10 bg-white text-black";
  }
}

function fmtStatus(value?: string | null) {
  switch (String(value || "").toLowerCase()) {
    case "confirmed":       return "Confirmed";
    case "driver_assigned": return "Driver assigned";
    case "en_route":        return "En route";
    case "arrived":         return "Arrived";
    case "collected":       return "On hire";
    case "returned":        return "Returned";
    case "completed":       return "Completed";
    case "cancelled":       return "Cancelled";
    default: return String(value || "—").replaceAll("_", " ");
  }
}

function insurancePill(driver: boolean, customer: boolean) {
  const both = driver && customer;
  return (
    <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${
      both ? "border-green-200 bg-green-50 text-green-700"
           : driver ? "border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]"
           : "border-amber-200 bg-amber-50 text-amber-700"
    }`}>
      {both ? "✓ Confirmed" : driver ? "Driver ✓" : "Pending"}
    </span>
  );
}

function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to   && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function revenuesByCurrency(rows: BookingRow[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { EUR: 0, GBP: 0, USD: 0 };
  for (const r of rows) {
    if (String(r.booking_status || "").toLowerCase() === "cancelled") continue;
    const curr: Currency = (r.currency as Currency) ?? "EUR";
    const amt = Number(r.amount ?? 0);
    if (isFinite(amt)) totals[curr] += amt;
  }
  return totals;
}

// Core financial calculation — cancelled bookings get zeroed/adjusted figures
function calcPayout(b: BookingRow): { hire: number; rate: number; commAmt: number; payout: number; fuelRefund: number } {
  const isCancelled  = String(b.booking_status || "").toLowerCase() === "cancelled";
  const refundStatus = b.refund_status || null;
  const fuel         = Number(b.fuel_price ?? 0);

  if (isCancelled && refundStatus === "full") {
    return { hire: 0, rate: 0, commAmt: 0, payout: 0, fuelRefund: fuel };
  }

  const hire    = Number(b.car_hire_price ?? 0);
  const rate    = b.commission_rate ?? 20;
  const commAmt = b.commission_amount != null
    ? Number(b.commission_amount)
    : Math.max((hire * rate) / 100, 10);
  const basePayout = b.partner_payout_amount != null
    ? Number(b.partner_payout_amount)
    : Math.max(0, hire - commAmt);
  const payout = basePayout + Number(b.fuel_charge ?? 0);

  // Partial cancel (customer <48hrs) — fuel always refunded
  const fuelRefund = (isCancelled && refundStatus === "partial")
    ? fuel
    : Number(b.fuel_refund ?? 0);

  return { hire, rate, commAmt, payout, fuelRefund };
}

function escapeXml(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildXls(sheets: { name: string; headers: string[]; rows: Array<Array<unknown>> }[]): Blob {
  const xmlSheets = sheets.map(sheet => {
    const rowsXml = [
      `<Row ss:Index="1">${sheet.headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`,
      ...sheet.rows.map((row, ri) =>
        `<Row ss:Index="${ri + 2}">${row.map(cell => {
          const v = cell ?? "";
          const isNum = typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)) && v.trim() !== "");
          return isNum
            ? `<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>`
            : `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
        }).join("")}</Row>`
      ),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#f0f0f0" ss:Pattern="Solid"/></Style></Styles>
  ${xmlSheets.join("\n")}
</Workbook>`;
  return new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const PAGE_SIZE = 10;

type CurrencyTotals = {
  total: number; carHire: number; fuelCharge: number; fuelRefund: number;
  commissionTotal: number; partnerPayoutTotal: number;
  count: number; completed: number; cancelled: number;
};

function AdminCurrencySection({ curr, t, bookings, router }: {
  curr: Currency; t: CurrencyTotals; bookings: BookingRow[]; router: any;
}) {
  const [showAll, setShowAll] = useState(false);
  const { symbol } = CURRENCY_CONFIG[curr];
  const visible = showAll ? bookings : bookings.slice(0, PAGE_SIZE);

  return (
    <div className="border border-black/10 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="border border-black bg-black px-3 py-1 text-sm font-black text-white">{symbol} {curr}</span>
        <h2 className="text-xl font-black text-black">Revenue &amp; Fuel Reconciliation</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
        {[
          { label: "Total Bookings",   value: t.count,               isMoney: false },
          { label: "Completed",        value: t.completed,           isMoney: false },
          { label: "Cancelled",        value: t.cancelled,           isMoney: false },
          { label: "Total Revenue",    value: t.total,               isMoney: true  },
          { label: "Car Hire Revenue", value: t.carHire,             isMoney: true  },
          { label: "Fuel Charged",     value: t.fuelCharge,          isMoney: true  },
          { label: "Fuel Refunded",    value: t.fuelRefund,          isMoney: true  },
          { label: "Camel Commission", value: t.commissionTotal,     isMoney: true  },
          { label: "Partner Payout",   value: t.partnerPayoutTotal,  isMoney: true  },
        ].map(({ label: lbl, value, isMoney }) => (
          <div key={lbl} className={`border p-4 ${lbl === "Cancelled" && (value as number) > 0 ? "border-red-200 bg-red-50" : "border-black/10 bg-[#f0f0f0]"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{lbl}</p>
            <p className={`mt-1 text-lg font-black ${lbl === "Cancelled" && (value as number) > 0 ? "text-red-700" : "text-black"}`}>
              {isMoney ? fmtCurr(value as number, curr) : value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              {["Job","Partner","Customer","Status","Car Hire","Commission","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((b, i) => {
              const usedQ = b.fuel_used_quarters;
              const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
              const { commAmt, payout, rate, hire, fuelRefund } = calcPayout(b);
              return (
                <tr key={b.id} onClick={() => router.push(`/admin/bookings/${b.id}`)}
                  className={`cursor-pointer hover:bg-[#f0f0f0] ${isCancelled ? "bg-red-50/50" : i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number || "—"}</td>
                  <td className="px-4 py-3 text-black/70">
                    <div>{b.partner_company_name || "—"}</div>
                    {b.partner_vat_number && <div className="text-xs text-black/40">{b.partner_vat_number}</div>}
                  </td>
                  <td className="px-4 py-3 text-black/70">{b.customer_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusPillClasses(b.booking_status)}`}>
                      {fmtStatus(b.booking_status)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${isCancelled ? "text-red-400 line-through" : "text-black/70"}`}>{fmtCurr(hire, curr)}</td>
                  <td className="px-4 py-3">
                    {isCancelled && b.refund_status === "full" ? (
                      <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt, curr)}</span>
                    ) : (
                      <>
                        <div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt, curr)}</div>
                        <div className="text-xs text-black/40">{rate}%</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-black/70">{fmtAmt(b.fuel_price, curr)}</td>
                  <td className="px-4 py-3 text-black/70">{usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—"}</td>
                  <td className="px-4 py-3 font-black text-[#ff7a00]">{b.fuel_charge !== null ? fmtAmt(b.fuel_charge, curr) : "—"}</td>
                  <td className="px-4 py-3 font-black text-green-700">{fuelRefund > 0 ? fmtCurr(fuelRefund, curr) : "—"}</td>
                  <td className={`px-4 py-3 font-black ${isCancelled ? "text-red-400 line-through" : "text-black"}`}>{fmtAmt(b.amount, curr)}</td>
                  <td className={`px-4 py-3 font-black ${isCancelled && b.refund_status === "full" ? "text-red-400" : "text-green-700"}`}>
                    {isCancelled && b.refund_status === "full" ? fmtCurr(0, curr) : fmtCurr(payout, curr)}
                  </td>
                  <td className="px-4 py-3 text-xs text-black/60">{b.cancelled_by || "—"}</td>
                  <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{b.cancelled_at ? fmtDate(b.cancelled_at) : "—"}</td>
                  <td className="px-4 py-3">{insurancePill(b.insurance_docs_confirmed_by_driver, b.insurance_docs_confirmed_by_customer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bookings.length > PAGE_SIZE && (
        <button type="button" onClick={() => setShowAll(s => !s)}
          className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
          {showAll ? "▲ Show less" : `▼ Show all ${bookings.length} bookings`}
        </button>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [bookings,       setBookings]       = useState<BookingRow[]>([]);
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | Currency>("all");
  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes  = await fetch("/api/admin/is-admin", { cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const res  = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Failed to load bookings.");
      setBookings(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin bookings.");
      setBookings([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, statusFilter, currencyFilter, dateFrom, dateTo]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = bookings;
    if (dateFrom || dateTo) rows = rows.filter(r => matchesDateRange(r.created_at, dateFrom, dateTo));
    if (statusFilter !== "all") rows = rows.filter(r => String(r.booking_status || "").toLowerCase() === statusFilter);
    if (currencyFilter !== "all") rows = rows.filter(r => (r.currency ?? "EUR") === currencyFilter);
    if (normalizedSearch) rows = rows.filter(r =>
      [r.job_number, r.partner_company_name, r.pickup_address, r.dropoff_address,
        r.vehicle_category_name, r.booking_status, r.amount, r.customer_name]
        .map(v => String(v || "").toLowerCase()).join(" ").includes(normalizedSearch)
    );
    return [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [bookings, dateFrom, dateTo, statusFilter, currencyFilter, normalizedSearch]);

  const revenuesByCurr = useMemo(() => revenuesByCurrency(filtered), [filtered]);

  const currencyTotals = useMemo(() => {
    const t: Record<Currency, CurrencyTotals> = {
      EUR: { total:0, carHire:0, fuelCharge:0, fuelRefund:0, commissionTotal:0, partnerPayoutTotal:0, count:0, completed:0, cancelled:0 },
      GBP: { total:0, carHire:0, fuelCharge:0, fuelRefund:0, commissionTotal:0, partnerPayoutTotal:0, count:0, completed:0, cancelled:0 },
      USD: { total:0, carHire:0, fuelCharge:0, fuelRefund:0, commissionTotal:0, partnerPayoutTotal:0, count:0, completed:0, cancelled:0 },
    };
    for (const b of filtered) {
      const c: Currency = (b.currency as Currency) ?? "EUR";
      if (!t[c]) continue;
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { commAmt, payout, hire, fuelRefund } = calcPayout(b);
      t[c].count++;
      if (!isCancelled) {
        t[c].total           += Number(b.amount ?? 0);
        t[c].carHire         += hire;
        t[c].fuelCharge      += Number(b.fuel_charge ?? 0);
        t[c].commissionTotal += commAmt;
        t[c].partnerPayoutTotal += payout;
      }
      t[c].fuelRefund += fuelRefund;
      if (isCancelled) t[c].cancelled++;
      if (String(b.booking_status || "").toLowerCase() === "completed") t[c].completed++;
    }
    return t;
  }, [filtered]);

  const completed     = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "completed").length;
  const confirmed     = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "confirmed").length;
  const active        = filtered.filter(r => ["driver_assigned","en_route","arrived","collected","returned"].includes(String(r.booking_status||"").toLowerCase())).length;
  const cancelled     = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "cancelled").length;
  const statusOptions = Array.from(new Set(bookings.map(r => String(r.booking_status || "").toLowerCase()).filter(Boolean))).sort();
  const visible       = filtered.slice(0, visibleCount);
  const hasMore       = filtered.length > visibleCount;

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const fuelHeaders = [
      "Job Number","Partner Company Name","Legal Company Name","Company Reg. No.","VAT / NIF Number",
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
      "Total Booking Amount","Partner Payout",
      "Customer Collection Confirmed","Customer Return Confirmed",
      "Insurance Driver Confirmed","Insurance Customer Confirmed",
      "Booking Status","Cancelled By","Cancelled At","Cancellation Reason","Refund Status",
      "Created At",
    ];
    const fuelRows = filtered.map(b => {
      const usedQ = b.fuel_used_quarters;
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { hire, rate, commAmt, payout, fuelRefund } = calcPayout(b);
      const isCompleted = String(b.booking_status || "").toLowerCase() === "completed";
      return [
        b.job_number||"", b.partner_company_name||"", b.partner_legal_company_name||"",
        b.partner_company_registration_number||"", b.partner_vat_number||"",
        b.customer_name||"", b.customer_email||"", b.customer_phone||"",
        b.pickup_address||"", b.dropoff_address||"",
        fmtDateTime(b.pickup_at), fmtDateTime(b.dropoff_at),
        fmtDateTime(b.delivery_confirmed_at), fmtDateTime(b.collection_confirmed_at),
        isCompleted ? fmtDate(b.created_at) : "",
        b.vehicle_category_name||"", b.driver_name||"", b.driver_vehicle||"",
        b.currency||"EUR",
        hire, rate, commAmt,
        Number(b.fuel_price??0),
        b.collection_fuel_level_driver||"—", b.collection_fuel_level_partner||"—",
        b.return_fuel_level_driver||"—", b.return_fuel_level_partner||"—",
        usedQ!==null&&usedQ!==undefined?usedQ:"—",
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0), fuelRefund,
        isCancelled ? 0 : Number(b.amount??0),
        payout,
        b.collection_confirmed_by_customer?"Yes":"No",
        b.return_confirmed_by_customer?"Yes":"No",
        b.insurance_docs_confirmed_by_driver?"Yes":"No",
        b.insurance_docs_confirmed_by_customer?"Yes":"No",
        b.booking_status||"",
        b.cancelled_by||"",
        b.cancelled_at ? fmtDateTime(b.cancelled_at) : "",
        b.cancellation_reason||"",
        b.refund_status||"",
        fmtDate(b.created_at),
      ];
    });
    const summaryHeaders = [
      "Currency","Total Bookings","Completed","Cancelled",
      "Total Revenue (excl. cancelled)","Car Hire Revenue","Camel Commission",
      "Partner Payout Total","Fuel Charges Billed","Fuel Refunds Issued",
    ];
    const summaryRows = (["EUR","GBP","USD"] as Currency[]).map(curr => {
      const t = currencyTotals[curr];
      return [`${curr} ${CURRENCY_CONFIG[curr].symbol}`, t.count, t.completed, t.cancelled, t.total, t.carHire, t.commissionTotal, t.partnerPayoutTotal, t.fuelCharge, t.fuelRefund];
    });
    const allHeaders = [
      "Job","Partner","Customer","Status","Car Hire","Commission Rate (%)","Commission Amount",
      "Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout",
      "Cancelled By","Cancelled At","Refund Status","Insurance","Currency","Created At",
    ];
    const allRows = filtered.map(b => {
      const usedQ = b.fuel_used_quarters;
      const isCancelled = String(b.booking_status||"").toLowerCase() === "cancelled";
      const { hire, rate, commAmt, payout, fuelRefund } = calcPayout(b);
      return [
        b.job_number||"", b.partner_company_name||"", b.customer_name||"", b.booking_status||"",
        hire, rate, commAmt, Number(b.fuel_price??0),
        usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—",
        Number(b.fuel_charge??0), fuelRefund,
        isCancelled ? 0 : Number(b.amount??0),
        payout,
        b.cancelled_by||"",
        b.cancelled_at ? fmtDateTime(b.cancelled_at) : "",
        b.refund_status||"",
        b.insurance_docs_confirmed_by_driver&&b.insurance_docs_confirmed_by_customer?"Confirmed":"Pending",
        b.currency||"EUR", fmtDate(b.created_at),
      ];
    });
    const blob = buildXls([
      { name:"Fuel Reconciliation", headers:fuelHeaders, rows:fuelRows },
      { name:"Currency Summary",    headers:summaryHeaders, rows:summaryRows },
      { name:"All Bookings",        headers:allHeaders, rows:allRows },
    ]);
    downloadBlob(blob, `camel-admin-bookings-${dateStr}.xls`);
  }

  if (loading) return (
    <div className="border border-black/10 bg-white p-8">
      <p className="text-black/50">Loading bookings…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        {[
          { label:"Total Bookings", value:filtered.length, color:"text-black" },
          { label:"Confirmed",      value:confirmed,       color:"text-black" },
          { label:"Active",         value:active,          color:"text-[#ff7a00]" },
          { label:"Completed",      value:completed,       color:"text-black" },
          { label:"Cancelled",      value:cancelled,       color:cancelled>0?"text-red-600":"text-black/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`border p-5 ${label==="Cancelled"&&cancelled>0?"border-red-200 bg-red-50":"border-black/10 bg-white"}`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
        {(["EUR","GBP","USD"] as Currency[]).map(curr => {
          const amt = revenuesByCurr[curr];
          const { locale, label, symbol } = CURRENCY_CONFIG[curr];
          const formatted = new Intl.NumberFormat(locale,{style:"currency",currency:curr,maximumFractionDigits:0}).format(amt);
          return (
            <div key={curr} className="border border-black/10 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-widest text-black/50">Revenue {symbol} {label}</p>
              <p className={`mt-2 text-2xl font-black ${amt>0?"text-black":"text-black/20"}`}>{formatted}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-black">All Bookings</h2>
            <p className="mt-1 text-sm text-black/50">All bookings across all partner accounts. Click any row to view detail.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Search</label>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Job, partner, customer…"
                className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black"/>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Status</label>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black">
                <option value="all">All statuses</option>
                {statusOptions.map(s=><option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Currency</label>
              <select value={currencyFilter} onChange={e=>setCurrencyFilter(e.target.value as "all"|Currency)}
                className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black">
                <option value="all">All currencies</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
                <option value="USD">USD $</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Date from</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black"/>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Date to</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                className="mt-1 w-full border border-black/20 bg-[#f0f0f0] p-3 text-sm text-black outline-none focus:border-black"/>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={()=>{setDateFrom("");setDateTo("");setSearch("");setStatusFilter("all");setCurrencyFilter("all");}}
            className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">
            Clear Filters
          </button>
          <button type="button" onClick={load}
            className="bg-[#ff7a00] px-5 py-2 text-sm font-black text-white hover:opacity-90">
            Refresh
          </button>
          <button type="button" onClick={exportExcel}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90">
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Per-currency fuel reconciliation sections */}
      {(["EUR","GBP","USD"] as Currency[]).map(curr => {
        const t = currencyTotals[curr];
        if (t.count === 0) return null;
        const currBookings = filtered.filter(b => (b.currency ?? "EUR") === curr);
        return <AdminCurrencySection key={curr} curr={curr} t={t} bookings={currBookings} router={router}/>;
      })}

      {/* All Bookings table */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-black">All Bookings</h2>
          <p className="text-sm text-black/50">
            Showing <span className="font-black text-black">{Math.min(visibleCount,filtered.length)}</span> of{" "}
            <span className="font-black text-black">{filtered.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Job","Partner","Customer","Status","Car Hire","Commission","Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund","Total","Partner Payout","Cancelled By","Cancelled At","Insurance"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.length===0?(
                <tr><td colSpan={15} className="px-4 py-4 text-black/50">No bookings found.</td></tr>
              ):visible.map((row,i)=>{
                const usedQ = row.fuel_used_quarters;
                const isCancelled = String(row.booking_status||"").toLowerCase()==="cancelled";
                const { commAmt, payout, rate, hire, fuelRefund } = calcPayout(row);
                return (
                  <tr key={row.id} onClick={()=>router.push(`/admin/bookings/${row.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-[#f0f0f0] ${isCancelled?"bg-red-50/50":i%2===0?"bg-white":"bg-[#fafafa]"}`}>
                    <td className="px-4 py-4 font-black text-black whitespace-nowrap">{row.job_number||"—"}</td>
                    <td className="px-4 py-4 text-black/70">
                      <div>{row.partner_company_name||"—"}</div>
                      {row.partner_vat_number&&<div className="text-xs text-black/40">{row.partner_vat_number}</div>}
                    </td>
                    <td className="px-4 py-4 text-black/70">
                      <div>{row.customer_name||"—"}</div>
                      <div className="text-xs text-black/40">{row.customer_phone||""}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusPillClasses(row.booking_status)}`}>
                        {fmtStatus(row.booking_status)}
                      </span>
                    </td>
                    <td className={`px-4 py-4 ${isCancelled&&row.refund_status==="full"?"text-red-400 line-through":"text-black/70"}`}>{fmtCurr(hire, row.currency??"EUR")}</td>
                    <td className="px-4 py-4">
                      {isCancelled&&row.refund_status==="full"?(
                        <span className="text-xs font-black text-red-400 line-through">{fmtCurr(commAmt,row.currency??"EUR")}</span>
                      ):(
                        <>
                          <div className="text-xs font-black text-[#ff7a00]">{fmtCurr(commAmt,row.currency??"EUR")}</div>
                          <div className="text-xs text-black/40">{rate}%</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-black/70">{fmtAmt(row.fuel_price,row.currency)}</td>
                    <td className="px-4 py-4 text-black/70">{usedQ!==null&&usedQ!==undefined?(QUARTER_LABELS[usedQ]??`${usedQ}/4`):"—"}</td>
                    <td className="px-4 py-4 font-black text-[#ff7a00]">{row.fuel_charge!==null?fmtAmt(row.fuel_charge,row.currency):"—"}</td>
                    <td className="px-4 py-4 font-black text-green-600">{fuelRefund>0?fmtCurr(fuelRefund,row.currency??"EUR"):"—"}</td>
                    <td className={`px-4 py-4 font-black ${isCancelled?"text-red-400 line-through":"text-black"}`}>{fmtAmt(row.amount,row.currency)}</td>
                    <td className={`px-4 py-4 font-black ${isCancelled&&row.refund_status==="full"?"text-red-600":"text-green-700"}`}>
                      {isCancelled&&row.refund_status==="full"?fmtCurr(0,row.currency??"EUR"):fmtCurr(payout,row.currency??"EUR")}
                    </td>
                    <td className="px-4 py-4 text-xs text-black/60">{row.cancelled_by||"—"}</td>
                    <td className="px-4 py-4 text-xs text-black/60 whitespace-nowrap">{row.cancelled_at?fmtDate(row.cancelled_at):"—"}</td>
                    <td className="px-4 py-4">{insurancePill(row.insurance_docs_confirmed_by_driver,row.insurance_docs_confirmed_by_customer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasMore&&(
          <button type="button" onClick={()=>setVisibleCount(c=>c+PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/10">
            ▼ Show more ({filtered.length-visibleCount} remaining)
          </button>
        )}
        {visibleCount>PAGE_SIZE&&!hasMore&&(
          <button type="button" onClick={()=>setVisibleCount(PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/10">
            ▲ Show less
          </button>
        )}
      </div>
    </div>
  );
}