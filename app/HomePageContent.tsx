"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

function CompactLanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center border border-white/20 overflow-hidden">
      {options.map(({ code, label }, i) => (
        <button key={code} type="button" onClick={() => setLocale(code)}
          className={[
            "px-2 py-1.5 text-xs font-black transition-colors",
            i < options.length - 1 ? "border-r border-white/20" : "",
            locale === code ? "bg-[#ff7a00] text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label={`Switch to ${label}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Fire a GA4 custom event if gtag is available
function fireGtagEvent(eventName: string, params?: Record<string, string>) {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params || {});
    }
  } catch {}
}

export default function HomePageContent() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const year = new Date().getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("unsubscribed") === "true") {
      setUnsubscribed(true);
    }
  }, []);

  // Track CTA clicks — only fires when utm_source=outreach so organic clicks aren't counted
  const handleOutreachCta = useCallback((position: "hero" | "apply" | "final-cta") => {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmTerm = params.get("utm_term") || "";
    const utmContent = params.get("utm_content") || "";
    if (utmSource === "outreach") {
      fireGtagEvent("outreach_cta_click", {
        cta_position: position,
        utm_term: utmTerm,
        utm_content: utmContent,
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">

      {/* ── Unsubscribed banner ── */}
      {unsubscribed && (
        <div className="w-full bg-green-600 px-6 py-3 text-center">
          <p className="text-sm font-black text-white">
            ✓ You have been unsubscribed and will no longer receive partner outreach emails from Camel Global.
          </p>
        </div>
      )}

      {/* ── Nav ── */}
      <header className="w-full bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2">
          <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-14 sm:h-16 w-auto brightness-0 invert" />

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

          {/* Mobile: compact toggle + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <CompactLanguageToggle />
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

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-black px-4 pb-4 pt-2 flex flex-col gap-2">
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
        )}
      </header>

      {/* ── Hero ── */}
      <section className="w-full bg-black px-6 py-12 sm:py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.meta.tagline")}</p>
            <h1 className="text-5xl font-black leading-none text-white md:text-7xl">
              {t("home.hero.line1")}<br />
              {t("home.hero.line2")}<br />
              <span className="text-[#ff7a00]">{t("home.hero.line3")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-bold text-white/70 leading-relaxed">
              {t("home.hero.body")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/partner/signup" onClick={() => handleOutreachCta("hero")}
                className="bg-[#ff7a00] px-10 py-5 text-base font-black text-white hover:opacity-90 transition-opacity">
                {t("home.hero.cta")}
              </Link>
              <Link href="/partner/login" className="border border-white/30 px-10 py-5 text-base font-black text-white hover:bg-white/10 transition-colors">
                {t("nav.partnerLoginShort")}
              </Link>
            </div>
            <p className="mt-5 text-sm font-bold text-white/30">
              {t("nav.alreadyDriver")}{" "}
              <Link href="/driver/login" className="text-white/60 underline hover:text-white transition-colors">{t("nav.driverLoginArrow")}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="w-full bg-[#ff7a00] px-6 py-10">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { n: t("home.stats.fees"),       label: t("home.stats.feesLabel") },
            { n: t("home.stats.commission"), label: t("home.stats.commissionLabel") },
            { n: t("home.stats.fuel"),       label: t("home.stats.fuelLabel") },
            { n: t("home.stats.radius"),     label: t("home.stats.radiusLabel") },
          ].map(({ n, label }) => (
            <div key={label} className="text-white">
              <p className="text-4xl font-black">{n}</p>
              <p className="mt-1 text-sm font-bold text-white/80">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sits alongside your business ── */}
      <section className="w-full bg-white px-6 py-16 border-b border-black/5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row gap-10 items-start">
          <div className="flex-1">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.nodisruption.tag")}</p>
            <h2 className="mb-4 text-3xl font-black text-black">{t("home.nodisruption.title")}</h2>
            <p className="text-base font-bold text-black/70 leading-relaxed">{t("home.nodisruption.body")}</p>
          </div>
          <div className="flex-1 grid gap-3">
            {[
              t("home.nodisruption.item1"),
              t("home.nodisruption.item2"),
              t("home.nodisruption.item3"),
              t("home.nodisruption.item4"),
              t("home.nodisruption.item5"),
            ].map(text => (
              <div key={text} className="flex gap-3 items-start bg-[#f0f0f0] px-4 py-3">
                <span className="text-green-500 font-black shrink-0">✅</span>
                <p className="text-sm font-bold text-black">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.how.tag")}</p>
          <h2 className="mb-12 text-4xl font-black text-black">{t("home.how.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(["01","02","03","04","05","06"] as const).map((n, i) => {
              const k = `home.how.step${i + 1}` as const;
              return (
                <div key={n} className="bg-[#f0f0f0] p-6">
                  <p className="mb-3 text-3xl font-black text-black/20">{n}</p>
                  <h3 className="mb-2 text-base font-black text-black">{t(`${k}.title`)}</h3>
                  <p className="text-sm font-bold text-black/60 leading-relaxed">{t(`${k}.body`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.included.tag")}</p>
          <h2 className="mb-12 text-4xl font-black text-white">{t("home.included.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "📋", key: "bookings" },
              { icon: "🚗", key: "fleet" },
              { icon: "👤", key: "driver" },
              { icon: "⛽", key: "fuel" },
              { icon: "📊", key: "reports" },
              { icon: "🔔", key: "notifications" },
              { icon: "💬", key: "ai" },
              { icon: "🌍", key: "currency" },
              { icon: "📄", key: "terms" },
            ].map(({ icon, key }) => (
              <div key={key} className="border border-white/10 p-6">
                <p className="text-2xl mb-3">{icon}</p>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t(`home.included.${key}.title`)}</h3>
                <p className="text-sm font-bold text-white/60 leading-relaxed">{t(`home.included.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission explained ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-20">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.pricing.tag")}</p>
            <h2 className="mb-6 text-4xl font-black text-black">{t("home.pricing.title")}</h2>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-4">{t("home.pricing.body1")}</p>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-4">{t("home.pricing.body2")}</p>
            <p className="text-base font-bold text-black/70 leading-relaxed">
              {t("home.pricing.body3")} <strong className="text-black">{t("home.pricing.body3.formula")}</strong>{t("home.pricing.body3.end")}
            </p>
          </div>
          <div className="space-y-3">
            {([1,2,3,4] as const).map(i => {
              const highlight = i === 4;
              return (
                <div key={i} className={`flex items-center justify-between p-5 ${highlight ? "bg-black text-white" : "bg-white"}`}>
                  <div>
                    <p className={`text-sm font-black ${highlight ? "text-white" : "text-black"}`}>{t(`home.pricing.row${i}.label`)}</p>
                    <p className={`text-xs font-bold mt-0.5 ${highlight ? "text-white/60" : "text-black/40"}`}>{t(`home.pricing.row${i}.note`)}</p>
                  </div>
                  <p className={`text-xl font-black ${highlight ? "text-[#ff7a00]" : "text-black"}`}>{t(`home.pricing.row${i}.example`)}</p>
                </div>
              );
            })}
            <p className="text-xs font-bold text-black/30 text-center pt-2">{t("home.pricing.disclaimer")}</p>
          </div>
        </div>
      </section>

      {/* ── Insurance & licence ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.insurance.tag")}</p>
          <h2 className="mb-4 text-4xl font-black text-black">{t("home.insurance.title")}</h2>
          <p className="mb-10 text-base font-bold text-black/60 max-w-2xl leading-relaxed">{t("home.insurance.body")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["box1","box2"] as const).map((box, i) => (
              <div key={box} className={`border-l-4 ${i === 0 ? "border-[#ff7a00]" : "border-black"} bg-[#f0f0f0] p-6`}>
                <p className={`text-xs font-black uppercase tracking-widest mb-3 ${i === 0 ? "text-[#ff7a00]" : "text-black"}`}>{t(`home.insurance.${box}.tag`)}</p>
                <p className="text-base font-black text-black mb-2">{t(`home.insurance.${box}.title`)}</p>
                <p className="text-sm font-bold text-black/70 leading-relaxed">{t(`home.insurance.${box}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.eligibility.tag")}</p>
          <h2 className="mb-10 text-4xl font-black text-black">{t("home.eligibility.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {([1,2,3,4,5,6] as const).map(i => (
              <div key={i} className="flex gap-4 bg-white p-5">
                <span className="text-green-500 font-black text-lg shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-black text-black mb-1">{t(`home.eligibility.item${i}.title`)}</p>
                  <p className="text-sm font-bold text-black/60 leading-relaxed">{t(`home.eligibility.item${i}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cancellation policy ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.cancellation.tag")}</p>
          <h2 className="mb-10 text-4xl font-black text-black">{t("home.cancellation.title")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              { color: "border-green-500", col: "col1" },
              { color: "border-amber-500", col: "col2" },
              { color: "border-red-500",   col: "col3" },
            ] as const).map(({ color, col }) => (
              <div key={col} className={`border-l-4 ${color} bg-[#f0f0f0] p-6`}>
                <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t(`home.cancellation.${col}.label`)}</p>
                <p className="text-base font-black text-black mb-1">{t(`home.cancellation.${col}.payout`)}</p>
                <p className="text-sm font-bold text-black/60 mb-3">{t(`home.cancellation.${col}.refund`)}</p>
                <p className="text-xs font-bold text-black/40 leading-relaxed">{t(`home.cancellation.${col}.note`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application process ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-20">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.apply.tag")}</p>
            <h2 className="mb-6 text-4xl font-black text-black">{t("home.apply.title")}</h2>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-8">{t("home.apply.body")}</p>
            <Link href="/partner/signup" onClick={() => handleOutreachCta("apply")}
              className="inline-block bg-[#ff7a00] px-10 py-5 text-base font-black text-white hover:opacity-90 transition-opacity">
              {t("home.apply.cta")}
            </Link>
          </div>
          <div className="space-y-3">
            {([1,2,3,4,5] as const).map(i => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-black text-white text-sm font-black flex items-center justify-center shrink-0">{i}</div>
                <div>
                  <p className="text-sm font-black text-black">{t(`home.apply.step${i}.title`)}</p>
                  <p className="text-sm font-bold text-black/50 leading-relaxed">{t(`home.apply.step${i}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Driver section ── */}
      <section className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.driver.tag")}</p>
            <h2 className="text-3xl font-black text-white mb-3">{t("home.driver.title")}</h2>
            <p className="text-base font-bold text-white/60 max-w-lg leading-relaxed">{t("home.driver.body")}</p>
          </div>
          <Link href="/driver/login" className="shrink-0 border border-white/30 px-10 py-5 text-base font-black text-white hover:bg-white/10 transition-colors">
            {t("home.driver.cta")}
          </Link>
        </div>
      </section>

      {/* ── Customer site ── */}
      <section className="w-full bg-white px-6 py-20 border-t-4 border-[#ff7a00]">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("home.customerSite.tag")}</p>
            <h2 className="text-4xl font-black text-black mb-4">{t("home.customerSite.title")}</h2>
            <p className="text-base font-bold text-black/60 leading-relaxed">{t("home.customerSite.body")}</p>
            <p className="mt-4 text-sm font-black text-black/30 tracking-widest uppercase">camel-global.com</p>
          </div>
          <div className="shrink-0">
            <a
              href="https://camel-global.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#ff7a00] px-10 py-5 text-base font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t("home.customerSite.cta")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full bg-[#ff7a00] px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-white/60">{t("home.cta.tag")}</p>
          <h2 className="mb-4 text-5xl font-black text-white">{t("home.cta.title")}</h2>
          <p className="mb-10 text-lg font-bold text-white/80 max-w-xl mx-auto leading-relaxed">{t("home.cta.body")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/partner/signup" onClick={() => handleOutreachCta("final-cta")}
              className="bg-black px-12 py-5 text-base font-black text-white hover:opacity-80 transition-opacity">
              {t("home.cta.primary")}
            </Link>
            <Link href="/partner/login" className="border border-white/40 px-12 py-5 text-base font-black text-white hover:bg-white/10 transition-colors">
              {t("home.cta.secondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full bg-black border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-40 shrink-0">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} className="h-10 w-auto brightness-0 invert" />
          </div>
          <p className="text-xs font-bold text-white/70">{t("common.copyright", { year })}</p>
        </div>
      </footer>

    </div>
  );
}
