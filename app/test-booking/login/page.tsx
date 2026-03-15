"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function TestBookingLoginPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInErr) throw signInErr;

      router.push("/test-booking/requests");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-3xl font-semibold text-[#003768]">Test Customer Login</h1>
        <p className="mt-2 text-slate-600">
          Sign in to access your test booking requests.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/test-booking/signup" className="font-semibold text-[#003768]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}