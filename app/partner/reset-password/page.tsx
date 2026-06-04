"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient, createCustomerAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

function PartnerResetPasswordInner() {
  const { t }               = useTranslation();
  const supabase            = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient          = useMemo(() => createAuthSupabaseClient(), []);
  const customerAuthClient  = useMemo(() => createCustomerAuthSupabaseClient(), []);
  const router              = useRouter();

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    async function init() {
      const hash        = window.location.hash.substring(1);
      const params      = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken= params.get("refresh_token");
      const errorCode   = params.get("error_code");

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
    if (password !== confirm)    { setError(t("reset.err.match"));  return; }
    if (password.length < 8)     { setError(t("reset.err.length")); return; }
    setLoading(true); setError("");
    try {
      const portalCookie  = document.cookie.split("; ").find(r => r.startsWith("resetPortal="))?.split("=")[1] ?? null;
      const activeClient  = portalCookie === "customer" ? customerAuthClient : authClient;
      const { error }     = await activeClient.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      const redirect = await getSuccessRedirect();
      setTimeout(() => router.replace(redirect), 2500);
    } catch (e: any) {
      setError(e?.message || t("reset.err.failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/partner/login" className="flex items-center">
            <Image src="/camel-logo.png" alt="Camel Global logo" width={180} height={60} priority className="h-[52px] w-auto" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-7xl justify-center px-4 pt-24 pb-10">
        <div className="mt-8 w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
          {sessionError ? (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">{t("reset.expired.title")}</h1>
              <p className="mt-3 text-lg text-slate-600">{sessionError}</p>
              <Link href="/partner/login" className="mt-8 inline-block rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95">
                {t("reset.expired.cta")}
              </Link>
            </>
          ) : success ? (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">{t("reset.success.title")}</h1>
              <p className="mt-3 text-lg text-slate-600">{t("reset.success.body")}</p>
            </>
          ) : !sessionReady ? (
            <p className="text-slate-600">{t("reset.verifying")}</p>
          ) : (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">{t("reset.title")}</h1>
              <p className="mt-3 text-lg text-slate-600">{t("reset.subtitle")}</p>
              {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#003768]">{t("reset.newPassword")}</label>
                  <input type="password" required autoComplete="new-password"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={password} onChange={e => setPassword(e.target.value)} placeholder={t("reset.newPassword.placeholder")} />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#003768]">{t("reset.confirmPassword")}</label>
                  <input type="password" required autoComplete="new-password"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t("reset.confirmPassword.placeholder")} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                  {loading ? t("reset.updating") : t("reset.cta")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartnerResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
      <PartnerResetPasswordInner />
    </Suspense>
  );
}