"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";

export default function DriverLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient = useMemo(() => createAuthSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message || "Failed to sign in.");
      router.push("/driver/jobs");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      const res = await fetch("/api/auth/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/?portal=driver`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reset email.");
      setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message || "Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl items-center px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-10">

        {mode === "login" ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">Driver Login</h1>
            <p className="mt-2 text-slate-600">Sign in to view your assigned jobs.</p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">Email</label>
                <input type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder="driver@company.com" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#003768]">Password</label>
                  <button type="button" onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }}
                    className="text-xs font-medium text-[#005b9f] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input type="password" autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder="Enter your password" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-sm text-slate-600">
              New driver?{" "}
              <Link href="/driver/signup" className="font-semibold text-[#003768] hover:underline">Set your password</Link>
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-[#003768] hover:underline">
              ← Back to login
            </button>
            <h1 className="text-3xl font-semibold text-[#003768]">Reset Password</h1>
            <p className="mt-2 text-slate-600">Enter your email and we'll send you a reset link.</p>

            {resetSent ? (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                <p className="font-semibold">Reset email sent ✓</p>
                <p className="mt-1">Check your inbox for a password reset link. It may take a minute to arrive.</p>
                <button type="button" onClick={() => setMode("login")} className="mt-4 text-[#003768] underline font-medium">Back to login</button>
              </div>
            ) : (
              <>
                {resetError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{resetError}</div>}
                <form onSubmit={handleForgotPassword} className="mt-8 space-y-5">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">Email address</label>
                    <input type="email" autoComplete="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                      placeholder="your@email.com" />
                  </div>
                  <button type="submit" disabled={resetLoading}
                    className="w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                    {resetLoading ? "Sending..." : "Send reset link"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}