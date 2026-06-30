"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient, createCustomerAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageToggle from "@/lib/i18n/LanguageToggle";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

/** Mobile-only language row (lg:hidden). Desktop (lg+) uses the inline <LanguageToggle /> in the header. */
function MobileLanguageRow() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" }, { code: "es", label: "ES" }, { code: "fr", label: "FR" },
    { code: "it", label: "IT" }, { code: "pt", label: "PT" }, { code: "de", label: "DE" },
  ];
  return (
    <div className="lg:hidden w-full bg-black border-b border-white/10 px-4 pb-3 pt-1">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/30">{t("settings.language.label")}</p>
        <div className="flex gap-2">
          {options.map(({ code, label }) => (
            <button key={code} type="button" onClick={() => setLocale(code)}
              aria-pressed={locale === code}
              className={[
                "flex-1 py-2.5 text-sm font-black border transition-colors",
                locale === code
                  ? "bg-[#ff7a00] border-[#ff7a00] text-white"
                  : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white",
              ].join(" ")}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerResetPasswordInner() {
  const { t }               = useTranslation();
  const supabase            = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient          = useMemo(() => createAuthSupabaseClient(), []);
  const customerAuthClient  = useMemo(() => createCustomerAuthSupabaseClient(), []);
  const router              = useRouter();

  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    async function init() {
      const hash         = window.location.hash.substring(1);
      const params       = new URLSearchParams(hash);
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const errorCode    = params.get("error_code");

      if (errorCode) { setSessionError(t("reset.expired.body")); return; }

      if (accessToken && refreshToken) {
        const portalCookie = document.cookie.split("; ").find(r => r.startsWith("resetPortal="))?.split("=")[1] ?? null;
        const initClient   = portalCookie === "customer" ? customerAuthClient : authClient;
        const { error }    = await initClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) { setSessionError(t("reset.expired.body")); } else { setSessionReady(true); }
        return;
      }

      const { data } = await authClient.auth.getSession();
      if (data?.session) { setSessionReady(true); return; }
      const { data: ssrData } = await supabase.auth.getSession();
      if (ssrData?.session) { setSessionReady(true); } else { setSessionError(t("reset.expired.body")); }
    }
    init();
  }, [authClient, supabase, customerAuthClient]);

  async function getSuccessRedirect(): Promise<string> {
    const stored = document.cookie.split("; ").find(r => r.startsWith("resetPortal="))?.split("=")[1] ?? null;
    document.cookie = "resetPortal=; domain=.camel-global.com; path=/; max-age=0";
    if (stored === "driver")   return "/driver/jobs";
    if (stored === "customer") return "/test-booking/login";
    return "/partner/requests";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm)  { setError(t("reset.err.match"));  return; }
    if (password.length < 8)   { setError(t("reset.err.length")); return; }
    setLoading(true); setError("");
    try {
      const portalCookie = document.cookie.split("; ").find(r => r.startsWith("resetPortal="))?.split("=")[1] ?? null;
      const activeClient = portalCookie === "customer" ? customerAuthClient : authClient;
      const { error }    = await activeClient.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      const redirect = await getSuccessRedirect();
      setTimeout(() => router.replace(redirect), 2500);
    } catch (e: any) {
      setError(e?.message || t("reset.err.failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/partner/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <div className="hidden lg:block"><LanguageToggle /></div>
        </div>
      </header>

      <MobileLanguageRow />

      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            {t("login.tag")}
          </p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {t("reset.title")}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {t("reset.subtitle")}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-xl">
          <div className="bg-white p-8 space-y-5">
            {sessionError ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">{t("reset.expired.title")}</p>
                <h2 className="text-2xl font-black text-black">{t("reset.expired.body")}</h2>
                <Link href="/partner/login"
                  className="inline-block bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity">
                  {t("reset.expired.cta")}
                </Link>
              </>
            ) : success ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">✓ {t("reset.success.title")}</p>
                <h2 className="text-2xl font-black text-black">{t("reset.success.body")}</h2>
              </>
            ) : !sessionReady ? (
              <p className="text-sm font-semibold text-black/50">{t("reset.verifying")}</p>
            ) : (
              <>
                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>{t("reset.newPassword")}</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t("reset.newPassword.placeholder")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t("reset.confirmPassword")}</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder={t("reset.confirmPassword.placeholder")}
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {loading ? t("reset.updating") : t("reset.cta")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PartnerResetPasswordInner />
    </Suspense>
  );
}
