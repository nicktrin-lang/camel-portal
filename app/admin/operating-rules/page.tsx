"use client";

import { useState } from "react";
import { OPERATING_RULES, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";

export default function AdminOperatingRulesPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadOperatingRulesPDF("Partner");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a00]">Legal</p>
            <h1 className="text-2xl font-bold text-[#003768]">Partner Operating Agreement</h1>
            <p className="mt-2 text-sm text-slate-500">
              These rules govern partner conduct on the Camel Global platform.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Last updated April 2026 — subject to change with 14 days&apos; notice.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="shrink-0 rounded-full bg-[#003768] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {downloading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-4">
        {OPERATING_RULES.map(({ section, rules }) => (
          <div key={section} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-base font-bold text-[#003768]">{section}</h2>
            <ol className="mt-4 space-y-2">
              {rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="shrink-0 font-semibold text-[#003768]">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <p className="pb-4 text-center text-xs text-slate-400">
        Camel Global Partner Operating Agreement — Last updated April 2026 — Subject to change with 14 days&apos; notice.
      </p>

    </div>
  );
}