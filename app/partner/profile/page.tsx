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
        const { data: userData, error: userErr } =
          await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const meRes = await fetch("/api/admin/me", {
          credentials: "include",
          cache: "no-store",
        });

        const meJson = await safeJson(meRes);

        if (!mounted) return;

        setAdminRole(String(meJson?.role || "none") as AdminRole);

        const user = userData.user;
        const email = (user.email || "").toLowerCase().trim();

        const { data: existingProfile } = await supabase
          .from("partner_profiles")
          .select(
            "company_name,contact_name,phone,address,website,service_radius_km,base_address,base_lat,base_lng"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: application } = await supabase
          .from("partner_applications")
          .select(
            "company_name,full_name,phone,address,website,status"
          )
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const status = String((application as any)?.status || "").toLowerCase();

        if (application && status && status !== "approved") {
          throw new Error(
            "Your account is not approved yet, so profile cannot be created."
          );
        }

        if (!mounted) return;

        setProfile({
          company_name: String(
            existingProfile?.company_name ??
              (application as any)?.company_name ??
              ""
          ),
          contact_name: String(
            existingProfile?.contact_name ??
              (application as any)?.full_name ??
              ""
          ),
          phone: String(
            existingProfile?.phone ?? (application as any)?.phone ?? ""
          ),
          address: String(
            existingProfile?.address ?? (application as any)?.address ?? ""
          ),
          website: String(
            existingProfile?.website ?? (application as any)?.website ?? ""
          ),
          service_radius_km: String(
            existingProfile?.service_radius_km ?? "30"
          ),
          base_address: String(existingProfile?.base_address ?? ""),
          base_lat:
            existingProfile?.base_lat !== null
              ? String(existingProfile.base_lat)
              : "",
          base_lng:
            existingProfile?.base_lng !== null
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

  function updateField<K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K]
  ) {
    setSaved(false);
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function pickSuggestion(item: Suggestion) {
    if (!item.lat || !item.lng) return;

    setProfile((prev) => ({
      ...prev,
      base_lat: String(item.lat),
      base_lng: String(item.lng),
      base_address: item.display_name,
      search_address: item.display_name,
    }));

    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleMapPick(lat: number, lng: number) {
    setProfile((prev) => ({
      ...prev,
      base_lat: String(lat),
      base_lng: String(lng),
    }));

    try {
      const res = await fetch(
        `/api/geocode?lat=${lat}&lng=${lng}`,
        { cache: "no-store" }
      );

      const json = await safeJson(res);

      const displayName = json?.display_name;

      if (displayName) {
        setProfile((prev) => ({
          ...prev,
          base_lat: String(lat),
          base_lng: String(lng),
          base_address: displayName,
          search_address: displayName,
        }));
      }
    } catch {}
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      handleMapPick(pos.coords.latitude, pos.coords.longitude);
    });
  }

  async function searchAddress() {
    const q = profile.search_address.trim();
    if (!q) return;

    setSearching(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const json = await safeJson(res);

      const results = Array.isArray(json?.results)
        ? json.results
        : [];

      setSuggestions(results);
      setShowSuggestions(true);

      if (results.length === 1) pickSuggestion(results[0]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not signed in");

      const userId = userData.user.id;

      const lat = parseCoordinate(profile.base_lat, "lat");
      const lng = parseCoordinate(profile.base_lng, "lng");

      const payload = {
        user_id: userId,
        company_name: profile.company_name || null,
        contact_name: profile.contact_name || null,
        phone: profile.phone || null,
        address: profile.address || null,
        website: profile.website || null,
        service_radius_km: Number(profile.service_radius_km),
        base_address: profile.base_address || null,
        base_lat: lat,
        base_lng: lng,
      };

      const { error } = await supabase
        .from("partner_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setSaved(true);
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  }

  const lat = parseCoordinate(profile.base_lat, "lat");
  const lng = parseCoordinate(profile.base_lng, "lng");

  const isAdmin =
    adminRole === "admin" || adminRole === "super_admin";
  const isSuperAdmin = adminRole === "super_admin";

  if (loading) return <div className="p-10">Loading…</div>;

  return (
    <div className="mx-auto w-full max-w-7xl">

      <div className="flex flex-wrap gap-2 mb-6">

        <Link href="/partner/dashboard" className="btn">
          Partner Dashboard
        </Link>

        <Link href="/partner/requests" className="btn">
          View Requests
        </Link>

        {isAdmin && (
          <Link href="/admin/approvals" className="btn">
            Admin Approvals
          </Link>
        )}

        {isSuperAdmin && (
          <Link href="/admin/users" className="btn-orange">
            Admin Users
          </Link>
        )}
      </div>

      <form onSubmit={handleSave}>

        {/* form fields unchanged */}

        <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />

        <button type="submit">
          {saving ? "Saving..." : "Save changes"}
        </button>

      </form>
    </div>
  );
}