"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

const EFFECTIVE_DATE = "1 April 2026";

export default function PartnerCookiesPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("cookies.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("cookies.title")}</h1>
          <p className="mt-2 text-xs font-bold text-white/40">{t("cookies.effective")} {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-8">
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            {t("cookies.intro.pre")}{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">{t("cookies.intro.link")}</a>
            {t("cookies.intro.end")}
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("cookies.s1.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("cookies.s1.body")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-6 pb-2 border-b border-black/10">{t("cookies.s2.title")}</h2>

          <div className="mb-4 overflow-hidden">
            <div className="bg-black px-5 py-3 flex items-center gap-3">
              <span className="inline-block bg-white px-3 py-0.5 text-xs font-black text-black">{t("cookies.s2.essential.badge")}</span>
              <span className="text-sm font-bold text-white">{t("cookies.s2.essential.status")}</span>
            </div>
            <div className="bg-[#f0f0f0] px-5 py-4 space-y-4">
              <div>
                <p className="text-sm font-black text-black">{t("cookies.s2.essential.auth.title")}</p>
                <p className="text-sm font-bold text-black/60 mt-1">{t("cookies.s2.essential.auth.body")}</p>
              </div>
              <div>
                <p className="text-sm font-black text-black">{t("cookies.s2.essential.consent.title")}</p>
                <p className="text-sm font-bold text-black/60 mt-1">{t("cookies.s2.essential.consent.body")}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="bg-[#ff7a00] px-5 py-3 flex items-center gap-3">
              <span className="inline-block bg-white px-3 py-0.5 text-xs font-black text-[#ff7a00]">{t("cookies.s2.analytics.badge")}</span>
              <span className="text-sm font-bold text-white">{t("cookies.s2.analytics.status")}</span>
            </div>
            <div className="bg-[#f0f0f0] px-5 py-4">
              <p className="text-sm font-black text-black">{t("cookies.s2.analytics.title")}</p>
              <p className="text-sm font-bold text-black/60 mt-1">{t("cookies.s2.analytics.body")}</p>
              <p className="text-sm font-bold text-black/40 mt-1">{t("cookies.s2.analytics.expires")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("cookies.s3.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed mb-3">{t("cookies.s3.intro")}</p>
          <ul className="list-disc list-inside space-y-2 text-sm font-bold text-black/70">
            <li>{t("cookies.s3.item1")}</li>
            <li>{t("cookies.s3.item2")}</li>
            <li>{t("cookies.s3.item3")}</li>
          </ul>
          <p className="mt-3 text-sm font-bold text-black/70">{t("cookies.s3.note")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("cookies.s4.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("cookies.s4.body")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("cookies.s5.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("cookies.s5.body")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("cookies.s6.title")}</h2>
          <p className="text-sm font-bold text-black/70">
            {t("cookies.s6.body.pre")}{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">{t("cookies.s6.body.link")}</a>{" "}
            {t("cookies.s6.body.end")}
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          {t("cookies.footer", { date: EFFECTIVE_DATE })}
        </p>
      </div>
    </div>
  );
}