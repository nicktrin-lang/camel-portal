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

/** Compact EN/ES toggle — fits in tight mobile headers */
function CompactLanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center border border-white/20 overflow-hidden">
      {options.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            "px-2 py-1.5 text-xs font-black transition-colors",
            i < options.length - 1 ? "border-r border-white/20" : "",
            locale === code
              ? "bg-[#ff7a00] text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();
  const pathname = usePathname();
  const { t }    = useTranslation();

  const [loading,     setLoading]     = useState(true);
  const [driverName,  setDriverName]  = useState("");
  const [companyName, setCompanyName] = useState("");

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

  // Public pages — constrained header, no footer
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

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
      {/* Authenticated header */}
      <header className="fixed inset-x-0 top-0 z-40 h-[76px] bg-black border-b border-white/10 text-white">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} priority className="h-12 w-auto brightness-0 invert" />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            {driverName && (
              <div className="hidden flex-col items-end md:flex">
                <span className="text-sm font-bold text-white">{driverName}</span>
                {companyName && <span className="text-xs text-white/60">{companyName}</span>}
              </div>
            )}
            <CompactLanguageToggle />
            <span className="border border-white/20 px-2 py-1 text-xs font-black text-white uppercase tracking-widest">Driver</span>
            <button
              type="button"
              onClick={handleLogout}
              className="border border-white/30 px-3 py-2 text-xs font-black text-white hover:bg-white/10 transition-colors md:px-4 md:py-2.5 md:text-sm"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <div className="pt-[76px] flex-1">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>

      <Footer />
    </div>
  );
}