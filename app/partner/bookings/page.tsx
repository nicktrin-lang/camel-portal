"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; currency: Currency | null;
  notes: string | null; created_at: string; job_number: number | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  delivery_confirmed_at: string | null;
  collection_confirmed_at: string | null;
  partner_company_name: string | null; partner_company_phone: string | null;
  partner_legal_company_name: string | null;
  partner_vat_number: string | null;
  partner_company_registration_number: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  vehicle_category_name: string | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  request_status: string | null;
  car_hire_price: number | null;
  fuel_price: number | null;
  fuel_charge: number | null;
  fuel_refund: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  partner_payout_amount: number | null;
};

type ApiResponse = { data: BookingRow[]; role: string | null; adminMode: boolean };

const FILTERS = [
  { value: "all",             label: "All" },
  { value: "confirmed",       label: "Confirmed" },
  { value: "driver_assigned", label: "Driver Assigned" },
  { value: "collected",       label: "On Hire" },
  { value: "completed",       label: "Completed" },
  { value: "cancelled",       label: "Cancelled" },
];

const CURRENCY_CONFIG: Record<Currency, { locale: string; label: string }> = {
  EUR: { locale: "es-ES", label: "EUR €" },
  GBP: { locale: "en-GB", label: "GBP £" },
  USD: { locale: "en-US", label: "USD $" },
};

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function fmtDate(v?: string | null) {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString(); } catch { return v; }
}

function fmtDuration(m?: number | null) {
  if (!m) return "—";
  const mpd = 24 * 60;
  if (m >= mpd) { const d = Math.ceil(m / mpd); return `${d} day${d === 1 ? "" : "s"}`; }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function fmtAmount(amount: number | null, currency: Currency | null) {
  if (amount == null || isNaN(amount)) return "—";
  const curr = currency ?? "EUR";
  const { locale } = CURRENCY_CONFIG[curr];
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
}

function statusPill(status?: string | null) {
  const map: Record<string, string> = {
    confirmed:       "border-blue-200 bg-blue-50 text-blue-700",
    driver_assigned: "border-amber-200 bg-amber-50 text-amber-700",
    en_route:        "border-indigo-200 bg-indigo-50 text-indigo-700",
    arrived:         "border-purple-200 bg-purple-50 text-purple-700",
    collected:       "border-blue-200 bg-blue-50 text-blue-700",
    returned:        "border-blue-200 bg-blue-50 text-blue-700",
    completed:       "border-green-200 bg-green-50 text-green-700",
    cancelled:       "border-red-200 bg-red-50 text-red-700",
  };
  return map[status ?? ""] ?? "border-black/10 bg-white text-slate-700";
}

function fmtStatus(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "collected": case "returned": return "On Hire";
    case "driver_assigned": return "Driver assigned";
    case "en_route": return "En route";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s || "—").replaceAll("_", " ");
  }
}

function norm(v: unknown) { return String(v || "").toLowerCase().trim(); }

function revenuesByCurrency(rows: BookingRow[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { EUR: 0, GBP: 0, USD: 0 };
  for (const r of rows) {
    const curr: Currency = (r.currency as Currency) ?? "EUR";
    const amt = Number(r.amount ?? 0);
    if (isFinite(amt)) totals[curr] += amt;
  }
  return totals;
}

// ── Excel Export (matches partner reports format) ─────────────────────────────

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

function fmtDateOnly(v?: string | null) {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString(); } catch { return v; }
}

function fmtDateTimeStr(v?: string | null) {
  if (!v) return "";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function downloadExcel(rows: BookingRow[]) {
  const dateStr = new Date().toISOString().split("T")[0];

  const fuelHeaders = [
    "Job No.", "Company Name", "Legal Company Name", "Company Reg. No.", "VAT / NIF Number",
    "Customer", "Customer Email", "Customer Phone",
    "Status", "Driver", "Vehicle",
    "Pickup Address", "Dropoff Address",
    "Scheduled Pickup At", "Scheduled Dropoff At",
    "Actual Pickup Date & Time", "Actual Dropoff Date & Time", "Completed Date",
    "Duration",
    "Currency", "Car Hire Price", "Commission Rate (%)", "Commission Amount",
    "Fuel Deposit", "Fuel Charge", "Fuel Refund",
    "Total Amount", "Your Payout",
    "Created At",
  ];

  const fuelRows = rows.map(r => {
    const hire    = r.car_hire_price ?? 0;
    const rate    = r.commission_rate ?? 20;
    const commAmt = r.commission_amount ?? Math.max((hire * rate) / 100, 10);
    const payout  = r.partner_payout_amount ?? Math.max(0, hire - commAmt);
    const netPayout = payout + Number(r.fuel_charge ?? 0);
    const isCompleted = String(r.booking_status || "").toLowerCase() === "completed";
    return [
      r.job_number ?? "",
      r.partner_company_name ?? "",
      r.partner_legal_company_name ?? "",
      r.partner_company_registration_number ?? "",
      r.partner_vat_number ?? "",
      r.customer_name ?? "",
      r.customer_email ?? "",
      r.customer_phone ?? "",
      r.booking_status ?? "",
      r.driver_name ?? "",
      r.vehicle_category_name ?? "",
      r.pickup_address ?? "",
      r.dropoff_address ?? "",
      fmtDateTimeStr(r.pickup_at),
      fmtDateTimeStr(r.dropoff_at),
      fmtDateTimeStr(r.delivery_confirmed_at),    // actual pickup = driver confirmed delivery
      fmtDateTimeStr(r.collection_confirmed_at),  // actual dropoff = driver confirmed return
      isCompleted ? fmtDateOnly(r.created_at) : "",
      fmtDuration(r.journey_duration_minutes),
      r.currency ?? "EUR",
      hire,
      rate,
      commAmt,
      r.fuel_price ?? "",
      r.fuel_charge ?? "",
      r.fuel_refund ?? "",
      r.amount ?? "",
      netPayout,
      fmtDateTimeStr(r.created_at),
    ];
  });

  const summaryHeaders = [
    "Currency", "Total Bookings", "Completed",
    "Total Revenue", "Car Hire Revenue",
    "Camel Commission (deducted)", "Fuel Deposits Collected",
    "Fuel Charges Billed", "Fuel Refunds Issued",
    "Your Net Payout",
  ];
  const summaryByCurr: Record<Currency, { count: number; completed: number; total: number; carHire: number; comm: number; fuelDep: number; fuelCharge: number; fuelRefund: number; payout: number }> = {
    EUR: { count: 0, completed: 0, total: 0, carHire: 0, comm: 0, fuelDep: 0, fuelCharge: 0, fuelRefund: 0, payout: 0 },
    GBP: { count: 0, completed: 0, total: 0, carHire: 0, comm: 0, fuelDep: 0, fuelCharge: 0, fuelRefund: 0, payout: 0 },
    USD: { count: 0, completed: 0, total: 0, carHire: 0, comm: 0, fuelDep: 0, fuelCharge: 0, fuelRefund: 0, payout: 0 },
  };
  for (const r of rows) {
    const c = (r.currency ?? "EUR") as Currency;
    const hire    = r.car_hire_price ?? 0;
    const rate    = r.commission_rate ?? 20;
    const commAmt = r.commission_amount ?? Math.max((hire * rate) / 100, 10);
    const payout  = r.partner_payout_amount ?? Math.max(0, hire - commAmt);
    summaryByCurr[c].count++;
    summaryByCurr[c].total      += Number(r.amount ?? 0);
    summaryByCurr[c].carHire    += hire;
    summaryByCurr[c].comm       += commAmt;
    summaryByCurr[c].fuelDep    += Number(r.fuel_price ?? 0);
    summaryByCurr[c].fuelCharge += Number(r.fuel_charge ?? 0);
    summaryByCurr[c].fuelRefund += Number(r.fuel_refund ?? 0);
    summaryByCurr[c].payout     += payout + Number(r.fuel_charge ?? 0);
    if (String(r.booking_status || "").toLowerCase() === "completed") summaryByCurr[c].completed++;
  }
  const summaryRows = (["EUR", "GBP", "USD"] as Currency[]).map(c => {
    const t = summaryByCurr[c];
    return [`${c} ${CURRENCY_CONFIG[c].label}`, t.count, t.completed, t.total, t.carHire, t.comm, t.fuelDep, t.fuelCharge, t.fuelRefund, t.payout];
  });

  const allHeaders = [
    "Job No.", "Customer", "Pickup", "Dropoff",
    "Scheduled Pickup At", "Actual Pickup Date & Time", "Actual Dropoff Date & Time", "Completed Date",
    "Vehicle", "Driver", "Status", "Currency",
    "Car Hire", "Commission Rate (%)", "Commission Amount",
    "Fuel Charge", "Total Amount", "Your Payout", "Created At",
  ];
  const allRows = rows.map(r => {
    const hire    = r.car_hire_price ?? 0;
    const rate    = r.commission_rate ?? 20;
    const commAmt = r.commission_amount ?? Math.max((hire * rate) / 100, 10);
    const payout  = r.partner_payout_amount ?? Math.max(0, hire - commAmt);
    const isCompleted = String(r.booking_status || "").toLowerCase() === "completed";
    return [
      r.job_number ?? "", r.customer_name ?? "",
      r.pickup_address ?? "", r.dropoff_address ?? "",
      fmtDateTimeStr(r.pickup_at),
      fmtDateTimeStr(r.delivery_confirmed_at),
      fmtDateTimeStr(r.collection_confirmed_at),
      isCompleted ? fmtDateOnly(r.created_at) : "",
      r.vehicle_category_name ?? "", r.driver_name ?? "",
      r.booking_status ?? "", r.currency ?? "EUR",
      hire, rate, commAmt,
      Number(r.fuel_charge ?? 0),
      Number(r.amount ?? 0),
      payout + Number(r.fuel_charge ?? 0),
      fmtDateTimeStr(r.created_at),
    ];
  });

  const blob = buildXls([
    { name: "Booking Detail",   headers: fuelHeaders,   rows: fuelRows   },
    { name: "Currency Summary", headers: summaryHeaders, rows: summaryRows },
    { name: "All Bookings",     headers: allHeaders,    rows: allRows    },
  ]);
  downloadBlob(blob, `camel-bookings-${dateStr}.xls`);
}

const PAGE_SIZE = 10;

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load.");
      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) { setError(e?.message || "Failed to load."); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search, dateFrom, dateTo]);

  const q = norm(search);

  const filtered = useMemo(() => rows.filter(row => {
    if (filter !== "all" && row.booking_status !== filter) return false;
    if (dateFrom && row.created_at && new Date(row.created_at) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && row.created_at && new Date(row.created_at) > new Date(`${dateTo}T23:59:59.999`)) return false;
    if (!q) return true;
    return [row.job_number, row.partner_company_name, row.customer_name, row.driver_name,
      row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.booking_status]
      .map(norm).join(" ").includes(q);
  }), [rows, filter, q, dateFrom, dateTo]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const revenues = revenuesByCurrency(filtered);
  const completed = filtered.filter(r => r.booking_status === "completed").length;
  const active = filtered.filter(r => ["confirmed", "driver_assigned", "en_route", "arrived", "collected", "returned"].includes(r.booking_status ?? "")).length;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Header + Filters */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#003768]">Bookings</h1>
            <p className="mt-2 text-slate-600">
              {adminMode ? "All bookings across the network." : "Bookings assigned to your partner account. Click any row to view detail."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search job, customer, driver..."
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]" />
              <span className="text-slate-400">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]" />
            </div>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
              Clear
            </button>
            <button type="button" onClick={load}
              className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              Refresh
            </button>
            <button type="button" onClick={() => downloadExcel(filtered)}
              className="rounded-full bg-[#003768] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              ⬇ Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Total Bookings</p>
          <p className="mt-2 text-2xl font-semibold text-[#003768]">{filtered.length}</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{active}</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">{completed}</p>
        </div>
        {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
          const amt = revenues[curr];
          const { locale, label } = CURRENCY_CONFIG[curr];
          const formatted = new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 2 }).format(amt);
          return (
            <div key={curr} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium text-slate-500">Revenue ({label})</p>
              <p className={`mt-2 text-2xl font-semibold ${amt > 0 ? "text-[#003768]" : "text-slate-300"}`}>{formatted}</p>
            </div>
          );
        })}
      </div>

      {/* Currency Breakdown Table */}
      {Object.values(revenues).filter(v => v > 0).length > 1 && (
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-semibold text-[#003768]">Revenue by Currency</h2>
          <p className="mt-1 text-sm text-slate-500">Breakdown of bookings and revenue per currency for reconciliation.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Currency</th>
                  <th className="px-4 py-3 font-semibold">Bookings</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Total Revenue</th>
                  <th className="px-4 py-3 font-semibold">Avg per Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
                  const currRows = filtered.filter(r => (r.currency ?? "EUR") === curr);
                  if (currRows.length === 0) return null;
                  const total = revenues[curr];
                  const completedCount = currRows.filter(r => r.booking_status === "completed").length;
                  const avg = currRows.length > 0 ? total / currRows.length : 0;
                  const { locale, label } = CURRENCY_CONFIG[curr];
                  const fmtC = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);
                  return (
                    <tr key={curr}>
                      <td className="px-4 py-3 font-semibold text-[#003768]">{label}</td>
                      <td className="px-4 py-3 text-slate-700">{currRows.length}</td>
                      <td className="px-4 py-3 text-slate-700">{completedCount}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{fmtC(total)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmtC(avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-600">No bookings found.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-[#003768]">{Math.min(visibleCount, filtered.length)}</span> of{" "}
                <span className="font-semibold text-[#003768]">{filtered.length}</span> bookings
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f8ff] text-left text-[#003768]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Job No.</th>
                    {adminMode && <th className="px-4 py-3 font-semibold">Partner</th>}
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Driver</th>
                    <th className="px-4 py-3 font-semibold">Pickup</th>
                    <th className="px-4 py-3 font-semibold">Pickup Time</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Currency</th>
                    <th className="px-4 py-3 font-semibold">Car Hire</th>
                    <th className="px-4 py-3 font-semibold">Commission</th>
                    <th className="px-4 py-3 font-semibold">Fuel Charge</th>
                    <th className="px-4 py-3 font-semibold">Fuel Refund</th>
                    <th className="px-4 py-3 font-semibold">Your Payout</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {visible.map(row => {
                    const rate = row.commission_rate ?? 20;
                    const hire = row.car_hire_price ?? 0;
                    const commAmt = row.commission_amount ?? Math.max((hire * rate) / 100, 10);
                    const payout = row.partner_payout_amount ?? Math.max(0, hire - commAmt);
                    return (
                      <tr key={row.id}
                        onClick={() => router.push(`/partner/bookings/${row.id}`)}
                        className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                        <td className="px-4 py-4 font-bold text-[#003768]">{row.job_number ?? "—"}</td>
                        {adminMode && <td className="px-4 py-4 text-slate-700">{row.partner_company_name || "—"}</td>}
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{row.customer_name || "—"}</div>
                          <div className="text-xs text-slate-400">{row.customer_phone || row.customer_email || ""}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(row.booking_status)}`}>
                            {fmtStatus(row.booking_status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{row.driver_name || "—"}</td>
                        <td className="px-4 py-4 max-w-[160px] truncate text-slate-700">{row.pickup_address || "—"}</td>
                        <td className="px-4 py-4 text-slate-700">{fmt(row.pickup_at)}</td>
                        <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "—"}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-black/10 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {row.currency ?? "EUR"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{fmtAmount(row.car_hire_price, row.currency)}</td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-amber-700 font-semibold">{fmtAmount(commAmt, row.currency)}</div>
                          <div className="text-xs text-slate-400">{rate}%</div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-green-700">{fmtAmount(payout, row.currency)}</td>
                        <td className="px-4 py-4 text-slate-700">{fmt(row.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="mt-4 w-full rounded-2xl border border-black/10 bg-slate-50 py-3 text-sm font-semibold text-[#003768] hover:bg-slate-100">
                ▼ Show more ({filtered.length - visibleCount} remaining)
              </button>
            )}
            {visibleCount > PAGE_SIZE && !hasMore && (
              <button type="button" onClick={() => setVisibleCount(PAGE_SIZE)}
                className="mt-4 w-full rounded-2xl border border-black/10 bg-slate-50 py-3 text-sm font-semibold text-[#003768] hover:bg-slate-100">
                ▲ Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}