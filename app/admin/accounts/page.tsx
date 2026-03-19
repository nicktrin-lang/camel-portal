"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountRow = {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  address: string;
  website: string;
  role: string;
  status: string;
  created_at: string | null;
  user_id: string | null;
  has_profile: boolean;
  service_radius_km: number | null;
  base_address: string;
  fleet_count: number;
  is_live_profile: boolean;
  live_profile_reason: string;
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

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
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

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function AdminAccountsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

      const res = await fetch("/api/admin/accounts", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load partner accounts.");
      }

      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load partner accounts.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return [
      row.company_name,
      row.contact_name,
      row.email,
      row.phone,
      row.address,
      row.website,
      row.status,
      row.base_address,
      row.live_profile_reason,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const totalPartners = rows.length;
  const approvedPartners = rows.filter((row) => String(row.status).toLowerCase() === "approved").length;
  const pendingPartners = rows.filter((row) => String(row.status).toLowerCase() === "pending").length;
  const liveProfiles = rows.filter((row) => row.is_live_profile).length;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Total Partners</p>
          <p className="mt-1 text-2xl font-semibold text-[#003768]">{totalPartners}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{approvedPartners}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pendingPartners}</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Live Profiles</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{liveProfiles}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Account Management</h2>
            <p className="mt-2 text-slate-600">
              View partner account details, application status, live profile readiness,
              and key account information.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, email..."
              className="w-full rounded-xl border border-black/10 p-3 text-black sm:w-80"
            />

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Live Profile</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-left text-slate-600" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-left text-slate-600" colSpan={8}>
                      No partner accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02] align-top">
                      <td className="px-4 py-4 text-left text-slate-700">
                        {formatDateTime(row.created_at)}
                      </td>

                      <td className="px-4 py-4 text-left font-medium text-slate-900">
                        {row.company_name || "—"}
                      </td>

                      <td className="px-4 py-4 text-left text-slate-700">
                        {row.contact_name || "—"}
                      </td>

                      <td className="px-4 py-4 text-left text-slate-700">
                        {row.email || "—"}
                      </td>

                      <td className="px-4 py-4 text-left text-slate-700">
                        {row.phone || "—"}
                      </td>

                      <td className="px-4 py-4 text-left">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                            row.status
                          )}`}
                        >
                          {formatLabel(row.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-left">
                        <div className="space-y-2">
                          {row.is_live_profile ? (
                            <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              Yes
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                No
                              </span>
                              <div className="text-xs text-slate-500">
                                {row.live_profile_reason || "Requirements not met"}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-left">
                        <Link
                          href={`/admin/accounts/${row.id}`}
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