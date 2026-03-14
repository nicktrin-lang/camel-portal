"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type SignupState = {
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  address1: string;
  address2: string;
  province: string;
  postcode: string;
  country: string;
  website: string;
  password: string;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function PartnerSignupPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [form, setForm] = useState<SignupState>({
    company_name: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    address1: "",
    address2: "",
    province: "",
    postcode: "",
    country: "Spain",
    website: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof SignupState>(key: K, value: SignupState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const signupRes = await fetch("/api/partner/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          address:
            form.address.trim() ||
            [form.address1, form.address2, form.province, form.postcode, form.country]
              .filter(Boolean)
              .join(", "),
          address1: form.address1.trim(),
          address2: form.address2.trim(),
          province: form.province.trim(),
          postcode: form.postcode.trim(),
          country: form.country.trim(),
          website: form.website.trim(),
          password: form.password,
        }),
      });

      const signupJson = await safeJson(signupRes);

      if (!signupRes.ok) {
        throw new Error(signupJson?.error || signupJson?._raw || "Signup failed.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (signInError) {
        setSuccess("Application submitted successfully. Please log in.");
        router.push("/partner/login");
        return;
      }

      setSuccess("Application submitted successfully.");
      router.push("/partner/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/partner/signup" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global logo"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>

          <Link
            href="/partner/login"
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-28">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
          <h1 className="text-4xl font-semibold text-[#003768]">Partner Sign Up</h1>
          <p className="mt-3 text-lg text-slate-600">
            Create your partner account. We review and approve partners before going live.
          </p>

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 p-4 md:p-6">
              <h2 className="text-2xl font-semibold text-[#003768]">Address</h2>
              <p className="mt-2 text-slate-600">
                This is used for your application and initial profile setup.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Address line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Street address, building, etc."
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={form.address1}
                    onChange={(e) => updateField("address1", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business Address line 2
                  </label>
                  <input
                    type="text"
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={form.address2}
                    onChange={(e) => updateField("address2", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Province / State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alicante"
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={form.province}
                      onChange={(e) => updateField("province", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Postcode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 03501"
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={form.postcode}
                      onChange={(e) => updateField("postcode", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      required
                    >
                      <option value="Spain">Spain</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Portugal">Portugal</option>
                      <option value="France">France</option>
                      <option value="Italy">Italy</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">Website</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#003768]">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Create partner account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}