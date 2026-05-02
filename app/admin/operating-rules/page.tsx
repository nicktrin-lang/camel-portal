"use client";

import { useState } from "react";
import { OPERATING_RULES, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";

export default function AdminOperatingRulesPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try { await downloadOperatingRulesPDF("Partner"); }
    finally { setDownloading(false); }
  }

  return (
    <>
      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Partner Operating Agreement</h1>
          <p className="mt-3 text-base font-bold text-white/70">
            These rules govern partner conduct on the Camel Global platform. By operating as a partner you agree to comply with all sections below.
          </p>
          <p className="mt-2 text-xs font-bold text-white/40">Last updated April 2026 — subject to change with 14 days&apos; notice.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="flex justify-end">
          <button type="button" onClick={handleDownload} disabled={downloading}
            className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
            {downloading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>

        {OPERATING_RULES.map(({ section, rules }) => (
          <div key={section} className="bg-white p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">
              {section}
            </h2>
            <ol className="space-y-3">
              {rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-black/70 leading-relaxed">
                  <span className="shrink-0 font-black text-black w-5">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          Camel Global Partner Operating Agreement — Last updated April 2026 — Subject to change with 14 days&apos; notice.
        </p>
      </div>
    </>
  );
}