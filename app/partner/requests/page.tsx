"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RequestRow = {
  id: string; job_number: number | null; pickup_address: string;
  dropoff_address: string | null; pickup_at: string; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number; suitcases: number;
  hand_luggage: number; vehicle_category_name: string | null; status: string;
  request_status: string; created_at: string; expires_at?: string | null;
};

type ApiResponse = { data: RequestRow[]; role: string | null; adminMode: boolean };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "bid_submitted", label: "Bid Submitted" },
  { value: "bid_successful", label: "Bid Successful" },
  { value: "bid_unsuccessful", label: "Bid Unsuccessful" },
  { value: "expired", label: "Expired" },
];

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function fmtDuration(m?: number | null) {
  if (!m) return "—";
  const mpd = 24 * 60;
  if (m >= mpd) { const d = Math.ceil(m / mpd); return `${d} day${d === 1 ? "" : "s"}`; }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    open: "border-blue-200 bg-blue-50 text-blue-700",
    confirmed: "border-green-200 bg-green-50 text-green-700",
    bid_submitted: "border-amber-200 bg-amber-50 text-amber-700",
    bid_successful: "border-green-200 bg-green-50 text-green-700",
    bid_unsuccessful: "border-red-200 bg-red-50 text-red-700",
    expired: "border-slate-200 bg-slate-50 text-slate-600",
    cancelled: "border-red-200 bg-red-50 text-red-700",
  };
  return map[status] ?? "border-black/10 bg-white text-slate-700";
}

function norm(v: unknown) { return String(v || "").toLowerCase().trim(); }

const PAGE_SIZE = 10;

export default function PartnerRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/partner/requests", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load.");
      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) { setError(e?.message || "Failed to load."); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search]);

  const q = norm(search);
  const filtered = useMemo(() => rows.filter(row => {
    if (filter !== "all" && row.status !== filter) return false;
    if (!q) return true;
    return [row.job_number, row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.status]
      .map(norm).join(" ").includes(q);
  }), [rows, filter, q]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#003768]">Requests</h1>
            <p className="mt-2 text-slate-600">
              {adminMode ? "All requests across the network." : "Request history matched to your partner account. Click any row to view detail."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search job, pickup, dropoff..."
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}
              className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
              Clear
            </button>
            <button type="button" onClick={load}
              className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-slate-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-slate-600">No requests found.</p>
        ) : (
          <>
            <div className="mt-4 mb-2 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-[#003768]">{Math.min(visibleCount, filtered.length)}</span> of <span className="font-semibold text-[#003768]">{filtered.length}</span> requests
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f8ff] text-left text-[#003768]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Job No.</th>
                    <th className="px-4 py-3 font-semibold">Booking Status</th>
                    <th className="px-4 py-3 font-semibold">Request Status</th>
                    <th className="px-4 py-3 font-semibold">Pickup</th>
                    <th className="px-4 py-3 font-semibold">Dropoff</th>
                    <th className="px-4 py-3 font-semibold">Pickup Time</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                    <th className="px-4 py-3 font-semibold">Passengers</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {visible.map(row => (
                    <tr key={row.id}
                      onClick={() => router.push(`/partner/requests/${row.id}`)}
                      className="cursor-pointer hover:bg-[#f3f8ff] transition-colors">
                      <td className="px-4 py-4 font-bold text-[#003768]">{row.job_number ?? "—"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPill(row.request_status)}`}>
                          {row.request_status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPill(row.status)}`}>
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-[180px] truncate text-slate-700">{row.pickup_address || "—"}</td>
                      <td className="px-4 py-4 max-w-[180px] truncate text-slate-700">{row.dropoff_address || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{fmt(row.pickup_at)}</td>
                      <td className="px-4 py-4 text-slate-700">{fmtDuration(row.journey_duration_minutes)}</td>
                      <td className="px-4 py-4 text-slate-700">{row.vehicle_category_name || "—"}</td>
                      <td className="px-4 py-4 text-slate-700">{row.passengers}</td>
                      <td className="px-4 py-4 text-slate-700">{fmt(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="mt-4 w-full rounded-2xl border border-black/10 bg-slate-50 py-3 text-sm font-semibold text-[#003768] hover:bg-slate-100">
                ▼ Show more ({filtered.length - visibleCount} remaining)
              </button>
            )}
            {visibleCount > PAGE_SIZE && !hasMore && (
              <button type="button"
                onClick={() => setVisibleCount(PAGE_SIZE)}
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