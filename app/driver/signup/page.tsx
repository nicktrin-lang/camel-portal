// ── app/driver/signup/page.tsx ────────────────────────────────────────────────
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import HCaptcha from "@/app/components/HCaptcha";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function DriverSignupPage() {
  const { t } = useTranslation();
  const router   = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey,   setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);
  function resetCaptcha() { setCaptchaToken(""); setCaptchaKey(k => k + 1); }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!captchaToken) { setError(t("driver.signup.captchaError")); setLoading(false); return; }
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!captchaRes.ok) { setError(t("driver.signup.captchaFail")); resetCaptcha(); setLoading(false); return; }

      const res  = await fetch("/api/driver/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || t("driver.signup.error.notFound"));

      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) throw new Error(signUpError.message);

      const userId = data.user?.id;
      if (!userId) throw new Error(t("driver.signup.error.generic"));

      await fetch("/api/driver/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, auth_user_id: userId }),
      });

      setSuccess(true);
      setTimeout(() => router.push("/driver/login"), 1500);
    } catch (e: any) {
      setError(e?.message || t("driver.signup.error.generic"));
      resetCaptcha();
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f0f0]">
      <div className="bg-black py-16 px-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">{t("driver.signup.tag")}</p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">{t("driver.signup.title")}</h1>
        <p className="mt-3 text-base font-bold text-white/60">{t("driver.signup.subtitle")}</p>
      </div>

      <div className="flex-1 bg-[#f0f0f0] py-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white p-8 md:p-10">
          {error && <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {success && <div className="mb-6 border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{t("driver.signup.success")}</div>}
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">{t("driver.signup.email")}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                placeholder={t("driver.signup.email.placeholder")} required />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">{t("driver.signup.password")}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                placeholder={t("driver.signup.password.placeholder")} required />
            </div>
            <HCaptcha key={captchaKey} onVerify={handleCaptcha} onExpire={() => setCaptchaToken("")} />
            <button type="submit" disabled={loading}
              className="w-full bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? t("driver.signup.creating") : t("driver.signup.createBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


// ── app/driver/reset-password/page.tsx ───────────────────────────────────────
// Save as a separate file