// ── app/partner/about/page.tsx ────────────────────────────────────────────────
"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export default function PartnerAboutPage() {
  const { t } = useTranslation();

  const HOW_STEPS = [
    { n: "01", titleKey: "about.how.step1.title", bodyKey: "about.how.step1.body" },
    { n: "02", titleKey: "about.how.step2.title", bodyKey: "about.how.step2.body" },
    { n: "03", titleKey: "about.how.step3.title", bodyKey: "about.how.step3.body" },
    { n: "04", titleKey: "about.how.step4.title", bodyKey: "about.how.step4.body" },
    { n: "05", titleKey: "about.how.step5.title", bodyKey: "about.how.step5.body" },
    { n: "06", titleKey: "about.how.step6.title", bodyKey: "about.how.step6.body" },
  ] as const;

  return (
    <div className="w-full">
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("about.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("about.hero.title")}</h1>
          <p className="mt-3 max-w-2xl text-base font-bold text-white/70 leading-relaxed">{t("about.hero.body")}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("about.whatWeDo.title")}</h2>
          <div className="space-y-4 text-sm font-bold text-black/70 leading-relaxed">
            <p>{t("about.whatWeDo.p1")}</p>
            <p>{t("about.whatWeDo.p2")}</p>
            <p>{t("about.whatWeDo.p3")}</p>
          </div>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-6 pb-2 border-b border-black/10">{t("about.how.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {HOW_STEPS.map(({ n, titleKey, bodyKey }) => (
              <div key={n} className="bg-[#f0f0f0] p-5">
                <p className="mb-2 text-2xl font-black text-black/20">{n}</p>
                <h3 className="mb-1 text-sm font-black text-black">{t(titleKey)}</h3>
                <p className="text-xs font-bold leading-relaxed text-black/60">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("about.why.title")}</h2>
          <div className="space-y-4 text-sm font-bold text-black/70 leading-relaxed">
            <p>{t("about.why.p1")}</p>
            <p>{t("about.why.p2")}</p>
          </div>
        </div>

        <div className="bg-black p-8">
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("about.cta.tag")}</p>
          <h2 className="text-2xl font-black text-white mb-3">{t("about.cta.title")}</h2>
          <p className="text-sm font-bold text-white/60 mb-6">{t("about.cta.body")}</p>
          <a href="/partner/contact"
            className="inline-block bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity">
            {t("about.cta.btn")}
          </a>
        </div>
      </div>
    </div>
  );
}


// ── app/partner/privacy/page.tsx ──────────────────────────────────────────────
// Save as a separate file