"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestRow = {
  id: string;
  job_number: number | null;
  customer_name: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  passengers: number | null;
  vehicle_category_name: string | null;
  status: string | null;
  created_at: string;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "matched", label: "Matched" },
  { value: "booked", label: "Booked" },
  { value: "expired", label: "Expired" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function PartnerRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const res = await fetch("/api/partner/requests", {
      cache: "no-store",
      credentials: "include",
    });

    const json = await res.json();
    setRows(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="rounded-3xl bg-white p-8 shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-[#003768]">
            Requests
          </h1>

          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-xl px-4 py-2"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <button
              onClick={load}
              className="bg-[#ff7a00] text-white px-4 py-2 rounded-full"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3">View</th>
                  <th className="px-4 py-3">Job No.</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Dropoff</th>
                  <th className="px-4 py-3">Pickup Time</th>
                  <th className="px-4 py-3">Passengers</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    {/* ✅ VIEW BUTTON NOW FIRST */}
                    <td className="px-4 py-4">
                      <Link
                        href={`/partner/requests/${row.id}`}
                        className="bg-[#ff7a00] text-white px-3 py-1 rounded-full text-xs font-semibold"
                      >
                        View
                      </Link>
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#003768]">
                      {row.job_number || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {row.customer_name || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {row.pickup_address || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {row.dropoff_address || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {formatDate(row.pickup_at)}
                    </td>

                    <td className="px-4 py-4">
                      {row.passengers || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {row.vehicle_category_name || "—"}
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {row.status || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {formatDate(row.created_at)}
                    </td>
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