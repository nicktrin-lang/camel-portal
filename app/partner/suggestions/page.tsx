"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "feature",     label: "Feature Request" },
  { value: "bug",         label: "Bug Report" },
  { value: "improvement", label: "Improvement" },
];

const STATUS_STYLES: Record<string, string> = {
  submitted:  "bg-gray-100 text-gray-700",
  reviewing:  "bg-blue-100 text-blue-700",
  planned:    "bg-amber-100 text-amber-700",
  done:       "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  submitted:  "Submitted",
  reviewing:  "Under Review",
  planned:    "Planned",
  done:       "Done",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function PartnerSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState("feature");
  const [description, setDescription] = useState("");

  async function loadSuggestions() {
    try {
      const res  = await fetch("/api/partner/suggestions");
      const json = await res.json().catch(() => null);
      setSuggestions(json?.suggestions || []);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSuggestions(); }, []);

  async function handleSubmit() {
    setError(null); setSuccess(false);
    if (!title.trim())       { setError("Please enter a title."); return; }
    if (!description.trim()) { setError("Please enter a description."); return; }

    setSubmitting(true);
    try {
      const res  = await fetch("/api/partner/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, description: description.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit");
      setSuccess(true);
      setTitle(""); setCategory("feature"); setDescription("");
      await loadSuggestions();
    } catch (e: any) {
      setError(e?.message || "Failed to submit suggestion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-3xl">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-1">Partner Portal</p>
        <h1 className="text-3xl font-black text-[#003768]">Suggestions</h1>
        <p className="mt-2 text-sm font-semibold text-black/50">
          Have an idea, spotted a bug, or want to suggest an improvement? Let us know.
        </p>
      </div>

      {/* Submit form */}
      <div className="bg-white border border-black/10 p-6 space-y-5">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">Submit a Suggestion</p>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1.5">Category</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-4 py-2 text-sm font-black transition border ${
                  category === c.value
                    ? "bg-[#003768] text-white border-[#003768]"
                    : "bg-white text-black/60 border-black/20 hover:border-[#003768]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brief summary of your suggestion…"
            maxLength={120}
            className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] placeholder:text-black/30"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black/50 mb-1.5">Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your suggestion in detail…"
            className="w-full bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] placeholder:text-black/30 resize-none"
          />
        </div>

        {error   && <p className="text-sm font-semibold text-red-600">{error}</p>}
        {success && <p className="text-sm font-semibold text-green-600">✓ Suggestion submitted — thank you!</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#ff7a00] px-8 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting ? "Submitting…" : "Submit Suggestion"}
        </button>
      </div>

      {/* Previous suggestions */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-4">Your Previous Suggestions</p>
        {loading ? (
          <p className="text-sm font-semibold text-black/40">Loading…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm font-semibold text-black/40">No suggestions yet.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="bg-white border border-black/10 p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-base font-black text-black">{s.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black uppercase tracking-wide text-black/40">
                      {CATEGORIES.find(c => c.value === s.category)?.label || s.category}
                    </span>
                    <span className={`px-3 py-1 text-xs font-black ${STATUS_STYLES[s.status] || STATUS_STYLES.submitted}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-black/60 mb-2">{s.description}</p>
                {s.admin_notes && (
                  <div className="bg-[#f0f0f0] px-4 py-3 mt-3">
                    <p className="text-xs font-black uppercase tracking-widest text-[#003768] mb-1">Camel Global Response</p>
                    <p className="text-sm font-semibold text-black">{s.admin_notes}</p>
                  </div>
                )}
                <p className="text-xs font-semibold text-black/30 mt-3">{fmt(s.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}