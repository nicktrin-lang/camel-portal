"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "super_admin";
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

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load admin users.");
      }

      setUsers(Array.isArray(json?.users) ? json.users : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin users.");
    } finally {
      setLoading(false);
    }
  }

  async function addAdmin() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          role,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to add admin user.");
      }

      setEmail("");
      setRole("admin");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add admin user.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(userId: string, nextRole: "admin" | "super_admin") {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: userId,
          role: nextRole,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to update role.");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update role.");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(userId: string) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to remove admin user.");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to remove admin user.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4">
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

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <label className="text-sm font-medium text-[#003768]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              >
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addAdmin}
                disabled={saving || !email.trim()}
                className="w-full rounded-full bg-[#ff7a00] px-5 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                Add Admin
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">{fmtDateTime(user.created_at)}</td>
                    <td className="px-4 py-4">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-[#f3f8ff] px-3 py-1 text-xs font-semibold text-[#003768]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.role === "admin" ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => updateRole(user.id, "super_admin")}
                            className="rounded-full bg-[#ff7a00] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Promote to super_admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => updateRole(user.id, "admin")}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                          >
                            Demote to admin
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeUser(user.id)}
                          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!users.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-slate-600">
                      No admin users found.
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