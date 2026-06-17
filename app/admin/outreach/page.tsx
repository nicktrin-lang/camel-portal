"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const DAILY_LIMIT = 50; // Single source of truth is in send/route.ts — keep in sync if changing

const COUNTRIES = ["All Countries", "Spain", "France", "Italy", "Portugal", "Germany", "UK", "USA"];

type Status = "pending" | "sent" | "bounced" | "replied" | "onboarded";

type Prospect = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  city: string | null;
  country: string | null;
  status: Status;
  unsubscribed: boolean | null;
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

// Parse CSV — expects headers: company_name, contact_name, email, city, country, notes
// Headers are case-insensitive and order-independent
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    fields.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = fields[i] || ""; });
    return row;
  }).filter(row => row.email && row.company_name);
}

export default function OutreachPage() {
  const [prospects, setProspects]     = useState<Prospect[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [sending, setSending]         = useState<string | null>(null);
  const [sendResult, setSendResult]   = useState<Record<string, "ok" | "error">>({});
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("All Countries");
  const [sentToday, setSentToday]     = useState(0);
  const [testSending, setTestSending] = useState(false);
  const [totalCount, setTotalCount]   = useState(0);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult]     = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", city: "", country: "Spain", notes: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  const loadDailyCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outreach/send");
      const json = await res.json();
      if (res.ok) setSentToday(json.sent_today || 0);
    } catch { /* ignore */ }
  }, []);

  async function handleTestEmail() {
    setTestSending(true);
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      alert(`✅ Test email sent to your inbox!\n\nSubject: ${json.subject}\n\nCheck your email and approve the copy before sending to real prospects.`);
    } catch (e: any) {
      alert(`❌ Test failed: ${e?.message}`);
    } finally {
      setTestSending(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/prospects");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const all: Prospect[] = json.prospects || [];
      setProspects(all);
      setTotalCount(all.length);
    } catch (e: any) {
      setError(e?.message || "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadDailyCount();
  }, [loadDailyCount]);

  async function handleSend(id: string, isResend = false): Promise<boolean> {
    setSending(id);
    setSendResult(r => ({ ...r, [id]: undefined as any }));
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: id, resend: isResend }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error(json.error);
        throw new Error(json.error || "Send failed");
      }
      setSendResult(r => ({ ...r, [id]: "ok" }));
      setSentToday(json.sent_today || 0);
      setProspects(p => p.map(x => x.id === id ? { ...x, status: "sent", sent_at: new Date().toISOString() } : x));
      return true;
    } catch (e: any) {
      setSendResult(r => ({ ...r, [id]: "error" }));
      if (String(e?.message).includes("Daily limit")) {
        alert(e.message);
        return false;
      }
      return true;
    } finally {
      setSending(null);
    }
  }

  async function handleBatchSend() {
    const remaining = DAILY_LIMIT - sentToday;
    if (remaining <= 0) {
      alert(`Daily limit of ${DAILY_LIMIT} emails already reached. Come back tomorrow.`);
      return;
    }
    const pending = filtered.filter(p => p.status === "pending" && !p.unsubscribed);
    if (pending.length === 0) { alert("No pending prospects to send to."); return; }
    const toSend = pending.slice(0, remaining);
    const countryNote = countryFilter !== "All Countries" ? ` in ${countryFilter}` : "";
    if (!confirm(`Send emails to ${toSend.length} prospect(s)${countryNote} today?\n\nDaily limit: ${DAILY_LIMIT} | Already sent today: ${sentToday} | Sending now: ${toSend.length}\n\nA personalised email will be sent to each company in their local language.`)) return;

    setBatchSending(true);
    setBatchProgress({ done: 0, total: toSend.length });

    for (let i = 0; i < toSend.length; i++) {
      const shouldContinue = await handleSend(toSend[i].id);
      setBatchProgress({ done: i + 1, total: toSend.length });
      if (!shouldContinue) break;
      if (i < toSend.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    setBatchSending(false);
    setBatchProgress(null);
    await loadDailyCount();
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
      setTotalCount(c => c - 1);
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
      setTotalCount(c => c + 1);
      setForm({ company_name: "", contact_name: "", email: "", city: "", country: "Spain", notes: "" });
      setShowAdd(false);
    } catch (e: any) {
      setAddError(e?.message || "Failed to add prospect");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setCsvResult("❌ No valid rows found. CSV must have headers: company_name, email (required), contact_name, city, country, notes (optional).");
        return;
      }

      let added = 0;
      let skipped = 0;
      const newProspects: Prospect[] = [];

      for (const row of rows) {
        const payload = {
          company_name: row.company_name || row["company name"] || "",
          contact_name: row.contact_name || row["contact name"] || "",
          email:        row.email || "",
          city:         row.city || "",
          country:      row.country || "Spain",
          notes:        row.notes || "",
        };
        if (!payload.company_name || !payload.email) { skipped++; continue; }

        try {
          const res = await fetch("/api/admin/outreach/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (res.ok && json.prospect) {
            newProspects.push(json.prospect);
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      setProspects(p => [...newProspects, ...p]);
      setTotalCount(c => c + added);
      setCsvResult(`✅ Imported ${added} prospect${added !== 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} skipped (duplicate email or missing fields)` : ""}.`);
    } catch (e: any) {
      setCsvResult(`❌ Failed to parse CSV: ${e?.message}`);
    } finally {
      setCsvImporting(false);
      // Reset file input so same file can be re-imported if needed
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  const filtered = prospects
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .filter(p => countryFilter === "All Countries" || (p.country || "").toLowerCase() === countryFilter.toLowerCase());

  const counts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const remaining    = Math.max(0, DAILY_LIMIT - sentToday);
  const pendingInView = filtered.filter(p => p.status === "pending" && !p.unsubscribed).length;
  const batchSize    = Math.min(remaining, pendingInView);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-black">Partner Outreach</h1>
          <p className="mt-1 text-sm font-semibold text-black/50">
            Email outreach · {totalCount.toLocaleString()} total prospects
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <div className="flex justify-between text-xs font-black text-black/40">
              <span>Today</span>
              <span>{sentToday} / {DAILY_LIMIT}</span>
            </div>
            <div className="h-2 bg-black/10 w-full">
              <div
                className="h-2 bg-[#ff7a00] transition-all"
                style={{ width: `${Math.min(100, (sentToday / DAILY_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
          <button
            onClick={handleBatchSend}
            disabled={batchSending || loading || remaining === 0 || pendingInView === 0}
            className="bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
          >
            {batchSending
              ? batchProgress
                ? `Sending ${batchProgress.done}/${batchProgress.total}…`
                : "Sending…"
              : remaining === 0
                ? "Limit reached today"
                : `Send Today's Batch (${batchSize})`}
          </button>
          <button
            onClick={handleTestEmail}
            disabled={testSending}
            className="bg-white border border-black px-4 py-2 text-sm font-black text-black hover:bg-black hover:text-white disabled:opacity-40 transition-all"
          >
            {testSending ? "Sending test…" : "Send Test Email"}
          </button>
          {/* CSV Import */}
          <label className={[
            "cursor-pointer bg-white border border-black px-4 py-2 text-sm font-black text-black hover:bg-black hover:text-white transition-all whitespace-nowrap",
            csvImporting ? "opacity-40 pointer-events-none" : "",
          ].join(" ")}>
            {csvImporting ? "Importing…" : "Import CSV"}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCSVImport}
              disabled={csvImporting}
            />
          </label>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 transition-opacity"
          >
            {showAdd ? "Cancel" : "+ Add Prospect"}
          </button>
        </div>
      </div>

      {/* CSV result message */}
      {csvResult && (
        <div className={[
          "border px-4 py-3 text-sm font-semibold",
          csvResult.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700",
        ].join(" ")}>
          {csvResult}
          <p className="mt-1 text-xs font-normal opacity-70">
            CSV format: company_name, contact_name, email, city, country, notes — first row must be headers. Rows with duplicate emails are skipped automatically.
          </p>
        </div>
      )}

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

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-black uppercase tracking-widest text-black/40">Filter by country:</span>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(c => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              className={[
                "px-3 py-1.5 text-xs font-black transition-all border",
                countryFilter === c
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/60 border-black/15 hover:border-black/40 hover:text-black",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Add Prospect Form */}
      {showAdd && (
        <div className="border border-black/10 bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-black">Add Prospect</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Company Name *</label>
              <input required value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Hertz Spain SL" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Contact Name</label>
              <input value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Juan García" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Email *</label>
              <input required type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="info@example.com" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">City</label>
              <input value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Madrid" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Country</label>
              <select value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black">
                {COUNTRIES.filter(c => c !== "All Countries").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1">Notes</label>
              <input value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-semibold text-black outline-none focus:border-black"
                placeholder="Serves Malaga airport" />
            </div>
            {addError && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{addError}</div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={addLoading}
                className="bg-[#ff7a00] px-6 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40">
                {addLoading ? "Adding…" : "Add Prospect"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-6 py-2 text-sm font-black text-black/50 hover:text-black">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
              {statusFilter !== "all" || countryFilter !== "All Countries"
                ? "Try adjusting your filters."
                : "Add your first prospect using the button above, or import a CSV file."}
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
                  <tr key={p.id} className={["hover:bg-[#f8f8f8] transition-colors", p.unsubscribed ? "opacity-50" : ""].join(" ")}>
                    <td className="px-4 py-3 font-black text-black">
                      {p.company_name}
                      {p.unsubscribed && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5">unsub</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-black/70">{p.contact_name || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-black/70 text-xs">{p.email}</td>
                    <td className="px-4 py-3 font-semibold text-black/70 text-xs">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={e => handleStatusChange(p.id, e.target.value as Status)}
                        className={["text-xs font-black px-2 py-1 border-0 outline-none cursor-pointer", STATUS_STYLES[p.status]].join(" ")}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-black/50">{fmt(p.sent_at)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-black/50 max-w-[160px] truncate" title={p.notes || ""}>{p.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        {p.status === "pending" && !p.unsubscribed && (
                          <button
                            onClick={() => handleSend(p.id)}
                            disabled={sending === p.id || batchSending || remaining === 0}
                            className="bg-[#ff7a00] px-3 py-1 text-xs font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                          >
                            {sending === p.id ? "Sending…" : "Send"}
                          </button>
                        )}
                        {!p.unsubscribed && (
                          <button
                            onClick={() => handleSend(p.id, true)}
                            disabled={sending === p.id || batchSending || remaining === 0}
                            className="border border-black/20 px-3 py-1 text-xs font-black text-black/50 hover:border-black hover:text-black disabled:opacity-40 transition-all whitespace-nowrap"
                          >
                            {sending === p.id ? "Sending…" : "Send Again"}
                          </button>
                        )}
                        {sendResult[p.id] === "ok"    && <span className="text-xs font-black text-green-600">✓</span>}
                        {sendResult[p.id] === "error" && <span className="text-xs font-black text-red-600">✗</span>}
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
        {filtered.length} shown · {totalCount.toLocaleString()} total · {remaining} emails remaining today
      </p>
    </div>
  );
}
