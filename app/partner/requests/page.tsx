"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  request_status: string;
  status: string;
  created_at: string;
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
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function statusLabel(status?: string) {
  switch (status) {
    case "bid_submitted":
      return "Bid Submitted";
    case "accepted":
      return "Accepted";
    case "open":
    default:
      return "Open";
  }
}

export default function PartnerRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
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

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load requests.");
      }

      setRows(json?.data || []);
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
    <div className="px-4 py-8 md:px-8">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#003768]">
              Booking Requests
            </h1>
            <p className="mt-2 text-slate-600">
              Open booking requests matched to your fleet and service area.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-slate-600">Loading requests…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-slate-600">No requests available.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job No.</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Dropoff Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Passengers</th>
                  <th className="px-4 py-3 font-semibold">Bags</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-black/5">
                    <td className="px-4 py-4 font-semibold text-[#003768]">
                      {row.job_number ?? "—"}
                    </td>
                    <td className="px-4 py-4">{fmtDateTime(row.created_at)}</td>
                    <td className="px-4 py-4">{row.pickup_address}</td>
                    <td className="px-4 py-4">{row.dropoff_address || "—"}</td>
                    <td className="px-4 py-4">{fmtDateTime(row.pickup_at)}</td>
                    <td className="px-4 py-4">{fmtDateTime(row.dropoff_at)}</td>
                    <td className="px-4 py-4">
                      {fmtDuration(row.journey_duration_minutes)}
                    </td>
                    <td className="px-4 py-4">{row.passengers}</td>
                    <td className="px-4 py-4">
                      {row.suitcases} suitcases / {row.hand_luggage} hand luggage
                    </td>
                    <td className="px-4 py-4">
                      {row.vehicle_category_name || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[#f3d36b] bg-[#fff9e8] px-4 py-1 text-xs font-semibold text-[#b96a00]">
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/partner/requests/${row.id}`}
                        className="inline-flex rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 py-4 text-sm text-slate-500">
              Requests shown here should later be filtered by both your fleet
              capability and service radius.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}