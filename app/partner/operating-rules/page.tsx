"use client";

import { useState } from "react";
import { OPERATING_RULES, OPERATING_RULES_ES, OPERATING_RULES_FR, OPERATING_RULES_IT, OPERATING_RULES_PT, OPERATING_RULES_DE, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function PartnerOperatingRulesPage() {
  const { t, locale } = useTranslation();
  const RULES_BY_LOCALE: Record<string, typeof OPERATING_RULES> = {
    en: OPERATING_RULES, es: OPERATING_RULES_ES, fr: OPERATING_RULES_FR,
    it: OPERATING_RULES_IT, pt: OPERATING_RULES_PT, de: OPERATING_RULES_DE,
  };
  const rules = RULES_BY_LOCALE[locale] ?? OPERATING_RULES;
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try { await downloadOperatingRulesPDF("Partner", locale); }
    finally { setDownloading(false); }
  }

  return (
    <>
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("rules.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("rules.title")}</h1>
          <p className="mt-3 text-base font-bold text-white/70">{t("rules.intro")}</p>
          <p className="mt-2 text-xs font-bold text-white/40">{t("rules.updated")}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">
        <div className="flex justify-end">
          <button type="button" onClick={handleDownload} disabled={downloading}
            className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
            {downloading ? t("rules.downloading") : t("rules.downloadPdf")}
          </button>
        </div>

        {rules.map(({ section, rules: sectionRules }) => (
          <div key={section} className="bg-white p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">
              {section}
            </h2>
            <ol className="space-y-3">
              {sectionRules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-black/70 leading-relaxed">
                  <span className="shrink-0 font-black text-black w-5">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <p className="text-xs font-bold text-black/30 text-center pb-4">{t("rules.footer")}</p>
      </div>
    </>
  );
}