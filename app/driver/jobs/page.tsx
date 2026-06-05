"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  collection_fuel_level_partner?: string | null;
  return_confirmed_by_driver?: boolean | null;
  return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
  return_fuel_level_partner?: string | null;
  insurance_docs_confirmed_by_driver?: boolean | null;
  insurance_docs_confirmed_by_driver_at?: string | null;
  insurance_docs_confirmed_by_customer?: boolean | null;
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";
type FilterType = "all" | "awaiting" | "onhire" | "completed";

const FUEL_OPTIONS: FuelLevel[] = ["full", "3/4", "half", "quarter", "empty"];
const FUEL_BARS: Record<FuelLevel, number> = { full: 4, "3/4": 3, half: 2, quarter: 1, empty: 0 };

function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty") return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half") return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full") return "full";
  return null;
}

function FuelBar({ level }: { level: string | null }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n as FuelLevel] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-2">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-3 flex-1 ${
          i < filled ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400" : "bg-black/10"
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
  const { t } = useTranslation();

  const FUEL_LABELS: Record<FuelLevel, string> = {
    full:    t("driver.jobs.fuel.level.full"),
    "3/4":   t("driver.jobs.fuel.level.threequarter"),
    half:    t("driver.jobs.fuel.level.half"),
    quarter: t("driver.jobs.fuel.level.quarter"),
    empty:   t("driver.jobs.fuel.level.empty"),
  };

  function fuelDisplayLabel(v: unknown): string {
    switch (normalizeFuel(v)) {
      case "empty":   return t("driver.jobs.fuel.display.empty");
      case "quarter": return t("driver.jobs.fuel.display.quarter");
      case "half":    return t("driver.jobs.fuel.display.half");
      case "3/4":     return t("driver.jobs.fuel.display.threequarter");
      case "full":    return t("driver.jobs.fuel.display.full");
      default:        return "—";
    }
  }

  function statusLabel(s: string): string {
    const key = `driver.jobs.status.${s.toLowerCase()}` as any;
    const result = t(key);
    return result !== key ? result : s.replaceAll("_", " ");
  }

  const [driverInfo,    setDriverInfo]    = useState<DriverInfo | null>(null);
  const [jobs,          setJobs]          = useState<DriverJob[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [expandedJob,   setExpandedJob]   = useState<string | null>(null);
  const [confirmingJob, setConfirmingJob] = useState<string | null>(null);
  const [fuelInputs,    setFuelInputs]    = useState<Record<string, FuelLevel>>({});
  const [confirmError,  setConfirmError]  = useState<string | null>(null);
  const [confirmOk,     setConfirmOk]     = useState<string | null>(null);
  const [lastLoaded,    setLastLoaded]    = useState<Date | null>(null);
  const [activeFilter,  setActiveFilter]  = useState<FilterType>("all");

  async function load() {
    try {
      const res  = await fetch("/api/driver/jobs", { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setError(json?.error || t("driver.jobs.error.default")); setLoading(false); return; }
      setDriverInfo(json?.driver || null);
      setJobs(Array.isArray(json?.jobs) ? json.jobs : []);
      setLastLoaded(new Date());
    } catch (e: any) { setError(e?.message || t("driver.jobs.error.load")); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, []);

  async function confirmAction(bookingId: string, action: "collection" | "return" | "insurance", fuelLevel?: FuelLevel) {
    setConfirmingJob(bookingId); setConfirmError(null); setConfirmOk(null);
    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/confirm`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, fuel_level: fuelLevel }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("driver.jobs.confirm.error"));
      setConfirmOk(
        action === "collection" ? t("driver.jobs.confirm.delivery") :
        action === "return"     ? t("driver.jobs.confirm.collection") :
        t("driver.jobs.confirm.insurance")
      );
      await load();
    } catch (e: any) { setConfirmError(e?.message || t("driver.jobs.confirm.error")); }
    finally { setConfirmingJob(null); }
  }

  const awaitingJobs  = useMemo(() => jobs.filter(j => ["confirmed","driver_assigned","en_route","arrived"].includes(j.booking_status.toLowerCase())), [jobs]);
  const onHireJobs    = useMemo(() => jobs.filter(j => ["collected","returned"].includes(j.booking_status.toLowerCase())), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.booking_status.toLowerCase() === "completed"), [jobs]);
  const cancelledJobs = useMemo(() => jobs.filter(j => j.booking_status.toLowerCase() === "cancelled"), [jobs]);
  const activeJobs    = useMemo(() => jobs.filter(j => !["completed","cancelled"].includes(j.booking_status.toLowerCase())), [jobs]);

  // Jobs to show based on active filter
  const visibleActive    = activeFilter === "awaiting" ? awaitingJobs : activeFilter === "onhire" ? onHireJobs : activeFilter === "all" ? activeJobs : [];
  const visibleCompleted = activeFilter === "completed" ? completedJobs : activeFilter === "all" ? completedJobs : [];
  const visibleCancelled = activeFilter === "all" ? cancelledJobs : [];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-black/40 font-bold text-sm">{t("driver.jobs.loading")}</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20 px-6">
      <div className="max-w-md text-center">
        <p className="text-4xl mb-4">🚫</p>
        <p className="text-black font-black text-xl mb-2">{t("driver.jobs.error.title")}</p>
        <p className="text-black/50 font-semibold text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">

      <div className="bg-black px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">{t("driver.jobs.tag")}</p>
          <h1 className="text-xl font-black text-white mt-0.5">{t("driver.jobs.title")}</h1>
          {driverInfo && <p className="text-xs font-bold text-white/40 mt-0.5">{driverInfo.full_name}</p>}
        </div>
        <div className="text-right">
          {lastLoaded && (
            <p className="text-xs font-bold text-white/30">
              {t("driver.jobs.updated")} {lastLoaded.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </p>
          )}
        </div>
      </div>

      {/* Stat cards — clickable filters */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { filter: "awaiting" as FilterType, labelKey: "driver.jobs.stats.awaitingDelivery", value: awaitingJobs.length,  color: "text-[#ff7a00]", activeBorder: "border-[#ff7a00] bg-[#ff7a00]/5", inactiveBorder: "border-[#ff7a00]/20 bg-white" },
          { filter: "onhire"   as FilterType, labelKey: "driver.jobs.stats.onHire",           value: onHireJobs.length,    color: "text-black",     activeBorder: "border-black bg-black/5",         inactiveBorder: "border-black/10 bg-white" },
          { filter: "completed"as FilterType, labelKey: "driver.jobs.stats.completed",        value: completedJobs.length, color: "text-green-600", activeBorder: "border-green-500 bg-green-50",    inactiveBorder: "border-green-200 bg-green-50" },
        ] as const).map(({ filter, labelKey, value, color, activeBorder, inactiveBorder }) => {
          const isActive = activeFilter === filter;
          return (
            <button key={filter} type="button"
              onClick={() => setActiveFilter(isActive ? "all" : filter)}
              className={`border p-4 text-left transition-all hover:opacity-80 ${isActive ? activeBorder : inactiveBorder}`}>
              <p className="text-xs font-black uppercase tracking-widest text-black/40">{t(labelKey as any)}</p>
              <p className={`mt-1 text-3xl font-black ${color}`}>{value}</p>
              {isActive && <p className="text-xs font-black text-black/30 mt-1">✕ clear</p>}
            </button>
          );
        })}
      </div>

      {confirmOk    && <div className="border border-green-500/30 bg-green-50 px-4 py-3 text-sm font-black text-green-700">{confirmOk}</div>}
      {confirmError && <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-700">{confirmError}</div>}

      {jobs.length === 0 ? (
        <div className="bg-white border border-black/5 p-12 text-center">
          <p className="text-4xl mb-4">🚗</p>
          <p className="text-black font-black text-xl mb-2">{t("driver.jobs.noJobs.title")}</p>
          <p className="text-black/40 font-semibold text-sm">{t("driver.jobs.noJobs.body")}</p>
        </div>
      ) : (
        <>
          {visibleActive.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] px-1">{t("driver.jobs.active.label")}</p>
              {visibleActive.map(job => {
                const isExpanded          = expandedJob === job.booking_id;
                const collFuelInput       = fuelInputs[`coll_${job.booking_id}`] as FuelLevel | undefined;
                const retFuelInput        = fuelInputs[`ret_${job.booking_id}`]  as FuelLevel | undefined;
                const isConfirming        = confirmingJob === job.booking_id;
                const collPartnerOverride = !!normalizeFuel(job.collection_fuel_level_partner);
                const retPartnerOverride  = !!normalizeFuel(job.return_fuel_level_partner);

                return (
                  <div key={job.booking_id} className="bg-white border border-black/5">
                    <button type="button" onClick={() => setExpandedJob(isExpanded ? null : job.booking_id)}
                      className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-[#f0f0f0] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-base font-black text-black">#{job.job_number ?? "—"}</span>
                          <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-wide ${statusColor(job.booking_status)}`}>{statusLabel(job.booking_status)}</span>
                        </div>
                        <p className="text-sm font-bold text-black/70 truncate">📍 {job.pickup_address || "—"}</p>
                        <p className="text-sm font-semibold text-black/40 truncate">🏁 {job.dropoff_address || "—"}</p>
                        <p className="text-xs font-bold text-black/30 mt-1">
                          🗓 {job.pickup_at ? new Date(job.pickup_at).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}
                        </p>
                      </div>
                      <span className="text-black/30 font-black text-lg shrink-0">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-black/5 px-5 py-5 space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { labelKey:"driver.jobs.detail.customer",     value: job.customer_name },
                            { labelKey:"driver.jobs.detail.customerPhone",value: job.customer_phone, phone: true },
                            { labelKey:"driver.jobs.detail.vehicle",      value: job.driver_vehicle || job.vehicle_category_name },
                            { labelKey:"driver.jobs.detail.pickupTime",   value: fmt(job.pickup_at) },
                            { labelKey:"driver.jobs.detail.dropoffTime",  value: fmt(job.dropoff_at) },
                            { labelKey:"driver.jobs.detail.assignedAt",   value: fmt(job.driver_assigned_at) },
                          ].map(({ labelKey, value, phone }) => (
                            <div key={labelKey}>
                              <p className="text-xs font-black uppercase tracking-wide text-black/30">{t(labelKey as any)}</p>
                              {phone && value
                                ? <a href={`tel:${value}`} className="text-sm font-bold text-[#ff7a00] underline">{value}</a>
                                : <p className="text-sm font-bold text-black">{value || "—"}</p>}
                            </div>
                          ))}
                        </div>

                        {job.driver_notes && (
                          <div className="border-l-4 border-[#ff7a00] bg-[#ff7a00]/5 px-4 py-3">
                            <p className="text-xs font-black uppercase tracking-wide text-[#ff7a00] mb-1">{t("driver.jobs.detail.partnerNotes")}</p>
                            <p className="text-sm font-bold text-black/70">{job.driver_notes}</p>
                          </div>
                        )}

                        {job.customer_phone && (
                          <a href={`https://wa.me/${job.customer_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-green-500 px-4 py-2.5 text-sm font-black text-white hover:bg-green-600 transition-colors">
                            {t("driver.jobs.detail.whatsapp")}
                          </a>
                        )}

                        {/* ── Insurance ── */}
                        <div className={`border p-4 ${job.insurance_docs_confirmed_by_driver ? "border-green-200 bg-green-50" : "border-black/10 bg-[#f0f0f0]"}`}>
                          <p className="text-xs font-black uppercase tracking-wide text-black/40 mb-2">{t("driver.jobs.insurance.label")}</p>
                          {job.insurance_docs_confirmed_by_driver ? (
                            <p className="text-sm font-black text-green-700">{t("driver.jobs.insurance.confirmed", { time: fmt(job.insurance_docs_confirmed_by_driver_at) })}</p>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-black/60 mb-3">{t("driver.jobs.insurance.body")}</p>
                              <button type="button" disabled={isConfirming} onClick={() => confirmAction(job.booking_id, "insurance")}
                                className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
                                {isConfirming ? t("driver.jobs.insurance.saving") : t("driver.jobs.insurance.btn")}
                              </button>
                            </>
                          )}
                        </div>

                        {/* ── Delivery fuel ── */}
                        <div className={`border p-4 ${job.collection_confirmed_by_driver ? "border-green-200 bg-green-50" : "border-black/10 bg-[#f0f0f0]"}`}>
                          <p className="text-xs font-black uppercase tracking-wide text-black/40 mb-2">{t("driver.jobs.fuel.delivery.label")}</p>
                          {job.collection_confirmed_by_driver ? (
                            <>
                              <p className="text-sm font-black text-green-700">{t("driver.jobs.fuel.recorded", { level: fuelDisplayLabel(job.collection_fuel_level_driver) })}</p>
                              <p className="text-xs text-black/30 mt-1">{fmt(job.collection_confirmed_by_driver_at)}</p>
                              {job.collection_fuel_level_driver && <FuelBar level={job.collection_fuel_level_driver}/>}
                              {collPartnerOverride && normalizeFuel(job.collection_fuel_level_partner) !== normalizeFuel(job.collection_fuel_level_driver) && (
                                <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2">
                                  <p className="text-xs font-black text-amber-700">{t("driver.jobs.fuel.officeOverride", { level: fuelDisplayLabel(job.collection_fuel_level_partner) })}</p>
                                  <p className="text-xs font-bold text-amber-600 mt-0.5">{t("driver.jobs.fuel.officeOverrideNote")}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {collPartnerOverride && (
                                <div className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2">
                                  <p className="text-xs font-black text-amber-700">{t("driver.jobs.fuel.officeSet", { level: fuelDisplayLabel(job.collection_fuel_level_partner) })}</p>
                                  <p className="text-xs font-bold text-amber-600 mt-0.5">{t("driver.jobs.fuel.officeSetNote")}</p>
                                </div>
                              )}
                              <p className="text-sm font-bold text-black/60 mb-3">{t("driver.jobs.fuel.deliveryInstruction")}</p>
                              <div className="grid grid-cols-5 gap-2 mb-3">
                                {FUEL_OPTIONS.map(opt => (
                                  <button key={opt} type="button"
                                    onClick={() => setFuelInputs(f => ({ ...f, [`coll_${job.booking_id}`]: opt }))}
                                    className={`py-2.5 text-xs font-black transition-colors ${collFuelInput === opt ? "bg-[#ff7a00] text-white" : "bg-white text-black/60 border border-black/10 hover:border-black/30"}`}>
                                    {FUEL_LABELS[opt]}
                                  </button>
                                ))}
                              </div>
                              {collFuelInput && <FuelBar level={collFuelInput}/>}
                              <button type="button" disabled={!collFuelInput || isConfirming}
                                onClick={() => confirmAction(job.booking_id, "collection", collFuelInput)}
                                className="mt-3 bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                                {isConfirming ? t("driver.jobs.fuel.saving") : t("driver.jobs.fuel.confirmDeliveryBtn")}
                              </button>
                            </>
                          )}
                        </div>

                        {/* ── Collection fuel ── */}
                        <div className={`border p-4 ${job.return_confirmed_by_driver ? "border-green-200 bg-green-50" : "border-black/10 bg-[#f0f0f0]"}`}>
                          <p className="text-xs font-black uppercase tracking-wide text-black/40 mb-2">{t("driver.jobs.fuel.collection.label")}</p>
                          {job.return_confirmed_by_driver ? (
                            <>
                              <p className="text-sm font-black text-green-700">{t("driver.jobs.fuel.recorded", { level: fuelDisplayLabel(job.return_fuel_level_driver) })}</p>
                              <p className="text-xs text-black/30 mt-1">{fmt(job.return_confirmed_by_driver_at)}</p>
                              {job.return_fuel_level_driver && <FuelBar level={job.return_fuel_level_driver}/>}
                              {retPartnerOverride && normalizeFuel(job.return_fuel_level_partner) !== normalizeFuel(job.return_fuel_level_driver) && (
                                <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2">
                                  <p className="text-xs font-black text-amber-700">{t("driver.jobs.fuel.officeOverride", { level: fuelDisplayLabel(job.return_fuel_level_partner) })}</p>
                                  <p className="text-xs font-bold text-amber-600 mt-0.5">{t("driver.jobs.fuel.officeOverrideNote")}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {retPartnerOverride && (
                                <div className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2">
                                  <p className="text-xs font-black text-amber-700">{t("driver.jobs.fuel.officeRecorded", { level: fuelDisplayLabel(job.return_fuel_level_partner) })}</p>
                                  <p className="text-xs font-bold text-amber-600 mt-0.5">{t("driver.jobs.fuel.officeRecordedNote")}</p>
                                  <FuelBar level={job.return_fuel_level_partner ?? null}/>
                                </div>
                              )}
                              <p className="text-sm font-bold text-black/60 mb-3">{t("driver.jobs.fuel.collectionInstruction")}</p>
                              <div className="grid grid-cols-5 gap-2 mb-3">
                                {FUEL_OPTIONS.map(opt => (
                                  <button key={opt} type="button"
                                    onClick={() => setFuelInputs(f => ({ ...f, [`ret_${job.booking_id}`]: opt }))}
                                    className={`py-2.5 text-xs font-black transition-colors ${retFuelInput === opt ? "bg-[#ff7a00] text-white" : "bg-white text-black/60 border border-black/10 hover:border-black/30"}`}>
                                    {FUEL_LABELS[opt]}
                                  </button>
                                ))}
                              </div>
                              {retFuelInput && <FuelBar level={retFuelInput}/>}
                              <button type="button" disabled={!retFuelInput || isConfirming}
                                onClick={() => confirmAction(job.booking_id, "return", retFuelInput)}
                                className="mt-3 bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                                {isConfirming ? t("driver.jobs.fuel.saving") : t("driver.jobs.fuel.confirmCollectionBtn")}
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

          {(visibleCompleted.length > 0 || visibleCancelled.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-black/30 px-1">{t("driver.jobs.history.label")}</p>
              {[...visibleCompleted, ...visibleCancelled].map(job => {
                const isExpanded        = expandedJob === job.booking_id;
                const effectiveCollFuel = normalizeFuel(job.collection_fuel_level_partner) || normalizeFuel(job.collection_fuel_level_driver);
                const effectiveRetFuel  = normalizeFuel(job.return_fuel_level_partner)     || normalizeFuel(job.return_fuel_level_driver);
                return (
                  <div key={job.booking_id} className="bg-white border border-black/5">
                    <button type="button" onClick={() => setExpandedJob(isExpanded ? null : job.booking_id)}
                      className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-[#f0f0f0] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-black/50">#{job.job_number ?? "—"}</span>
                          <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-wide ${statusColor(job.booking_status)}`}>{statusLabel(job.booking_status)}</span>
                        </div>
                        <p className="text-xs font-bold text-black/40 truncate">📍 {job.pickup_address || "—"}</p>
                        <p className="text-xs text-black/30">{job.pickup_at ? new Date(job.pickup_at).toLocaleDateString("en-GB") : "—"}</p>
                      </div>
                      <span className="text-black/30 font-black text-lg shrink-0">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-black/5 px-5 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { labelKey:"driver.jobs.detail.customer",       value: job.customer_name },
                            { labelKey:"driver.jobs.detail.customerPhone",  value: job.customer_phone, phone: true },
                            { labelKey:"driver.jobs.detail.vehicle",        value: job.driver_vehicle || job.vehicle_category_name },
                            { labelKey:"driver.jobs.detail.pickupTime",     value: fmt(job.pickup_at) },
                            { labelKey:"driver.jobs.detail.dropoffTime",    value: fmt(job.dropoff_at) },
                            { labelKey:"driver.jobs.detail.dropoffAddress", value: job.dropoff_address },
                          ].map(({ labelKey, value, phone }) => (
                            <div key={labelKey}>
                              <p className="text-xs font-black uppercase tracking-wide text-black/30">{t(labelKey as any)}</p>
                              {phone && value
                                ? <a href={`tel:${value}`} className="text-sm font-bold text-[#ff7a00] underline">{value}</a>
                                : <p className="text-sm font-bold text-black">{value || "—"}</p>}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="border border-black/10 bg-[#f0f0f0] p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-black/30 mb-1">{t("driver.jobs.fuel.deliveryHistoryLabel")}</p>
                            <p className="text-sm font-bold text-black">{fuelDisplayLabel(effectiveCollFuel)}</p>
                            {effectiveCollFuel && <FuelBar level={effectiveCollFuel}/>}
                            {normalizeFuel(job.collection_fuel_level_partner) && <p className="text-xs font-bold text-amber-600 mt-1">{t("driver.jobs.fuel.officeRecordedBadge")}</p>}
                          </div>
                          <div className="border border-black/10 bg-[#f0f0f0] p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-black/30 mb-1">{t("driver.jobs.fuel.collectionHistoryLabel")}</p>
                            <p className="text-sm font-bold text-black">{fuelDisplayLabel(effectiveRetFuel)}</p>
                            {effectiveRetFuel && <FuelBar level={effectiveRetFuel}/>}
                            {normalizeFuel(job.return_fuel_level_partner) && <p className="text-xs font-bold text-amber-600 mt-1">{t("driver.jobs.fuel.officeRecordedBadge")}</p>}
                          </div>
                        </div>
                        <div className={`border p-3 ${job.insurance_docs_confirmed_by_driver ? "border-green-200 bg-green-50" : "border-black/10 bg-[#f0f0f0]"}`}>
                          <p className="text-xs font-black uppercase tracking-wide text-black/30 mb-1">{t("driver.jobs.insurance.historyLabel")}</p>
                          <p className="text-sm font-bold text-black">
                            {job.insurance_docs_confirmed_by_driver
                              ? t("driver.jobs.insurance.confirmed", { time: fmt(job.insurance_docs_confirmed_by_driver_at) })
                              : t("driver.jobs.insurance.notConfirmed")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state for active filter */}
          {activeFilter !== "all" && visibleActive.length === 0 && visibleCompleted.length === 0 && visibleCancelled.length === 0 && (
            <div className="bg-white border border-black/5 p-10 text-center">
              <p className="text-black/40 font-bold text-sm">No jobs in this category.</p>
            </div>
          )}
        </>
      )}

      <p className="text-center text-xs font-bold text-black/20 pb-4">{t("driver.jobs.footer")}</p>
    </div>
  );
}