"use client";

import { useEffect, useState } from "react";

type Status = "pending" | "sent" | "bounced" | "replied" | "onboarded";

type Prospect = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  city: string | null;
  country: string | null;
  status: Status;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<Status, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  sent:      "bg-blue-100 text-blue-800",
  bounced:   "bg-red-100 text-red-800",
  replied:   "bg-purple-100 text-purple-800",
  onboarded: "bg-green-100 text-green-800",
};

const STATUS_OPTIONS: Status[] = ["pending", "sent", "bounced", "replied", "onboarded"];

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB"); } catch { return v; }
}

export default function OutreachPage() {
  const [prospects, setProspects]   = useState<Prospect[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [sending, setSending]       = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<Record<string, "ok" | "error">>({});
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  // Add form state
  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", city: "", country: "Spain", notes: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/prospects");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setProspects(json.prospects || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSend(id: string) {
    setSending(id);
    setSendResult(r => ({ ...r, [id]: undefined as any }));
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      setSendResult(r => ({ ...r, [id]: "ok" }));
      setProspects(p => p.map(x => x.id === id ? { ...x, status: "sent", sent_at: new Date().toISOString() } : x));
    } catch (e: any) {
      setSendResult(r => ({ ...r, [id]: "error" }));
      alert(`Send failed: ${e?.message}`);
    } finally {
      setSending(null);
    }
  }

  async function handleBulkSend() {
    const pending = prospects.filter(p => p.status === "pending");
    if (pending.length === 0) { alert("No pending prospects to send to."); return; }
    if (!confirm(`Send emails to ${pending.length} pending prospect(s)? Claude will generate a personalised email for each.`)) return;
    setBulkSending(true);
    for (const p of pending) {
      await handleSend(p.id);
      await new Promise(r => setTimeout(r, 800)); // small delay between sends
    }
    setBulkSending(false);
  }

  async function handleStatusChange(id: string, status: Status) {
    setProspects(p => p.map(x => x.id === id ? { ...x, status } : x));
    await fetch(`/api/admin/outreach/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/outreach/prospects/${id}`, { method: "DELETE" });
      setProspects(p => p.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/outreach/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add");
      setProspects(p => [json.prospect, ...p]);
      setForm({ company_name: "", contact_name: "", email: "", city: "", country: "Spain", notes: "" });
      setShowAdd(false);
    } catch (e: any) {
      setAddError(e?.message || "Failed to add prospect");
    } finally {
      setAddLoading(false);
    }
  }

  const filtered = statusFilter === "all" ? prospects : prospects.filter(p => p.status === statusFilter);

  const counts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-black">Partner Outreach</h1>
          <p className="mt-1 text-sm font-semibold text-black/50">
            AI-powered email outreach to prospective car hire partners
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleBulkSend}
            disabled={bulkSending || loading}
            className="bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {bulkSending ? "Sending…" : `Send All Pending (${counts["pending"] || 0})`}
          </button>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 transition-opacity"
          >
            {showAdd ? "Cancel" : "+ Add Prospect"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(prev => prev === s ? "all" : s)}
            className={[
              "border p-3 text-left transition-all",
              statusFilter === s ? "border-black ring-2 ring-black" : "border-black/10 bg-white hover:border-black/30",
            ].join(" ")}
          >
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{s}</p>
            <p className="mt-1 text-2xl font-black text-black">{counts[s] || 0}</p>
          </button>
        ))}
      </div>

      {/* Add Prospect Form */}
      {showAdd && (
        <div className="border border-black/10 bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-black">Add Prospect</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Company Name *</label>
              <input
                required
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Hertz Spain SL"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Contact Name</label>
              <input
                value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Juan García"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="info@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">City</label>
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Madrid"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Country</label>
              <input
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Spain"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Found via Google Maps, serves Malaga airport"
              />
            </div>
            {addError && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{addError}</div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={addLoading}
                className="bg-[#ff7a00] px-6 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40"
              >
                {addLoading ? "Adding…" : "Add Prospect"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-sm font-black text-black/50 hover:text-black">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="border border-black/10 bg-white overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm font-semibold text-black/40">Loading prospects…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-black text-black/40 uppercase tracking-widest">No prospects found</p>
            <p className="mt-2 text-xs font-semibold text-black/30">
              {statusFilter !== "all" ? `No ${statusFilter} prospects.` : "Add your first prospect using the button above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-[#f0f0f0]">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-black/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[#f8f8f8] transition-colors">
                    <td className="px-4 py-3 font-black text-black">{p.company_name}</td>
                    <td className="px-4 py-3 font-semibold text-black/70">{p.contact_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-black/70 text-xs">{p.email}</td>
                    <td className="px-4 py-3 font-semibold text-black/70 text-xs">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={e => handleStatusChange(p.id, e.target.value as Status)}
                        className={[
                          "text-xs font-black px-2 py-1 border-0 outline-none cursor-pointer",
                          STATUS_STYLES[p.status],
                        ].join(" ")}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-black/50">{fmt(p.sent_at)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-black/50 max-w-[160px] truncate" title={p.notes || ""}>{p.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {(p.status === "pending") && (
                          <button
                            onClick={() => handleSend(p.id)}
                            disabled={sending === p.id || bulkSending}
                            className="bg-[#ff7a00] px-3 py-1 text-xs font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                          >
                            {sending === p.id ? "Sending…" : "Send Email"}
                          </button>
                        )}
                        {sendResult[p.id] === "ok" && (
                          <span className="text-xs font-black text-green-600">✓ Sent</span>
                        )}
                        {sendResult[p.id] === "error" && (
                          <span className="text-xs font-black text-red-600">✗ Failed</span>
                        )}
                        <button
                          onClick={() => handleDelete(p.id, p.company_name)}
                          disabled={deleting === p.id}
                          className="text-xs font-black text-black/30 hover:text-red-600 transition-colors disabled:opacity-40"
                        >
                          {deleting === p.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-black/30">
        {filtered.length} prospect{filtered.length !== 1 ? "s" : ""} shown
        {statusFilter !== "all" ? ` · filtered by: ${statusFilter}` : ` · ${prospects.length} total`}
      </p>
    </div>
  );
}