"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  request_id: string;
  partner_user_id: string;
  winning_bid_id: string;
  booking_status: string;
  amount: number | null;
  notes: string | null;
  created_at: string;
  job_number: number | null;

  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_notes: string | null;
  driver_assigned_at: string | null;

  partner_company_name: string | null;
  partner_company_phone: string | null;

  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number | null;
  suitcases: number | null;
  hand_luggage: number | null;
  vehicle_category_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  request_notes: string | null;
  request_status: string | null;
  request_created_at: string | null;
  request_expires_at: string | null;

  role?: string | null;
  adminMode?: boolean;
};

type ApiResponse = {
  data: BookingRow[];
  role: string | null;
  adminMode: boolean;
};

const BOOKING_FILTERS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "driver_assigned", label: "Driver Assigned" },
  { value: "en_route", label: "En Route" },
  { value: "arrived", label: "Arrived" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
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

function formatGBP(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatStatusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function statusPillClasses(status?: string | null) {
  switch (status) {
    case "confirmed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "driver_assigned":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "en_route":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "arrived":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

export default function PartnerBookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner/bookings", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        throw new Error((json as any)?.error || "Failed to load bookings.");
      }

      setRows(json?.data || []);
      setRole(json?.role || null);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) {
      setError(e?.message || "Failed to load bookings.");
      setRows([]);
      setRole(null);
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
    return rows.filter((row) => row.booking_status === selectedFilter);
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
            <h1 className="text-3xl font-semibold text-[#003768]">Bookings</h1>
            <p className="mt-2 text-slate-600">
              {adminMode
                ? "All bookings across the network."
                : "Bookings assigned to your partner account."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Signed in role: {role || "—"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]"
            >
              {BOOKING_FILTERS.map((item) => (
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
          <p className="mt-6 text-slate-600">Loading bookings…</p>
        ) : filteredRows.length === 0 ? (
          <p className="mt-6 text-slate-600">No bookings found for this filter.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">View</th>
                  <th className="px-4 py-3 font-semibold">Job No.</th>
                  {adminMode ? (
                    <th className="px-4 py-3 font-semibold">Partner</th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Booking Status</th>
                  <th className="px-4 py-3 font-semibold">Request Status</th>
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-black/5 align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/partner/bookings/${row.id}`}
                        className="inline-flex rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                      >
                        View
                      </Link>
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#003768]">
                      {row.job_number ?? "—"}
                    </td>

                    {adminMode ? (
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {row.partner_company_name || "—"}
                        </div>
                        <div className="text-slate-500">
                          {row.partner_company_phone || "—"}
                        </div>
                      </td>
                    ) : null}

                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {row.customer_name || "—"}
                      </div>
                      <div className="text-slate-500">
                        {row.customer_phone || row.customer_email || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-4">{row.pickup_address || "—"}</td>
                    <td className="px-4 py-4">{row.dropoff_address || "—"}</td>
                    <td className="px-4 py-4">{formatDateTime(row.pickup_at)}</td>
                    <td className="px-4 py-4">
                      {formatDuration(row.journey_duration_minutes)}
                    </td>
                    <td className="px-4 py-4">{row.vehicle_category_name || "—"}</td>
                    <td className="px-4 py-4">{formatGBP(row.amount)}</td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                          row.booking_status
                        )}`}
                      >
                        {formatStatusLabel(row.booking_status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="capitalize text-slate-700">
                        {formatStatusLabel(row.request_status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {row.driver_name || "—"}
                      </div>
                      <div className="text-slate-500">
                        {row.driver_vehicle || row.driver_phone || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}