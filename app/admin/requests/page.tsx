"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminRequestRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
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
  created_at: string;
  bid_count: number;
  has_accepted_bid: boolean;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/requests", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load requests.");
      }

      setRows((json?.data || []) as AdminRequestRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Requests</h2>
            <p className="mt-2 text-slate-600">
              Review customer requests and partner bids.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Dropoff Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Bids</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-5 text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-5 text-slate-600">
                      No customer requests found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-slate-700">
                        {fmtDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-900">
                        {row.customer_name || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-900">{row.pickup_address}</td>
                      <td className="px-4 py-4 text-slate-900">
                        {row.dropoff_address || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {fmtDateTime(row.pickup_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {fmtDateTime(row.dropoff_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {fmtDuration(row.journey_duration_minutes)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {row.vehicle_category_name || "Any suitable vehicle"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.bid_count}</td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            row.has_accepted_bid || row.status === "booked"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-yellow-200 bg-yellow-50 text-yellow-800",
                          ].join(" ")}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/requests/${row.id}`}
                          className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                        >
                          View Request
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}