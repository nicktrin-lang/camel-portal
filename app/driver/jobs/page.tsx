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
  insurance_docs_confirmed_by_driver?: boolean | null;
  insurance_docs_confirmed_by_driver_at?: string | null;
  insurance_docs_confirmed_by_customer?: boolean | null;
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

const FUEL_OPTIONS: FuelLevel[] = ["full", "3/4", "half", "quarter", "empty"];
const FUEL_LABELS: Record<FuelLevel, string> = {
  full: "Full", "3/4": "¾ Tank", half: "½ Tank", quarter: "¼ Tank", empty: "Empty",
};
const FUEL_BARS: Record<FuelLevel, number> = {
  full: 4, "3/4": 3, half: 2, quarter: 1, empty: 0,
};

function FuelBar({ level, light }: { level: FuelLevel; light?: boolean }) {
  const filled = FUEL_BARS[level] ?? 0;
  return (
    <div className="flex gap-1 mt-2">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-3 flex-1 ${
          i < filled
            ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400"
            : light ? "bg-white/20" : "bg-black/10"
        }`}/>
      ))}
    </div>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch { return v; }
}

function statusLabel(s: string): string {
  switch (s.toLowerCase()) {
    case "confirmed":       return "Awaiting delivery";
    case "driver_assigned": return "Assigned to you";
    case "en_route":        return "En route";
    case "arrived":         return "Arrived";
    case "collected":       return "On hire";
    case "returned":        return "Returned";
    case "completed":       return "Completed";
    case "cancelled":       return "Cancelled";
    default: return s.replaceAll("_", " ");
  }
}

function statusColor(s: string): string {
  switch (s.toLowerCase()) {
    case "driver_assigned": case "en_route": case "arrived": return "bg-[#ff7a00] text-white";
    case "collected": case "returned": return "bg-black text-white";
    case "completed": return "bg-green-500 text-white";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "bg-[#f0f0f0] text-black";
  }
}

export default function DriverJobsPage() {
  const [driverInfo,    setDriverInfo]    = useState<DriverInfo | null>(null);
  const [jobs,          setJobs]          = useState<DriverJob[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [expandedJob,   setExpandedJob]   = useState<string | null>(null);
  const [confirmingJob, setConfirmingJob] = useState<string | null>(null);
  const [fuelLevels,    setFuelLevels]    = useState<Record<string, FuelLevel>>({});
  const [confirmError,  setConfirmError]  = useState<string | null>(null);
  const [confirmOk,     setConfirmOk]     = useState<string | null>(null);
  const [lastLoaded,    setLastLoaded]    = useState<Date | null>(null);

  async function load() {
    try {
      const [dRes, jRes] = await Promise.all([
        fetch("/api/driver/check", { credentials: "include", cache: "no-store" }),
        fetch("/api/driver/jobs",  { credentials: "include", cache: "no-store" }),
      ]);
      const dJson = await dRes.json().catch(() => null);
      const jJson = await jRes.json().catch(() => null);
      if (!dRes.ok) { setError(dJson?.error || "Not authorised as a driver."); setLoading(false); return; }
      setDriverInfo(dJson?.driver || null);
      setJobs(Array.isArray(jJson?.jobs) ? jJson.jobs : []);
      setLastLoaded(new Date());
    } catch (e: any) { setError(e?.message || "Failed to load jobs."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function confirmAction(
    bookingId: string,
    action: "collection" | "return" | "insurance",
    fuelLevel?: FuelLevel
  ) {
    setConfirmingJob(bookingId); setConfirmError(null); setConfirmOk(null);
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/confirm`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, fuel_level: fuelLevel }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to confirm.");
      setConfirmOk(
        action === "collection" ? "Delivery confirmed ✓" :
        action === "return"     ? "Collection confirmed ✓" :
                                  "Insurance confirmed ✓"
      );
      await load();
    } catch (e: any) { setConfirmError(e?.message || "Failed to confirm."); }
    finally { setConfirmingJob(null); }
  }

  const activeJobs    = useMemo(() => jobs.filter(j => !["completed","cancelled"].includes(j.booking_status.toLowerCase())), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => ["completed","cancelled"].includes(j.booking_status.toLowerCase())), [jobs]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50 font-bold">Loading your jobs…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-4xl mb-4">🚫</p>
        <p className="text-white font-black text-xl mb-2">Access denied</p>
        <p className="text-white/50 font-semibold text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="w-full bg-black border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">Camel Global</p>
            <h1 className="text-xl font-black text-white">Driver Portal</h1>
            {driverInfo && <p className="text-xs font-bold text-white/40 mt-0.5">{driverInfo.full_name}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/30">
              {activeJobs.length} active · {completedJobs.length} completed
            </p>
            {lastLoaded && (
              <p className="text-xs font-bold text-white/20 mt-0.5">
                Updated {lastLoaded.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

        {confirmOk && (
          <div className="border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-black text-green-400">
            {confirmOk}
          </div>
        )}
        {confirmError && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-400">
            {confirmError}
          </div>
        )}

        {/* Active jobs */}
        {activeJobs.length === 0 && completedJobs.length === 0 ? (
          <div className="border border-white/10 p-12 text-center">
            <p className="text-4xl mb-4">🚗</p>
            <p className="text-white font-black text-xl mb-2">No jobs assigned</p>
            <p className="text-white/40 font-semibold text-sm">Your partner will assign jobs to you here. This page refreshes automatically.</p>
          </div>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">Active Jobs</p>
                {activeJobs.map(job => {
                  const isExpanded = expandedJob === job.booking_id;
                  const collFuel = fuelLevels[`coll_${job.booking_id}`] as FuelLevel | undefined;
                  const retFuel  = fuelLevels[`ret_${job.booking_id}`]  as FuelLevel | undefined;
                  const isConfirming = confirmingJob === job.booking_id;

                  return (
                    <div key={job.booking_id} className="border border-white/10 bg-white/5">
                      {/* Job header */}
                      <button type="button" onClick={() => setExpandedJob(isExpanded ? null : job.booking_id)}
                        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/5 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-base font-black text-white">#{job.job_number ?? "—"}</span>
                            <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-wide ${statusColor(job.booking_status)}`}>
                              {statusLabel(job.booking_status)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white/70 truncate">📍 {job.pickup_address || "—"}</p>
                          <p className="text-sm font-semibold text-white/40 truncate">🏁 {job.dropoff_address || "—"}</p>
                          <p className="text-xs font-bold text-white/30 mt-1">
                            🗓 {job.pickup_at ? new Date(job.pickup_at).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}
                          </p>
                        </div>
                        <span className="text-white/30 font-black text-lg shrink-0">{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/10 px-5 py-5 space-y-5">

                          {/* Journey details */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label:"Customer", value:job.customer_name },
                              { label:"Customer phone", value:job.customer_phone, phone:true },
                              { label:"Vehicle", value:job.driver_vehicle||job.vehicle_category_name },
                              { label:"Pickup time", value:fmt(job.pickup_at) },
                              { label:"Dropoff time", value:fmt(job.dropoff_at) },
                              { label:"Assigned at", value:fmt(job.driver_assigned_at) },
                            ].map(({ label, value, phone }) => (
                              <div key={label}>
                                <p className="text-xs font-black uppercase tracking-wide text-white/30">{label}</p>
                                {phone && value
                                  ? <a href={`tel:${value}`} className="text-sm font-bold text-[#ff7a00] underline">{value}</a>
                                  : <p className="text-sm font-bold text-white">{value || "—"}</p>}
                              </div>
                            ))}
                          </div>

                          {job.driver_notes && (
                            <div className="border border-[#ff7a00]/20 bg-[#ff7a00]/5 px-4 py-3">
                              <p className="text-xs font-black uppercase tracking-wide text-[#ff7a00] mb-1">Notes from partner</p>
                              <p className="text-sm font-bold text-white/70">{job.driver_notes}</p>
                            </div>
                          )}

                          {/* WhatsApp customer */}
                          {job.customer_phone && (
                            <a href={`https://wa.me/${job.customer_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-green-500 px-4 py-2.5 text-sm font-black text-white hover:bg-green-600 transition-colors">
                              💬 WhatsApp Customer
                            </a>
                          )}

                          {/* Insurance confirmation */}
                          <div className={`border p-4 ${job.insurance_docs_confirmed_by_driver ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                            <p className="text-xs font-black uppercase tracking-wide text-white/40 mb-2">📄 Insurance Documents</p>
                            {job.insurance_docs_confirmed_by_driver ? (
                              <p className="text-sm font-black text-green-400">✓ Confirmed handover at {fmt(job.insurance_docs_confirmed_by_driver_at)}</p>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-white/60 mb-3">Confirm you have handed the insurance documents to the customer.</p>
                                <button type="button" disabled={isConfirming}
                                  onClick={() => confirmAction(job.booking_id, "insurance")}
                                  className="bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                                  {isConfirming ? "Saving…" : "✓ Confirm insurance handover"}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Delivery fuel */}
                          <div className={`border p-4 ${job.collection_confirmed_by_driver ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                            <p className="text-xs font-black uppercase tracking-wide text-white/40 mb-2">⛽ Delivery Fuel Level</p>
                            {job.collection_confirmed_by_driver ? (
                              <>
                                <p className="text-sm font-black text-green-400">✓ Recorded: {FUEL_LABELS[job.collection_fuel_level_driver as FuelLevel] || job.collection_fuel_level_driver}</p>
                                <p className="text-xs text-white/30 mt-1">{fmt(job.collection_confirmed_by_driver_at)}</p>
                                {job.collection_fuel_level_driver && <FuelBar level={job.collection_fuel_level_driver as FuelLevel} light/>}
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-white/60 mb-3">Record the fuel level when you deliver the vehicle.</p>
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                  {FUEL_OPTIONS.map(opt => (
                                    <button key={opt} type="button"
                                      onClick={() => setFuelLevels(f => ({ ...f, [`coll_${job.booking_id}`]: opt }))}
                                      className={`py-2.5 text-xs font-black transition-colors ${collFuel === opt ? "bg-[#ff7a00] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                                      {FUEL_LABELS[opt]}
                                    </button>
                                  ))}
                                </div>
                                {collFuel && <FuelBar level={collFuel} light/>}
                                <button type="button" disabled={!collFuel || isConfirming}
                                  onClick={() => confirmAction(job.booking_id, "collection", collFuel)}
                                  className="mt-3 bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                                  {isConfirming ? "Saving…" : "✓ Confirm delivery fuel"}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Collection fuel */}
                          <div className={`border p-4 ${job.return_confirmed_by_driver ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                            <p className="text-xs font-black uppercase tracking-wide text-white/40 mb-2">⛽ Collection Fuel Level</p>
                            {job.return_confirmed_by_driver ? (
                              <>
                                <p className="text-sm font-black text-green-400">✓ Recorded: {FUEL_LABELS[job.return_fuel_level_driver as FuelLevel] || job.return_fuel_level_driver}</p>
                                <p className="text-xs text-white/30 mt-1">{fmt(job.return_confirmed_by_driver_at)}</p>
                                {job.return_fuel_level_driver && <FuelBar level={job.return_fuel_level_driver as FuelLevel} light/>}
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-white/60 mb-3">Record the fuel level when you collect the vehicle back.</p>
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                  {FUEL_OPTIONS.map(opt => (
                                    <button key={opt} type="button"
                                      onClick={() => setFuelLevels(f => ({ ...f, [`ret_${job.booking_id}`]: opt }))}
                                      className={`py-2.5 text-xs font-black transition-colors ${retFuel === opt ? "bg-[#ff7a00] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                                      {FUEL_LABELS[opt]}
                                    </button>
                                  ))}
                                </div>
                                {retFuel && <FuelBar level={retFuel} light/>}
                                <button type="button" disabled={!retFuel || isConfirming}
                                  onClick={() => confirmAction(job.booking_id, "return", retFuel)}
                                  className="mt-3 bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                                  {isConfirming ? "Saving…" : "✓ Confirm collection fuel"}
                                </button>
                              </>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed jobs */}
            {completedJobs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-white/30">Completed & Cancelled</p>
                {completedJobs.map(job => (
                  <div key={job.booking_id} className="border border-white/5 bg-white/3 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-white/60">#{job.job_number ?? "—"}</span>
                        <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-wide ${statusColor(job.booking_status)}`}>
                          {statusLabel(job.booking_status)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white/30 truncate">{job.pickup_address || "—"}</p>
                      <p className="text-xs text-white/20">{job.pickup_at ? new Date(job.pickup_at).toLocaleDateString("en-GB") : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs font-bold text-white/20 pb-4">
          Auto-refreshes every 15 seconds · Camel Global Driver Portal
        </p>
      </div>
    </div>
  );
}