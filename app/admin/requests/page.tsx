"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminRequestRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number;
  suitcases: number;
  hand_luggage: number;
  vehicle_category_name: string | null;
  status: string;
  created_at: string;
  bid_count: number;
  has_accepted_bid: boolean;
};

const PAGE_SIZE = 10;

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function fmtDate(value?: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const mpd = 24 * 60;
  if (minutes >= mpd) { const d = Math.ceil(minutes / mpd); return `${d} day${d === 1 ? "" : "s"}`; }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function statusPillClasses(status: string, hasAccepted: boolean) {
  if (hasAccepted || status === "confirmed" || status === "booked") return "border-green-200 bg-green-50 text-green-700";
  if (status === "open") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "expired" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-slate-700";
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

export default function AdminRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/requests", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load requests.");
      setRows((json?.data || []) as AdminRequestRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, statusFilter, dateFrom, dateTo]);

  const normalizedSearch = search.trim().toLowerCase();
  const statusOptions = Array.from(new Set(rows.map(r => r.status).filter(Boolean))).sort();

  const filtered = rows.filter(row => {
    if (dateFrom && new Date(row.created_at) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(row.created_at) > new Date(`${dateTo}T23:59:59.999`)) return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [row.customer_name, row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.status]
      .map(v => String(v || "").toLowerCase()).join(" ").includes(normalizedSearch);
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const totalOpen = filtered.filter(r => r.status === "open").length;
  const totalConfirmed = filtered.filter(r => r.status === "confirmed").length;
  const totalExpired = filtered.filter(r => r.status === "expired").length;

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const headers = [
      "Created At", "Customer", "Customer Email",
      "Pickup Address", "Dropoff Address", "Pickup At", "Dropoff At",
      "Duration", "Passengers", "Suitcases", "Hand Luggage",
      "Vehicle Category", "Bid Count", "Has Accepted Bid", "Status",
    ];
    const rows = filtered.map(r => [
      fmtDate(r.created_at), r.customer_name || "", r.customer_email || "",
      r.pickup_address || "", r.dropoff_address || "",
      fmtDate(r.pickup_at), fmtDate(r.dropoff_at),
      fmtDuration(r.journey_duration_minutes),
      r.passengers, r.suitcases, r.hand_luggage,
      r.vehicle_category_name || "",
      r.bid_count, r.has_accepted_bid ? "Yes" : "No", r.status,
    ]);
    const blob = buildXls([{ name: "Requests", headers, rows }]);
    downloadBlob(blob, `camel-admin-requests-${dateStr}.xls`);
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Requests</h2>
            <p className="mt-1 text-sm text-slate-600">All customer requests across the network. Click any row to view detail.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-[#003768]">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Customer, address…"
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]">
                <option value="all">All statuses</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Date from</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Date to</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-sm outline-none focus:border-[#0f4f8a]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}
            className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5">
            Clear Filters
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" onClick={exportExcel}
            className="rounded-full bg-[#003768] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: filtered.length, color: "text-[#003768]" },
          { label: "Open", value: totalOpen, color: "text-amber-600" },
          { label: "Confirmed", value: totalConfirmed, color: "text-green-600" },
          { label: "Expired", value: totalExpired, color: "text-slate-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#003768]">Requests</h2>
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-[#003768]">{Math.min(visibleCount, filtered.length)}</span> of <span className="font-semibold text-[#003768]">{filtered.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f8ff] text-[#003768]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup</th>
                <th className="px-4 py-3 text-left font-semibold">Dropoff</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup Time</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold">Bids</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-5 text-slate-600">Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-5 text-slate-600">No requests found.</td></tr>
              ) : visible.map(row => (
                <tr key={row.id} onClick={() => router.push(`/admin/requests/${row.id}`)} className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                  <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.created_at)}</td>
                  <td className="px-4 py-4 font-semibold text-[#003768]">{row.customer_name || "—"}</td>
                  <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.pickup_address}</td>
                  <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{row.dropoff_address || "—"}</td>
                  <td className="px-4 py-4 text-slate-700">{fmtDateTime(row.pickup_at)}</td>
                  <td className="px-4 py-4 text-slate-700">{fmtDuration(row.journey_duration_minutes)}</td>
                  <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "Any"}</td>
                  <td className="px-4 py-4 text-slate-700">{row.bid_count}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(row.status, row.has_accepted_bid)}`}>
                      {row.status}
                    </span>
                  </td>
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