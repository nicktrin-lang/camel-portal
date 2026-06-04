"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

type RequestRow = {
  id: string; job_number: number | null; pickup_address: string;
  dropoff_address: string | null; pickup_at: string; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number; suitcases: number;
  hand_luggage: number; vehicle_category_name: string | null; status: string;
  request_status: string; created_at: string; expires_at?: string | null;
};

type ApiResponse = { data: RequestRow[]; role: string | null; adminMode: boolean };

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
    open:             "border-blue-200 bg-blue-50 text-blue-700",
    confirmed:        "border-green-200 bg-green-50 text-green-700",
    bid_submitted:    "border-amber-200 bg-amber-50 text-amber-700",
    bid_successful:   "border-green-200 bg-green-50 text-green-700",
    bid_unsuccessful: "border-red-200 bg-red-50 text-red-700",
    expired:          "border-black/10 bg-[#f0f0f0] text-black/50",
    cancelled:        "border-red-200 bg-red-50 text-red-700",
  };
  return map[status] ?? "border-black/10 bg-white text-black/60";
}
function norm(v: unknown) { return String(v || "").toLowerCase().trim(); }

const PAGE_SIZE = 10;

export default function PartnerRequestsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const FILTERS = [
    { value: "all",              label: t("requests.filter.all") },
    { value: "open",             label: t("requests.filter.open") },
    { value: "bid_submitted",    label: t("requests.filter.bid_submitted") },
    { value: "bid_successful",   label: t("requests.filter.bid_successful") },
    { value: "bid_unsuccessful", label: t("requests.filter.bid_unsuccessful") },
    { value: "expired",          label: t("requests.filter.expired") },
  ];

  const [rows,         setRows]         = useState<RequestRow[]>([]);
  const [adminMode,    setAdminMode]    = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/requests", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || t("requests.error.load"));
      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) { setError(e?.message || t("requests.error.load")); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
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
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <div className="border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-black">{t("requests.list.title")}</h1>
            <p className="mt-1 text-sm font-bold text-black/50">
              {adminMode ? t("requests.list.subtitleAdmin") : t("requests.list.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("requests.list.search.placeholder")}
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}
              className="border border-black/20 bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
              {t("requests.list.clear")}
            </button>
            <button type="button" onClick={load}
              className="bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity">
              {t("requests.list.refresh")}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm font-bold text-black/50">{t("requests.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm font-bold text-black/50">{t("requests.list.empty")}</p>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-3">
              {t("requests.list.showing")} <span className="text-black">{Math.min(visibleCount, filtered.length)}</span> {t("requests.list.of")} <span className="text-black">{filtered.length}</span> {t("requests.list.requestsLabel")}
            </p>
            <div className="overflow-x-auto border border-black/10">
              <table className="min-w-full text-sm">
                <thead className="bg-black text-white text-left">
                  <tr>
                    {[
                      t("requests.table.col.jobNo"),
                      t("requests.table.col.bookingStatus"),
                      t("requests.table.col.requestStatus"),
                      t("requests.table.col.pickup"),
                      t("requests.table.col.dropoff"),
                      t("requests.table.col.pickupTime"),
                      t("requests.table.col.duration"),
                      t("requests.table.col.vehicle"),
                      t("requests.table.col.passengers"),
                      t("requests.table.col.created"),
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {visible.map((row, i) => (
                    <tr key={row.id}
                      onClick={() => router.push(`/partner/requests/${row.id}`)}
                      className={`cursor-pointer hover:bg-[#f0f0f0] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                      <td className="px-4 py-3 font-black text-black whitespace-nowrap">{row.job_number ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex border px-2 py-0.5 text-xs font-black capitalize ${statusPill(row.request_status)}`}>
                          {row.request_status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex border px-2 py-0.5 text-xs font-black capitalize ${statusPill(row.status)}`}>
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate font-bold text-black/70">{row.pickup_address || "—"}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate font-bold text-black/70">{row.dropoff_address || "—"}</td>
                      <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmt(row.pickup_at)}</td>
                      <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmtDuration(row.journey_duration_minutes)}</td>
                      <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{row.vehicle_category_name || "—"}</td>
                      <td className="px-4 py-3 font-bold text-black/70">{row.passengers}</td>
                      <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmt(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
                {t("requests.list.showMore", { count: String(filtered.length - visibleCount) })}
              </button>
            )}
            {visibleCount > PAGE_SIZE && !hasMore && (
              <button type="button" onClick={() => setVisibleCount(PAGE_SIZE)}
                className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
                {t("requests.list.showLess")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}