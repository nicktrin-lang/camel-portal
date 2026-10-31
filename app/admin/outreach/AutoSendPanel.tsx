"use client";

import { useCallback, useEffect, useState } from "react";

// Weekday auto-send switch: when on, app/api/cron/outreach-autosend sends the next batch
// (up to the daily limit) at 09:00 Spanish time, Monday to Friday. The admin's job is only
// to keep enough prospects queued; this panel shows how many are.

type State = {
  enabled: boolean;
  queued: number;
  last_run_on?: string | null;
  last_result?: { at: string; sent: number; failed: number; queued_after: number; errors?: string[] } | null;
  updated_by?: string | null;
};

export default function AutoSendPanel({ dailyLimit, onChange }: { dailyLimit: number; onChange?: () => void }) {
  const [state, setState] = useState<State | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outreach/autosend", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load auto-send");
      setState(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load auto-send");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (!state) return;
    const next = !state.enabled;
    if (next && !confirm(`Turn on auto-send?\n\nEvery weekday at 09:00 Spanish time, the next ${dailyLimit} pending prospects (oldest first) will be emailed automatically.`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/outreach/autosend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      await load();
      onChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (error && !state) {
    return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>;
  }
  if (!state) return null;

  const short = state.queued < dailyLimit;
  const last = state.last_result;

  return (
    <div className={["flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between", state.enabled ? "border-green-300 bg-green-50" : "border-black/10 bg-white"].join(" ")}>
      <div className="min-w-0">
        <p className="text-sm font-black text-black">
          Auto-send {state.enabled ? <span className="text-green-700">ON</span> : <span className="text-black/40">OFF</span>}
          <span className="font-semibold text-black/50"> · weekdays at 09:00 Spanish time · up to {dailyLimit} a day, oldest pending first</span>
        </p>
        <p className={["mt-1 text-sm font-semibold", short ? "text-[#c25e00]" : "text-black/60"].join(" ")}>
          {state.queued.toLocaleString("en-GB")} prospect{state.queued === 1 ? "" : "s"} queued
          {short ? ` - add ${dailyLimit - state.queued} more for a full batch` : " - enough for the next batch"}
        </p>
        {last && (
          <p className="mt-1 text-xs font-semibold text-black/40">
            Last run {new Date(last.at).toLocaleString("en-GB", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (Spain): {last.sent} sent{last.failed ? `, ${last.failed} failed` : ""}
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        role="switch"
        aria-checked={state.enabled}
        className={["shrink-0 px-4 py-2 text-sm font-black transition-all disabled:opacity-40", state.enabled ? "border border-black bg-white text-black hover:bg-black hover:text-white" : "bg-green-700 text-white hover:opacity-90"].join(" ")}
      >
        {saving ? "Saving…" : state.enabled ? "Turn off" : "Turn on auto-send"}
      </button>
    </div>
  );
}
