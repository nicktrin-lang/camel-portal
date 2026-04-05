"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";

function reasonMessage(reason: string | null) {
  switch (reason) {
    case "signed_out": return "You have been signed out.";
    case "not_signed_in": return "Please sign in to continue.";
    case "not_authorized": return "You are not authorized to access that page.";
    default: return "";
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

function PartnerLoginInner() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient = useMemo(() => createAuthSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const reason = searchParams.get("reason");
  const infoMessage = reasonMessage(reason);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    clearStaleSupabaseLocks();
    try {
      const signInPromise = supabase.auth.signInWithPassword({ email: email.trim(), password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 30000)
      );
      const { error: signInError } = await Promise.race([signInPromise, timeoutPromise]);
      if (signInError) throw signInError;

      let nextRole = "partner";
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        if (meRes.ok) { const meJson = await safeJson(meRes); nextRole = meJson?.role || "partner"; }
      } catch { nextRole = "partner"; }

      if (nextRole === "admin" || nextRole === "super_admin") {
        router.replace("/admin/approvals");
      } else {
        router.replace("/partner/requests");
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      document.cookie = "resetPortal=partner; domain=.camel-global.com; path=/; max-age=3600";
      const res = await fetch("/api/auth/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/partner/reset-password`,
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
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center px-4 md:px-8">
          <Link href="/partner/login" className="flex items-center">
            <Image src="/camel-logo.png" alt="Camel Global logo" width={180} height={60} priority className="h-[52px] w-auto" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-7xl justify-center px-4 pt-24 pb-10">
        <div className="mt-8 w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">

          {mode === "login" ? (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">Partner Login</h1>
              <p className="mt-3 text-lg text-slate-600">Log in to manage your profile and requests.</p>

              {infoMessage && (
                <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{infoMessage}</div>
              )}
              {error && (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                  {error.includes("timed out") && (
                    <button type="button" onClick={() => { try { Object.keys(localStorage).filter(k => k.includes("sb-") || k.includes("supabase")).forEach(k => localStorage.removeItem(k)); } catch {} window.location.reload(); }} className="ml-2 underline font-semibold">
                      Clear session & retry
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#003768]">Email</label>
                  <input type="email" autoComplete="email" required
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#003768]">Password</label>
                    <button type="button" onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }}
                      className="text-xs font-medium text-[#005b9f] hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" autoComplete="current-password" required
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-600">
                Need an account?{" "}
                <Link href="/partner/signup" className="font-medium text-[#005b9f] hover:underline">Partner signup</Link>
              </p>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-[#003768] hover:underline">
                ← Back to login
              </button>
              <h1 className="text-4xl font-semibold text-[#003768]">Reset Password</h1>
              <p className="mt-3 text-lg text-slate-600">Enter your email and we'll send you a reset link.</p>

              {resetSent ? (
                <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                  <p className="font-semibold">Reset email sent ✓</p>
                  <p className="mt-1">Check your inbox for a password reset link. It may take a minute to arrive.</p>
                  <button type="button" onClick={() => setMode("login")} className="mt-4 text-[#003768] underline font-medium">Back to login</button>
                </div>
              ) : (
                <>
                  {resetError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{resetError}</div>}
                  <form onSubmit={handleForgotPassword} className="mt-8 space-y-6">
                    <div>
                      <label className="text-sm font-medium text-[#003768]">Email address</label>
                      <input type="email" autoComplete="email" required
                        className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                        value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                    </div>
                    <button type="submit" disabled={resetLoading}
                      className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                      {resetLoading ? "Sending..." : "Send reset link"}
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

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
      <PartnerLoginInner />
    </Suspense>
  );
}