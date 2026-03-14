"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AdminRole = "admin" | "super_admin";

type AdminUserRow = {
  id?: string;
  email: string;
  role: AdminRole;
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

export default function AdminUsersPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [saving, setSaving] = useState(false);

  async function ensureSuperAdmin() {
    const meRes = await fetch("/api/admin/me", {
      cache: "no-store",
      credentials: "include",
    });
    const me = await safeJson(meRes);

    if (me?.role !== "super_admin") {
      router.replace("/partner/login?reason=not_authorized");
      return false;
    }

    return true;
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const ok = await ensureSuperAdmin();
      if (!ok) return;

      const res = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load admins.");
      }

      setRows((json?.users || []) as AdminUserRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load admins.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function addAdmin() {
    setError(null);
    const email = newEmail.trim().toLowerCase();

    if (!email) {
      setError("Enter an email.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: newRole }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to add admin.");
      }

      setNewEmail("");
      setNewRole("admin");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add admin.");
    } finally {
      setSaving(false);
    }
  }

  async function setRole(email: string, role: AdminRole) {
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to update role.");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update role.");
    }
  }

  async function removeAdmin(email: string) {
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to remove admin.");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to remove admin.");
    }
  }

  useEffect(() => {
    load();
  }, []);

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
            <h2 className="text-2xl font-semibold text-[#003768]">Admin Users</h2>
            <p className="mt-2 text-slate-600">
              Super admin can add/remove admins and promote them.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[#003768]">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@email.com"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Role</label>
              <select
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
              >
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addAdmin}
                disabled={saving}
                className="w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Add Admin"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={4}>
                      No admin users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.email}-${idx}`} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 text-slate-700">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-4 text-slate-900">{r.email}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#003768]">
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {r.role !== "admin" ? (
                            <button
                              type="button"
                              onClick={() => setRole(r.email, "admin")}
                              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                            >
                              Demote to admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRole(r.email, "super_admin")}
                              className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                            >
                              Promote to super_admin
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removeAdmin(r.email)}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Remove
                          </button>
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