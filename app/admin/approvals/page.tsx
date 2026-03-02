"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppStatus = "pending" | "approved" | "rejected";

type PartnerApplication = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  status: AppStatus;
  created_at: string | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// Robust helper: never throws "Unexpected end of JSON input"
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function AdminApprovalsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      // Ensure a session exists client-side
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in.");

      // ✅ IMPORTANT FOR PRODUCTION:
      // Send Supabase auth cookies to the API route
      const res = await fetch("/api/admin/applications", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          json?._raw ||
          "Failed to load applications.";
        throw new Error(msg);
      }

      setRows((json?.data || []) as PartnerApplication[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load applications.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: AppStatus) {
    setError(null);

    try {
      const res = await fetch("/api/admin/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          json?._raw ||
          "Failed to update status.";
        throw new Error(msg);
      }

      // Fast UI update + reload for consistency
      setRows((prev) =>
        prev.map((r) => (String(r.id) === String(id) ? { ...r, status } : r))
      );

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003768]">
            Admin Approvals
          </h1>
          <p className="mt-2 text-gray-600">
            Review partner applications and approve/reject them.
          </p>

          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Pending:</span> {pending}{" "}
            <span className="text-gray-400">•</span>{" "}
            <span className="font-medium">Approved:</span> {approved}{" "}
            <span className="text-gray-400">•</span>{" "}
            <span className="font-medium">Rejected:</span> {rejected}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#003768] hover:bg-black/5 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <Link
            href="/partner/dashboard"
            className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f3f8ff]">
              <tr className="text-[#003768]">
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={6}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const status = (r.status || "pending")
                    .toLowerCase() as AppStatus;

                  const badge =
                    status === "approved"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : status === "rejected"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-yellow-50 text-yellow-800 border-yellow-200";

                  return (
                    <tr key={String(r.id)} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-gray-700">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {r.email || "—"}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {r.full_name || "—"}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {r.company_name || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setStatus(String(r.id), "approved")}
                            className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatus(String(r.id), "rejected")}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatus(String(r.id), "pending")}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                          >
                            Set pending
                          </button>
                        </div>
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
  );
}