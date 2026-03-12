"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type CountryOption = { code: string; name: string };

const COUNTRIES: CountryOption[] = [
  { code: "ES", name: "Spain" },
  { code: "GI", name: "Gibraltar" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "US", name: "United States" },
];

function normalizeWebsite(v: string) {
  const s = (v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

/**
 * We keep your database schema unchanged:
 * partner_applications.address is a single TEXT field.
 * So we combine the address parts into one clean, readable string.
 */
function buildAddressString(opts: {
  line1: string;
  line2: string;
  province: string;
  postcode: string;
  countryName: string;
}) {
  const parts = [
    opts.line1.trim(),
    opts.line2.trim(),
    [opts.province.trim(), opts.postcode.trim()].filter(Boolean).join(" "),
    opts.countryName.trim(),
  ].filter(Boolean);

  return parts.join(", ");
}

export default function PartnerSignupPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // NEW address fields
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [province, setProvince] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("ES");

  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    const company = companyName.trim();
    const name = fullName.trim();
    const mail = email.trim();
    const ph = phone.trim();

    if (!company) return setError("Company name is required.");
    if (!name) return setError("Full name is required.");
    if (!mail) return setError("Email is required.");
    if (!ph) return setError("Phone is required.");
    if (!password || password.length < 8)
      return setError("Password must be at least 8 characters.");

    if (!address1.trim()) return setError("Address line 1 is required.");
    if (!province.trim()) return setError("Province / State is required.");
    if (!postcode.trim()) return setError("Postcode is required.");
    if (!country) return setError("Country is required.");

    const countryName = COUNTRIES.find((c) => c.code === country)?.name || country;

    const combinedAddress = buildAddressString({
      line1: address1,
      line2: address2,
      province,
      postcode,
      countryName,
    });

    setLoading(true);
    try {
      // 1) Create auth user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: {
            full_name: name,
            company_name: company,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const userId = signUpData.user?.id;
      if (!userId) {
        throw new Error("Could not create user account.");
      }

      // 2) Create partner application (keep schema unchanged)
 const payload = {
  user_id: userId,
  company_name: company,
  full_name: name,
  email,
phone,
address: [address1, address2, province, postcode, country]
  .map((s) => (s || "").trim())
  .filter(Boolean)
  .join(", "),
website,
status: "pending",
};

const { error: insertErr } = await (supabase as any)
  .from("partner_applications")
  .insert(payload);

      if (insertErr) throw insertErr;

      setOk("Account created ✅ Your application is now pending approval.");
      router.replace("/partner/login?reason=created");
    } catch (e: any) {
      setError(e?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#003768]">Partner Sign Up</h1>
          <p className="mt-2 text-gray-600">
            Create your partner account. We review and approve partners before going live.
          </p>
        </div>

        <Link
  href="/partner/login"
  className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
>
  Login
</Link>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#003768]">
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* NEW ADDRESS FIELDS */}
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
          <h2 className="text-base font-semibold text-[#003768]">Address</h2>
          <p className="mt-1 text-sm text-gray-600">
            This is used for your application and initial profile setup.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Address line 1 <span className="text-red-500">*</span>
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 p-2"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="Street address, building, etc."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Address line 2</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 p-2"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Apartment, suite, unit, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-[#003768]">
                  Province / State <span className="text-red-500">*</span>
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 p-2"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="e.g. Alicante"
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-sm font-medium text-[#003768]">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 p-2"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 03501"
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-sm font-medium text-[#003768]">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-black/10 p-2 bg-white"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Existing */}
        <div>
          <label className="text-sm font-medium text-[#003768]">Website</label>
          <input
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#003768]">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-black/10 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 8 characters.</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {ok}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create partner account"}
        </button>
      </form>
    </div>
  );
}