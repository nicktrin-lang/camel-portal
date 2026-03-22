"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ApprovalRow = {
  id: string;
  user_id?: string | null;
  email: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  status: string | null;
  is_live_profile?: boolean | null;
  live_profile?: boolean | null;
  created_at: string | null;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function statusPillClasses(status?: string | null) {
  switch (normalizeText(status)) {
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

function statusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function liveValue(row: ApprovalRow) {
  return !!(row.is_live_profile ?? row.live_profile ?? false);
}

export default function AdminApprovalsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveFilter, setLiveFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const res = await fetch("/api/admin/applications", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load partner approvals.");
      }

      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load partner approvals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const searchValue = normalizeText(search);

  const filteredRows = rows.filter((row) => {
    if (searchValue) {
      const haystack = [
        row.company_name,
        row.contact_name,
        row.email,
        row.phone,
        row.address,
        row.role,
        row.status,
        liveValue(row) ? "yes live true" : "no not live false",
      ]
        .map(normalizeText)
        .join(" ");

      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    if (statusFilter !== "all" && normalizeText(row.status) !== normalizeText(statusFilter)) {
      return false;
    }

    if (liveFilter === "yes" && !liveValue(row)) {
      return false;
    }

    if (liveFilter === "no" && liveValue(row)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#003768]">Partner Approvals</h1>
            <p className="mt-2 text-slate-600">
              Review partner applications and current live profile details.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:max-w-[900px]">
            <div>
              <label className="text-sm font-medium text-[#003768]">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, contact, email, phone..."
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white p-3 text-black"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Live Profile</label>
              <select
                value={liveFilter}
                onChange={(e) => setLiveFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white p-3 text-black"
              >
                <option value="all">All</option>
                <option value="yes">Live only</option>
                <option value="no">Not live</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setLiveFilter("all");
            }}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
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

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={10}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={10}>
                      No partner applications found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-slate-700">
                        {formatDateTime(row.created_at)}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-900">
                        {row.company_name || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {row.contact_name || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">{row.email || "—"}</td>

                      <td className="px-4 py-4 text-slate-700">{row.phone || "—"}</td>

                      <td className="px-4 py-4 text-slate-700">{row.address || "—"}</td>

                      <td className="px-4 py-4 text-slate-700">
                        {row.role || "Partner"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                            row.status
                          )}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {liveValue(row) ? (
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