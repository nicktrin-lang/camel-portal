"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppStatus = "pending" | "approved" | "rejected";

type PartnerApplicationRow = {
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
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartnerApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        throw new Error(json?.error || json?._raw || "Failed to load applications.");
      }

      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load applications.");
      setRows([]);
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

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const rejectedCount = rows.filter((r) => r.status === "rejected").length;

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
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Approvals</h2>
            <p className="mt-2 text-slate-600">
              Review partner applications and approve/reject them.
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Pending: {pendingCount} • Approved: {approvedCount} • Rejected: {rejectedCount}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-slate-600">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-slate-600">
                      No partner applications found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-slate-700">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-4 text-slate-900">{r.email || "—"}</td>
                      <td className="px-4 py-4 text-[#003768]">{r.full_name || "—"}</td>
                      <td className="px-4 py-4 text-[#003768]">{r.company_name || "—"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            r.status === "approved"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : r.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-yellow-200 bg-yellow-50 text-yellow-800",
                          ].join(" ")}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingId === r.id}
                            onClick={() => setStatus(r.id, "approved")}
                            className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            disabled={savingId === r.id}
                            onClick={() => setStatus(r.id, "rejected")}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            disabled={savingId === r.id}
                            onClick={() => setStatus(r.id, "pending")}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                          >
                            Pause
                          </button>

                          <Link
                            href={`/admin/approvals/${r.id}`}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                          >
                            View
                          </Link>
                        </div>
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