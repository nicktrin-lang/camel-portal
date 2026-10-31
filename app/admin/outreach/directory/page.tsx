"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { MapPartner, MapPoint } from "./DirectoryMap";
import AirportsView from "./AirportsView";

const DirectoryMap = dynamic(() => import("./DirectoryMap"), {
  ssr: false,
  loading: () => <div className="border border-black/10 bg-white p-6 text-sm font-semibold text-black/40">Loading map…</div>,
});

// Car hire company directory (worldwide, from Overture Maps + website scans). Browse by
// country, then add companies with an email into Partner Outreach, where the normal
// send flow takes over. Loaded by `npm run directory:load`, emails by `npm run directory:scan`.

type Summary = {
  country: string;
  total: number;
  independents: number;
  with_website: number;
  with_phone: number;
  scanned: number;
  with_email: number;
  added: number;
};

type Row = {
  id: string;
  name: string;
  town: string | null;
  region: string | null;
  phone: string | null;
  website: string | null;
  domain: string | null;
  email: string | null;
  emails: string[] | null;
  email_source: string | null;
  scan_status: "pending" | "found" | "none" | "no_website" | "failed";
  is_chain: boolean;
  confidence: number | null;
  prospect_id: string | null;
  added_at: string | null;
};

type Filter = "all" | "email" | "website" | "no_website" | "not_scanned" | "added";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "email",       label: "Has email, not added" },
  { key: "website",     label: "Has website" },
  { key: "no_website",  label: "No website" },
  { key: "not_scanned", label: "Not scanned yet" },
  { key: "added",       label: "Added to outreach" },
];

const SCAN_LABEL: Record<Row["scan_status"], string> = {
  pending: "Not scanned",
  found: "Email found",
  none: "No email on site",
  no_website: "No website",
  failed: "Site didn't load",
};

const REGION_NAMES = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
function countryName(cc: string) {
  try { return REGION_NAMES?.of(cc) ?? cc; } catch { return cc; }
}

const n = (v: number | string | null | undefined) => Number(v || 0).toLocaleString("en-GB");

function websiteHref(w: string) {
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}

export default function OutreachDirectoryPage() {
  const [summary, setSummary]   = useState<Summary[]>([]);
  const [rows, setRows]         = useState<Row[]>([]);
  const [total, setTotal]       = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage]         = useState(0);
  const [country, setCountry]   = useState<string>("");
  const [filter, setFilter]     = useState<Filter>("all");
  const [search, setSearch]     = useState("");
  const [query, setQuery]       = useState("");
  const [showChains, setShowChains] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [message, setMessage]   = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [view, setView]         = useState<"list" | "map" | "airports">("list");
  const [mapData, setMapData]   = useState<{ country: string; points: MapPoint[]; partners: MapPartner[] } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter, page: String(page) });
      if (country) params.set("country", country);
      if (query) params.set("q", query);
      if (showChains) params.set("chains", "1");
      const res = await fetch(`/api/admin/outreach/directory?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setSummary((json.summary || []).map((s: any) => ({
        ...s,
        total: Number(s.total), independents: Number(s.independents), with_website: Number(s.with_website),
        with_phone: Number(s.with_phone), scanned: Number(s.scanned), with_email: Number(s.with_email), added: Number(s.added),
      })));
      setRows(json.rows || []);
      setTotal(json.total || 0);
      setPageSize(json.pageSize || 100);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [country, filter, page, query, showChains]);

  useEffect(() => { load(); }, [load]);

  const loadMap = useCallback(async () => {
    if (!country) return;
    setMapLoading(true);
    try {
      const params = new URLSearchParams({ country });
      if (showChains) params.set("chains", "1");
      const res = await fetch(`/api/admin/outreach/directory/map?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load the map");
      setMapData({ country, points: json.points || [], partners: json.partners || [] });
    } catch (e: any) {
      setError(e?.message || "Failed to load the map");
    } finally {
      setMapLoading(false);
    }
  }, [country, showChains]);

  useEffect(() => { if (view === "map") loadMap(); }, [view, loadMap]);
  useEffect(() => { setSelected(new Set()); }, [country, filter, page, query, showChains]);

  async function add(body: { ids?: string[]; country?: string }): Promise<boolean> {
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/outreach/directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to add");
      const parts = [`${n(json.added)} added to Partner Outreach`];
      if (json.linked) parts.push(`${n(json.linked)} were already there and are now linked`);
      setMessage({ ok: true, text: json.message || parts.join(" · ") });
      setSelected(new Set());
      await load();
      if (view === "map") {
        if (body.ids) {
          const ids = new Set(body.ids);
          setMapData((d) => d && { ...d, points: d.points.map((p) => (ids.has(p[0]) ? ([...p.slice(0, 3), "added", ...p.slice(4)] as MapPoint) : p)) });
        } else {
          await loadMap();
        }
      }
      return true;
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Failed to add" });
      return false;
    } finally {
      setAdding(false);
    }
  }

  const totals = summary.reduce(
    (a, s) => ({
      independents: a.independents + s.independents,
      with_website: a.with_website + s.with_website,
      with_email: a.with_email + s.with_email,
      added: a.added + s.added,
    }),
    { independents: 0, with_website: 0, with_email: 0, added: 0 },
  );
  const current = summary.find((s) => s.country === country);
  const visibleCountries = summary.filter((s) => {
    const q = countrySearch.trim().toLowerCase();
    return !q || s.country.toLowerCase() === q || countryName(s.country).toLowerCase().includes(q);
  });
  const selectable = rows.filter((r) => r.email && !r.prospect_id && !r.is_chain);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const readyInCountry = current ? Math.max(0, current.with_email - current.added) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/outreach" className="text-xs font-black uppercase tracking-widest text-[#ff7a00] hover:opacity-80">
            ← Partner Outreach
          </Link>
          <h1 className="mt-1 text-2xl font-black text-black">Car Hire Directory</h1>
          <p className="mt-1 text-sm font-semibold text-black/50">
            {n(totals.independents)} independent car hire companies in {n(summary.length)} countries · {n(totals.with_website)} with a website · {n(totals.with_email)} with an email · {n(totals.added)} added to outreach
          </p>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
          {/outreach_directory/i.test(error) && " (has OUTREACH_DIRECTORY_SCHEMA.sql been run in Supabase?)"}
        </div>
      )}
      {message && (
        <div className={["border px-4 py-3 text-sm font-semibold", message.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"].join(" ")}>
          {message.text}
        </div>
      )}

      {!loading && !error && summary.length === 0 && (
        <div className="border border-black/10 bg-white p-6 text-sm font-semibold text-black/60">
          The directory is empty. Load it on the Mac with <code className="bg-black/5 px-1">npm run directory:load</code>, then
          find emails with <code className="bg-black/5 px-1">npm run directory:scan</code>.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Countries */}
        <div className="min-w-0 border border-black/10 bg-white">
          <div className="border-b border-black/10 p-3">
            <input
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Find a country…"
              className="w-full border border-black/20 px-3 py-2 text-sm font-semibold outline-none focus:border-[#ff7a00]"
            />
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-[11px] font-black uppercase tracking-wider text-black/40">
                <tr>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-2 py-2 text-right">Firms</th>
                  <th className="px-2 py-2 text-right">Email</th>
                  <th className="px-3 py-2 text-right">Added</th>
                </tr>
              </thead>
              <tbody>
                {visibleCountries.map((s) => (
                  <tr
                    key={s.country}
                    onClick={() => { setCountry(s.country); setPage(0); setMessage(null); }}
                    className={["cursor-pointer border-t border-black/5 hover:bg-[#ff7a00]/5", s.country === country ? "bg-[#ff7a00]/10" : ""].join(" ")}
                  >
                    <td className="px-3 py-2 font-bold text-black">{countryName(s.country)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{n(s.independents)}</td>
                    <td className="px-2 py-2 text-right font-semibold text-black/70">{n(s.with_email)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-black/50">{n(s.added)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Companies in the chosen country */}
        <div className="min-w-0 space-y-4">
          {!country ? (
            <div className="border border-black/10 bg-white p-6 text-sm font-semibold text-black/50">
              Choose a country to see its car hire companies.
            </div>
          ) : (
            <>
              {current && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Independent firms", current.independents],
                    ["With website", current.with_website],
                    ["Websites scanned", current.scanned],
                    ["With email", current.with_email],
                  ].map(([label, value]) => (
                    <div key={label as string} className="border border-black/10 bg-white p-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-black/40">{label}</p>
                      <p className="mt-1 text-xl font-black text-black">{n(value as number)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-0">
                {(["list", "airports", "map"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={["px-4 py-1.5 text-xs font-black uppercase tracking-wider", view === v ? "bg-black text-white" : "border border-black/20 bg-white text-black hover:border-black"].join(" ")}
                  >
                    {v === "list" ? "List" : v === "map" ? "Map" : "Airports"}
                  </button>
                ))}
              </div>

              {view === "airports" ? (
                <div className="space-y-2">
                  <label className="flex items-center justify-end gap-2 text-xs font-black text-black/60">
                    <input type="checkbox" checked={showChains} onChange={(e) => setShowChains(e.target.checked)} />
                    Show chains
                  </label>
                  <AirportsView
                    country={country}
                    countryLabel={countryName(country)}
                    showChains={showChains}
                    adding={adding}
                    onAdd={(ids) => add({ ids })}
                  />
                </div>
              ) : view === "map" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-black/60">
                    <span>
                      {mapLoading ? "Loading places…" : mapData?.country === country ? `${n(mapData.points.length)} places in ${countryName(country)}. Click a dot for details; orange dots can be added to outreach.` : ""}
                    </span>
                    <label className="flex items-center gap-2 text-xs font-black text-black/60">
                      <input type="checkbox" checked={showChains} onChange={(e) => setShowChains(e.target.checked)} />
                      Show chains
                    </label>
                  </div>
                  {mapData?.country === country && (
                    <DirectoryMap
                      country={country}
                      points={mapData.points}
                      partners={mapData.partners}
                      onAdd={(id) => add({ ids: [id] })}
                    />
                  )}
                </div>
              ) : (
              <>
              <div className="flex flex-col gap-3 border border-black/10 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key); setPage(0); }}
                      className={["px-3 py-1.5 text-xs font-black transition-colors", filter === f.key ? "bg-black text-white" : "border border-black/20 text-black hover:border-black"].join(" ")}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <form
                    className="flex min-w-0 flex-1 gap-2"
                    onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); setPage(0); }}
                  >
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, town or website…"
                      className="min-w-0 flex-1 border border-black/20 px-3 py-2 text-sm font-semibold outline-none focus:border-[#ff7a00]"
                    />
                    <button className="border border-black px-3 py-2 text-sm font-black hover:bg-black hover:text-white">Search</button>
                  </form>
                  <label className="flex items-center gap-2 text-xs font-bold text-black/60">
                    <input type="checkbox" checked={showChains} onChange={(e) => { setShowChains(e.target.checked); setPage(0); }} />
                    Show chains
                  </label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => add({ ids: [...selected] })}
                    disabled={adding || selected.size === 0}
                    className="bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 disabled:opacity-30"
                  >
                    Add selected to outreach ({selected.size})
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Add every company in ${countryName(country)} with an email to Partner Outreach? This adds up to 500 per click; click again for the rest. Nothing is sent: they join the outreach list as pending.`)) {
                        add({ country });
                      }
                    }}
                    disabled={adding || readyInCountry === 0}
                    className="bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-30"
                  >
                    {adding ? "Adding…" : readyInCountry > 500
                      ? `Add next 500 of ${n(readyInCountry)} with email in ${countryName(country)}`
                      : `Add all ${n(readyInCountry)} with email in ${countryName(country)}`}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-black/10 bg-white">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-[11px] font-black uppercase tracking-wider text-black/40">
                    <tr>
                      <th className="w-8 px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label="Select all with email on this page"
                          checked={selectable.length > 0 && selectable.every((r) => selected.has(r.id))}
                          onChange={(e) => setSelected(e.target.checked ? new Set(selectable.map((r) => r.id)) : new Set())}
                        />
                      </th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Town</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Website</th>
                      <th className="px-3 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center font-semibold text-black/40">Loading…</td></tr>
                    )}
                    {!loading && rows.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center font-semibold text-black/40">No companies match.</td></tr>
                    )}
                    {!loading && rows.map((r) => {
                      const canSelect = !!r.email && !r.prospect_id && !r.is_chain;
                      return (
                        <tr key={r.id} className="border-t border-black/5 align-top">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              disabled={!canSelect}
                              checked={selected.has(r.id)}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(r.id); else next.delete(r.id);
                                setSelected(next);
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-bold text-black">{r.name}</p>
                            {r.is_chain && <span className="mt-0.5 inline-block bg-black/5 px-1.5 text-[10px] font-black uppercase text-black/50">Chain</span>}
                          </td>
                          <td className="px-3 py-2 font-semibold text-black/70">{r.town || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-black/70">
                            {r.phone ? <a href={`tel:${r.phone}`} className="hover:text-[#ff7a00]">{r.phone}</a> : "—"}
                          </td>
                          <td className="max-w-[200px] px-3 py-2 font-semibold">
                            {r.website ? (
                              <a href={websiteHref(r.website)} target="_blank" rel="noopener noreferrer" className="break-all text-[#ff7a00] hover:underline">
                                {r.domain || r.website}
                              </a>
                            ) : "—"}
                          </td>
                          <td className="max-w-[240px] px-3 py-2">
                            {r.email ? (
                              <p className="break-all font-semibold text-black">{r.email}</p>
                            ) : (
                              <p className="text-xs font-semibold text-black/40">{SCAN_LABEL[r.scan_status]}</p>
                            )}
                            {r.prospect_id && <p className="mt-0.5 text-[11px] font-black uppercase text-green-700">In outreach</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm font-semibold text-black/60">
                <span>{n(total)} companies</span>
                <div className="flex items-center gap-2">
                  <button disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)} className="border border-black/20 px-3 py-1 font-black disabled:opacity-30">←</button>
                  <span>Page {page + 1} of {pages}</span>
                  <button disabled={page + 1 >= pages || loading} onClick={() => setPage((p) => p + 1)} className="border border-black/20 px-3 py-1 font-black disabled:opacity-30">→</button>
                </div>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
