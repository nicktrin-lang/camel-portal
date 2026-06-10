"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

function DriverResetPasswordInner() {
  const { t }      = useTranslation();
  const authClient = useMemo(() => createAuthSupabaseClient(), []);
  const supabase   = useMemo(() => createBrowserSupabaseClient(), []);
  const router     = useRouter();

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

      if (errorCode) { setSessionError(t("driver.reset.expired.body")); return; }
      if (accessToken && refreshToken) {
        const { error } = await authClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) setSessionError(t("driver.reset.expired.body"));
        else setSessionReady(true);
        return;
      }
      const { data } = await authClient.auth.getSession();
      if (data?.session) { setSessionReady(true); return; }
      const { data: ssrData } = await supabase.auth.getSession();
      if (ssrData?.session) { setSessionReady(true); return; }
      setSessionError(t("driver.reset.expired.body"));
    }
    init();
  }, [authClient, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(t("driver.reset.err.match")); return; }
    if (password.length < 8)  { setError(t("driver.reset.err.length")); return; }
    setLoading(true); setError("");
    try {
      const { error } = await authClient.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.replace("/driver/login"), 2500);
    } catch (e: any) {
      setError(e?.message || t("driver.reset.err.failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/driver/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">
            {t("login.tag")}
          </p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {t("driver.reset.title")}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {t("driver.reset.subtitle")}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-xl">
          <div className="bg-white p-8 space-y-5">
            {sessionError ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">{t("driver.reset.expired.title")}</p>
                <h2 className="text-2xl font-black text-black">{sessionError}</h2>
                <Link href="/driver/login"
                  className="inline-block bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity">
                  {t("driver.reset.expired.backBtn")}
                </Link>
              </>
            ) : success ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">✓ {t("driver.reset.success.title")}</p>
                <h2 className="text-2xl font-black text-black">{t("driver.reset.success.body")}</h2>
              </>
            ) : !sessionReady ? (
              <p className="text-sm font-semibold text-black/50">{t("driver.reset.verifying")}</p>
            ) : (
              <>
                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>{t("driver.reset.newPassword")}</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t("driver.reset.newPassword.placeholder")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t("driver.reset.confirmPassword")}</label>
                    <input
                      type="password" required autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder={t("driver.reset.confirmPassword.placeholder")}
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {loading ? t("driver.reset.updating") : t("driver.reset.setBtn")}
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

export default function DriverResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <DriverResetPasswordInner />
    </Suspense>
  );
}
