"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestRow = {
  id: string;
  job_number: number | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number;
  suitcases: number;
  hand_luggage: number;
  vehicle_category_name: string | null;
  status: string;
  request_status: string;
  created_at: string;
  expires_at?: string | null;
};

type ApiResponse = {
  data: RequestRow[];
  role: string | null;
  adminMode: boolean;
};

const REQUEST_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "bid_submitted", label: "Bid Submitted" },
  { value: "bid_successful", label: "Bid Successful" },
  { value: "bid_unsuccessful", label: "Bid Unsuccessful" },
  { value: "expired", label: "Expired" },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }

  const minutesPerDay = 24 * 60;

  if (minutes >= minutesPerDay) {
    const days = Math.ceil(minutes / minutesPerDay);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatStatusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function bookingStatusPillClasses(status?: string | null) {
  switch (status) {
    case "open":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "confirmed":
      return "border-green-200 bg-green-50 text-green-700";
    case "expired":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

function requestStatusPillClasses(status?: string | null) {
  switch (status) {
    case "open":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "bid_submitted":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "bid_successful":
      return "border-green-200 bg-green-50 text-green-700";
    case "bid_unsuccessful":
      return "border-red-200 bg-red-50 text-red-700";
    case "expired":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "confirmed":
      return "border-green-200 bg-green-50 text-green-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

export default function PartnerRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner/requests", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        throw new Error((json as any)?.error || "Failed to load requests.");
      }

      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
      setAdminMode(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (selectedFilter === "all") return rows;
    return rows.filter((row) => row.status === selectedFilter);
  }, [rows, selectedFilter]);

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#003768]">Requests</h1>
            <p className="mt-2 text-slate-600">
              {adminMode
                ? "All request history across the network."
                : "Request history matched to your partner account."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]"
            >
              {REQUEST_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={load}
              className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-slate-600">Loading requests…</p>
        ) : filteredRows.length === 0 ? (
          <p className="mt-6 text-slate-600">No requests found for this filter.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">View</th>
                  <th className="px-4 py-3 font-semibold">Job No.</th>
                  <th className="px-4 py-3 font-semibold">Booking Status</th>
                  <th className="px-4 py-3 font-semibold">Request Status</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Dropoff Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Passengers</th>
                  <th className="px-4 py-3 font-semibold">Bags</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const effectiveBookingStatus = row.request_status;
                  const effectiveRequestStatus = row.status;

                  return (
                    <tr key={row.id} className="border-t border-black/5 align-top">
                      <td className="px-4 py-4">
                        <Link
                          href={`/partner/requests/${row.id}`}
                          className="inline-flex rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                        >
                          View
                        </Link>
                      </td>

                      <td className="px-4 py-4 font-semibold text-[#003768]">
                        {row.job_number ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${bookingStatusPillClasses(
                            effectiveBookingStatus
                          )}`}
                        >
                          {formatStatusLabel(effectiveBookingStatus)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${requestStatusPillClasses(
                            effectiveRequestStatus
                          )}`}
                        >
                          {formatStatusLabel(effectiveRequestStatus)}
                        </span>
                      </td>

                      <td className="px-4 py-4">{row.pickup_address || "—"}</td>
                      <td className="px-4 py-4">{row.dropoff_address || "—"}</td>
                      <td className="px-4 py-4">{formatDateTime(row.pickup_at)}</td>
                      <td className="px-4 py-4">{formatDateTime(row.dropoff_at)}</td>
                      <td className="px-4 py-4">
                        {formatDuration(row.journey_duration_minutes)}
                      </td>
                      <td className="px-4 py-4">{row.passengers}</td>
                      <td className="px-4 py-4">
                        {row.suitcases} suitcases / {row.hand_luggage} hand luggage
                      </td>
                      <td className="px-4 py-4">{row.vehicle_category_name || "—"}</td>
                      <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}