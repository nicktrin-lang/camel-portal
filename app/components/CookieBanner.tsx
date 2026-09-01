"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Cookie consent banner. Essential cookies always run; Google Analytics only gets
 * consent (via gtag consent update) once the visitor accepts. The choice is stored in
 * localStorage ("cookie_consent"); clearing it makes the banner reappear - which is
 * exactly what the /partner/cookies policy page tells users. Copy is inline for the
 * portal's active locales (en/es), defaulting to English.
 */
const STORAGE_KEY = "cookie_consent";

const COPY: Record<string, { msg: string; accept: string; decline: string; policy: string }> = {
  en: {
    msg: "We use essential cookies to run this portal and, with your consent, Google Analytics to understand how it is used.",
    accept: "Accept",
    decline: "Decline",
    policy: "Cookie Policy",
  },
  es: {
    msg: "Usamos cookies esenciales para el funcionamiento del portal y, con su consentimiento, Google Analytics para entender su uso.",
    accept: "Aceptar",
    decline: "Rechazar",
    policy: "Política de cookies",
  },
};

export default function CookieBanner() {
  const { locale } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable - just don't show */
    }
  }, []);

  function choose(accepted: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, accepted ? "accepted" : "rejected");
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("consent", "update", {
        analytics_storage: accepted ? "granted" : "denied",
      });
    }
    setVisible(false);
  }

  if (!visible) return null;
  const c = COPY[String(locale)] ?? COPY.en;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 z-[9999] w-full border-t border-black/10 bg-black px-4 py-5"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
        <p className="flex-1 text-sm font-semibold leading-relaxed text-white/70">
          {c.msg}{" "}
          <Link href="/partner/cookies" className="font-black text-white underline underline-offset-2 transition-colors hover:text-[#ff7a00]">
            {c.policy}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose(false)}
            className="border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-black text-white transition-colors hover:bg-white/10"
          >
            {c.decline}
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="bg-[#ff7a00] px-5 py-2.5 text-xs font-black text-white transition-opacity hover:opacity-90"
          >
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
