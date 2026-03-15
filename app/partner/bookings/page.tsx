"use client";

import { useEffect, useState } from "react";

type BookingRow = {
  id: string;
  booking_status: string;
  amount: number;
  created_at: string;
  request_id: string;
  winning_bid_id: string | null;
  customer_requests: {
    pickup_address: string;
    dropoff_address: string | null;
    pickup_at: string;
    passengers: number;
    suitcases: number;
    hand_luggage: number;
    vehicle_category_name: string | null;
    status: string;
  } | null;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function PartnerBookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
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

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load bookings.");
      }

      setRows((json?.data || []) as BookingRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load bookings.");
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Bookings</h2>
            <p className="mt-2 text-slate-600">
              Accepted bookings assigned to your partner account.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Dropoff</th>
                  <th className="px-4 py-3 font-semibold">Pickup Time</th>
                  <th className="px-4 py-3 font-semibold">Passengers</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-5 text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-5 text-slate-600">
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const req = row.customer_requests;

                    return (
                      <tr key={row.id} className="hover:bg-black/[0.02]">
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDateTime(row.created_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-900">
                          {req?.pickup_address || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-900">
                          {req?.dropoff_address || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {fmtDateTime(req?.pickup_at)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {req?.passengers || 0}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {req?.vehicle_category_name || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{row.amount}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            {row.booking_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}