"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Props = { open: boolean; onClose: () => void };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LANG_OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
  { code: "it", label: "IT" },
  { code: "pt", label: "PT" },
  { code: "de", label: "DE" },
];

export default function PartnerSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();
  const { t } = useTranslation();

  const navItems = [
    { href: "/partner/account",     label: t("nav.accountManagement") },
    { href: "/partner/bookings",    label: t("nav.bookings") },
    { href: "/partner/drivers",     label: t("nav.drivers") },
    { href: "/partner/fleet",       label: t("nav.carFleet") },
    { href: "/partner/reports",     label: t("nav.reportManagement") },
    { href: "/partner/requests",    label: t("nav.requests") },
    { href: "/partner/reviews",     label: t("nav.reviews") },
    { href: "/partner/settings",    label: t("nav.settings") },
    { href: "/partner/suggestions", label: t("nav.suggestions") },
  ];

  return (
    <>
      {open && (
        <button type="button" aria-label="Close sidebar overlay" onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden" />
      )}
      <aside className={[
        "fixed left-0 z-40 w-[290px] border-r border-white/10",
        "bg-gradient-to-b from-[#003768] to-[#005b9f] text-white shadow-2xl",
        "transform transition-transform duration-300 ease-in-out",
        "top-[105px] h-[calc(100vh-105px)] md:top-[115px] md:h-[calc(100vh-115px)]",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      ].join(" ")}>
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/10 px-6 pb-6 pt-8">
            <Link href="/partner/dashboard" onClick={onClose} className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{t("nav.camelGlobal")}</div>
              <div className="mt-2 text-2xl font-semibold">{t("nav.partnerPortal")}</div>
              <div className="mt-3 text-sm text-white/75">{t("nav.operationsDashboard")}</div>
            </Link>
          </div>
          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{t("nav.navigation")}</div>
            <div className="space-y-2">
              {navItems.map(item => {
                const active = isActive(pathname || "", item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={["block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active ? "bg-white text-[#003768] shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                             : "text-white/90 hover:bg-white/10 hover:text-white",
                    ].join(" ")}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Language switcher */}
          <div className="border-t border-white/10 px-5 py-4">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-white/30">{t("settings.language.label")}</p>
            <div className="flex flex-wrap gap-1">
              {LANG_OPTIONS.map(({ code, label }) => (
                <button key={code} type="button"
                  onClick={() => setLocale(code)}
                  className={[
                    "px-3 py-1.5 text-xs font-black transition-colors border",
                    locale === code
                      ? "bg-[#ff7a00] text-white border-[#ff7a00]"
                      : "text-white/60 border-white/20 hover:bg-white/10 hover:text-white",
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 px-5 py-5">
            <Link href="/partner/profile" onClick={onClose}
              className="block rounded-2xl bg-[#ff7a00] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] hover:opacity-95">
              {t("account.actions.editProfile")}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
