"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

async function getAdminRoleWithRetry(retries = 6, delayMs = 250) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch("/api/admin/me", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    const json = await safeJson(res);
    const role = String(json?.role || "none");

    if (role === "admin" || role === "super_admin") {
      return role;
    }

    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return "none";
}

export default function PartnerLoginPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reason = new URLSearchParams(window.location.search).get("reason") || "";

    if (reason === "not_authorized") {
      setInfo("You are not authorized to access that page.");
    } else if (reason === "signed_out") {
      setInfo("You have been signed out.");
    } else if (reason === "not_signed_in") {
      setInfo("Please sign in to continue.");
    } else {
      setInfo(null);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const eTrim = email.trim().toLowerCase();
    if (!eTrim || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: eTrim,
        password,
      });

      if (signInErr) throw signInErr;

      const role = await getAdminRoleWithRetry();

      if (role === "admin" || role === "super_admin") {
        window.location.replace("/admin/approvals");
        return;
      }

      window.location.replace("/partner/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-10">
      <h1 className="text-2xl font-semibold text-[#003768]">Partner Login</h1>
      <p className="mt-2 text-gray-600">Log in to manage your profile and requests.</p>

      {info ? (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {info}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#003768]">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Need an account?{" "}
          <Link href="/partner/signup" className="font-medium text-[#005b9f] hover:underline">
            Partner signup
          </Link>
        </p>
      </form>
    </div>
  );
}