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
  booking_status: string | null;
  amount: number | string | null;
  currency: Currency | null;
  car_hire_price: number | null;
  fuel_price: number | null;
  fuel_used_quarters: number | null;
  fuel_charge: number | null;
  fuel_refund: number | null;
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  vehicle_category_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  driver_name: string | null;
  driver_vehicle: string | null;
  collection_fuel_level_driver: string | null;
  collection_fuel_level_partner: string | null;
  return_fuel_level_driver: string | null;
  return_fuel_level_partner: string | null;
  collection_confirmed_by_customer: boolean;
  return_confirmed_by_customer: boolean;
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
    case "collected": case "returned": return "border-blue-200 bg-blue-50 text-blue-700";
    case "driver_assigned": case "en_route": case "arrived": return "border-amber-200 bg-amber-50 text-amber-800";
    case "cancelled": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-black/10 bg-white text-slate-700";
  }
}

function fmtStatus(value?: string | null) {
  switch (String(value || "").toLowerCase()) {
    case "confirmed": return "Confirmed";
    case "driver_assigned": return "Driver assigned";
    case "en_route": return "En route";
    case "arrived": return "Arrived";
    case "collected": return "On hire";
    case "returned": return "Returned";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(value || "—").replaceAll("_", " ");
  }
}

function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function revenuesByCurrency(rows: BookingRow[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { EUR: 0, GBP: 0, USD: 0 };
  for (const r of rows) {
    const curr: Currency = (r.currency as Currency) ?? "EUR";
    const amt = Number(r.amount ?? 0);
    if (isFinite(amt)) totals[curr] += amt;
  }
  return totals;
}

// ── Excel export ──────────────────────────────────────────────────────────────

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

const PAGE_SIZE = 10;

// ── Currency Section Component ────────────────────────────────────────────────

type CurrencyTotals = { total: number; carHire: number; fuelCharge: number; fuelRefund: number; count: number; completed: number };

function AdminCurrencySection({ curr, t, bookings, router }: {
  curr: Currency; t: CurrencyTotals; bookings: BookingRow[]; router: any;
}) {
  const [showAll, setShowAll] = useState(false);
  const { symbol } = CURRENCY_CONFIG[curr];
  const visible = showAll ? bookings : bookings.slice(0, PAGE_SIZE);

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#003768]/10 px-3 py-1 text-sm font-bold text-[#003768]">{symbol}</span>
        <h2 className="text-xl font-semibold text-[#003768]">Revenue &amp; Fuel Reconciliation</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Bookings", value: t.count, isMoney: false },
          { label: "Completed", value: t.completed, isMoney: false },
          { label: "Total Revenue", value: t.total, isMoney: true },
          { label: "Car Hire Revenue", value: t.carHire, isMoney: true },
          { label: "Fuel Charged", value: t.fuelCharge, isMoney: true },
          { label: "Net Revenue to Partner", value: t.carHire + t.fuelCharge, isMoney: true },
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
              <th className="px-4 py-3 font-semibold">Fuel Deposit</th>
              <th className="px-4 py-3 font-semibold">Fuel Used</th>
              <th className="px-4 py-3 font-semibold">Fuel Charge</th>
              <th className="px-4 py-3 font-semibold">Fuel Refund</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Net Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map(b => {
              const usedQ = b.fuel_used_quarters;
              const netRev = Number(b.car_hire_price ?? 0) + Number(b.fuel_charge ?? 0);
              return (
                <tr key={b.id} onClick={() => router.push(`/admin/bookings/${b.id}`)} className="cursor-pointer hover:bg-[#f3f8ff]">
                  <td className="px-4 py-3 font-semibold text-[#003768]">{b.job_number || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{b.partner_company_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{b.customer_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(b.booking_status)}`}>
                      {fmtStatus(b.booking_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmtAmt(b.car_hire_price, curr)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtAmt(b.fuel_price, curr)}</td>
                  <td className="px-4 py-3 text-slate-700">{usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-orange-700">{b.fuel_charge !== null ? fmtAmt(b.fuel_charge, curr) : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{b.fuel_refund !== null ? fmtAmt(b.fuel_refund, curr) : "—"}</td>
                  <td className="px-4 py-3 font-bold text-[#003768]">{fmtAmt(b.amount, curr)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{fmtCurr(netRev, curr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bookings.length > PAGE_SIZE && (
        <button type="button" onClick={() => setShowAll(s => !s)}
          className="mt-3 w-full rounded-2xl border border-black/10 bg-slate-50 py-2.5 text-sm font-semibold text-[#003768] hover:bg-slate-100">
          {showAll ? "▲ Show less" : `▼ Show all ${bookings.length} bookings`}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | Currency>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes = await fetch("/api/admin/is-admin", { cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const res = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
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
      EUR: { total: 0, carHire: 0, fuelCharge: 0, fuelRefund: 0, count: 0, completed: 0 },
      GBP: { total: 0, carHire: 0, fuelCharge: 0, fuelRefund: 0, count: 0, completed: 0 },
      USD: { total: 0, carHire: 0, fuelCharge: 0, fuelRefund: 0, count: 0, completed: 0 },
    };
    for (const b of filtered) {
      const c: Currency = (b.currency as Currency) ?? "EUR";
      if (!t[c]) continue;
      t[c].count++;
      t[c].total += Number(b.amount ?? 0);
      t[c].carHire += Number(b.car_hire_price ?? 0);
      t[c].fuelCharge += Number(b.fuel_charge ?? 0);
      t[c].fuelRefund += Number(b.fuel_refund ?? 0);
      if (String(b.booking_status || "").toLowerCase() === "completed") t[c].completed++;
    }
    return t;
  }, [filtered]);

  const completed = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "completed").length;
  const confirmed = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "confirmed").length;
  const active = filtered.filter(r => ["driver_assigned", "en_route", "arrived", "collected", "returned"].includes(String(r.booking_status || "").toLowerCase())).length;
  const statusOptions = Array.from(new Set(bookings.map(r => String(r.booking_status || "").toLowerCase()).filter(Boolean))).sort();

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const fuelHeaders = [
      "Job Number", "Partner", "Customer", "Customer Email", "Customer Phone",
      "Pickup Address", "Dropoff Address", "Pickup At", "Dropoff At",
      "Vehicle", "Driver", "Driver Vehicle", "Currency",
      "Car Hire Price", "Full Fuel Deposit",
      "Collection Fuel (Driver)", "Collection Fuel (Partner Override)",
      "Return Fuel (Driver)", "Return Fuel (Partner Override)",
      "Quarters Used", "Fuel Used Label",
      "Fuel Charge to Customer", "Fuel Refund to Customer",
      "Total Booking Amount", "Net Revenue to Partner (Car Hire + Fuel Charge)",
      "Customer Collection Confirmed", "Customer Return Confirmed",
      "Booking Status", "Created At",
    ];
    const fuelRows = filtered.map(b => {
      const usedQ = b.fuel_used_quarters;
      return [
        b.job_number || "", b.partner_company_name || "",
        b.customer_name || "", b.customer_email || "", b.customer_phone || "",
        b.pickup_address || "", b.dropoff_address || "",
        fmtDate(b.pickup_at), fmtDate(b.dropoff_at),
        b.vehicle_category_name || "", b.driver_name || "", b.driver_vehicle || "",
        b.currency || "EUR",
        Number(b.car_hire_price ?? 0), Number(b.fuel_price ?? 0),
        b.collection_fuel_level_driver || b.collection_fuel_level_partner || "—",
        b.collection_fuel_level_partner || "—",
        b.return_fuel_level_driver || b.return_fuel_level_partner || "—",
        b.return_fuel_level_partner || "—",
        usedQ !== null && usedQ !== undefined ? usedQ : "—",
        usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—",
        Number(b.fuel_charge ?? 0), Number(b.fuel_refund ?? 0),
        Number(b.amount ?? 0),
        Number(b.car_hire_price ?? 0) + Number(b.fuel_charge ?? 0),
        b.collection_confirmed_by_customer ? "Yes" : "No",
        b.return_confirmed_by_customer ? "Yes" : "No",
        b.booking_status || "", fmtDate(b.created_at),
      ];
    });

    const summaryHeaders = ["Currency", "Total Bookings", "Completed", "Total Revenue", "Car Hire Revenue", "Fuel Charges Billed", "Fuel Refunds Issued", "Net Revenue to Partner"];
    const summaryRows = (["EUR", "GBP", "USD"] as Currency[]).map(curr => {
      const t = currencyTotals[curr];
      return [`${curr} ${CURRENCY_CONFIG[curr].symbol}`, t.count, t.completed, t.total, t.carHire, t.fuelCharge, t.fuelRefund, t.carHire + t.fuelCharge];
    });

    const allHeaders = ["Job Number", "Partner", "Customer", "Pickup", "Dropoff", "Pickup At", "Vehicle", "Driver", "Status", "Currency", "Amount", "Net Revenue to Partner", "Created At"];
    const allRows = filtered.map(b => [
      b.job_number || "", b.partner_company_name || "", b.customer_name || "",
      b.pickup_address || "", b.dropoff_address || "",
      fmtDate(b.pickup_at), b.vehicle_category_name || "", b.driver_name || "",
      b.booking_status || "", b.currency || "EUR", Number(b.amount ?? 0),
      Number(b.car_hire_price ?? 0) + Number(b.fuel_charge ?? 0),
      fmtDate(b.created_at),
    ]);

    const blob = buildXls([
      { name: "Fuel Reconciliation", headers: fuelHeaders, rows: fuelRows },
      { name: "Currency Summary", headers: summaryHeaders, rows: summaryRows },
      { name: "All Bookings", headers: allHeaders, rows: allRows },
    ]);
    downloadBlob(blob, `camel-admin-bookings-${dateStr}.xls`);
  }

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <p className="text-slate-600">Loading bookings...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">All Bookings</h2>
            <p className="mt-1 text-sm text-slate-600">All bookings across all partner accounts. Click any row to view detail.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm font-medium text-[#003768]">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Job, partner, customer…"
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm text-black outline-none focus:border-[#0f4f8a]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm text-black outline-none focus:border-[#0f4f8a]">
                <option value="all">All statuses</option>
                {statusOptions.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Currency</label>
              <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value as "all" | Currency)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm text-black outline-none focus:border-[#0f4f8a]">
                <option value="all">All currencies</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
                <option value="USD">USD $</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Date from</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm text-black outline-none focus:border-[#0f4f8a]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Date to</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm text-black outline-none focus:border-[#0f4f8a]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); setStatusFilter("all"); setCurrencyFilter("all"); }}
            className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5">
            Clear Filters
          </button>
          <button type="button" onClick={load}
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
            Refresh
          </button>
          <button type="button" onClick={exportExcel}
            className="rounded-full bg-[#003768] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Bookings", value: filtered.length, color: "text-[#003768]" },
          { label: "Confirmed", value: confirmed, color: "text-green-600" },
          { label: "Active", value: active, color: "text-amber-600" },
          { label: "Completed", value: completed, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
        {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
          const amt = revenuesByCurr[curr];
          const { locale, label, symbol } = CURRENCY_CONFIG[curr];
          const formatted = new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(amt);
          return (
            <div key={curr} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-medium text-slate-500">Revenue {symbol} {label}</p>
              <p className={`mt-2 text-2xl font-semibold ${amt > 0 ? "text-[#003768]" : "text-slate-300"}`}>{formatted}</p>
            </div>
          );
        })}
      </div>

      {/* Per-currency fuel reconciliation sections */}
      {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
        const t = currencyTotals[curr];
        if (t.count === 0) return null;
        const currBookings = filtered.filter(b => (b.currency ?? "EUR") === curr);
        return <AdminCurrencySection key={curr} curr={curr} t={t} bookings={currBookings} router={router} />;
      })}

      {/* Full bookings table */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#003768]">All Bookings</h2>
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-[#003768]">{Math.min(visibleCount, filtered.length)}</span> of <span className="font-semibold text-[#003768]">{filtered.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-[#003768]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-left font-semibold">Job No.</th>
                <th className="px-4 py-3 text-left font-semibold">Partner</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup</th>
                <th className="px-4 py-3 text-left font-semibold">Dropoff</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup At</th>
                <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Currency</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-4 text-slate-600">No bookings found.</td></tr>
              ) : visible.map(row => (
                <tr key={row.id} onClick={() => router.push(`/admin/bookings/${row.id}`)} className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                  <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.created_at)}</td>
                  <td className="px-4 py-4 font-semibold text-[#003768]">{row.job_number || "—"}</td>
                  <td className="px-4 py-4 text-slate-700">{row.partner_company_name || "—"}</td>
                  <td className="px-4 py-4 text-slate-700">
                    <div>{row.customer_name || "—"}</div>
                    <div className="text-xs text-slate-400">{row.customer_phone || ""}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.pickup_address || "—"}</td>
                  <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.dropoff_address || "—"}</td>
                  <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.pickup_at)}</td>
                  <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "—"}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClasses(row.booking_status)}`}>
                      {fmtStatus(row.booking_status)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-black/10 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {row.currency ?? "EUR"}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">{fmtAmt(row.amount, row.currency)}</td>
                </tr>
              ))}
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
      </div>
    </div>
  );
}