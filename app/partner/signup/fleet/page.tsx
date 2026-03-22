"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MapPicker = dynamic(() => import("../../profile/MapPicker"), {
  ssr: false,
});

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

type CountryOption = { code: string; name: string };

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

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function PartnerSignupFleetPage() {
  const router = useRouter();

  const [step1Data, setStep1Data] = useState<SignupStep1Data | null>(null);

  const [fleetAddressSearch, setFleetAddressSearch] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLat, setBaseLat] = useState("");
  const [baseLng, setBaseLng] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);

      if (!raw) {
        router.replace("/partner/signup");
        return;
      }

      const saved = JSON.parse(raw) as SignupStep1Data;

      if (
        !saved?.companyName ||
        !saved?.contactName ||
        !saved?.email ||
        !saved?.phone ||
        !saved?.password
      ) {
        router.replace("/partner/signup");
        return;
      }

      setStep1Data(saved);
    } catch {
      router.replace("/partner/signup");
      return;
    } finally {
      setBooting(false);
    }
  }, [router]);

  function applyFleetAddressParts(item: Suggestion) {
    setFleetAddressSearch(item.display_name || "");
    setBaseAddress(item.display_name || "");
    setBaseLat(item.lat !== null ? String(item.lat) : "");
    setBaseLng(item.lng !== null ? String(item.lng) : "");
  }

  function pickSuggestion(item: Suggestion) {
    applyFleetAddressParts(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function searchForFleetAddress() {
    setError(null);

    const q = fleetAddressSearch.trim();
    if (!q) {
      setError("Enter a car fleet address to search.");
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

  async function handleMapPick(lat: number, lng: number) {
    setError(null);
    setBaseLat(String(lat));
    setBaseLng(String(lng));

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

      applyFleetAddressParts({
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

  async function useCurrentFleetLocation() {
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleMapPick(pos.coords.latitude, pos.coords.longitude);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!step1Data) {
      setError("Missing step 1 signup data. Please start again.");
      return;
    }

    if (!baseAddress.trim()) {
      setError("Car fleet address is required.");
      return;
    }

    const lat = parseCoordinate(baseLat, "lat");
    const lng = parseCoordinate(baseLng, "lng");

    if (lat === null || lng === null) {
      setError("Car fleet latitude and longitude must be valid numbers.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        companyName: step1Data.companyName.trim(),
        contactName: step1Data.contactName.trim(),
        email: step1Data.email.trim().toLowerCase().replace(/\s+/g, ""),
        phone: step1Data.phone.trim(),
        website: step1Data.website.trim(),
        password: step1Data.password,
        address1: step1Data.address1.trim(),
        address2: step1Data.address2.trim(),
        province: step1Data.province.trim(),
        postcode: step1Data.postcode.trim(),
        country:
          COUNTRIES.find((c) => c.code === step1Data.country)?.name || step1Data.country,
        baseAddress: baseAddress.trim(),
        baseLat: lat,
        baseLng: lng,
      };

      console.log("🚀 Submitting complete signup payload:", payload.email);

      const res = await fetch("/api/partner/complete-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      console.log("📦 complete-signup response:", res.status, json);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Sign up failed.");
      }

      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/partner/application-submitted");
    } catch (e: any) {
      console.error("❌ Fleet signup submit failed:", e?.message || e);
      setError(e?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  const lat = parseCoordinate(baseLat, "lat");
  const lng = parseCoordinate(baseLng, "lng");

  if (booting) {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-28">
          <div className="mx-auto w-full max-w-5xl rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
            <p className="text-slate-600">Loading signup...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!step1Data) return null;

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
            <div className="inline-flex rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
              Step 2 of 2
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-[#003768] md:text-4xl">
              Fleet Address
            </h1>

            <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
              Set the address your vehicles operate from. This will be used for service coverage
              and partner setup.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-[#cfe2f7] bg-[#f3f8ff] p-4 text-sm text-[#003768]">
            <div className="font-semibold">{step1Data.companyName}</div>
            <div className="mt-1">{step1Data.contactName}</div>
            <div className="mt-1">{step1Data.email}</div>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-8">
            <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-7">
              <h2 className="text-xl font-semibold text-[#003768] md:text-2xl">
                Car Fleet Address required
              </h2>

              <p className="mt-2 text-slate-600">
                Search for the address, use your current location, type it manually, or click on
                the map to set your fleet base.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={useCurrentFleetLocation}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
                >
                  Use current location
                </button>

                <button
                  type="button"
                  onClick={searchForFleetAddress}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-[#003768]">
                  Search car fleet address
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={fleetAddressSearch}
                  onChange={(e) => {
                    setFleetAddressSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchForFleetAddress();
                    }
                  }}
                  placeholder="Search for your vehicle base address"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Search, use your current location, type directly below, or click the map.
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

              <div className="mt-5">
                <label className="text-sm font-medium text-[#003768]">
                  Car fleet address <span className="text-red-500">*</span>
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="Selected map, search, or manually entered fleet address"
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Base latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={baseLat}
                    onChange={(e) => setBaseLat(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Base longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none transition focus:border-[#0f4f8a]"
                    value={baseLng}
                    onChange={(e) => setBaseLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6">
                <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
                <p className="mt-2 text-xs text-slate-500">
                  Click anywhere on the map to set the partner base location.
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/partner/signup")}
                className="rounded-full border border-black/10 bg-white px-6 py-4 text-base font-semibold text-[#003768] hover:bg-black/5"
              >
                Back to Business Details
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#ff7a00] px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create partner account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}