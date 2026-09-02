"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageContext";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

const GUIDES_LABEL: Record<Locale, string> = {
  en: "Guides", es: "Guías", fr: "Guides", it: "Guide", pt: "Guias", de: "Ratgeber",
};

// Header + footer for the portal Guides section — identical to the portal
// homepage chrome, localized to whatever language the visitor picks in the
// switcher. The guide content (children) renders in its own written language.
// NOTE: no `lang` prop. The chrome language follows the visitor's own locale context
// (the switcher / navigator.languages), NOT the URL segment — that segment is the MARKET,
// and /gb/guides and /au/guides would both be English anyway.
export default function GuidesChrome({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const year = String(new Date().getFullYear());
  const [menuOpen, setMenuOpen] = useState(false);

  const langOptions: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" }, { code: "es", label: "ES" }, { code: "fr", label: "FR" },
    { code: "it", label: "IT" }, { code: "pt", label: "PT" }, { code: "de", label: "DE" },
  ];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* ── Nav (matches the portal homepage) ── */}
      <header className="w-full bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-14 sm:h-16 w-auto brightness-0 invert" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-2">
            <LanguageToggle />
            <Link href="/driver/login" className="border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              {t("nav.driverLogin")}
            </Link>
            <Link href="/partner/login" className="border border-white/30 px-5 py-2 text-sm font-black text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              {t("nav.partnerLogin")}
            </Link>
            <Link href="/partner/signup" className="bg-[#ff7a00] px-5 py-2 text-sm font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap">
              {t("nav.becomePartner")}
            </Link>
          </div>

          {/* Mobile: hamburger */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-black px-4 pb-4 pt-3 flex flex-col gap-3">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/30">{t("settings.language.label")}</p>
              <div className="flex gap-2">
                {langOptions.map(({ code, label }) => (
                  <button key={code} type="button"
                    onClick={() => { setLocale(code); setMenuOpen(false); }}
                    className={[
                      "flex-1 py-2.5 text-sm font-black border transition-colors",
                      locale === code ? "bg-[#ff7a00] border-[#ff7a00] text-white" : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white",
                    ].join(" ")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link href="/driver/login" onClick={() => setMenuOpen(false)}
                className="block border border-white/20 px-4 py-3 text-sm font-black text-white hover:bg-white/10 transition-colors">
                {t("nav.driverLogin")}
              </Link>
              <Link href="/partner/login" onClick={() => setMenuOpen(false)}
                className="block border border-white/20 px-4 py-3 text-sm font-black text-white hover:bg-white/10 transition-colors">
                {t("nav.partnerLogin")}
              </Link>
              <Link href="/partner/signup" onClick={() => setMenuOpen(false)}
                className="block bg-[#ff7a00] px-4 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity">
                {t("nav.becomePartner")}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* ── Footer (matches the portal homepage) ── */}
      <footer className="w-full bg-black border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-40 shrink-0">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} className="h-10 w-auto brightness-0 invert" />
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/es/guides" className="text-sm font-bold text-white hover:underline">{GUIDES_LABEL[locale] ?? "Guides"}</Link>
          </nav>
          <p className="text-xs font-bold text-white/70">{t("common.copyright", { year })}</p>
        </div>
      </footer>
    </div>
  );
}
