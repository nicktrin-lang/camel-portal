"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PartnersMap, { type MapPartner } from "./PartnersMap";

type ApprovalRow = {
  id: string; user_id?: string | null; email: string | null;
  company_name: string | null; contact_name: string | null; phone: string | null;
  address: string | null; role: string | null; status: string | null;
  is_live_profile?: boolean | null; live_profile?: boolean | null;
  missing?: string[]; fleet_count?: number; driver_count?: number;
  default_currency?: string | null; created_at: string | null;
  base_lat?: number | null; base_lng?: number | null;
  partner_country?: string | null;
};

const PAGE_SIZE = 10;

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function normalizeText(value: unknown) { return String(value || "").trim().toLowerCase(); }

function statusPillClasses(status?: string | null) {
  switch (normalizeText(status)) {
    case "approved": return "border-green-200 bg-green-50 text-green-700";
    case "pending":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-black/60";
  }
}

function statusLabel(value?: string | null) { return String(value || "—").replaceAll("_", " "); }
function liveValue(row: ApprovalRow) { return !!(row.is_live_profile ?? row.live_profile ?? false); }

function missingLabel(key: string) {
  const map: Record<string, string> = {
    service_radius_km: "Service radius", base_address: "Base address",
    base_location: "Base location (lat/lng)", fleet: "Fleet vehicle",
    driver: "Driver", default_currency: "Billing currency",
  };
  return map[key] ?? key;
}


export default function AdminApprovalsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [rows,          setRows]          = useState<ApprovalRow[]>([]);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [liveFilter,    setLiveFilter]    = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes  = await fetch("/api/admin/is-admin", { cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const res  = await fetch("/api/admin/applications", { cache: "no-store", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to load partner approvals.");
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load partner approvals.");
      setRows([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, statusFilter, liveFilter, countryFilter]);

  // Unique countries for filter dropdown
  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.partner_country) s.add(r.partner_country);
    }
    return Array.from(s).sort();
  }, [rows]);

  const searchValue = normalizeText(search);

  const filteredRows = rows.filter(row => {
    if (searchValue) {
      const haystack = [row.company_name, row.contact_name, row.email, row.phone,
        row.address, row.role, row.status, row.partner_country,
        liveValue(row) ? "yes live true" : "no not live false"]
        .map(normalizeText).join(" ");
      if (!haystack.includes(searchValue)) return false;
    }
    if (statusFilter  !== "all" && normalizeText(row.status)          !== normalizeText(statusFilter))  return false;
    if (liveFilter    === "yes" && !liveValue(row))                                                      return false;
    if (liveFilter    === "no"  &&  liveValue(row))                                                      return false;
    if (countryFilter !== "all" && normalizeText(row.partner_country) !== normalizeText(countryFilter)) return false;
    return true;
  });

  // Map partners: approved rows that have lat/lng, respecting current filters
  const mapPartners = useMemo<MapPartner[]>(() =>
    filteredRows
      .filter(r => normalizeText(r.status) === "approved" && r.base_lat != null && r.base_lng != null)
      .map(r => ({
        id:           r.id,
        company_name: r.company_name,
        address:      r.address,
        lat:          Number(r.base_lat),
        lng:          Number(r.base_lng),
        is_live:      liveValue(r),
      })),
    [filteredRows]
  );

  const showMap = mapPartners.length > 0;

  const visible      = filteredRows.slice(0, visibleCount);
  const hasMore      = filteredRows.length > visibleCount;
  const totalPending  = filteredRows.filter(r => normalizeText(r.status) === "pending").length;
  const totalApproved = filteredRows.filter(r => normalizeText(r.status) === "approved").length;
  const totalLive     = filteredRows.filter(r => liveValue(r)).length;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total",        value: filteredRows.length, color: "text-black" },
          { label: "Pending",      value: totalPending,        color: "text-[#ff7a00]" },
          { label: "Approved",     value: totalApproved,       color: "text-black" },
          { label: "Live Profile", value: totalLive,           color: "text-black" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-black">Partner Approvals</h1>
            <p className="mt-1 text-sm font-bold text-black/50">Review partner applications and current live profile details.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:max-w-[960px]">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Company, contact, email…"
                className="mt-1 w-full border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="mt-1 w-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Live Profile</label>
              <select value={liveFilter} onChange={e => setLiveFilter(e.target.value)}
                className="mt-1 w-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
                <option value="all">All</option>
                <option value="yes">Live only</option>
                <option value="no">Not live</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Country</label>
              <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
                className="mt-1 w-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
                <option value="all">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button type="button"
            onClick={() => { setSearch(""); setStatusFilter("all"); setLiveFilter("all"); setCountryFilter("all"); }}
            className="border border-black/20 px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
            Clear Filters
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Partner map — approved partners with coordinates */}
        {showMap && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-black/50">
                Partner Map
              </p>
              <span className="border border-black/10 bg-[#f0f0f0] px-2 py-0.5 text-xs font-black text-black/60">
                {mapPartners.length} approved partner{mapPartners.length !== 1 ? "s" : ""}
                {countryFilter !== "all" ? ` · ${countryFilter}` : ""}
              </span>
            </div>
            <PartnersMap partners={mapPartners} />
          </div>
        )}

        <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-3">
          Showing <span className="text-black">{Math.min(visibleCount, filteredRows.length)}</span> of <span className="text-black">{filteredRows.length}</span> applications
        </p>

        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Created","Company Name","Contact Name","Email","Phone","Address","Country","Role","Status","Live Profile","Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td className="px-4 py-4 text-sm font-bold text-black/50" colSpan={11}>Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td className="px-4 py-4 text-sm font-bold text-black/50" colSpan={11}>No partner applications found.</td></tr>
              ) : visible.map((row, i) => (
                <tr key={row.id} className={`align-top hover:bg-[#f0f0f0] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                  <td className="px-4 py-3 font-bold text-black/50 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3 font-black text-black">{row.company_name || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.contact_name || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.email || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.phone || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70 max-w-[200px] truncate">{row.address || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{row.partner_country || "—"}</td>
                  <td className="px-4 py-3 font-bold text-black/70">{row.role || "Partner"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-black capitalize ${statusPillClasses(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {liveValue(row) ? (
                      <span className="inline-flex border border-black/20 bg-black px-2 py-0.5 text-xs font-black text-white">✓ Live</span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">Not live</span>
                        {row.missing && row.missing.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {row.missing.map(m => (
                              <li key={m} className="text-[11px] font-bold text-black/40">· {missingLabel(m)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/approvals/${row.id}`}
                      className="inline-flex bg-[#ff7a00] px-4 py-2 text-xs font-black text-white hover:opacity-90 transition-opacity">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <button type="button" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
            ▼ Show more ({filteredRows.length - visibleCount} remaining)
          </button>
        )}
        {visibleCount > PAGE_SIZE && !hasMore && (
          <button type="button" onClick={() => setVisibleCount(PAGE_SIZE)}
            className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
            ▲ Show less
          </button>
        )}
      </div>
    </div>
  );
}