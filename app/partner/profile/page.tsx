"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { triggerPartnerLiveRefresh } from "@/lib/portal/triggerPartnerLiveRefresh";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

type Currency = "EUR" | "GBP" | "USD";

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
  default_currency: Currency;
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

function parseCoordinate(value: string | number | null | undefined, kind: "lat" | "lng"): number | null {
  if (value === null || value === undefined) return null;
  let raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  let sign = 1;
  if (kind === "lat") { if (raw.includes("S")) sign = -1; raw = raw.replace(/[NS]/g, ""); }
  if (kind === "lng") { if (raw.includes("W")) sign = -1; raw = raw.replace(/[EW]/g, ""); }
  raw = raw.replace(/,/g, ".").trim();
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return sign * num;
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function inferCurrencyFromCountry(country: string): Currency {
  const c = country.toLowerCase().trim();
  const gbp = ["united kingdom","uk","england","scotland","wales","northern ireland","great britain","gibraltar"];
  const usd = ["united states","usa","us","america"];
  if (gbp.includes(c)) return "GBP";
  if (usd.includes(c)) return "USD";
  return "EUR";
}

// ── Reusable field components ─────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-[#003768]">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black outline-none focus:border-[#0f4f8a]" />
  );
}

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
      <div className="border-b border-black/5 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-[#003768]">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PartnerProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    company_name: "", contact_name: "", phone: "", address: "",
    address1: "", address2: "", province: "", postcode: "", country: "",
    website: "", service_radius_km: "30", base_address: "",
    base_lat: "", base_lng: "", search_address: "", default_currency: "EUR",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_signed_in"); return; }
        const user = userData.user;
        const email = (user.email || "").toLowerCase().trim();

        const { data: existingProfile } = await supabase
          .from("partner_profiles")
          .select("company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng,default_currency")
          .eq("user_id", user.id).maybeSingle();

        const { data: application } = await supabase
          .from("partner_applications")
          .select("company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status")
          .eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();

        const status = String((application as any)?.status || "").toLowerCase();
        if (application && status && status !== "approved" && status !== "live") {
          throw new Error("Your account is not approved yet, so profile cannot be created.");
        }

        if (!mounted) return;

        const country = String(existingProfile?.country ?? (application as any)?.country ?? "");
        const savedCurrency = existingProfile?.default_currency as Currency | null;

        setProfile({
          company_name: String(existingProfile?.company_name ?? (application as any)?.company_name ?? ""),
          contact_name: String(existingProfile?.contact_name ?? (application as any)?.full_name ?? ""),
          phone: String(existingProfile?.phone ?? (application as any)?.phone ?? ""),
          address: String(existingProfile?.address ?? (application as any)?.address ?? ""),
          address1: String(existingProfile?.address1 ?? (application as any)?.address1 ?? ""),
          address2: String(existingProfile?.address2 ?? (application as any)?.address2 ?? ""),
          province: String(existingProfile?.province ?? (application as any)?.province ?? ""),
          postcode: String(existingProfile?.postcode ?? (application as any)?.postcode ?? ""),
          country,
          website: String(existingProfile?.website ?? (application as any)?.website ?? ""),
          service_radius_km: String(existingProfile?.service_radius_km ?? "30"),
          base_address: String(existingProfile?.base_address ?? ""),
          base_lat: existingProfile?.base_lat != null ? String(existingProfile.base_lat) : "",
          base_lng: existingProfile?.base_lng != null ? String(existingProfile.base_lng) : "",
          search_address: String(existingProfile?.base_address ?? ""),
          default_currency: savedCurrency ?? (country ? inferCurrencyFromCountry(country) : "EUR"),
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
    return () => { mounted = false; };
  }, [router, supabase]);

  function updateField<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setSaved(false);
    setProfile(prev => {
      const next = { ...prev, [key]: value };
      if (key === "country" && typeof value === "string") {
        next.default_currency = inferCurrencyFromCountry(value);
      }
      return next;
    });
  }

  function applyAddressParts(item: Suggestion) {
    setProfile(prev => ({
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
      default_currency: item.country ? inferCurrencyFromCountry(item.country) : prev.default_currency,
    }));
  }

  function pickSuggestion(item: Suggestion) {
    if (item.lat === null || item.lng === null) return;
    setSaved(false); setError(null);
    applyAddressParts(item);
    setSuggestions([]); setShowSuggestions(false);
  }

  async function handleMapPick(lat: number, lng: number) {
    setSaved(false); setError(null);
    setProfile(prev => ({ ...prev, base_lat: String(lat), base_lng: String(lng) }));
    try {
      const res = await fetch(`/api/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Failed to get address.");
      applyAddressParts({ display_name: String(json?.display_name || ""), lat, lng, address_line1: String(json?.address_line1 || ""), address_line2: String(json?.address_line2 || ""), province: String(json?.province || ""), postcode: String(json?.postcode || ""), country: String(json?.country || "") });
    } catch (e: any) { setError(e?.message || "Failed to get address."); }
  }

  async function useCurrentLocation() {
    setError(null); setSaved(false);
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => { await handleMapPick(pos.coords.latitude, pos.coords.longitude); },
      err => { setError(err.message || "Could not get location."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function searchAddress() {
    setError(null); setSaved(false);
    const q = profile.search_address.trim();
    if (!q) { setError("Enter an address to search."); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Search failed.");
      const results = Array.isArray(json?.results) ? json.results as Suggestion[] : [];
      if (!results.length) { setSuggestions([]); setShowSuggestions(false); throw new Error("No suggestions found."); }
      setSuggestions(results); setShowSuggestions(true);
      if (results.length === 1) pickSuggestion(results[0]);
    } catch (e: any) { setError(e?.message || "Search failed."); }
    finally { setSearching(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false); setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in.");
      const userId = userData.user.id;
      const lat = parseCoordinate(profile.base_lat, "lat");
      const lng = parseCoordinate(profile.base_lng, "lng");
      if (lat === null || lng === null) throw new Error("Base latitude and longitude must be valid numbers.");
      const radius = Number(profile.service_radius_km);
      if (!Number.isFinite(radius) || radius <= 0) throw new Error("Service radius must be a valid number.");

      const { error: upsertErr } = await supabase.from("partner_profiles").upsert({
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
        default_currency: profile.default_currency,
      }, { onConflict: "user_id" });

      if (upsertErr) throw upsertErr;
      const liveRefresh = await triggerPartnerLiveRefresh();
      if (liveRefresh.error) console.error("Failed to refresh live status:", liveRefresh.error);
      setSaved(true);
    } catch (e: any) { setError(e?.message || "Failed to save profile."); }
    finally { setSaving(false); }
  }

  const lat = parseCoordinate(profile.base_lat, "lat");
  const lng = parseCoordinate(profile.base_lng, "lng");

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <p className="text-slate-600">Loading…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">✓ Profile saved successfully.</div>}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Section 1: Company Information ── */}
        <SectionCard
          title="Company Information"
          description="Your basic company details shown to customers when you win a bid.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Company name">
              <TextInput value={profile.company_name} onChange={v => updateField("company_name", v)} placeholder="e.g. Valencia Cars" />
            </Field>
            <Field label="Contact name">
              <TextInput value={profile.contact_name} onChange={v => updateField("contact_name", v)} placeholder="e.g. Nick Smith" />
            </Field>
            <Field label="Phone">
              <TextInput value={profile.phone} onChange={v => updateField("phone", v)} placeholder="+34 600 000 000" />
            </Field>
            <Field label="Website">
              <TextInput value={profile.website} onChange={v => updateField("website", v)} placeholder="https://yourcompany.com" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Section 2: Business Address ── */}
        <SectionCard
          title="Business Address"
          description="Your registered company address for correspondence and records.">
          <Field label="Full business address">
            <TextInput value={profile.address} onChange={v => updateField("address", v)} placeholder="Full address" />
          </Field>
        </SectionCard>

        {/* ── Section 3: Service Settings ── */}
        <SectionCard
          title="Service Settings"
          description="Control your service radius and the currency you bid in.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Service radius (km)">
              <p className="mt-0.5 mb-1 text-xs text-slate-500">Customer requests within this distance from your base will be sent to you.</p>
              <TextInput type="number" value={profile.service_radius_km} onChange={v => updateField("service_radius_km", v)} placeholder="30" />
            </Field>

            <Field label="Billing currency">
              <p className="mt-0.5 mb-2 text-xs text-slate-500">The currency your bids and bookings will be quoted in. Auto-detected from your country.</p>
              <div className="flex gap-2">
                {(["EUR", "GBP", "USD"] as Currency[]).map(c => (
                  <button key={c} type="button"
                    onClick={() => updateField("default_currency", c)}
                    className={[
                      "flex-1 rounded-xl border px-3 py-3 text-sm font-bold transition-all",
                      profile.default_currency === c
                        ? "border-[#003768] bg-[#003768] text-white shadow-[0_4px_12px_rgba(0,55,104,0.3)]"
                        : "border-black/10 bg-white text-slate-700 hover:border-[#003768]/40"
                    ].join(" ")}>
                    {c === "EUR" ? "€ Euro" : c === "GBP" ? "£ GBP" : "$ USD"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* ── Section 4: Car Fleet Base Location ── */}
        <SectionCard
          title="Car Fleet Base Location"
          description="The location your vehicles are based. Customer requests within your service radius of this point will be sent to you. Use the search, GPS button, or click the map.">

          {/* Search tools */}
          <div className="rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-4">
            <p className="text-sm font-semibold text-[#003768] mb-3">Find your location</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={useCurrentLocation}
                className="rounded-full border border-[#003768]/20 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-[#003768]/5">
                📍 Use my current location
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input type="text"
                value={profile.search_address}
                onChange={e => { updateField("search_address", e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
                placeholder="Search for your fleet base address…"
                className="flex-1 rounded-xl border border-black/10 p-3 text-black outline-none focus:border-[#0f4f8a]" />
              <button type="button" onClick={searchAddress}
                className="rounded-xl bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Press Enter or click Search, then choose a suggestion from the list.</p>
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                {suggestions.map((item, idx) => (
                  <button key={`${item.display_name}-${idx}`} type="button" onClick={() => pickSuggestion(item)}
                    className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm text-gray-800 hover:bg-[#f3f8ff] last:border-b-0">
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fleet address fields */}
          <div className="mt-6">
            <Field label="Fleet base address (full)">
              <p className="mt-0.5 mb-1 text-xs text-slate-500">Auto-filled from search or map. You can also type it manually.</p>
              <TextInput value={profile.base_address} onChange={v => updateField("base_address", v)} />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Address line 1">
              <TextInput value={profile.address1} onChange={v => updateField("address1", v)} />
            </Field>
            <Field label="Address line 2">
              <TextInput value={profile.address2} onChange={v => updateField("address2", v)} />
            </Field>
            <Field label="Province / Region">
              <TextInput value={profile.province} onChange={v => updateField("province", v)} />
            </Field>
            <Field label="Postcode">
              <TextInput value={profile.postcode} onChange={v => updateField("postcode", v)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Country">
                <TextInput value={profile.country} onChange={v => updateField("country", v)} />
              </Field>
            </div>
          </div>

          {/* Coordinates */}
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Base latitude">
              <p className="mt-0.5 mb-1 text-xs text-slate-500">Auto-filled from search or map click.</p>
              <TextInput value={profile.base_lat} onChange={v => updateField("base_lat", v)} placeholder="e.g. 38.842" />
            </Field>
            <Field label="Base longitude">
              <p className="mt-0.5 mb-1 text-xs text-slate-500">Auto-filled from search or map click.</p>
              <TextInput value={profile.base_lng} onChange={v => updateField("base_lng", v)} placeholder="e.g. 0.112" />
            </Field>
          </div>

          {/* Map */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
            <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
          </div>
          <p className="mt-2 text-xs text-slate-500">💡 Click anywhere on the map to set or adjust your fleet base location. The address fields above will update automatically.</p>
        </SectionCard>

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm font-medium text-green-600">✓ Saved successfully</p>}
        </div>
      </form>
    </div>
  );
}