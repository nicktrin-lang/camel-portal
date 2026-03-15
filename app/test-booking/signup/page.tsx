"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

export default function TestBookingSignupPage() {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const router = useRouter();

  const customerProjectHost =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL).host
      : "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebug(null);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            account_type: "customer",
          },
        },
      });

      setDebug(
        JSON.stringify(
          {
            projectHost: customerProjectHost,
            signUpError: signUpErr ? signUpErr.message : null,
            userId: data?.user?.id || null,
            userEmail: data?.user?.email || null,
            sessionExists: !!data?.session,
            identitiesCount: data?.user?.identities?.length || 0,
          },
          null,
          2
        )
      );

      if (signUpErr) throw signUpErr;

      const userId = data.user?.id;
      if (!userId) {
        throw new Error("Could not create customer account.");
      }

      const { error: profileErr } = await supabase.from("customer_profiles").upsert({
        user_id: userId,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });

      if (profileErr) {
        setDebug((prev) =>
          `${prev || ""}\n\nPROFILE ERROR:\n${JSON.stringify(
            { message: profileErr.message, code: (profileErr as any).code || null },
            null,
            2
          )}`
        );
        throw profileErr;
      }

      router.push("/test-booking/requests");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create customer account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-3xl font-semibold text-[#003768]">Test Customer Sign Up</h1>
        <p className="mt-2 text-slate-600">
          Create a separate customer account for booking flow testing.
        </p>

        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Customer auth project: {customerProjectHost || "not loaded"}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {debug ? (
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            {debug}
          </pre>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

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
            {loading ? "Creating..." : "Create Customer Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/test-booking/login" className="font-semibold text-[#003768]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}