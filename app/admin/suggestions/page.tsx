"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  id: string;
  partner_user_id: string;
  partner_name: string | null;
  title: string;
  category: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  { value: "",            label: "All Categories" },
  { value: "feature",     label: "Feature Request" },
  { value: "bug",         label: "Bug Report" },
  { value: "improvement", label: "Improvement" },
];

const STATUSES = [
  { value: "",           label: "All Statuses" },
  { value: "submitted",  label: "Submitted" },
  { value: "reviewing",  label: "Under Review" },
  { value: "planned",    label: "Planned" },
  { value: "done",       label: "Done" },
];

const STATUS_STYLES: Record<string, string> = {
  submitted:  "bg-gray-100 text-gray-700",
  reviewing:  "bg-blue-100 text-blue-700",
  planned:    "bg-amber-100 text-amber-700",
  done:       "bg-green-100 text-green-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  feature:     "Feature Request",
  bug:         "Bug Report",
  improvement: "Improvement",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function AdminSuggestionsPage() {
  const [suggestions,    setSuggestions]    = useState<Suggestion[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [saving,         setSaving]         = useState<string | null>(null);
  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [notes,          setNotes]          = useState<Record<string, string>>({});
  const [ok,             setOk]             = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)   params.set("status",   filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      const res  = await fetch(`/api/admin/suggestions?${params}`);
      const json = await res.json().catch(() => null);
      setSuggestions(json?.suggestions || []);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus, filterCategory]);

  async function updateSuggestion(id: string, status: string) {
    setSaving(id); setOk(null); setError(null);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, admin_notes: notes[id] ?? null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update");
      setOk("Updated successfully");
      setExpanded(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  // Counts per status
  const counts = suggestions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-1">Admin</p>
        <h1 className="text-3xl font-black text-[#003768]">Partner Suggestions</h1>
        <p className="mt-2 text-sm font-semibold text-black/50">Review and manage suggestions submitted by partners.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Submitted",   key: "submitted",  color: "bg-gray-100 text-gray-700" },
          { label: "Under Review",key: "reviewing",  color: "bg-blue-100 text-blue-700" },
          { label: "Planned",     key: "planned",    color: "bg-amber-100 text-amber-700" },
          { label: "Done",        key: "done",       color: "bg-green-100 text-green-700" },
        ].map(({ label, key, color }) => (
          <div key={key} className={`p-4 ${color}`}>
            <p className="text-2xl font-black">{counts[key] || 0}</p>
            <p className="text-xs font-black uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#f0f0f0] px-4 py-2.5 text-sm font-semibold text-black outline-none"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-[#f0f0f0] px-4 py-2.5 text-sm font-semibold text-black outline-none"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {ok    && <p className="text-sm font-semibold text-green-600">{ok}</p>}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {/* List */}
      {loading ? (
        <p className="text-sm font-semibold text-black/40">Loading…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm font-semibold text-black/40">No suggestions found.</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const isExpanded = expanded === s.id;
            return (
              <div key={s.id} className="bg-white border border-black/10">
                {/* Summary row */}
                <div
                  className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-[#f8f8f8] transition-colors"
                  onClick={() => {
                    setExpanded(isExpanded ? null : s.id);
                    if (!notes[s.id]) setNotes(n => ({ ...n, [s.id]: s.admin_notes || "" }));
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="text-base font-black text-black">{s.title}</p>
                      <span className="text-xs font-black uppercase tracking-wide px-2 py-0.5 bg-black/5 text-black/50">
                        {CATEGORY_LABELS[s.category] || s.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-black/50 mb-1 truncate">{s.description}</p>
                    <p className="text-xs font-semibold text-black/30">
                      {s.partner_name || "Unknown partner"} · {fmt(s.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 text-xs font-black ${STATUS_STYLES[s.status] || STATUS_STYLES.submitted}`}>
                      {STATUSES.find(st => st.value === s.status)?.label || s.status}
                    </span>
                    <span className="text-black/30 text-sm">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-black/10 p-5 space-y-4 bg-[#f8f8f8]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Full Description</p>
                      <p className="text-sm font-semibold text-black whitespace-pre-wrap">{s.description}</p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Admin Notes (visible to partner)</p>
                      <textarea
                        rows={3}
                        value={notes[s.id] ?? s.admin_notes ?? ""}
                        onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                        placeholder="Add a note for the partner…"
                        className="w-full bg-white border border-black/10 px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#003768] resize-none"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "submitted",  label: "Submitted" },
                          { value: "reviewing",  label: "Under Review" },
                          { value: "planned",    label: "Planned" },
                          { value: "done",       label: "Done" },
                        ].map(st => (
                          <button
                            key={st.value}
                            type="button"
                            disabled={saving === s.id}
                            onClick={() => updateSuggestion(s.id, st.value)}
                            className={`px-4 py-2 text-sm font-black transition border disabled:opacity-50 ${
                              s.status === st.value
                                ? "bg-[#003768] text-white border-[#003768]"
                                : "bg-white text-black/60 border-black/20 hover:border-[#003768]"
                            }`}
                          >
                            {saving === s.id ? "Saving…" : st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}