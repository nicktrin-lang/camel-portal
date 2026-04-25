"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";
import HCaptcha from "@/app/components/HCaptcha";

function reasonMessage(reason: string | null) {
  switch (reason) {
    case "signed_out":      return { text: "You have been signed out.", type: "info" };
    case "not_signed_in":   return { text: "Please sign in to continue.", type: "info" };
    case "not_authorized":  return { text: "You are not authorized to access that page.", type: "info" };
    case "account_deleted": return { text: "Your account has been deleted. If this was a mistake, please contact support@camel-global.com.", type: "warning" };
    default:                return null;
  }
}

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

function PartnerLoginInner() {
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
  const notice = reasonMessage(reason);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (!loginToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaOk = await verifyCaptcha(loginToken);
      if (!captchaOk) { setError("CAPTCHA verification failed. Please try again."); resetLoginCaptcha(); setLoading(false); return; }

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
          setError("This account has been deleted. Please contact support@camel-global.com if you believe this is an error.");
          resetLoginCaptcha(); setLoading(false); return;
        }

        const hasOnboarded = !!(
          profile?.base_lat && profile?.base_lng &&
          profile?.default_currency && profile?.vat_number
        );
        if (!hasOnboarded) { router.replace("/partner/onboarding"); router.refresh(); return; }
      }

      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        if (meRes.ok) {
          const meJson = await safeJson(meRes);
          const role = meJson?.role || "";
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
      if (!forgotToken) { setResetError("Please complete the CAPTCHA."); setResetLoading(false); return; }
      const captchaOk = await verifyCaptcha(forgotToken);
      if (!captchaOk) { setResetError("CAPTCHA verification failed. Please try again."); resetForgotCaptcha(); setResetLoading(false); return; }

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

      {/* Header */}
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} priority className="h-12 w-auto brightness-0 invert" />
          </Link>
          <Link href="/partner/signup" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
            Become a Partner
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Partner Portal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            {mode === "login" ? "Welcome back." : "Reset Password"}
          </h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            {mode === "login"
              ? "Sign in to manage your profile and bookings."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>
      </div>

      {/* Form area */}
      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-xl">
          <div className="bg-white p-8 space-y-5">

            {mode === "login" ? (
              <>
                {notice && (
                  <div className={`border px-4 py-3 text-sm font-semibold ${
                    notice.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-blue-200 bg-blue-50 text-blue-700"
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
                        Clear session &amp; retry
                      </button>
                    )}
                  </div>
                )}

                {reason !== "account_deleted" && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" autoComplete="email" required value={email}
                        onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls} style={{ marginBottom: 0 }}>Password</label>
                        <button type="button"
                          onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }}
                          className="text-xs font-black text-[#ff7a00] hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <input type="password" autoComplete="current-password" required value={password}
                        onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                    </div>
                    <HCaptcha key={loginKey} onVerify={handleLoginToken} onExpire={() => setLoginToken("")} />
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                      {loading ? "Signing in…" : "Sign In →"}
                    </button>
                  </form>
                )}

                {/* Become a partner CTA */}
                <div className="bg-[#f0f0f0] p-5">
                  <p className="text-sm font-black text-black mb-1">Want to join the Camel Global network?</p>
                  <p className="text-xs font-semibold text-black/50 mb-4">Register your car hire company and start receiving bookings.</p>
                  <Link href="/partner/signup"
                    className="block w-full bg-black py-4 text-center text-sm font-black text-white hover:opacity-80 transition-opacity">
                    Become a Partner →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <button type="button"
                  onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                  className="flex items-center gap-1 text-sm font-black text-black hover:underline">
                  ← Back to login
                </button>

                {resetSent ? (
                  <div className="bg-[#f0f0f0] px-5 py-5 space-y-2">
                    <p className="text-base font-black text-black">Reset email sent ✓</p>
                    <p className="text-sm font-semibold text-black/60">Check your inbox — it may take a minute.</p>
                    <button type="button" onClick={() => setMode("login")}
                      className="text-sm font-black text-[#ff7a00] hover:underline">
                      Back to login
                    </button>
                  </div>
                ) : (
                  <>
                    {resetError && (
                      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {resetError}
                      </div>
                    )}
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className={labelCls}>Email address</label>
                        <input type="email" autoComplete="email" required value={email}
                          onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
                      </div>
                      <HCaptcha key={forgotKey} onVerify={handleForgotToken} onExpire={() => setForgotToken("")} />
                      <button type="submit" disabled={resetLoading}
                        className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                        {resetLoading ? "Sending…" : "Send Reset Link →"}
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