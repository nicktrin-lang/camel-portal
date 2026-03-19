"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApprovalRow = {
  id: string;
  email: string;
  company_name: string;
  full_name: string;
  phone: string;
  address: string;
  role: string;
  status: string;
  created_at: string;
  user_id: string | null;
  has_profile: boolean;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function normalizeSearchValue(value: unknown) {
  return String(value || "").toLowerCase().trim();
}

function statusPillClasses(status?: string | null) {
  switch (status) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

export default function AdminApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveProfileFilter, setLiveProfileFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/applications", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load applications.");
      }

      setRows(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load applications.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const searchValue = normalizeSearchValue(search);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && String(row.status || "").toLowerCase() !== statusFilter) {
        return false;
      }

      if (liveProfileFilter === "yes" && !row.has_profile) {
        return false;
      }

      if (liveProfileFilter === "no" && row.has_profile) {
        return false;
      }

      if (!searchValue) return true;

      const haystack = [
        row.company_name,
        row.full_name,
        row.email,
        row.phone,
        row.address,
        row.role,
        row.status,
        row.has_profile ? "yes live profile true" : "no live profile false",
      ]
        .map(normalizeSearchValue)
        .join(" ");

      return haystack.includes(searchValue);
    });
  }, [rows, searchValue, statusFilter, liveProfileFilter]);

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">
              Partner Approvals
            </h2>
            <p className="mt-2 text-slate-600">
              Review partner applications and current live profile details.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[760px]">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-[#003768]">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search company, contact, email..."
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]"
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Live Profile</label>
                <select
                  value={liveProfileFilter}
                  onChange={(e) => setLiveProfileFilter(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#0f4f8a]"
                >
                  <option value="all">All</option>
                  <option value="yes">Live only</option>
                  <option value="no">Not live only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setLiveProfileFilter("all");
                }}
                className="rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-[#003768] hover:bg-black/5"
              >
                Clear Filters
              </button>

              <button
                type="button"
                onClick={load}
                className="rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {searchValue || statusFilter !== "all" || liveProfileFilter !== "all" ? (
          <div className="mt-4 rounded-2xl border border-[#cfe2f7] bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768]">
            Showing filtered approval results.
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-slate-600">Loading applications…</p>
        ) : filteredRows.length === 0 ? (
          <p className="mt-6 text-slate-600">
            No applications found for the selected filters.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Company Name</th>
                  <th className="px-4 py-3 font-semibold">Contact Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Live Profile</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-black/5 align-top">
                    <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {row.company_name || "—"}
                    </td>
                    <td className="px-4 py-4">{row.full_name || "—"}</td>
                    <td className="px-4 py-4">{row.email || "—"}</td>
                    <td className="px-4 py-4">{row.phone || "—"}</td>
                    <td className="px-4 py-4">{row.address || "—"}</td>
                    <td className="px-4 py-4">
                      <span className="capitalize">{formatLabel(row.role)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                          row.status
                        )}`}
                      >
                        {formatLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {row.has_profile ? (
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/approvals/${row.id}`}
                        className="inline-flex rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                      >
                        View
                      </Link>
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