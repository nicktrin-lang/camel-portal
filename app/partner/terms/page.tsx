// ── app/partner/terms/page.tsx ────────────────────────────────────────────────
"use client";

import Link from "next/link";
import { TERMS_VERSION, TERMS_EFFECTIVE, PARTNER_TERMS, downloadPartnerTermsPDF } from "@/lib/portal/partnerTerms";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function PartnerTermsPage() {
  const { t } = useTranslation();

  const SUMMARY_ITEMS = [
    { icon: "🏪", titleKey: "terms.summary.marketplace.title", bodyKey: "terms.summary.marketplace.body" },
    { icon: "💰", titleKey: "terms.summary.commission.title",  bodyKey: "terms.summary.commission.body"  },
    { icon: "❌", titleKey: "terms.summary.cancellation.title",bodyKey: "terms.summary.cancellation.body"},
    { icon: "✅", titleKey: "terms.summary.stripe.title",      bodyKey: "terms.summary.stripe.body"      },
    { icon: "💱", titleKey: "terms.summary.currency.title",    bodyKey: "terms.summary.currency.body"    },
    { icon: "📊", titleKey: "terms.summary.transparency.title",bodyKey: "terms.summary.transparency.body"},
  ] as const;

  return (
    <>
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("terms.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("terms.title")}</h1>
          <p className="mt-3 text-base font-bold text-white/70">{t("terms.intro")}</p>
          <p className="mt-2 text-xs font-bold text-white/40">{t("terms.version", { version: TERMS_VERSION, effective: TERMS_EFFECTIVE })}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-6">
          <div className="flex justify-end mb-6">
            <button type="button" onClick={() => downloadPartnerTermsPDF()}
              className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 transition-opacity">
              {t("terms.downloadPdf")}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMARY_ITEMS.map(({ icon, titleKey, bodyKey }) => (
              <div key={titleKey} className="bg-[#f0f0f0] p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-xs font-black uppercase tracking-widest text-black mb-1">{t(titleKey)}</p>
                <p className="text-xs font-bold text-black/60">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-green-200 bg-green-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-green-800 mb-2">{t("terms.fee.label")}</p>
          <div className="space-y-2 text-sm font-bold text-green-900">
            <div className="flex justify-between border-b border-green-200 pb-2">
              <span>{t("terms.fee.hire")}</span><span>{t("terms.fee.hireExample")}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>{t("terms.fee.commission")}</span><span>{t("terms.fee.commissionExample")}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>{t("terms.fee.stripe")}</span><span>{t("terms.fee.stripeExample")}</span>
            </div>
            <div className="flex justify-between border-t border-green-300 pt-2 font-black text-green-900">
              <span>{t("terms.fee.payout")}</span><span>{t("terms.fee.payoutExample")}</span>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-green-700">{t("terms.fee.note")}</p>
        </div>

        {PARTNER_TERMS.map(({ title, clauses }) => (
          <div key={title} className={`bg-white p-6 ${title === "7b. Stripe Processing Fees and Currency" ? "border-l-4 border-green-400" : ""}`}>
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{title}</h2>
            <ol className="space-y-3">
              {clauses.map((clause, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-black/70 leading-relaxed">
                  <span className="shrink-0 font-black text-black w-5">{i + 1}.</span>
                  <span>{clause}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <div className="bg-[#f0f0f0] p-6">
          <p className="text-xs font-black uppercase tracking-widest text-black mb-2">{t("rules.title")}</p>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            {t("terms.rules.intro")}{" "}
            <Link href="/partner/account" className="font-black text-black underline hover:opacity-70">{t("terms.rules.accountLink")}</Link>
            {t("terms.rules.end")}
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          {t("terms.footer", { version: TERMS_VERSION, effective: TERMS_EFFECTIVE })}
        </p>
      </div>
    </>
  );
}


// ── app/partner/operating-rules/page.tsx ──────────────────────────────────────
// Save as a separate file