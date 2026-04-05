"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createAuthSupabaseClient } from "@/lib/supabase/auth-client";

function PartnerResetPasswordInner() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const authClient = useMemo(() => createAuthSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    // Flow 1: #access_token in hash (implicit flow via root page redirect)
    // authClient with detectSessionInUrl:true handles this automatically
    // Flow 2: Direct Supabase verify link — session set in SSR cookie, use supabase client
    const checkSession = async () => {
      // First try authClient (handles hash token)
      const { data: authData } = await authClient.auth.getSession();
      if (authData?.session) { setSessionReady(true); return; }

      // Then try SSR client (handles cookie session from direct verify link)
      const { data: ssrData } = await supabase.auth.getSession();
      if (ssrData?.session) { setSessionReady(true); return; }

      setSessionError("This reset link has expired or is invalid. Please request a new one.");
    };

    // Give detectSessionInUrl time to process the hash
    const timer = setTimeout(checkSession, 800);
    return () => clearTimeout(timer);
  }, [authClient, supabase]);

  async function getPostResetRedirect(): Promise<string> {
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email) return "/partner/requests";
      const res = await fetch("/api/driver/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (res.ok) return "/driver/jobs";
    } catch {}
    return "/partner/requests";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      // Try whichever client has the active session
      const { data: authSession } = await authClient.auth.getSession();
      const client = authSession?.session ? authClient : supabase;
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      const redirect = await getPostResetRedirect();
      setTimeout(() => router.replace(redirect), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
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

          {sessionError ? (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">Link Expired</h1>
              <p className="mt-3 text-lg text-slate-600">{sessionError}</p>
              <Link href="/partner/login" className="mt-8 inline-block rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95">
                Back to login
              </Link>
            </>
          ) : success ? (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">Password Updated ✓</h1>
              <p className="mt-3 text-lg text-slate-600">Your password has been changed. Redirecting you to the dashboard…</p>
            </>
          ) : !sessionReady ? (
            <p className="text-slate-600">Verifying reset link…</p>
          ) : (
            <>
              <h1 className="text-4xl font-semibold text-[#003768]">Set New Password</h1>
              <p className="mt-3 text-lg text-slate-600">Choose a new password for your partner account.</p>

              {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#003768]">New password</label>
                  <input type="password" required autoComplete="new-password"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#003768]">Confirm new password</label>
                  <input type="password" required autoComplete="new-password"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                  {loading ? "Updating…" : "Set new password"}
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