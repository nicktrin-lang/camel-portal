"use client";

import { useCallback, useEffect, useState } from "react";

// Every version of the outreach email, what it said and how it did, side by side.
// Data: /api/admin/outreach/campaigns (OUTREACH_CAMPAIGNS_SCHEMA.sql).

type Counts = {
  sent: number; delivered: number; bounced: number; hard_bounced: number; opened: number;
  clicked: number; human_clicked: number; complained: number; unsubscribed: number;
  replied: number; landed: number; signup_started: number; signed_up: number;
};
type Campaign = {
  id: string; name: string; description: string | null; notes: string | null; source_ref: string | null;
  first_sent_at: string | null; last_sent_at: string | null;
  totals: Counts; by_country: ({ country: string } & Counts)[];
};
type Content = Record<string, { airport?: { subject: string; html: string }; town: { subject: string; html: string } }>;

const LOCALES = ["es", "en", "fr", "it", "pt", "de"] as const;

const pct = (n: number, of: number) => (of > 0 ? `${((n / of) * 100).toFixed(n / of < 0.01 && n > 0 ? 1 : 0)}%` : "–");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–");

// Columns of the results table. Rates are of emails sent.
const COLS: { key: keyof Counts; label: string; rate?: boolean; title?: string }[] = [
  { key: "sent",           label: "Sent" },
  { key: "bounced",        label: "Bounced",       rate: true },
  { key: "opened",         label: "Opened",        rate: true, title: "Includes Apple Mail privacy pre-opens, so read it as a ceiling" },
  { key: "human_clicked",  label: "Clicked",       rate: true, title: "Likely-human clicks: security-scanner clicks left out" },
  { key: "landed",         label: "Visited site",  rate: true, title: "Our own beacon in a real browser (tracked from Nov 2026)" },
  { key: "signup_started", label: "Started signup", rate: true },
  { key: "signed_up",      label: "Signed up",     rate: true },
  { key: "unsubscribed",   label: "Unsub",         rate: true },
];

export default function CampaignsPanel() {
  const [data, setData]       = useState<{ campaigns: Campaign[]; current_campaign_id?: string; setup_needed?: boolean } | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outreach/campaigns", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load campaigns");
      setData(json); setError(null);
    } catch (e: any) { setError(e?.message || "Failed to load campaigns"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Campaigns: {error}</div>;
  if (!data) return null;

  return (
    <div className="border border-black/10 bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="text-sm font-black text-black">Campaigns <span className="font-semibold text-black/50">· each version of the email, what it said and how it did</span></p>
          {data.setup_needed && <p className="mt-1 text-xs font-semibold text-[#c25e00]">Not set up yet: run OUTREACH_CAMPAIGNS_SCHEMA.sql, then npm run outreach:campaigns-backfill.</p>}
        </div>
        <span className="shrink-0 text-sm font-black text-black/40">{open ? "Hide" : `Show ${data.campaigns.length}`}</span>
      </button>

      {open && !data.setup_needed && (
        <div className="space-y-4 border-t border-black/10 p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs font-black uppercase tracking-widest text-black/40">
                  <th className="py-2 pr-3">Campaign</th>
                  {COLS.map((c) => <th key={c.key} title={c.title} className="py-2 pr-3 text-right">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...data.campaigns].reverse().map((c) => (
                  <CampaignRow key={c.id} c={c} current={c.id === data.current_campaign_id}
                    expanded={expanded === c.id} onToggle={() => setExpanded((e) => (e === c.id ? null : c.id))} onSaved={load} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-semibold text-black/40">
            Rates are of emails sent. Clicks leave out security scanners. Site visits and signups are credited to the prospect's latest email before they happened.
          </p>
        </div>
      )}
    </div>
  );
}

function Cells({ n }: { n: Counts }) {
  return <>{COLS.map((col) => (
    <td key={col.key} className="py-2 pr-3 text-right font-bold tabular-nums text-black">
      {n[col.key].toLocaleString("en-GB")}
      {col.rate && <span className="ml-1 text-xs font-semibold text-black/40">{pct(n[col.key], n.sent)}</span>}
    </td>
  ))}</>;
}

function CampaignRow({ c, current, expanded, onToggle, onSaved }: { c: Campaign; current: boolean; expanded: boolean; onToggle: () => void; onSaved: () => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-black/5 align-top hover:bg-black/[0.02]" onClick={onToggle}>
        <td className="py-2 pr-3">
          <p className="font-black text-black">{expanded ? "▾" : "▸"} {c.name} {current && <span className="ml-1 bg-green-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-green-800">sending now</span>}</p>
          <p className="text-xs font-semibold text-black/40">{day(c.first_sent_at)} – {day(c.last_sent_at)}</p>
        </td>
        <Cells n={c.totals} />
      </tr>
      {expanded && (
        <>
          {c.by_country.length > 1 && c.by_country.map((r) => (
            <tr key={r.country} className="border-b border-black/5 text-black/70">
              <td className="py-1.5 pl-5 pr-3 text-xs font-bold">{r.country}</td>
              <Cells n={r} />
            </tr>
          ))}
          <tr className="border-b border-black/10">
            <td colSpan={COLS.length + 1} className="py-3">
              <CampaignDetail c={c} onSaved={onSaved} />
            </td>
          </tr>
        </>
      )}
    </>
  );
}

function CampaignDetail({ c, onSaved }: { c: Campaign; onSaved: () => void }) {
  const [content, setContent] = useState<Content | null>(null);
  const [locale, setLocale]   = useState<(typeof LOCALES)[number]>("es");
  const [version, setVersion] = useState<"airport" | "town">("airport");
  const [notes, setNotes]     = useState(c.notes ?? "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch(`/api/admin/outreach/campaigns?id=${encodeURIComponent(c.id)}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => setContent(j?.campaign?.content ?? {})).catch(() => setContent({}));
  }, [c.id]);

  async function save() {
    setSaving(true); setSaved(false);
    const res = await fetch("/api/admin/outreach/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, notes }) });
    setSaving(false);
    if (res.ok) { setSaved(true); onSaved(); }
  }

  const forLocale = content?.[locale];
  const email = forLocale ? (version === "airport" && forLocale.airport ? forLocale.airport : forLocale.town) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        {c.description && <p className="text-sm font-semibold text-black/70">{c.description}</p>}
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-black/40">What we learned</p>
          <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={6}
            className="w-full border border-black/15 p-2 text-sm font-semibold text-black focus:border-black focus:outline-none"
            placeholder="What worked, what didn't, what to change next time…" />
          <div className="mt-1 flex items-center gap-3">
            <button onClick={save} disabled={saving || notes === (c.notes ?? "")} className="bg-black px-3 py-1.5 text-xs font-black text-white disabled:opacity-30">{saving ? "Saving…" : "Save notes"}</button>
            {saved && <span className="text-xs font-bold text-green-700">Saved</span>}
          </div>
        </div>
        <p className="text-xs font-semibold text-black/40">Campaign id <code>{c.id}</code>{c.source_ref ? ` · commit ${c.source_ref}` : ""}</p>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {LOCALES.map((l) => (
            <button key={l} onClick={() => setLocale(l)} className={["px-2 py-1 text-xs font-black uppercase", locale === l ? "bg-black text-white" : "border border-black/15 text-black/60"].join(" ")}>{l}</button>
          ))}
          {forLocale?.airport && (
            <span className="ml-2 flex gap-1">
              {(["airport", "town"] as const).map((v) => (
                <button key={v} onClick={() => setVersion(v)} className={["px-2 py-1 text-xs font-black", version === v ? "bg-[#ff7a00] text-white" : "border border-black/15 text-black/60"].join(" ")}>{v === "airport" ? "Near an airport" : "Town"}</button>
              ))}
            </span>
          )}
        </div>
        {content === null ? <p className="text-sm font-semibold text-black/40">Loading…</p> : email ? (
          <div className="border border-black/10">
            <p className="border-b border-black/10 bg-black/[0.03] px-3 py-2 text-sm font-bold text-black"><span className="text-black/40">Subject: </span>{email.subject}</p>
            <iframe title={`${c.name} ${locale}`} srcDoc={email.html} sandbox="" className="h-[420px] w-full bg-white" />
          </div>
        ) : <p className="text-sm font-semibold text-black/40">No stored copy for this language.</p>}
      </div>
    </div>
  );
}
