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

export default function PartnerDriversPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function loadDrivers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/drivers", {
        method: "GET", credentials: "include", cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load drivers.");
      setRows(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDrivers(); }, []);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setOk(null);
    try {
      const res = await fetch("/api/partner/drivers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, phone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add driver.");
      setFullName(""); setEmail(""); setPhone("");
      setOk("Driver added successfully.");
      await loadDrivers();
    } catch (e: any) {
      setError(e?.message || "Failed to add driver.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDriver(driverId: string, nextIsActive: boolean) {
    setTogglingId(driverId); setError(null); setOk(null);
    try {
      const res = await fetch(`/api/partner/drivers/${driverId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextIsActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update driver.");
      setOk(nextIsActive ? "Driver activated." : "Driver deactivated.");
      await loadDrivers();
    } catch (e: any) {
      setError(e?.message || "Failed to update driver.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok    && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      <div>
        <h1 className="text-3xl font-semibold text-[#003768]">Drivers</h1>
        <p className="mt-2 text-slate-600">Add and manage drivers for your business.</p>
      </div>

      {/* Driver portal info card */}
      <div className="rounded-3xl border border-[#003768]/10 bg-[#f3f8ff] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#003768]">🚗 Driver Portal</h2>
            <p className="mt-1 text-sm text-slate-600">
              Each driver you add here needs to log in to the Camel Global Driver Portal to accept jobs, record fuel levels, and confirm vehicle collections and returns.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Share the driver portal link with your drivers so they can log in with the email address you registered them with.
            </p>
          </div>
          <a
            href="/driver/login"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-[#003768] px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 transition-opacity"
          >
            Open Driver Portal →
          </a>
        </div>
        <div className="mt-4 rounded-2xl border border-[#003768]/10 bg-white px-4 py-3 text-sm text-[#003768]">
          <span className="font-semibold">Driver login URL: </span>
          <span className="font-mono text-slate-600 select-all">
            {typeof window !== "undefined" ? `${window.location.origin}/driver/login` : "/driver/login"}
          </span>
        </div>
      </div>

      {/* Add driver form */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Add Driver</h2>
        <form onSubmit={addDriver} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">Driver full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. John Smith" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Driver email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. driver@company.com" />
            </div>
          </div>
          <div className="max-w-xl">
            <label className="text-sm font-medium text-[#003768]">Driver phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. +34 600 000 000" />
          </div>
          <button type="submit" disabled={saving}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {saving ? "Adding..." : "Add Driver"}
          </button>
        </form>
      </div>

      {/* Driver list */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Driver List</h2>
        {loading ? (
          <p className="mt-6 text-slate-600">Loading drivers…</p>
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
                {rows.map(driver => (
                  <tr key={driver.id} className="border-t">
                    <td className="px-4 py-4 font-semibold text-slate-900">{driver.full_name}</td>
                    <td className="px-4 py-4">{driver.email}</td>
                    <td className="px-4 py-4">{driver.phone || "—"}</td>
                    <td className="px-4 py-4">
                      {driver.is_active ? (
                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Active</span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{new Date(driver.created_at).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <button type="button"
                        onClick={() => toggleDriver(driver.id, !driver.is_active)}
                        disabled={togglingId === driver.id}
                        className="rounded-full border border-black/10 bg-white px-4 py-2 font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60">
                        {togglingId === driver.id ? "Saving..." : driver.is_active ? "Deactivate" : "Activate"}
                      </button>
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