"use client";

import { useEffect, useMemo, useState } from "react";

type DriverInfo = { id: string; full_name: string; email: string; phone: string | null };

type DriverJob = {
  booking_id: string; request_id: string; job_number: number | null;
  booking_status: string; booking_status_label: string; amount: number | null;
  created_at: string; driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  customer_name: string | null; customer_phone: string | null;
  vehicle_category_name: string | null;
  collection_confirmed_by_driver?: boolean | null;
  collection_confirmed_by_driver_at?: string | null;
  collection_fuel_level_driver?: string | null;
  return_confirmed_by_driver?: boolean | null;
  return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

const FUEL_OPTIONS: FuelLevel[] = ["full", "3/4", "half", "quarter", "empty"];
const FUEL_LABELS: Record<FuelLevel, string> = {
  full: "Full", "3/4": "¾ Tank", half: "½ Tank", quarter: "¼ Tank", empty: "Empty",
};
const FUEL_BARS: Record<FuelLevel, number> = {
  full: 4, "3/4": 3, half: 2, quarter: 1, empty: 0,
};

function FuelBar({ level }: { level: FuelLevel }) {
  const filled = FUEL_BARS[level] ?? 0;
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`h-3 flex-1 rounded-full ${
          i < filled
            ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400"
            : "bg-slate-200"
        }`} />
      ))}
    </div>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return v; }
}

function Detail({ label, value, phone }: { label: string; value?: string | null; phone?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {phone && value
        ? <a href={`tel:${value}`} className="text-sm font-medium text-[#003768] underline">{value}</a>
        : <p className="text-sm font-medium text-slate-800">{value || "—"}</p>}
    </div>
  );
}

function FuelSummaryCard({ title, confirmed, confirmedAt, fuelLevel }: {
  title: string; confirmed: boolean; confirmedAt?: string | null; fuelLevel: FuelLevel | null;
}) {
  return (
    <div className={`rounded-xl border p-3 ${confirmed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`text-lg font-bold ${confirmed ? "text-green-700" : "text-slate-400"}`}>
          {confirmed ? (fuelLevel ? FUEL_LABELS[fuelLevel] : "✓") : "Pending"}
        </span>
      </div>
      {confirmed && fuelLevel && <div className="mt-2"><FuelBar level={fuelLevel} /></div>}
      {confirmed && confirmedAt && <p className="mt-1 text-xs text-slate-400">{fmt(confirmedAt)}</p>}
    </div>
  );
}

function JobCard({ job, mode, fuelInput, onFuelChange, onConfirm, saving }: {
  job: DriverJob; mode: "collection" | "return" | "readonly";
  fuelInput: FuelLevel; onFuelChange: (v: FuelLevel) => void;
  onConfirm: () => void; saving: boolean;
}) {
  const [expanded, setExpanded] = useState(mode !== "readonly");

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <button type="button" onClick={() => setExpanded(p => !p)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-[#003768]">Job #{job.job_number ?? "—"}</span>
          </div>
          <span className="text-sm text-slate-600 truncate">{job.pickup_address ?? "—"}</span>
          <span className="text-xs text-slate-400">{fmt(job.pickup_at)}</span>
        </div>
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-black/5 px-4 pb-5 pt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Customer"       value={job.customer_name} />
            <Detail label="Customer phone" value={job.customer_phone} phone />
            <Detail label="Vehicle"        value={job.vehicle_category_name} />
            <Detail label="Driver vehicle" value={job.driver_vehicle} />
            <Detail label="Pickup"         value={job.pickup_address} />
            <Detail label="Dropoff"        value={job.dropoff_address} />
            <Detail label="Pickup time"    value={fmt(job.pickup_at)} />
            <Detail label="Dropoff time"   value={fmt(job.dropoff_at)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FuelSummaryCard title="Collection fuel" confirmed={!!job.collection_confirmed_by_driver}
              confirmedAt={job.collection_confirmed_by_driver_at}
              fuelLevel={job.collection_fuel_level_driver as FuelLevel | null} />
            <FuelSummaryCard title="Return fuel" confirmed={!!job.return_confirmed_by_driver}
              confirmedAt={job.return_confirmed_by_driver_at}
              fuelLevel={job.return_fuel_level_driver as FuelLevel | null} />
          </div>

          {mode !== "readonly" && (
            <div className="rounded-2xl bg-slate-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-[#003768]">
                {mode === "collection" ? "Record collection fuel level" : "Record return fuel level"}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {FUEL_OPTIONS.map(opt => (
                  <button key={opt} type="button" onClick={() => onFuelChange(opt)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs font-semibold transition ${
                      fuelInput === opt
                        ? "border-[#003768] bg-[#003768] text-white"
                        : "border-black/10 bg-white text-slate-700 hover:border-[#003768]/40"
                    }`}>
                    <span className="text-base leading-none">
                      {opt === "full" ? "F" : opt === "3/4" ? "¾" : opt === "half" ? "½" : opt === "quarter" ? "¼" : "E"}
                    </span>
                    <span className="hidden sm:block">{FUEL_LABELS[opt]}</span>
                  </button>
                ))}
              </div>
              <FuelBar level={fuelInput} />
              <button type="button" onClick={onConfirm} disabled={saving}
                className="w-full rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60 active:scale-95 transition-transform">
                {saving ? "Saving…" : mode === "collection" ? "✓ Confirm Collection" : "✓ Confirm Return"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, accent, jobs, mode, fuelInputs, onFuelChange, onConfirm, savingId }: {
  title: string; icon: string; accent: string; jobs: DriverJob[];
  mode: "collection" | "return" | "readonly";
  fuelInputs: Record<string, FuelLevel>;
  onFuelChange: (id: string, v: FuelLevel) => void;
  onConfirm: (id: string, stage: "collection" | "return") => void;
  savingId: string | null;
}) {
  if (jobs.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className={`text-lg font-bold ${accent}`}>{title}</h2>
        <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-bold text-slate-600">{jobs.length}</span>
      </div>
      <div className="space-y-3">
        {jobs.map(job => (
          <JobCard key={job.booking_id} job={job} mode={mode}
            fuelInput={fuelInputs[job.booking_id] ?? "full"}
            onFuelChange={v => onFuelChange(job.booking_id, v)}
            onConfirm={() => onConfirm(job.booking_id, mode === "readonly" ? "return" : mode)}
            saving={savingId === job.booking_id} />
        ))}
      </div>
    </section>
  );
}

export default function DriverJobsPage() {
  const [loading,    setLoading]    = useState(true);
  const [savingId,   setSavingId]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [driver,     setDriver]     = useState<DriverInfo | null>(null);
  const [jobs,       setJobs]       = useState<DriverJob[]>([]);
  const [fuelInputs, setFuelInputs] = useState<Record<string, FuelLevel>>({});

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/driver/jobs", { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load jobs.");
      setDriver(json.driver ?? null);
      setJobs(json.jobs ?? []);
      const inputs: Record<string, FuelLevel> = {};
      for (const j of json.jobs ?? []) inputs[j.booking_id] = "full";
      setFuelInputs(inputs);
    } catch (e: any) {
      setError(e?.message || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function confirmStage(bookingId: string, stage: "collection" | "return") {
    setSavingId(bookingId); setError(null);
    try {
      const res  = await fetch(`/api/driver/bookings/${bookingId}/confirm`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, fuel_level: fuelInputs[bookingId] ?? "full" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setToast(stage === "collection" ? "Collection confirmed ✓" : "Return confirmed ✓");
      setTimeout(() => setToast(null), 3000);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSavingId(null);
    }
  }

  const { awaiting, onHire, completed } = useMemo(() => ({
    awaiting:  jobs.filter(j => j.booking_status_label === "Awaiting delivery"),
    onHire:    jobs.filter(j => j.booking_status_label === "On Hire"),
    completed: jobs.filter(j => j.booking_status_label === "Completed"),
  }), [jobs]);

  const sharedProps = {
    fuelInputs,
    onFuelChange: (id: string, v: FuelLevel) => setFuelInputs(p => ({ ...p, [id]: v })),
    onConfirm: confirmStage,
    savingId,
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 inset-x-4 z-50 rounded-2xl bg-green-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-96">
          {toast}
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003768]">My Jobs</h1>
          {driver && <p className="mt-1 text-sm text-slate-500">Signed in as <span className="font-semibold text-[#003768]">{driver.full_name}</span></p>}
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-50 shadow-sm">
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-slate-500">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center">
          <p className="text-4xl">🚗</p>
          <p className="mt-3 text-lg font-semibold text-slate-700">No jobs assigned yet</p>
          <p className="mt-1 text-sm text-slate-500">Your partner will assign jobs to you here.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-blue-700">{awaiting.length}</p>
              <p className="mt-1 text-xs font-semibold text-blue-600 uppercase tracking-wide">Awaiting</p>
              <p className="text-xs text-blue-500">Collection</p>
            </div>
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-orange-600">{onHire.length}</p>
              <p className="mt-1 text-xs font-semibold text-orange-500 uppercase tracking-wide">On Hire</p>
              <p className="text-xs text-orange-400">Active</p>
            </div>
            <div className="rounded-3xl border border-green-100 bg-green-50 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-green-700">{completed.length}</p>
              <p className="mt-1 text-xs font-semibold text-green-600 uppercase tracking-wide">Completed</p>
              <p className="text-xs text-green-500">Done</p>
            </div>
          </div>

          {/* Job sections */}
          <div className="space-y-8">
            <Section title="Awaiting Collection" icon="🔵" accent="text-blue-700"
              mode="collection" jobs={awaiting} {...sharedProps} />
            <Section title="On Hire" icon="🟠" accent="text-orange-600"
              mode="return" jobs={onHire} {...sharedProps} />
            <Section title="Completed" icon="✅" accent="text-green-700"
              mode="readonly" jobs={completed} {...sharedProps} />
          </div>
        </>
      )}
    </div>
  );
}