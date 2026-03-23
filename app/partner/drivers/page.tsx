"use client";

import { useEffect, useState } from "react";

type DriverRow = {
  id: string;
  partner_user_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function PartnerDriversPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner/drivers", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load drivers.");
      }

      setRows(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load drivers.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createDriver(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/partner/drivers", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to add driver.");
      }

      setFullName("");
      setEmail("");
      setPhone("");
      setOk("Driver added.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add driver.");
    } finally {
      setSaving(false);
    }
  }

  async function setDriverActive(id: string, action: "activate" | "deactivate") {
    setBusyId(id);
    setError(null);
    setOk(null);

    try {
      const res = await fetch(`/api/partner/drivers/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update driver.");
      }

      setOk(action === "activate" ? "Driver activated." : "Driver deactivated.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update driver.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold text-[#003768]">Drivers</h1>
        <p className="mt-2 text-slate-600">
          Add and manage drivers for your business.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Add Driver</h2>

        <form onSubmit={createDriver} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Driver full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Driver email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. driver@company.com"
              />
            </div>
          </div>

          <div className="max-w-xl">
            <label className="text-sm font-medium text-[#003768]">
              Driver phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. +44 7700 900123"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add Driver"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Driver List</h2>

        {loading ? (
          <p className="mt-6 text-slate-600">Loading drivers...</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-slate-600">No drivers added yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-black/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-[#003768]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {row.full_name}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{row.email}</td>
                    <td className="px-4 py-4 text-slate-700">{row.phone || "—"}</td>
                    <td className="px-4 py-4">
                      {row.is_active ? (
                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {row.is_active ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => setDriverActive(row.id, "deactivate")}
                          className="rounded-full border border-black/10 bg-white px-4 py-2 font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                        >
                          {busyId === row.id ? "Saving..." : "Deactivate"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => setDriverActive(row.id, "activate")}
                          className="rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                        >
                          {busyId === row.id ? "Saving..." : "Activate"}
                        </button>
                      )}
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