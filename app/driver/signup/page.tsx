"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import HCaptcha from "@/app/components/HCaptcha";

export default function DriverSignupPage() {
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
      if (!captchaToken) { setError("Please complete the CAPTCHA."); setLoading(false); return; }
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!captchaRes.ok) { setError("CAPTCHA verification failed. Please try again."); resetCaptcha(); setLoading(false); return; }

      const res  = await fetch("/api/driver/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Driver not found.");

      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) throw new Error(signUpError.message);

      const userId = data.user?.id;
      if (!userId) throw new Error("Failed to create account.");

      await fetch("/api/driver/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, auth_user_id: userId }),
      });

      setSuccess(true);
      setTimeout(() => router.push("/driver/login"), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to create account.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f0f0]">

      {/* Black hero band */}
      <div className="bg-black py-16 px-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">Driver Portal</p>
        <h1 className="text-4xl font-black text-white sm:text-5xl">Set Your Password</h1>
        <p className="mt-3 text-base font-bold text-white/60">Create your driver login to access assigned jobs.</p>
      </div>

      {/* Form area */}
      <div className="flex-1 bg-[#f0f0f0] py-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white p-8 md:p-10">

          {error && (
            <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-6 border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">
              Account created. Redirecting to login…
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                placeholder="driver@company.com" required />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-4 text-sm font-bold outline-none focus:border-black"
                placeholder="Create password" required />
            </div>
            <HCaptcha key={captchaKey} onVerify={handleCaptcha} onExpire={() => setCaptchaToken("")} />
            <button type="submit" disabled={loading}
              className="w-full bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}