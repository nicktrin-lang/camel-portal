"use client";

import { useCallback, useEffect, useState } from "react";

// Airports view of one country in the Car Hire Directory: companies grouped by their
// nearest airport (within 30 km), busiest-for-outreach first, then everyone further away.
// Data: GET /api/admin/outreach/directory/airports. Adding uses the page's add action.

type Company = {
  id: string;
  name: string;
  town: string | null;
  phone: string | null;
  website: string | null;
  domain: string | null;
  email: string | null;
  scan_status: "pending" | "found" | "none" | "no_website" | "failed";
  is_chain: boolean;
  prospect_id: string | null;
  nearest_airport: string | null;
  airport_km: number | null;
};

type Airport = {
  iata: string;
  name: string;
  town: string | null;
  country: string;
  type: string;
  companies: Company[];
  ready: number;
};

type Data = { radiusKm: number; airports: Airport[]; other: Company[]; otherReady: number; measured: boolean };

const SCAN_LABEL: Record<Company["scan_status"], string> = {
  pending: "Not scanned",
  found: "Email found",
  none: "No email on site",
  no_website: "No website",
  failed: "Site didn't load",
};

const TYPE_LABEL: Record<string, string> = { large_airport: "Major", medium_airport: "Regional", small_airport: "Small" };

const n = (v: number | null | undefined) => Number(v || 0).toLocaleString("en-GB");
const websiteHref = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w}`);
const canAdd = (c: Company) => !!c.email && !c.prospect_id && !c.is_chain;
const OTHER = "__other__";

type Props = {
  country: string;
  countryLabel: string;
  showChains: boolean;
  adding: boolean;
  onAdd: (ids: string[]) => Promise<boolean>;
};

export default function AirportsView({ country, countryLabel, showChains, adding, onAdd }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ country });
      if (showChains) params.set("chains", "1");
      const res = await fetch(`/api/admin/outreach/directory/airports?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load airports");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load airports");
    } finally {
      setLoading(false);
    }
  }, [country, showChains]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); setOpen(new Set()); }, [country, showChains]);

  async function add(ids: string[]) {
    if (!ids.length) return;
    const ok = await onAdd(ids);
    if (ok) { setSelected(new Set()); await load(); }
  }

  const toggleOpen = (key: string) => setOpen((o) => {
    const next = new Set(o);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (loading && !data) return <div className="border border-black/10 bg-white p-6 text-sm font-semibold text-black/40">Loading airports…</div>;
  if (error) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>;
  if (!data) return null;
  if (!data.measured) {
    return (
      <div className="border border-black/10 bg-white p-6 text-sm font-semibold text-black/60">
        Airports haven&apos;t been measured for {countryLabel} yet. Run <code className="bg-black/5 px-1">npm run directory:airports</code> on the Mac.
      </div>
    );
  }

  const nearCount = data.airports.reduce((s, a) => s + a.companies.length, 0);
  const nearReady = data.airports.reduce((s, a) => s + a.ready, 0);

  const group = (key: string, title: React.ReactNode, subtitle: string, companies: Company[], ready: number) => {
    const isOpen = open.has(key);
    const readyIds = companies.filter(canAdd).map((c) => c.id);
    const added = companies.filter((c) => c.prospect_id).length;
    return (
      <div key={key} className="border border-black/10 bg-white">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => toggleOpen(key)} className="flex min-w-0 items-start gap-2 text-left">
            <span className="mt-0.5 w-3 shrink-0 text-xs font-black text-black/40">{isOpen ? "▾" : "▸"}</span>
            <span className="min-w-0">
              <span className="block font-black text-black">{title}</span>
              <span className="block text-xs font-semibold text-black/50">
                {subtitle} · {n(companies.length)} companies · {n(ready)} with email to add{added ? ` · ${n(added)} in outreach` : ""}
              </span>
            </span>
          </button>
          <button
            onClick={() => add(readyIds.slice(0, 500))}
            disabled={adding || readyIds.length === 0}
            className="shrink-0 bg-[#ff7a00] px-3 py-1.5 text-xs font-black text-white hover:opacity-90 disabled:opacity-30"
          >
            {readyIds.length > 500 ? `Add next 500 of ${n(readyIds.length)}` : `Add ${n(readyIds.length)} with email`}
          </button>
        </div>
        {isOpen && (
          <div className="overflow-x-auto border-t border-black/10">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-[11px] font-black uppercase tracking-wider text-black/40">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all with email in this group"
                      checked={readyIds.length > 0 && readyIds.every((id) => selected.has(id))}
                      onChange={(e) => setSelected((s) => {
                        const next = new Set(s);
                        for (const id of readyIds) { if (e.target.checked) next.add(id); else next.delete(id); }
                        return next;
                      })}
                    />
                  </th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2 text-right">Airport</th>
                  <th className="px-3 py-2">Town</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Website</th>
                  <th className="px-3 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-black/5 align-top">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled={!canAdd(c)}
                        checked={selected.has(c.id)}
                        onChange={(e) => setSelected((s) => {
                          const next = new Set(s);
                          if (e.target.checked) next.add(c.id); else next.delete(c.id);
                          return next;
                        })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-black">{c.name}</p>
                      {c.is_chain && <span className="mt-0.5 inline-block bg-black/5 px-1.5 text-[10px] font-black uppercase text-black/50">Chain</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-black/70">
                      {c.airport_km != null ? `${c.airport_km.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km${key === OTHER && c.nearest_airport ? ` (${c.nearest_airport})` : ""}` : "100+ km"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-black/70">{c.town || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-black/70">
                      {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-[#ff7a00]">{c.phone}</a> : "—"}
                    </td>
                    <td className="max-w-[200px] px-3 py-2 font-semibold">
                      {c.website ? (
                        <a href={websiteHref(c.website)} target="_blank" rel="noopener noreferrer" className="break-all text-[#ff7a00] hover:underline">
                          {c.domain || c.website}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="max-w-[240px] px-3 py-2">
                      {c.email ? (
                        <p className="break-all font-semibold text-black">{c.email}</p>
                      ) : (
                        <p className="text-xs font-semibold text-black/40">{SCAN_LABEL[c.scan_status]}</p>
                      )}
                      {c.prospect_id && <p className="mt-0.5 text-[11px] font-black uppercase text-green-700">In outreach</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-black/60">
          {n(data.airports.length)} airports · {n(nearCount)} companies within {data.radiusKm} km ({n(nearReady)} with email to add) ·{" "}
          {n(data.other.length)} further away ({n(data.otherReady)} with email). Distances are straight-line to the nearest airport.
        </p>
        <button
          onClick={() => add([...selected])}
          disabled={adding || selected.size === 0}
          className="shrink-0 bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 disabled:opacity-30"
        >
          {adding ? "Adding…" : `Add selected to outreach (${n(selected.size)})`}
        </button>
      </div>

      {data.airports.map((a) => group(
        a.iata,
        <>{a.iata} · {a.name}</>,
        [TYPE_LABEL[a.type] ?? "Airport", a.town, a.country !== country ? a.country : null].filter(Boolean).join(" · "),
        a.companies,
        a.ready,
      ))}

      {data.other.length > 0 && (
        <>
          <h2 className="pt-3 text-sm font-black uppercase tracking-wider text-black/50">Not near an airport</h2>
          {group(OTHER, <>More than {data.radiusKm} km from any airport</>, countryLabel, data.other, data.otherReady)}
        </>
      )}
    </div>
  );
}
