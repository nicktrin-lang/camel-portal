"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
});

type ProfileState = {
  company_name: string;
  contact_name: string;
  phone: string;
  address: string;
  address1: string;
  address2: string;
  province: string;
  postcode: string;
  country: string;
  website: string;
  service_radius_km: string;
  base_address: string;
  base_lat: string;
  base_lng: string;
  search_address: string;
};

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

type AdminRole = "none" | "admin" | "super_admin";

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

export default function PartnerProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole>("none");

  const [profile, setProfile] = useState<ProfileState>({
    company_name: "",
    contact_name: "",
    phone: "",
    address: "",
    address1: "",
    address2: "",
    province: "",
    postcode: "",
    country: "",
    website: "",
    service_radius_km: "30",
    base_address: "",
    base_lat: "",
    base_lng: "",
    search_address: "",
  });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const meJson = await safeJson(meRes);

        if (!mounted) return;
        setAdminRole(String(meJson?.role || "none") as AdminRole);

        const user = userData.user;
        const email = (user.email || "").toLowerCase().trim();

        const { data: existingProfile } = await supabase
          .from("partner_profiles")
          .select(
            "company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: application } = await supabase
          .from("partner_applications")
          .select(
            "company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status"
          )
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const status = String((application as any)?.status || "").toLowerCase();
        if (application && status && status !== "approved") {
          throw new Error("Your account is not approved yet, so profile cannot be created.");
        }

        if (!mounted) return;

        setProfile({
          company_name: String(
            existingProfile?.company_name ?? (application as any)?.company_name ?? ""
          ),
          contact_name: String(
            existingProfile?.contact_name ?? (application as any)?.full_name ?? ""
          ),
          phone: String(existingProfile?.phone ?? (application as any)?.phone ?? ""),
          address: String(existingProfile?.address ?? (application as any)?.address ?? ""),
          address1: String(existingProfile?.address1 ?? (application as any)?.address1 ?? ""),
          address2: String(existingProfile?.address2 ?? (application as any)?.address2 ?? ""),
          province: String(existingProfile?.province ?? (application as any)?.province ?? ""),
          postcode: String(existingProfile?.postcode ?? (application as any)?.postcode ?? ""),
          country: String(existingProfile?.country ?? (application as any)?.country ?? ""),
          website: String(existingProfile?.website ?? (application as any)?.website ?? ""),
          service_radius_km: String(existingProfile?.service_radius_km ?? "30"),
          base_address: String(existingProfile?.base_address ?? ""),
          base_lat:
            existingProfile?.base_lat !== null && existingProfile?.base_lat !== undefined
              ? String(existingProfile.base_lat)
              : "",
          base_lng:
            existingProfile?.base_lng !== null && existingProfile?.base_lng !== undefined
              ? String(existingProfile.base_lng)
              : "",
          search_address: String(existingProfile?.base_address ?? ""),
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load profile.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  function updateField<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setSaved(false);
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function applyAddressParts(item: Suggestion) {
    setProfile((prev) => ({
      ...prev,
      search_address: item.display_name || prev.search_address,
      base_address: item.display_name || prev.base_address,
      base_lat: item.lat !== null ? String(item.lat) : prev.base_lat,
      base_lng: item.lng !== null ? String(item.lng) : prev.base_lng,
      address1: item.address_line1 || prev.address1,
      address2: item.address_line2 || prev.address2,
      province: item.province || prev.province,
      postcode: item.postcode || prev.postcode,
      country: item.country || prev.country,
      address: item.display_name || prev.address,
    }));
  }

  function pickSuggestion(item: Suggestion) {
    if (item.lat === null || item.lng === null) return;

    setSaved(false);
    setError(null);
    applyAddressParts(item);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleMapPick(lat: number, lng: number) {
    setSaved(false);
    setError(null);

    setProfile((prev) => ({
      ...prev,
      base_lat: String(lat),
      base_lng: String(lng),
    }));

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

      applyAddressParts({
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

  async function useCurrentLocation() {
    setError(null);
    setSaved(false);

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

  async function searchAddress() {
    setError(null);
    setSaved(false);

    const q = profile.search_address.trim();
    if (!q) {
      setError("Enter an address to search.");
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error("Not signed in.");
      }

      const userId = userData.user.id;

      const lat = parseCoordinate(profile.base_lat, "lat");
      const lng = parseCoordinate(profile.base_lng, "lng");

      if (lat === null || lng === null) {
        throw new Error("Base latitude and longitude must be valid numbers.");
      }

      const radius = Number(profile.service_radius_km);
      if (!Number.isFinite(radius) || radius <= 0) {
        throw new Error("Service radius must be a valid number.");
      }

      const payload = {
        user_id: userId,
        company_name: profile.company_name.trim() || null,
        contact_name: profile.contact_name.trim() || null,
        phone: profile.phone.trim() || null,
        address: profile.address.trim() || null,
        address1: profile.address1.trim() || null,
        address2: profile.address2.trim() || null,
        province: profile.province.trim() || null,
        postcode: profile.postcode.trim() || null,
        country: profile.country.trim() || null,
        website: profile.website.trim() || null,
        service_radius_km: radius,
        base_address: profile.base_address.trim() || profile.search_address.trim() || null,
        base_lat: lat,
        base_lng: lng,
      };

      const { error: upsertErr } = await supabase
        .from("partner_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertErr) throw upsertErr;

      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const lat = parseCoordinate(profile.base_lat, "lat");
  const lng = parseCoordinate(profile.base_lng, "lng");

  const isAdmin = adminRole === "admin" || adminRole === "super_admin";
  const isSuperAdmin = adminRole === "super_admin";

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-10">
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Edit Profile</h1>
          <p className="mt-2 text-gray-600">Update your partner details and base location.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/partner/dashboard"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Partner Dashboard
          </Link>

          <Link
            href="/partner/requests"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            View Requests
          </Link>

          {isAdmin ? (
            <Link
              href="/admin/approvals"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
            >
              Admin Approvals
            </Link>
          ) : null}

          {isSuperAdmin ? (
            <Link
              href="/admin/users"
              className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Admin Users
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Profile saved successfully.
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-10"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[#003768]">Company name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Contact name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.contact_name}
              onChange={(e) => updateField("contact_name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Phone</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Website</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.website}
              onChange={(e) => updateField("website", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-[#003768]">Address</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Service radius (km)</label>
            <input
              type="number"
              min="1"
              step="1"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.service_radius_km}
              onChange={(e) => updateField("service_radius_km", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-black/10 p-4">
          <h2 className="text-xl font-semibold text-[#003768]">Base location</h2>
          <p className="mt-2 text-sm text-gray-600">
            Type an address to see suggestions, use GPS, or click on the map. Then click Save.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={useCurrentLocation}
              className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
            >
              Use my current location
            </button>

            <button
              type="button"
              onClick={searchAddress}
              className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-[#003768]">Search address</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.search_address}
              onChange={(e) => {
                updateField("search_address", e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchAddress();
                }
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              Tip: click Search or press Enter, then choose a suggestion.
            </p>

            {showSuggestions && suggestions.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
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
            <label className="text-sm font-medium text-[#003768]">Base address</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-black/10 p-3"
              value={profile.base_address}
              onChange={(e) => updateField("base_address", e.target.value)}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">Address line 1</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.address1}
                onChange={(e) => updateField("address1", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Address line 2</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.address2}
                onChange={(e) => updateField("address2", e.target.value)}
              />
            />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Province</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.province}
                onChange={(e) => updateField("province", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Postcode</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-[#003768]">Country</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">Base latitude</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.base_lat}
                onChange={(e) => updateField("base_lat", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Base longitude</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-black/10 p-3"
                value={profile.base_lng}
                onChange={(e) => updateField("base_lng", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
            <p className="mt-2 text-xs text-gray-500">
              Click anywhere on the map to set the partner base location.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}