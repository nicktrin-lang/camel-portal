"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppStatus = "pending" | "approved" | "rejected";

type PartnerApplication = {
  id: string;
  email: string | null;
  company_name: string | null;
  full_name: string | null;
  status: AppStatus;
  created_at: string | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
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

export default function AdminApprovalsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error("Not authorized");
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        throw new Error("Not authorized");
      }

      const res = await fetch("/api/admin/applications", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load applications.");
      }

      setApplications(Array.isArray(json?.applications) ? json.applications : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: AppStatus) {
    setSavingId(id);
    setError(null);

    try {
      const res = await fetch("/api/admin/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to update status.");
      }

      setApplications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Approvals</h2>
            <p className="mt-2 text-slate-600">
              Review partner applications and approve/reject them.
            </p>
            <p className="mt-4 text-slate-600">
              Pending: {pendingCount} • Approved: {approvedCount} • Rejected: {rejectedCount}
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
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-4">{fmtDateTime(app.created_at)}</td>
                    <td className="px-4 py-4">{app.email || "—"}</td>
                    <td className="px-4 py-4">{app.full_name || "—"}</td>
                    <td className="px-4 py-4">{app.company_name || "—"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          app.status === "approved"
                            ? "bg-green-50 text-green-700"
                            : app.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-800",
                        ].join(" ")}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingId === app.id}
                          onClick={() => setStatus(app.id, "approved")}
                          className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={savingId === app.id}
                          onClick={() => setStatus(app.id, "rejected")}
                          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          disabled={savingId === app.id}
                          onClick={() => setStatus(app.id, "pending")}
                          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                        >
                          Pause
                        </button>

                        <Link
                          href={`/admin/approvals/${app.id}`}
                          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {!applications.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-slate-600">
                      No partner applications found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}