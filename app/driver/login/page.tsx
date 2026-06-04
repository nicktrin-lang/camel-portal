// ── app/driver/login/page.tsx ─────────────────────────────────────────────────
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import HCaptcha from "@/app/components/HCaptcha";
import { useTranslation } from "@/lib/i18n/useTranslation";

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify-captcha", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

export default function DriverLoginPage() {
  const { t } = useTranslation();
  const router   = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [mode,         setMode]         = useState<"login" | "forgot">("login");
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");
  const [loginToken,   setLoginToken]   = useState("");
  const [forgotToken,  setForgotToken]  = useState("");
  const [loginKey,     setLoginKey]     = useState(0);
  const [forgotKey,    setForgotKey]    = useState(0);

  const handleLoginToken  = useCallback((t: string) => setLoginToken(t), []);
  const handleForgotToken = useCallback((t: string) => setForgotToken(t), []);
  function resetLoginCaptcha()  { setLoginToken("");  setLoginKey(k => k + 1); }
  function resetForgotCaptcha() { setForgotToken(""); setForgotKey(k => k + 1); }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!loginToken) { setError(t("driver.login.captchaError")); setLoading(false); return; }
      const captchaOk = await verifyCaptcha(loginToken);
      if (!captchaOk) { setError(t("driver.login.captchaFail")); resetLoginCaptcha(); setLoading(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message || "Failed to sign in.");
      router.push("/driver/jobs"); router.refresh();
    } catch (e: any) { setError(e?.message || "Failed to sign in."); resetLoginCaptcha(); }
    finally { setLoading(false); }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      if (!forgotToken) { setResetError(t("driver.login.captchaError")); setResetLoading(false); return; }
      const captchaOk = await verifyCaptcha(forgotToken);
      if (!captchaOk) { setResetError(t("driver.login.captchaFail")); resetForgotCaptcha(); setResetLoading(false); return; }
      document.cookie = "resetPortal=driver; domain=.camel-global.com; path=/; max-age=3600";
      const res  = await fetch("/api/auth/send-reset-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/?portal=driver` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) { setResetError(e?.message || "Failed to send reset email."); resetForgotCaptcha(); }
    finally { setResetLoading(false); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f0f0]">
      <div className="bg-black py-16 px-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">{t("driver.login.tag")}</p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">
          {mode === "forgot" ? t("driver.login.reset.title") : t("driver.login.title")}
        </h1>
        <p className="mt-3 text-base font-bold text-white/60">
          {mode === "forgot" ? t("driver.login.reset.subtitle") : t("driver.login.subtitle")}
        </p>
      </div>

      <div className="flex-1 bg-[#f0f0f0] py-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white p-8 md:p-10">

          {mode === "login" ? (
            <>
              {error && <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-black">{t("driver.login.email")}</label>
                  <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                    placeholder={t("driver.login.email.placeholder")} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-black">{t("driver.login.password")}</label>
                    <button type="button" onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }}
                      className="text-xs font-bold text-black/50 hover:text-black transition-colors">
                      {t("driver.login.forgotPassword")}
                    </button>
                  </div>
                  <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                    placeholder={t("driver.login.password.placeholder")} />
                </div>
                <HCaptcha key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
                <button type="submit" disabled={loading}
                  className="w-full bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
                  {loading ? t("driver.login.signingIn") : t("driver.login.signIn")}
                </button>
              </form>
              <p className="mt-6 text-sm font-bold text-black/50">
                {t("driver.login.newDriver")}{" "}
                <Link href="/driver/signup" className="text-black hover:text-[#ff7a00] transition-colors">{t("driver.login.setPassword")}</Link>
              </p>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                className="mb-6 flex items-center gap-2 text-sm font-black text-black/50 hover:text-black transition-colors">
                {t("driver.login.reset.backToLogin")}
              </button>
              {resetSent ? (
                <div className="border border-black/10 bg-[#f0f0f0] p-6">
                  <p className="text-sm font-black text-black">{t("driver.login.reset.sent.title")}</p>
                  <p className="mt-1 text-sm font-bold text-black/60">{t("driver.login.reset.sent.body")}</p>
                  <button type="button" onClick={() => setMode("login")}
                    className="mt-4 text-sm font-black text-[#ff7a00] hover:opacity-80 transition-opacity">
                    {t("driver.login.reset.sent.backBtn")}
                  </button>
                </div>
              ) : (
                <>
                  {resetError && <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{resetError}</div>}
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-black">{t("driver.login.reset.emailLabel")}</label>
                      <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                        className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                        placeholder={t("driver.login.reset.emailPlaceholder")} />
                    </div>
                    <HCaptcha key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                    <button type="submit" disabled={resetLoading}
                      className="w-full bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
                      {resetLoading ? t("driver.login.reset.sending") : t("driver.login.reset.sendBtn")}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ── app/driver/signup/page.tsx ────────────────────────────────────────────────
// Save as a separate file