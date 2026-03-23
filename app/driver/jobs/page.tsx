"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DriverInfo = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type DriverJob = {
  booking_id: string;
  request_id: string;
  job_number: number | null;
  booking_status: string;
  booking_status_label: string;
  amount: number | null;
  created_at: string;

  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_notes: string | null;
  driver_assigned_at: string | null;

  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_category_name: string | null;

  collection_confirmed_by_driver?: boolean | null;
  collection_confirmed_by_driver_at?: string | null;
  collection_fuel_level_driver?: string | null;

  return_confirmed_by_driver?: boolean | null;
  return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
};

type ApiResponse = {
  driver: DriverInfo;
  jobs: DriverJob[];
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function fuelLabel(value?: string | null) {
  switch (String(value || "").toLowerCase()) {
    case "full":
      return "Full";
    case "3/4":
      return "3/4";
    case "half":
      return "Half";
    case "quarter":
      return "Quarter";
    case "empty":
      return "Empty";
    default:
      return "—";
  }
}

function bucketLabel(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "awaiting delivery":
      return "Awaiting delivery";
    case "on hire":
      return "On Hire";
    case "completed":
      return "Completed";
    default:
      return "Other";
  }
}

export default function DriverJobsPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [fuelInputs, setFuelInputs] = useState<Record<string, FuelLevel>>({});

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/driver/jobs", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load driver jobs.");
      }

      const next = json as ApiResponse;
      setDriver(next.driver || null);
      setJobs(next.jobs || []);

      const nextFuelInputs: Record<string, FuelLevel> = {};
      for (const job of next.jobs || []) {
        nextFuelInputs[job.booking_id] = "full";
      }
      setFuelInputs(nextFuelInputs);
    } catch (e: any) {
      setError(e?.message || "Failed to load driver jobs.");
      setDriver(null);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const awaiting = jobs.filter(
      (job) => bucketLabel(job.booking_status_label) === "Awaiting delivery"
    );
    const onHire = jobs.filter(
      (job) => bucketLabel(job.booking_status_label) === "On Hire"
    );
    const completed = jobs.filter(
      (job) => bucketLabel(job.booking_status_label) === "Completed"
    );

    return { awaiting, onHire, completed };
  }, [jobs]);

  async function confirmStage(
    bookingId: string,
    stage: "collection" | "return"
  ) {
    setSavingId(bookingId);
    setError(null);
    setOk(null);

    try {
      const res = await fetch(`/api/driver/bookings/${bookingId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
          fuel_level: fuelInputs[bookingId] || "full",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save driver confirmation.");
      }

      setOk(
        stage === "collection"
          ? "Collection confirmed."
          : "Return confirmed."
      );

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save driver confirmation.");
    } finally {
      setSavingId(null);
    }
  }

  function renderJobCard(job: DriverJob, mode: "collection" | "return" | "readonly") {
    return (
      <div
        key={job.booking_id}
        className="rounded-2xl border border-black/10 p-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p><span className="font-semibold text-slate-900">Job No.:</span> {job.job_number ?? "—"}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> {job.booking_status_label}</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {job.vehicle_category_name || "—"}</p>

          <p><span className="font-semibold text-slate-900">Customer:</span> {job.customer_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Customer phone:</span> {job.customer_phone || "—"}</p>
          <p><span className="font-semibold text-slate-900">Driver vehicle:</span> {job.driver_vehicle || "—"}</p>

          <p><span className="font-semibold text-slate-900">Pickup:</span> {job.pickup_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {job.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Assigned at:</span> {formatDateTime(job.driver_assigned_at)}</p>

          <p><span className="font-semibold text-slate-900">Pickup time:</span> {formatDateTime(job.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {formatDateTime(job.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Created:</span> {formatDateTime(job.created_at)}</p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-slate-50 p-4">
            <h4 className="text-lg font-semibold text-[#003768]">Driver Collection</h4>
            <div className="mt-4 space-y-2 text-slate-700">
              <p><span className="font-semibold text-slate-900">Confirmed:</span> {job.collection_confirmed_by_driver ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Fuel:</span> {fuelLabel(job.collection_fuel_level_driver)}</p>
              <p><span className="font-semibold text-slate-900">Confirmed at:</span> {formatDateTime(job.collection_confirmed_by_driver_at)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-slate-50 p-4">
            <h4 className="text-lg font-semibold text-[#003768]">Driver Return</h4>
            <div className="mt-4 space-y-2 text-slate-700">
              <p><span className="font-semibold text-slate-900">Confirmed:</span> {job.return_confirmed_by_driver ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Fuel:</span> {fuelLabel(job.return_fuel_level_driver)}</p>
              <p><span className="font-semibold text-slate-900">Confirmed at:</span> {formatDateTime(job.return_confirmed_by_driver_at)}</p>
            </div>
          </div>
        </div>

        {mode !== "readonly" ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-4">
            <div className="max-w-sm">
              <label className="text-sm font-medium text-[#003768]">
                Fuel level
              </label>
              <select
                value={fuelInputs[job.booking_id] || "full"}
                onChange={(e) =>
                  setFuelInputs((prev) => ({
                    ...prev,
                    [job.booking_id]: e.target.value as FuelLevel,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]"
                disabled={savingId === job.booking_id}
              >
                <option value="full">full</option>
                <option value="3/4">3/4</option>
                <option value="half">half</option>
                <option value="quarter">quarter</option>
                <option value="empty">empty</option>
              </select>
            </div>

            <div className="mt-4">
              {mode === "collection" ? (
                <button
                  type="button"
                  onClick={() => confirmStage(job.booking_id, "collection")}
                  disabled={savingId === job.booking_id}
                  className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingId === job.booking_id
                    ? "Saving..."
                    : "Confirm Collection"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => confirmStage(job.booking_id, "return")}
                  disabled={savingId === job.booking_id}
                  className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingId === job.booking_id
                    ? "Saving..."
                    : "Confirm Return"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Driver Jobs</h1>
          <p className="mt-2 text-slate-600">
            View bookings assigned to your driver account.
          </p>
          {driver ? (
            <p className="mt-2 text-sm text-slate-500">
              Signed in as <span className="font-semibold">{driver.full_name}</span>
            </p>
          ) : null}
        </div>

        <Link
          href="/driver/jobs"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Refresh
        </Link>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading jobs…</p>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">
              Awaiting delivery
            </h2>

            {grouped.awaiting.length === 0 ? (
              <p className="mt-4 text-slate-600">No awaiting delivery jobs.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {grouped.awaiting.map((job) => renderJobCard(job, "collection"))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">On Hire</h2>

            {grouped.onHire.length === 0 ? (
              <p className="mt-4 text-slate-600">No on hire jobs.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {grouped.onHire.map((job) => renderJobCard(job, "return"))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">Completed</h2>

            {grouped.completed.length === 0 ? (
              <p className="mt-4 text-slate-600">No completed jobs.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {grouped.completed.map((job) => renderJobCard(job, "readonly"))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}