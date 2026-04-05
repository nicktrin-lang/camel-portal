"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

function CustomerResetPasswordInner() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
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
    const code = searchParams.get("code");
    if (!code) { setSessionError("Invalid or missing reset link. Please request a new one."); return; }
    supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: any }) => {
      if (error) setSessionError("This reset link has expired or is invalid. Please request a new one.");
      else setSessionReady(true);
    });
  }, [searchParams, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.replace("/test-booking/requests"), 2500);
    } catch (e: any) {
      setError(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">

        {sessionError ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">Link Expired</h1>
            <p className="mt-2 text-slate-600">{sessionError}</p>
            <a href="/test-booking/login" className="mt-6 inline-block rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
              Back to login
            </a>
          </>
        ) : success ? (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">Password Updated ✓</h1>
            <p className="mt-2 text-slate-600">Your password has been changed. Redirecting you to your bookings…</p>
          </>
        ) : !sessionReady ? (
          <p className="text-slate-600">Verifying reset link…</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-[#003768]">Set New Password</h1>
            <p className="mt-2 text-slate-600">Choose a new password for your customer account.</p>

            {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">New password</label>
                <input type="password" required autoComplete="new-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#003768]">Confirm new password</label>
                <input type="password" required autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                  placeholder="Repeat your password" />
              </div>
              <button type="submit" disabled={loading}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {loading ? "Updating…" : "Set new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9fc]" />}>
      <CustomerResetPasswordInner />
    </Suspense>
  );
}