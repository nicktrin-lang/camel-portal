"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";
import HCaptcha from "@/app/components/HCaptcha";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageToggle from "@/lib/i18n/LanguageToggle";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function clearStaleSupabaseLocks() {
  try {
    Object.keys(localStorage).filter(k => k.includes("sb-") || k.includes("supabase")).forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter(k => k.includes("sb-") || k.includes("supabase")).forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/verify-captcha", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

const inputCls = "w-full bg-[#f0f0f0] px-4 py-4 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "block text-xs font-black uppercase tracking-widest text-black mb-2";

/** Mobile-only six-box language row (lg:hidden). Desktop uses <LanguageToggle /> in the header.
 *  Matches the customer-site LANGUAGE-labelled box row. Visual only — drives the shared locale context. */
function MobileLanguageRow() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" }, { code: "es", label: "ES" }, { code: "fr", label: "FR" },
    { code: "it", label: "IT" }, { code: "pt", label: "PT" }, { code: "de", label: "DE" },
  ];
  return (
    <div className="lg:hidden w-full bg-black border-b border-white/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/40">Language</span>
        <div className="flex flex-1 gap-1">
          {options.map(({ code, label }) => (
            <button key={code} type="button" onClick={() => setLocale(code)}
              aria-pressed={locale === code}
              className={[
                "flex-1 border py-1.5 text-xs font-black transition-colors",
                locale === code
                  ? "border-[#ff7a00] bg-[#ff7a00] text-white"
                  : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerLoginInner() {
  const { t }      = useTranslation();
  const supabase   = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient = useMemo(() => createAuthSupabaseClient(), []);
  const router     = useRouter();
  const searchParams = useSearchParams();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
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

  const reason = searchParams.get("reason");

  function reasonMessage(r: string | null) {
    switch (r) {
      case "signed_out":      return { text: t("login.reason.signedOut"),       type: "info" };
      case "not_signed_in":   return { text: t("login.reason.notSignedIn"),     type: "info" };
      case "not_authorized":  return { text: t("login.reason.notAuthorized"),   type: "info" };
      case "account_deleted": return { text: t("login.reason.accountDeleted"),  type: "warning" };
      default: return null;
    }
  }
  const notice = reasonMessage(reason);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (!loginToken) { setError(t("login.captchaError")); setLoading(false); return; }
      const captchaOk = await verifyCaptcha(loginToken);
      if (!captchaOk) { setError(t("login.captchaFail")); resetLoginCaptcha(); setLoading(false); return; }

      clearStaleSupabaseLocks();
      const signInPromise  = supabase.auth.signInWithPassword({ email: email.trim(), password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 30000)
      );
      const { error: signInError } = await Promise.race([signInPromise, timeoutPromise]);
      if (signInError) throw signInError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("partner_profiles")
          .select("base_lat, base_lng, default_currency, vat_number, deleted_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.deleted_at) {
          await supabase.auth.signOut();
          clearStaleSupabaseLocks();
          setError(t("login.reason.accountDeleted"));
          resetLoginCaptcha(); setLoading(false); return;
        }

        const hasOnboarded = !!(profile?.base_lat && profile?.base_lng && profile?.default_currency && profile?.vat_number);
        if (!hasOnboarded) { router.replace("/partner/onboarding"); router.refresh(); return; }
      }

      try {
        const meRes  = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        if (meRes.ok) {
          const meJson = await safeJson(meRes);
          const role   = meJson?.role || "";
          if (role === "admin" || role === "super_admin") {
            router.replace("/admin/approvals"); router.refresh(); return;
          }
        }
      } catch {}

      router.replace("/partner/dashboard"); router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
      resetLoginCaptcha(); setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      if (!forgotToken) { setResetError(t("login.captchaError")); setResetLoading(false); return; }
      const captchaOk = await verifyCaptcha(forgotToken);
      if (!captchaOk) { setResetError(t("login.captchaFail")); resetForgotCaptcha(); setResetLoading(false); return; }

      document.cookie = "resetPortal=partner; domain=.camel-global.com; path=/; max-age=3600";
      const res  = await fetch("/api/auth/send-reset-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/partner/reset-password` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message || "Failed to send reset email.");
      resetForgotCaptcha();
    } finally { setResetLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/"><Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" /></Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/partner/signup" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
              {t("nav.becomePartner")}
            </Link>
          </div>
        </div>
      </header>

      <MobileLanguageRow />

      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("login.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {mode === "login" ? t("login.title") : t("login.reset.title")}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {mode === "login" ? t("login.subtitle") : t("login.reset.subtitle")}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-xl">
          <div className="bg-white p-8 space-y-5">
            {mode === "login" ? (
              <>
                {notice && (
                  <div className={`border px-4 py-3 text-sm font-semibold ${
                    notice.type === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700"
                  }`}>
                    {notice.text}
                  </div>
                )}
                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                    {error.includes("timed out") && (
                      <button type="button"
                        onClick={() => { try { Object.keys(localStorage).filter(k => k.includes("sb-") || k.includes("supabase")).forEach(k => localStorage.removeItem(k)); } catch {} window.location.reload(); }}
                        className="ml-2 underline font-black">
                        {t("login.clearRetry")}
                      </button>
                    )}
                  </div>
                )}
                {reason !== "account_deleted" && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className={labelCls}>{t("login.email")}</label>
                      <input type="email" autoComplete="email" required value={email}
                        onChange={e => setEmail(e.target.value)} className={inputCls} placeholder={t("login.email.placeholder")} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls} style={{ marginBottom: 0 }}>{t("login.password")}</label>
                        <button type="button"
                          onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }}
                          className="text-xs font-black text-[#ff7a00] hover:underline">
                          {t("login.forgotPassword")}
                        </button>
                      </div>
                      <input type="password" autoComplete="current-password" required value={password}
                        onChange={e => setPassword(e.target.value)} className={inputCls} placeholder={t("login.password.placeholder")} />
                    </div>
                    <HCaptcha key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                      {loading ? t("login.signingIn") : t("login.signIn")}
                    </button>
                  </form>
                )}
                <div className="bg-[#f0f0f0] p-5">
                  <p className="text-sm font-black text-black mb-1">{t("login.joinTitle")}</p>
                  <p className="text-xs font-semibold text-black/50 mb-4">{t("login.joinBody")}</p>
                  <Link href="/partner/signup"
                    className="block w-full bg-black py-4 text-center text-sm font-black text-white hover:opacity-80 transition-opacity">
                    {t("login.joinCta")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <button type="button"
                  onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                  className="flex items-center gap-1 text-sm font-black text-black hover:underline">
                  {t("login.backToLogin")}
                </button>
                {resetSent ? (
                  <div className="bg-[#f0f0f0] px-5 py-5 space-y-2">
                    <p className="text-base font-black text-black">{t("login.resetSentTitle")}</p>
                    <p className="text-sm font-semibold text-black/60">{t("login.resetSentBody")}</p>
                    <button type="button" onClick={() => setMode("login")}
                      className="text-sm font-black text-[#ff7a00] hover:underline">
                      {t("login.backToLogin")}
                    </button>
                  </div>
                ) : (
                  <>
                    {resetError && (
                      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{resetError}</div>
                    )}
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className={labelCls}>{t("login.email")}</label>
                        <input type="email" autoComplete="email" required value={email}
                          onChange={e => setEmail(e.target.value)} className={inputCls} placeholder={t("login.email.placeholder")} />
                      </div>
                      <HCaptcha key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                      <button type="submit" disabled={resetLoading}
                        className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                        {resetLoading ? t("login.sending") : t("login.sendReset")}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PartnerLoginInner />
    </Suspense>
  );
}
