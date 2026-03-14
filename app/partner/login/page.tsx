"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function reasonMessage(reason: string | null) {
  switch (reason) {
    case "signed_out":
      return "You have been signed out.";
    case "not_signed_in":
      return "Please sign in to continue.";
    case "not_authorized":
      return "You are not authorized to access that page.";
    default:
      return "";
  }
}

export default function PartnerLoginPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reason = searchParams.get("reason");
  const infoMessage = reasonMessage(reason);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const meRes = await fetch("/api/admin/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const meJson = await meRes.json().catch(() => null);
      const role = meJson?.role || "none";

      if (role === "admin" || role === "super_admin") {
        router.replace("/admin/approvals");
      } else {
        router.replace("/partner/dashboard");
      }

      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center px-4 md:px-8">
          <Link href="/partner/login" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global logo"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 pb-10 pt-28">
        <div className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
          <h1 className="text-4xl font-semibold text-[#003768]">Partner Login</h1>
          <p className="mt-3 text-lg text-slate-600">
            Log in to manage your profile and requests.
          </p>

          {infoMessage ? (
            <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-medium text-[#003768]">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/partner/signup" className="font-medium text-[#005b9f] hover:underline">
              Partner signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}