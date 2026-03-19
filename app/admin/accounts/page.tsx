"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountRow = {
  id: string;
  user_id?: string | null;
  email: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  application_status: string | null;
  live_profile: boolean;
  created_at: string | null;
};

type SortKey =
  | "created_desc"
  | "created_asc"
  | "company_asc"
  | "company_desc"
  | "contact_asc"
  | "contact_desc"
  | "status_asc"
  | "status_desc"
  | "live_desc"
  | "live_asc";

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

export default function AdminAccountsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_desc");
  const [appliedSortBy, setAppliedSortBy] = useState<SortKey>("created_desc");

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
        throw new Error(json?.error || json?._raw || "Failed to load accounts.");
      }

      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load accounts.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const searchValue = normalizeText(search);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!searchValue) return true;

      const haystack = [
        row.company_name,
        row.contact_name,
        row.email,
        row.phone,
        row.application_status,
        row.live_profile ? "yes live true" : "no not live false",
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(searchValue);
    });
  }, [rows, searchValue]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();

      switch (appliedSortBy) {
        case "created_asc":
          return aCreated - bCreated;
        case "created_desc":
          return bCreated - aCreated;
        case "company_asc":
          return normalizeText(a.company_name).localeCompare(normalizeText(b.company_name));
        case "company_desc":
          return normalizeText(b.company_name).localeCompare(normalizeText(a.company_name));
        case "contact_asc":
          return normalizeText(a.contact_name).localeCompare(normalizeText(b.contact_name));
        case "contact_desc":
          return normalizeText(b.contact_name).localeCompare(normalizeText(a.contact_name));
        case "status_asc":
          return normalizeText(a.application_status).localeCompare(
            normalizeText(b.application_status)
          );
        case "status_desc":
          return normalizeText(b.application_status).localeCompare(
            normalizeText(a.application_status)
          );
        case "live_asc":
          return Number(a.live_profile) - Number(b.live_profile);
        case "live_desc":
          return Number(b.live_profile) - Number(a.live_profile);
        default:
          return bCreated - aCreated;
      }
    });
  }, [filteredRows, appliedSortBy]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#003768]">Account Management</h1>
            <p className="mt-2 text-slate-600">
              View partner account details, live profile status, and key account information.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:max-w-[760px]">
            <div className="md:col-span-2">
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
              <label className="text-sm font-medium text-[#003768]">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white p-3 text-black"
              >
                <option value="created_desc">Newest created</option>
                <option value="created_asc">Oldest created</option>
                <option value="company_asc">Company A–Z</option>
                <option value="company_desc">Company Z–A</option>
                <option value="contact_asc">Contact A–Z</option>
                <option value="contact_desc">Contact Z–A</option>
                <option value="status_asc">Status A–Z</option>
                <option value="status_desc">Status Z–A</option>
                <option value="live_desc">Live profile first</option>
                <option value="live_asc">Non-live first</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSortBy("created_desc");
              setAppliedSortBy("created_desc");
            }}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={() => setAppliedSortBy(sortBy)}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Apply Sort
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

        {searchValue ? (
          <div className="mt-4 rounded-2xl border border-[#cfe2f7] bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768]">
            Showing filtered account results for:{" "}
            <span className="font-semibold">{search}</span>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Live Profile</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={8}>
                      {searchValue
                        ? "No partner accounts match this search."
                        : "No partner accounts found."}
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02]">
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

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                            row.application_status
                          )}`}
                        >
                          {statusLabel(row.application_status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {row.live_profile ? (
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