"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import Footer from "@/app/components/Footer";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

const PUBLIC_DRIVER_PATHS = ["/driver/login", "/driver/signup", "/driver/reset-password"];

function CompactLanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "it", label: "IT" },
    { code: "pt", label: "PT" },
    { code: "de", label: "DE" },
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

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase    = useMemo(() => createBrowserSupabaseClient(), []);
  const router      = useRouter();
  const pathname    = usePathname();
  const { t }       = useTranslation();
  const { locale, setLocale } = useLanguage();

  const [loading,     setLoading]     = useState(true);
  const [driverName,  setDriverName]  = useState("");
  const [companyName, setCompanyName] = useState("");
  const [menuOpen,    setMenuOpen]    = useState(false);

  const isPublic = PUBLIC_DRIVER_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublic) { setLoading(false); return; }
    let mounted = true;
    async function guard() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) { router.replace("/driver/login?reason=not_signed_in"); return; }
      setDriverName(
        String(data.user.user_metadata?.full_name || "").trim() ||
        String(data.user.email || "").split("@")[0] || ""
      );
      try {
        const res  = await fetch("/api/driver/jobs", { credentials: "include", cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (mounted && json?.driver?.company_name) setCompanyName(json.driver.company_name);
        if (mounted && json?.driver?.full_name) setDriverName(json.driver.full_name);
      } catch {}
      if (mounted) setLoading(false);
    }
    guard();
    return () => { mounted = false; };
  }, [isPublic, router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/driver/login?reason=signed_out");
  }

  const langOptions: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "it", label: "IT" },
    { code: "pt", label: "PT" },
    { code: "de", label: "DE" },
  ];

  // ── Public pages ────────────────────────────────────────────────────────────
  if (isPublic) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <header className="fixed inset-x-0 top-0 z-40 bg-black border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/">
              <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
            </Link>
            <div className="flex items-center gap-3">
              <CompactLanguageToggle />
              <Link href="/" className="text-sm font-bold text-white/60 hover:text-white transition-colors">
                Partner Portal →
              </Link>
            </div>
          </div>
        </header>
        <div className="pt-[76px]">{children}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] pt-[76px]">
        <div className="px-4 py-8">
          <div className="border border-black/5 bg-white p-8">
            <p className="text-sm font-semibold text-black/50">{t("driver.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated pages ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
      <header className="fixed inset-x-0 top-0 z-40 bg-black border-b border-white/10 text-white">
        {/* Main header row */}
        <div className="flex h-[76px] items-center justify-between px-4 md:px-8">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} priority className="h-12 w-auto brightness-0 invert" />
          </Link>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {driverName && (
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white">{driverName}</span>
                {companyName && <span className="text-xs text-white/60">{companyName}</span>}
              </div>
            )}
            <CompactLanguageToggle />
            <span className="border border-white/20 px-3 py-1 text-xs font-black text-white uppercase tracking-widest">Driver</span>
            <button type="button" onClick={handleLogout}
              className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
              {t("common.logout")}
            </button>
          </div>

          {/* Mobile right — Driver badge + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <span className="border border-white/20 px-2 py-1 text-xs font-black text-white uppercase tracking-widest">Driver</span>
            <button type="button" onClick={() => setMenuOpen(o => !o)}
              className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu">
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
          <div className="md:hidden border-t border-white/10 bg-black px-4 pb-4 pt-3 space-y-3">
            {/* Language */}
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
            {/* Driver info */}
            {driverName && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-sm font-bold text-white">{driverName}</p>
                {companyName && <p className="text-xs text-white/60">{companyName}</p>}
              </div>
            )}
            {/* Logout */}
            <button type="button" onClick={handleLogout}
              className="w-full border border-white/30 py-3 text-sm font-black text-white hover:bg-white/10 transition-colors">
              {t("common.logout")}
            </button>
          </div>
        )}
      </header>

      {/* Offset — header height is 76px; dropdown adds height so we use fixed offset */}
      <div className="pt-[76px] flex-1">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>

      <Footer />
    </div>
  );
}