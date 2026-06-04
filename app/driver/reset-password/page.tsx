// ── app/driver/reset-password/page.tsx ───────────────────────────────────────
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

function DriverResetPasswordInner() {
  const { t } = useTranslation();
  const authClient = useMemo(() => createAuthSupabaseClient(), []);
  const supabase   = useMemo(() => createBrowserSupabaseClient(), []);
  const router     = useRouter();

  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);
  const [sessionReady,  setSessionReady]  = useState(false);
  const [sessionError,  setSessionError]  = useState("");

  useEffect(() => {
    async function init() {
      const hash        = window.location.hash.substring(1);
      const params      = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken= params.get("refresh_token");
      const errorCode   = params.get("error_code");

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
    } catch (e: any) { setError(e?.message || t("driver.reset.err.failed")); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl items-center px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-10">
        {sessionError ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">{t("driver.reset.expired.title")}</h1>
            <p className="mt-2 text-slate-600">{sessionError}</p>
            <a href="/driver/login" className="mt-6 inline-block rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              {t("driver.reset.expired.backBtn")}
            </a>
          </>
        ) : success ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">{t("driver.reset.success.title")}</h1>
            <p className="mt-2 text-slate-600">{t("driver.reset.success.body")}</p>
          </>
        ) : !sessionReady ? (
          <p className="text-slate-600">{t("driver.reset.verifying")}</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">{t("driver.reset.title")}</h1>
            <p className="mt-2 text-slate-600">{t("driver.reset.subtitle")}</p>
            {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">{t("driver.reset.newPassword")}</label>
                <input type="password" required autoComplete="new-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder={t("driver.reset.newPassword.placeholder")} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#003768]">{t("driver.reset.confirmPassword")}</label>
                <input type="password" required autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder={t("driver.reset.confirmPassword.placeholder")} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {loading ? t("driver.reset.updating") : t("driver.reset.setBtn")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
      <DriverResetPasswordInner />
    </Suspense>
  );
}


// ── app/driver/jobs/page.tsx ──────────────────────────────────────────────────
// Save as a separate file