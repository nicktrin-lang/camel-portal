"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MapPicker = dynamic(() => import("../profile/MapPicker"), {
  ssr: false,
});

type CountryOption = { code: string; name: string };

type Suggestion = {
  display_name: string;
  lat: number | null;
  lng: number | null;
  address_line1?: string;
  address_line2?: string;
  province?: string;
  postcode?: string;
  country?: string;
};

type SignupStep1Data = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  password: string;
  businessAddressSearch: string;
  address1: string;
  address2: string;
  province: string;
  postcode: string;
  country: string;
  businessLat: string;
  businessLng: string;
};

const STORAGE_KEY = "camel_partner_signup_step1";

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

function parseCoordinate(
  value: string | number | null | undefined,
  kind: "lat" | "lng"
): number | null {
  if (value === null || value === undefined) return null;

  let raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  let sign = 1;

  if (kind === "lat") {
    if (raw.includes("S")) sign = -1;
    raw = raw.replace(/[NS]/g, "");
  }

  if (kind === "lng") {
    if (raw.includes("W")) sign = -1;
    raw = raw.replace(/[EW]/g, "");
  }

  raw = raw.replace(/,/g, ".").trim();

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;

  return sign * num;
}

function countryCodeFromName(name: string) {
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase().trim() === String(name || "").toLowerCase().trim()
  );
  return match?.code || "ES";
}

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
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");

  const [businessAddressSearch, setBusinessAddressSearch] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [province, setProvince] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("ES");
  const [businessLat, setBusinessLat] = useState("");
  const [businessLng, setBusinessLng] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as Partial<SignupStep1Data>;

      setCompanyName(saved.companyName || "");
      setContactName(saved.contactName || "");
      setEmail(saved.email || "");
      setPhone(saved.phone || "");
      setWebsite(saved.website || "");
      setPassword(saved.password || "");
      setBusinessAddressSearch(saved.businessAddressSearch || "");
      setAddress1(saved.address1 || "");
      setAddress2(saved.address2 || "");
      setProvince(saved.province || "");
      setPostcode(saved.postcode || "");
      setCountry(saved.country || "ES");
      setBusinessLat(saved.businessLat || "");
      setBusinessLng(saved.businessLng || "");
    } catch {
      // ignore bad session data
    }
  }, []);

  function applyBusinessAddressParts(item: Suggestion) {
    setBusinessAddressSearch(item.display_name || "");
    setBusinessLat(item.lat !== null ? String(item.lat) : "");
    setBusinessLng(item.lng !== null ? String(item.lng) : "");

    if (item.address_line1) setAddress1(item.address_line1);
    if (item.address_line2) setAddress2(item.address_line2);
    if (item.province) setProvince(item.province);
    if (item.postcode) setPostcode(item.postcode);
    if (item.country) setCountry(countryCodeFromName(item.country));
  }

  function pickSuggestion(item: Suggestion) {
    applyBusinessAddressParts(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function searchForBusinessAddress() {
    setError(null);

    const q = businessAddressSearch.trim();
    if (!q) {
      setError("Enter a business address to search.");
      return;
    }

    setSearching(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Address search failed.");
      }

      const results = Array.isArray(json?.results) ? (json.results as Suggestion[]) : [];

      if (!results.length) {
        setSuggestions([]);
        setShowSuggestions(false);
        throw new Error("No address suggestions found.");
      }

      setSuggestions(results);
      setShowSuggestions(true);

      if (results.length === 1) {
        pickSuggestion(results[0]);
      }
    } catch (e: any) {
      setError(e?.message || "Address search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleBusinessMapPick(lat: number, lng: number) {
    setError(null);

    setBusinessLat(String(lat));
    setBusinessLng(String(lng));

    try {
      const res = await fetch(
        `/api/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
          String(lng)
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to get address from map location.");
      }

      applyBusinessAddressParts({
        display_name: String(json?.display_name || ""),
        lat,
        lng,
        address_line1: String(json?.address_line1 || ""),
        address_line2: String(json?.address_line2 || ""),
        province: String(json?.province || ""),
        postcode: String(json?.postcode || ""),
        country: String(json?.country || ""),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to get address from map location.");
    }
  }

  async function useCurrentBusinessLocation() {
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleBusinessMapPick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(err.message || "Could not get your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function saveStep1ToSession() {
    const payload: SignupStep1Data = {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      website: website.trim(),
      password,
      businessAddressSearch: businessAddressSearch.trim(),
      address1: address1.trim(),
      address2: address2.trim(),
      province: province.trim(),
      postcode: postcode.trim(),
      country,
      businessLat: businessLat.trim(),
      businessLng: businessLng.trim(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const company = companyName.trim();
    const name = contactName.trim();
    const mail = email.trim().toLowerCase();
    const ph = phone.trim();

    if (!company) return setError("Company name is required.");
    if (!name) return setError("Contact name is required.");
    if (!mail) return setError("Email is required.");
    if (!ph) return setError("Phone is required.");
    if (!password || password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    if (!address1.trim()) return setError("Business address line 1 is required.");
    if (!province.trim()) return setError("Province / State is required.");
    if (!postcode.trim()) return setError("Postcode is required.");
    if (!country) return setError("Country is required.");

    const lat = parseCoordinate(businessLat, "lat");
    const lng = parseCoordinate(businessLng, "lng");

    if (lat === null || lng === null) {
      return setError("Business address latitude and longitude must be valid numbers.");
    }

    setLoading(true);

    try {
      saveStep1ToSession();
      router.push("/partner/signup/fleet");
    } catch (e: any) {
      setError(e?.message || "Could not continue to fleet address step.");
    } finally {
      setLoading(false);
    }
  }

  const lat = parseCoordinate(businessLat, "lat");
  const lng = parseCoordinate(businessLng, "lng");

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
        <div className="mx-auto w-full max-w-5xl rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-10">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f4f8a]/70">
              Step 1 of 2
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[#003768] md:text-4xl">
              Partner Sign Up
            </h1>

            <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
              Enter your business details, registered business address, and account password.
              You will set your fleet base address on the next step.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-8">
            <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-7">
              <h2 className="text-xl font-semibold text-[#003768] md:text-2xl">
                Business Details
              </h2>
              <p className="mt-2 text-slate-600">
                Enter the main company and contact details for your account.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Company name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Contact name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-[#003768]">Website</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-7">
              <h2 className="text-xl font-semibold text-[#003768] md:text-2xl">
                Business Address required
              </h2>
              <p className="mt-2 text-slate-600">
                This is your registered business address. You can search, use your current
                location, enter it manually, or click on the map.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={useCurrentBusinessLocation}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
                >
                  Use current location
                </button>

                <button
                  type="button"
                  onClick={searchForBusinessAddress}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-[#003768]">Search business address</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={businessAddressSearch}
                  onChange={(e) => {
                    setBusinessAddressSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchForBusinessAddress();
                    }
                  }}
                  placeholder="Search for your registered business address"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Search, use your current location, fill the fields manually, or click the map.
                </p>

                {showSuggestions && suggestions.length > 0 ? (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
                    {suggestions.map((item, idx) => (
                      <button
                        key={`${item.display_name}-${idx}`}
                        type="button"
                        onClick={() => pickSuggestion(item)}
                        className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm text-gray-800 hover:bg-[#f3f8ff] last:border-b-0"
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business address line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="Street address, building, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business address line 2
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Province / State <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="e.g. Alicante"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Postcode <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. 03501"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#003768]">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
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

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={businessLat}
                    onChange={(e) => setBusinessLat(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Business longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={businessLng}
                    onChange={(e) => setBusinessLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6">
                <MapPicker lat={lat} lng={lng} onPick={handleBusinessMapPick} />
                <p className="mt-2 text-xs text-slate-500">
                  Click anywhere on the map to set the business address location.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-7">
              <h2 className="text-xl font-semibold text-[#003768] md:text-2xl">
                Account Security
              </h2>
              <p className="mt-2 text-slate-600">
                Set the password you will use to sign in to the partner portal.
              </p>

              <div className="mt-6">
                <label className="text-sm font-medium text-[#003768]">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2 text-xs text-slate-500">Minimum 8 characters.</p>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Continuing..." : "Continue to Fleet Address"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}