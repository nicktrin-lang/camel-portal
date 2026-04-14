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

type RequestRow = {
  id: string;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
};

const QUARTER_LABELS: Record<number, string> = {
  0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank",
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
    case "completed": case "confirmed": return "border-green-200 bg-green-50 text-green-700";
    case "collected": case "returned":  return "border-blue-200 bg-blue-50 text-blue-700";
    case "driver_assigned": case "en_route": case "arrived": return "border-amber-200 bg-amber-50 text-amber-800";
    case "cancelled": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-black/10 bg-white text-slate-700";
  }
}

function insurancePill(driver: boolean, customer: boolean) {
  const both = driver && customer;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
      both ? "border-green-200 bg-green-50 text-green-700"
           : driver ? "border-blue-200 bg-blue-50 text-blue-700"
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
  if (to && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function getMonthKey(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKey() {
  const n = new Date(); n.setMonth(n.getMonth() - 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// Consistent payout: (hire − commission) + fuel_charge
function calcPayout(b: BookingRow): { hire: number; rate: number; commAmt: number; payout: number } {
  const hire    = Number(b.car_hire_price ?? 0);
  const rate    = b.commission_rate ?? 20;
  const commAmt = b.commission_amount != null
    ? Number(b.commission_amount)
    : Math.max((hire * rate) / 100, 10);
  const basePayout = b.partner_payout_amount != null
    ? Number(b.partner_payout_amount)
    : Math.max(0, hire - commAmt);
  const payout = basePayout + Number(b.fuel_charge ?? 0);
  return { hire, rate, commAmt, payout };
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
          return isNum ? `<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>` : `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
        }).join("")}</Row>`
      ),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#003768"/><Interior ss:Color="#f3f8ff" ss:Pattern="Solid"/></Style></Styles>
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

// ── Currency Section — same columns as admin bookings page ────────────────────

type CurrencyTotals = {
  total: number; carHire: number; fuelDeposit: number;
  fuelCharge: number; fuelRefund: number;
  commissionTotal: number; partnerPayoutTotal: number;
  count: number; completed: number;
};

function AdminCurrencySection({ curr, t, bookings }: {
  curr: Currency; t: CurrencyTotals; bookings: BookingRow[];
}) {
  const [showAll, setShowAll] = useState(false);
  const { symbol } = CURRENCY_META[curr];
  const visible = showAll ? bookings : bookings.slice(0, 10);

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#003768]/10 px-3 py-1 text-sm font-bold text-[#003768]">{symbol}</span>
        <h2 className="text-xl font-semibold text-[#003768]">Revenue &amp; Fuel Reconciliation</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Total Bookings",   value: t.count,                  isMoney: false },
          { label: "Completed",        value: t.completed,              isMoney: false },
          { label: "Total Revenue",    value: t.total,                  isMoney: true  },
          { label: "Car Hire Revenue", value: t.carHire,                isMoney: true  },
          { label: "Fuel Charged",     value: t.fuelCharge,             isMoney: true  },
          { label: "Camel Commission", value: t.commissionTotal,        isMoney: true  },
          { label: "Partner Payout",   value: t.partnerPayoutTotal,     isMoney: true  },
          { label: "Net to Partner",   value: t.carHire + t.fuelCharge, isMoney: true  },
        ].map(({ label: lbl, value, isMoney }) => (
          <div key={lbl} className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{lbl}</p>
            <p className="mt-1 text-lg font-semibold text-[#003768]">{isMoney ? fmtCurr(value as number, curr) : value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f3f8ff] text-left text-[#003768]">
            <tr>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Partner</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Car Hire</th>
              <th className="px-4 py-3 font-semibold">Commission</th>
              <th className="px-4 py-3 font-semibold">Fuel Deposit</th>
              <th className="px-4 py-3 font-semibold">Fuel Used</th>
              <th className="px-4 py-3 font-semibold">Fuel Charge</th>
              <th className="px-4 py-3 font-semibold">Fuel Refund</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Partner Payout</th>
              <th className="px-4 py-3 font-semibold">Insurance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map(b => {
              const usedQ = b.fuel_used_quarters;
              const { commAmt, payout, rate } = calcPayout(b);
              return (
                <tr key={b.id} className="hover:bg-[#f3f8ff]">
                  <td className="px-4 py-3 font-semibold text-[#003768]">{b.job_number || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{b.partner_company_name || "—"}</div>
                    {b.partner_vat_number && <div className="text-xs text-slate-400">{b.partner_vat_number}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{b.customer_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(b.booking_status)}`}>
                      {String(b.booking_status || "—").replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmtAmt(b.car_hire_price, curr)}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-amber-700">{fmtCurr(commAmt, curr)}</div>
                    <div className="text-xs text-slate-400">{rate}%</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmtAmt(b.fuel_price, curr)}</td>
                  <td className="px-4 py-3 text-slate-700">{usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-orange-700">{b.fuel_charge !== null ? fmtAmt(b.fuel_charge, curr) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{b.fuel_refund !== null ? fmtAmt(b.fuel_refund, curr) : "—"}</td>
                  <td className="px-4 py-3 font-bold text-[#003768]">{fmtAmt(b.amount, curr)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{fmtCurr(payout, curr)}</td>
                  <td className="px-4 py-3">{insurancePill(b.insurance_docs_confirmed_by_driver, b.insurance_docs_confirmed_by_customer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bookings.length > 10 && (
        <button type="button" onClick={() => setShowAll(s => !s)}
          className="mt-3 w-full rounded-2xl border border-black/10 bg-slate-50 py-2.5 text-sm font-semibold text-[#003768] hover:bg-slate-100">
          {showAll ? "▲ Show less" : `▼ Show all ${bookings.length} bookings`}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes = await fetch("/api/admin/is-admin", { cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const [reqRes, bkRes] = await Promise.all([
        fetch("/api/partner/requests", { cache: "no-store", credentials: "include" }),
        fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" }),
      ]);
      const reqJson = await safeJson(reqRes);
      const bkJson  = await safeJson(bkRes);
      if (!reqRes.ok) throw new Error(reqJson?.error || "Failed to load requests.");
      if (!bkRes.ok)  throw new Error(bkJson?.error  || "Failed to load bookings.");
      setRequests(Array.isArray(reqJson?.data) ? reqJson.data : []);
      setBookings(Array.isArray(bkJson?.data)  ? bkJson.data  : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin reporting data.");
      setRequests([]); setBookings([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredRequests = requests.filter(r => matchesDateRange(r.created_at, dateFrom, dateTo));
  const filteredBookings = bookings.filter(r => matchesDateRange(r.created_at, dateFrom, dateTo));
  const completedBookings = filteredBookings.filter(r => String(r.booking_status || "").toLowerCase() === "completed");

  const revenuesByCurrency = useMemo(() => {
    const t: Record<Currency, CurrencyTotals> = {
      EUR: { total: 0, carHire: 0, fuelDeposit: 0, fuelCharge: 0, fuelRefund: 0, commissionTotal: 0, partnerPayoutTotal: 0, count: 0, completed: 0 },
      GBP: { total: 0, carHire: 0, fuelDeposit: 0, fuelCharge: 0, fuelRefund: 0, commissionTotal: 0, partnerPayoutTotal: 0, count: 0, completed: 0 },
      USD: { total: 0, carHire: 0, fuelDeposit: 0, fuelCharge: 0, fuelRefund: 0, commissionTotal: 0, partnerPayoutTotal: 0, count: 0, completed: 0 },
    };
    for (const b of filteredBookings) {
      const c: Currency = (b.currency as Currency) ?? "EUR";
      if (!t[c]) continue;
      const { commAmt, payout } = calcPayout(b);
      t[c].count++;
      t[c].total              += Number(b.amount ?? 0);
      t[c].carHire            += Number(b.car_hire_price ?? 0);
      t[c].fuelDeposit        += Number(b.fuel_price ?? 0);
      t[c].fuelCharge         += Number(b.fuel_charge ?? 0);
      t[c].fuelRefund         += Number(b.fuel_refund ?? 0);
      t[c].commissionTotal    += commAmt;
      t[c].partnerPayoutTotal += payout;
      if (String(b.booking_status || "").toLowerCase() === "completed") t[c].completed++;
    }
    return t;
  }, [filteredBookings]);

  const currentMonthKey  = getCurrentMonthKey();
  const previousMonthKey = getPreviousMonthKey();
  const bidsSubmitted    = filteredRequests.filter(r =>
    ["bid_submitted", "bid_successful", "bid_unsuccessful"].includes(String(r.status || "").toLowerCase())
  ).length;

  const [allBookingsVisible, setAllBookingsVisible] = useState(10);

  const partnerMap = new Map<string, { name: string; bookings: number; revenue: number; commission: number; payout: number; completed: number }>();
  for (const b of filteredBookings) {
    const pid  = String(b.partner_user_id || "unknown");
    const name = String(b.partner_company_name || "Unknown Partner");
    const amt  = Number(b.amount ?? 0);
    const { commAmt, payout } = calcPayout(b);
    const cur  = partnerMap.get(pid) || { name, bookings: 0, revenue: 0, commission: 0, payout: 0, completed: 0 };
    cur.bookings++;
    cur.revenue    += isFinite(amt) ? amt : 0;
    cur.commission += commAmt;
    cur.payout     += payout;
    if (String(b.booking_status || "").toLowerCase() === "completed") cur.completed++;
    partnerMap.set(pid, cur);
  }
  const partnerBreakdown = Array.from(partnerMap.values()).sort((a, b) => b.revenue - a.revenue);

  const vehicleBreakdown = Array.from(
    filteredBookings.reduce((map, r) => {
      const key = String(r.vehicle_category_name || "Unknown");
      if (!map.has(key)) map.set(key, { category: key, count: 0 });
      map.get(key)!.count++;
      return map;
    }, new Map<string, { category: string; count: number }>())
  ).map(([, v]) => v).sort((a, b) => b.count - a.count);

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];

    const fuelHeaders = [
      "Job Number", "Partner Company Name", "Legal Company Name",
      "Company Reg. No.", "VAT / NIF Number",
      "Customer", "Customer Email", "Customer Phone",
      "Pickup Address", "Dropoff Address",
      "Scheduled Pickup At", "Scheduled Dropoff At",
      "Actual Pickup Date & Time", "Actual Dropoff Date & Time", "Completed Date",
      "Vehicle", "Driver", "Driver Vehicle", "Currency",
      "Car Hire Price", "Commission Rate (%)", "Commission Amount",
      "Full Fuel Deposit",
      "Collection Fuel (Driver)", "Collection Fuel (Partner Override)",
      "Return Fuel (Driver)", "Return Fuel (Partner Override)",
      "Quarters Used", "Fuel Used Label",
      "Fuel Charge to Customer", "Fuel Refund to Customer",
      "Total Booking Amount", "Partner Payout",
      "Customer Collection Confirmed", "Customer Return Confirmed",
      "Insurance Driver Confirmed", "Insurance Customer Confirmed",
      "Booking Status", "Created At",
    ];

    const fuelRows = filteredBookings.map(b => {
      const usedQ = b.fuel_used_quarters;
      const { hire, rate, commAmt, payout } = calcPayout(b);
      const isCompleted = String(b.booking_status || "").toLowerCase() === "completed";
      return [
        b.job_number || "",
        b.partner_company_name || "",
        b.partner_legal_company_name || "",
        b.partner_company_registration_number || "",
        b.partner_vat_number || "",
        b.customer_name || "", b.customer_email || "", b.customer_phone || "",
        b.pickup_address || "", b.dropoff_address || "",
        fmtDateTime(b.pickup_at), fmtDateTime(b.dropoff_at),
        fmtDateTime(b.delivery_confirmed_at),
        fmtDateTime(b.collection_confirmed_at),
        isCompleted ? fmtDate(b.created_at) : "",
        b.vehicle_category_name || "", b.driver_name || "", b.driver_vehicle || "",
        b.currency || "EUR",
        hire, rate, commAmt,
        Number(b.fuel_price ?? 0),
        b.collection_fuel_level_driver || "—",
        b.collection_fuel_level_partner || "—",
        b.return_fuel_level_driver || "—",
        b.return_fuel_level_partner || "—",
        usedQ !== null && usedQ !== undefined ? usedQ : "—",
        usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—",
        Number(b.fuel_charge ?? 0), Number(b.fuel_refund ?? 0),
        Number(b.amount ?? 0), payout,
        b.collection_confirmed_by_customer ? "Yes" : "No",
        b.return_confirmed_by_customer ? "Yes" : "No",
        b.insurance_docs_confirmed_by_driver ? "Yes" : "No",
        b.insurance_docs_confirmed_by_customer ? "Yes" : "No",
        b.booking_status || "", fmtDate(b.created_at),
      ];
    });

    const summaryHeaders = [
      "Currency", "Total Bookings", "Completed",
      "Total Revenue", "Car Hire Revenue",
      "Camel Commission", "Partner Payout Total",
      "Fuel Deposits", "Fuel Charges Billed", "Fuel Refunds Issued",
    ];
    const summaryRows = (["EUR", "GBP", "USD"] as Currency[]).map(curr => {
      const t = revenuesByCurrency[curr];
      return [
        `${curr} ${CURRENCY_META[curr].symbol}`,
        t.count, t.completed, t.total, t.carHire,
        t.commissionTotal, t.partnerPayoutTotal,
        t.fuelDeposit, t.fuelCharge, t.fuelRefund,
      ];
    });

    const partnerHeaders = ["Partner", "Total Bookings", "Completed", "Total Revenue", "Camel Commission", "Partner Payout"];
    const partnerRows = partnerBreakdown.map(p => [p.name, p.bookings, p.completed, p.revenue, p.commission, p.payout]);

    const allHeaders = [
      "Job", "Partner", "Customer", "Status",
      "Car Hire", "Commission Rate (%)", "Commission Amount",
      "Fuel Deposit", "Fuel Used", "Fuel Charge", "Fuel Refund",
      "Total", "Partner Payout", "Insurance",
      "Currency", "Created At",
    ];
    const allRows = filteredBookings.map(b => {
      const usedQ = b.fuel_used_quarters;
      const { hire, rate, commAmt, payout } = calcPayout(b);
      return [
        b.job_number || "", b.partner_company_name || "", b.customer_name || "",
        b.booking_status || "",
        hire, rate, commAmt,
        Number(b.fuel_price ?? 0),
        usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—",
        Number(b.fuel_charge ?? 0), Number(b.fuel_refund ?? 0),
        Number(b.amount ?? 0), payout,
        b.insurance_docs_confirmed_by_driver && b.insurance_docs_confirmed_by_customer ? "Confirmed" : "Pending",
        b.currency || "EUR", fmtDate(b.created_at),
      ];
    });

    const blob = buildXls([
      { name: "Fuel Reconciliation", headers: fuelHeaders, rows: fuelRows },
      { name: "Currency Summary",    headers: summaryHeaders, rows: summaryRows },
      { name: "Partner Breakdown",   headers: partnerHeaders, rows: partnerRows },
      { name: "All Bookings",        headers: allHeaders, rows: allRows },
    ]);
    downloadBlob(blob, `camel-admin-report-${dateStr}.xls`);
  }

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <p className="text-slate-600">Loading reports...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters + Export */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Reports</h2>
            <p className="mt-1 text-sm text-slate-600">Full network-wide reconciliation including commission, fuel charges, refunds and multi-currency revenue.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#003768]">Date from</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Date to</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#003768] hover:bg-black/5">
            Clear Filters
          </button>
          <button type="button" onClick={exportExcel}
            className="rounded-full bg-[#003768] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Bookings",  value: filteredBookings.length,  color: "text-[#003768]" },
          { label: "Completed",       value: completedBookings.length, color: "text-green-600" },
          { label: "Total Requests",  value: filteredRequests.length,  color: "text-[#003768]" },
          { label: "Bids Submitted",  value: bidsSubmitted,            color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Month comparison */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: "This Month Requests",
            value: filteredRequests.filter(r => getMonthKey(r.created_at) === currentMonthKey).length,
            prev:  filteredRequests.filter(r => getMonthKey(r.created_at) === previousMonthKey).length,
          },
          {
            label: "This Month Bookings",
            value: filteredBookings.filter(r => getMonthKey(r.created_at) === currentMonthKey).length,
            prev:  filteredBookings.filter(r => getMonthKey(r.created_at) === previousMonthKey).length,
          },
          {
            label: "Open Requests",
            value: filteredRequests.filter(r => String(r.status || "").toLowerCase() === "open").length,
            prev: null,
          },
        ].map(({ label, value, prev }) => (
          <div key={label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#003768]">{value}</p>
            {prev !== null && <p className="mt-1 text-xs text-slate-400">Previous month: {prev}</p>}
          </div>
        ))}
      </div>

      {/* All Bookings — top-level view, 10 at a time */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#003768]">All Bookings</h2>
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-[#003768]">{Math.min(allBookingsVisible, filteredBookings.length)}</span> of{" "}
            <span className="font-semibold text-[#003768]">{filteredBookings.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-left text-[#003768]">
              <tr>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Car Hire</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Fuel Deposit</th>
                <th className="px-4 py-3 font-semibold">Fuel Used</th>
                <th className="px-4 py-3 font-semibold">Fuel Charge</th>
                <th className="px-4 py-3 font-semibold">Fuel Refund</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Partner Payout</th>
                <th className="px-4 py-3 font-semibold">Insurance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredBookings.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-4 text-slate-600">No bookings found.</td></tr>
              ) : filteredBookings.slice(0, allBookingsVisible).map(b => {
                const usedQ = b.fuel_used_quarters;
                const { commAmt, payout, rate } = calcPayout(b);
                return (
                  <tr key={b.id} className="hover:bg-[#f3f8ff]">
                    <td className="px-4 py-3 font-semibold text-[#003768]">{b.job_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{b.partner_company_name || "—"}</div>
                      {b.partner_vat_number && <div className="text-xs text-slate-400">{b.partner_vat_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{b.customer_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(b.booking_status)}`}>
                        {String(b.booking_status || "—").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmtAmt(b.car_hire_price, b.currency)}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-amber-700">{fmtCurr(commAmt, b.currency ?? "EUR")}</div>
                      <div className="text-xs text-slate-400">{rate}%</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmtAmt(b.fuel_price, b.currency)}</td>
                    <td className="px-4 py-3 text-slate-700">{usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-orange-700">{b.fuel_charge !== null ? fmtAmt(b.fuel_charge, b.currency) : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{b.fuel_refund !== null ? fmtAmt(b.fuel_refund, b.currency) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-[#003768]">{fmtAmt(b.amount, b.currency)}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{fmtCurr(payout, b.currency ?? "EUR")}</td>
                    <td className="px-4 py-3">{insurancePill(b.insurance_docs_confirmed_by_driver, b.insurance_docs_confirmed_by_customer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredBookings.length > allBookingsVisible && (
          <button type="button" onClick={() => setAllBookingsVisible(v => v + 10)}
            className="mt-3 w-full rounded-2xl border border-black/10 bg-slate-50 py-2.5 text-sm font-semibold text-[#003768] hover:bg-slate-100">
            ▼ Show more ({filteredBookings.length - allBookingsVisible} remaining)
          </button>
        )}
        {allBookingsVisible > 10 && filteredBookings.length <= allBookingsVisible && (
          <button type="button" onClick={() => setAllBookingsVisible(10)}
            className="mt-3 w-full rounded-2xl border border-black/10 bg-slate-50 py-2.5 text-sm font-semibold text-[#003768] hover:bg-slate-100">
            ▲ Show less
          </button>
        )}
      </div>

      {/* Per-currency fuel reconciliation sections */}
      {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
        const t = revenuesByCurrency[curr];
        if (t.count === 0) return null;
        const currBookings = filteredBookings.filter(b => (b.currency ?? "EUR") === curr);
        return <AdminCurrencySection key={curr} curr={curr} t={t} bookings={currBookings} />;
      })}

      {/* Partner breakdown */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">Partner Breakdown</h2>
        <p className="mt-1 text-sm text-slate-500">Revenue, commission and payout performance by partner.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-left text-[#003768]">
              <tr>
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Bookings</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Total Revenue</th>
                <th className="px-4 py-3 font-semibold">Camel Commission</th>
                <th className="px-4 py-3 font-semibold">Partner Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {partnerBreakdown.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-slate-600">No partner data.</td></tr>
              ) : partnerBreakdown.map((p, i) => (
                <tr key={i} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-700">{p.bookings}</td>
                  <td className="px-4 py-3 text-slate-700">{p.completed}</td>
                  <td className="px-4 py-3 font-semibold text-[#003768]">{p.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{p.commission.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{p.payout.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle breakdown */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">Vehicle Category Breakdown</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-left text-[#003768]">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle Category</th>
                <th className="px-4 py-3 font-semibold">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {vehicleBreakdown.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-4 text-slate-600">No data.</td></tr>
              ) : vehicleBreakdown.map(r => (
                <tr key={r.category} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.category}</td>
                  <td className="px-4 py-3 text-slate-700">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}