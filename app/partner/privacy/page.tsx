"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

const EFFECTIVE_DATE  = "1 April 2026";
const COMPANY_NAME    = "NTUK Ltd (trading as Camel Global)";
const COMPANY_REG     = "08765474";
const COMPANY_ADDRESS = "Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN";

export default function PartnerPrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("privacy.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("privacy.title")}</h1>
          <p className="mt-2 text-xs font-bold text-white/40">{t("privacy.effective")} {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-8">
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            {t("privacy.intro", { company: COMPANY_NAME })}{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">{t("privacy.introLink")}</a>
            {t("privacy.introEnd")}
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s1.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s1.p1", { company: COMPANY_NAME, reg: COMPANY_REG, address: COMPANY_ADDRESS })}</p>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s1.p2")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s2.title")}</h2>
          <div className="bg-[#f0f0f0] px-5 py-4 mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("privacy.s2.customers.label")}</p>
            <p className="text-sm font-bold text-black/70 mb-2">{t("privacy.s2.customers.intro")}</p>
            <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
              <li>{t("privacy.s2.customers.item1")}</li>
              <li>{t("privacy.s2.customers.item2")}</li>
              <li>{t("privacy.s2.customers.item3")}</li>
              <li>{t("privacy.s2.customers.item4")}</li>
              <li>{t("privacy.s2.customers.item5")}</li>
              <li>{t("privacy.s2.customers.item6pre")}{" "}<a href="/partner/cookies" className="text-[#ff7a00] hover:underline">{t("privacy.s2.customers.item6link")}</a>{t("privacy.s2.customers.item6end")}</li>
            </ul>
          </div>
          <div className="bg-[#f0f0f0] px-5 py-4 mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("privacy.s2.partners.label")}</p>
            <p className="text-sm font-bold text-black/70 mb-2">{t("privacy.s2.partners.intro")}</p>
            <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
              <li>{t("privacy.s2.partners.item1")}</li>
              <li>{t("privacy.s2.partners.item2")}</li>
              <li>{t("privacy.s2.partners.item3")}</li>
              <li>{t("privacy.s2.partners.item4")}</li>
              <li>{t("privacy.s2.partners.item5")}</li>
              <li>{t("privacy.s2.partners.item6")}</li>
              <li>{t("privacy.s2.partners.item7")}</li>
            </ul>
          </div>
          <div className="bg-[#f0f0f0] px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("privacy.s2.drivers.label")}</p>
            <p className="text-sm font-bold text-black/70">{t("privacy.s2.drivers.body")}</p>
          </div>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s3.title")}</h2>
          <p className="text-sm font-bold text-black/70 mb-2">{t("privacy.s3.intro")}</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            <li>{t("privacy.s3.item1")}</li>
            <li>{t("privacy.s3.item2")}</li>
            <li>{t("privacy.s3.item3")}</li>
            <li>{t("privacy.s3.item4")}</li>
            <li>{t("privacy.s3.item5")}</li>
            <li>{t("privacy.s3.item6")}</li>
            <li>{t("privacy.s3.item7")}</li>
          </ul>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            {t("privacy.s3.basis.pre")} <strong className="text-black">{t("privacy.s3.basis.contract")}</strong> {t("privacy.s3.basis.mid")} <strong className="text-black">{t("privacy.s3.basis.legitimate")}</strong> {t("privacy.s3.basis.end")}
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s4.title")}</h2>
          <p className="text-sm font-bold text-black/70 mb-2">{t("privacy.s4.intro")}</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            {(["item1","item2","item3","item4","item5","item6","item7"] as const).map(k => (
              <li key={k}><strong className="text-black">{t(`privacy.s4.${k}pre` as any)}</strong>{t(`privacy.s4.${k}body` as any)}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s5.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s5.p1")}</p>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s5.p2")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s6.title")}</h2>
          <p className="text-sm font-bold text-black/70 mb-2">{t("privacy.s6.intro")}</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            {(["item1","item2","item3","item4","item5","item6"] as const).map(k => (
              <li key={k}><strong className="text-black">{t(`privacy.s6.${k}pre` as any)}</strong>{t(`privacy.s6.${k}body` as any)}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            {t("privacy.s6.contact.pre")}{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">{t("privacy.s6.contact.link")}</a>
            {t("privacy.s6.contact.end")}
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s7.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            {t("privacy.s7.body.pre")}{" "}
            <a href="/partner/cookies" className="text-[#ff7a00] hover:underline">{t("privacy.s7.body.link")}</a>{" "}
            {t("privacy.s7.body.end")}
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s8.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s8.body")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s9.title")}</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">{t("privacy.s9.body")}</p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{t("privacy.s10.title")}</h2>
          <p className="text-sm font-bold text-black/70">
            {t("privacy.s10.body.pre")}{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">{t("privacy.s10.body.link")}</a>
            {t("privacy.s10.body.end")}
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          {t("privacy.footer", { date: EFFECTIVE_DATE })}
        </p>
      </div>
    </div>
  );
}