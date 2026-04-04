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
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  vehicle_category_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
};

const CURRENCY_CONFIG: Record<Currency, { locale: string; label: string; symbol: string }> = {
  EUR: { locale: "es-ES", label: "EUR", symbol: "€" },
  GBP: { locale: "en-GB", label: "GBP", symbol: "£" },
  USD: { locale: "en-US", label: "USD", symbol: "$" },
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function fmtAmount(amount: number | string | null, currency: Currency | null) {
  const amt = Number(amount ?? 0);
  if (!isFinite(amt)) return "—";
  const curr = currency ?? "EUR";
  const { locale } = CURRENCY_CONFIG[curr];
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 2 }).format(amt);
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

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = bookings.filter(row => {
    if (dateFrom || dateTo) {
      if (!matchesDateRange(row.created_at, dateFrom, dateTo)) return false;
    }
    if (statusFilter !== "all" && String(row.booking_status || "").toLowerCase() !== statusFilter) return false;
    if (currencyFilter !== "all" && (row.currency ?? "EUR") !== currencyFilter) return false;
    if (!normalizedSearch) return true;
    return [row.job_number, row.partner_company_name, row.pickup_address,
      row.dropoff_address, row.vehicle_category_name, row.booking_status, row.amount, row.customer_name]
      .map(v => String(v || "").toLowerCase()).join(" ").includes(normalizedSearch);
  });

  const sorted = [...filtered].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const revenues = revenuesByCurrency(filtered);
  const completed = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "completed").length;
  const confirmed = filtered.filter(r => String(r.booking_status || "").toLowerCase() === "confirmed").length;
  const active = filtered.filter(r => ["driver_assigned", "en_route", "arrived", "collected", "returned"].includes(String(r.booking_status || "").toLowerCase())).length;

  const statusOptions = Array.from(new Set(
    bookings.map(r => String(r.booking_status || "").toLowerCase()).filter(Boolean)
  )).sort();

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
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Job, partner, customer…"
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
          const amt = revenues[curr];
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

      {/* Per-Currency Breakdown Table */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">Revenue by Currency</h2>
        <p className="mt-1 text-sm text-slate-500">Full breakdown for reconciliation and dispute resolution.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-left text-[#003768]">
              <tr>
                <th className="px-4 py-3 font-semibold">Currency</th>
                <th className="px-4 py-3 font-semibold">Total Bookings</th>
                <th className="px-4 py-3 font-semibold">Confirmed</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Cancelled</th>
                <th className="px-4 py-3 font-semibold">Total Revenue</th>
                <th className="px-4 py-3 font-semibold">Completed Revenue</th>
                <th className="px-4 py-3 font-semibold">Avg per Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
                const currRows = filtered.filter(r => (r.currency ?? "EUR") === curr);
                const { locale, label, symbol } = CURRENCY_CONFIG[curr];
                const fmtC = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);
                const total = revenues[curr];
                const completedRows = currRows.filter(r => String(r.booking_status || "").toLowerCase() === "completed");
                const completedRevenue = completedRows.reduce((sum, r) => sum + (isFinite(Number(r.amount)) ? Number(r.amount) : 0), 0);
                const activeCount = currRows.filter(r => ["driver_assigned", "en_route", "arrived", "collected", "returned"].includes(String(r.booking_status || "").toLowerCase())).length;
                const cancelledCount = currRows.filter(r => String(r.booking_status || "").toLowerCase() === "cancelled").length;
                const confirmedCount = currRows.filter(r => String(r.booking_status || "").toLowerCase() === "confirmed").length;
                const avg = currRows.length > 0 ? total / currRows.length : 0;
                return (
                  <tr key={curr} className={currRows.length === 0 ? "opacity-40" : ""}>
                    <td className="px-4 py-3 font-semibold text-[#003768]">{symbol} {label}</td>
                    <td className="px-4 py-3 text-slate-700">{currRows.length}</td>
                    <td className="px-4 py-3 text-green-700">{confirmedCount}</td>
                    <td className="px-4 py-3 text-amber-700">{activeCount}</td>
                    <td className="px-4 py-3 text-blue-700">{completedRows.length}</td>
                    <td className="px-4 py-3 text-red-600">{cancelledCount}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmtC(total)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmtC(completedRevenue)}</td>
                    <td className="px-4 py-3 text-slate-700">{currRows.length > 0 ? fmtC(avg) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">All Bookings ({sorted.length})</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
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
                {sorted.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-4 text-slate-600">No bookings found.</td></tr>
                ) : sorted.map(row => (
                  <tr key={row.id}
                    onClick={() => router.push(`/admin/bookings/${row.id}`)}
                    className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
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
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {fmtAmount(row.amount, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}