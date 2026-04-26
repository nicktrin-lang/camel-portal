"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { triggerPartnerLiveRefresh } from "@/lib/portal/triggerPartnerLiveRefresh";
import { CITIES, citiesByCountry, type CityEntry } from "@/lib/cities";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

type Currency = "EUR" | "GBP" | "USD";

type ProfileState = {
  company_name: string; contact_name: string; phone: string; address: string;
  address1: string; address2: string; province: string; postcode: string; country: string;
  city: string; website: string; service_radius_km: string; base_address: string;
  base_address1: string; base_address2: string; base_city: string; base_province: string; base_postcode: string; base_country: string;
  base_lat: string; base_lng: string; search_address: string; default_currency: Currency;
  same_as_business: boolean; legal_company_name: string; vat_number: string; company_registration_number: string;
};

type Suggestion = {
  display_name: string; label?: string; subtitle?: string; type?: string;
  lat: number | null; lng: number | null;
  address_line1?: string; address_line2?: string; province?: string; postcode?: string; country?: string;
};

const TYPE_ICON: Record<string, string> = {
  airport: "✈", hotel: "🏨", food: "🍽", train: "🚆", bus: "🚌", street: "🏠", place: "📍",
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

const inputCls = "mt-1 w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/10">
      <div className="border-b border-black/10 px-6 py-5 md:px-8">
        <h2 className="text-base font-black uppercase tracking-widest text-black">{title}</h2>
        {description && <p className="mt-1 text-sm font-semibold text-black/50">{description}</p>}
      </div>
      <div className="px-6 py-6 md:px-8">{children}</div>
    </div>
  );
}

function SuggestionRow({ item, onClick }: { item: Suggestion; onClick: () => void }) {
  const icon     = TYPE_ICON[item.type || ""] || "📍";
  const label    = item.label    || item.display_name;
  const subtitle = item.subtitle || "";
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-[#f0f0f0] last:border-b-0">
      <span className="mt-0.5 w-5 shrink-0 text-center text-base">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-black text-black">{label}</span>
        {subtitle && <span className="truncate text-xs font-semibold text-black/50">{subtitle}</span>}
      </span>
    </button>
  );
}

export default function PartnerProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [suggestions,     setSuggestions]     = useState<Suggestion[]>([]);
  const [searching,       setSearching]       = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // City/country selector — shared bias for both address searches
  const [searchCity,    setSearchCity]    = useState<CityEntry>(CITIES[0]);
  const grouped = citiesByCountry();

  // Fleet base search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Business address search
  const [bizQuery,       setBizQuery]       = useState("");
  const [bizSuggestions, setBizSuggestions] = useState<Suggestion[]>([]);
  const [bizSearching,   setBizSearching]   = useState(false);
  const [bizShowSug,     setBizShowSug]     = useState(false);
  const bizTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profile, setProfile] = useState<ProfileState>({
    company_name: "", contact_name: "", phone: "", address: "",
    address1: "", address2: "", province: "", postcode: "", country: "",
    city: "", website: "", service_radius_km: "30", base_address: "",
    base_address1: "", base_address2: "", base_city: "", base_province: "", base_postcode: "", base_country: "",
    base_lat: "", base_lng: "", search_address: "", default_currency: "EUR",
    same_as_business: false, legal_company_name: "", vat_number: "", company_registration_number: "",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_signed_in"); return; }
        const user  = userData.user;
        const email = (user.email || "").toLowerCase().trim();

        const { data: existingProfile } = await supabase
          .from("partner_profiles")
          .select("company_name,contact_name,phone,address,address1,address2,city,province,postcode,country,website,service_radius_km,base_address,base_address1,base_address2,base_city,base_province,base_postcode,base_country,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number")
          .eq("user_id", user.id).maybeSingle();

        const { data: application } = await supabase
          .from("partner_applications")
          .select("company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status")
          .eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();

        const status = String((application as any)?.status || "").toLowerCase();
        if (application && status && status !== "approved" && status !== "live") throw new Error("Your account is not approved yet.");
        if (!mounted) return;

        const country       = String(existingProfile?.country ?? (application as any)?.country ?? "");
        const savedCurrency = existingProfile?.default_currency as Currency | null;

        setProfile({
          company_name:                String(existingProfile?.company_name                        ?? (application as any)?.company_name ?? ""),
          contact_name:                String(existingProfile?.contact_name                        ?? (application as any)?.full_name    ?? ""),
          phone:                       String(existingProfile?.phone                               ?? (application as any)?.phone        ?? ""),
          address:                     String(existingProfile?.address                             ?? (application as any)?.address      ?? ""),
          address1:                    String(existingProfile?.address1                            ?? (application as any)?.address1     ?? ""),
          address2:                    String(existingProfile?.address2                            ?? (application as any)?.address2     ?? ""),
          city:                        String((existingProfile as any)?.city                       ?? (application as any)?.city         ?? ""),
          province:                    String(existingProfile?.province                            ?? (application as any)?.province     ?? ""),
          postcode:                    String(existingProfile?.postcode                            ?? (application as any)?.postcode     ?? ""),
          country,
          website:                     String(existingProfile?.website                             ?? (application as any)?.website      ?? ""),
          service_radius_km:           String(existingProfile?.service_radius_km                  ?? "30"),
          base_address:                String(existingProfile?.base_address                        ?? ""),
          base_address1:               String((existingProfile as any)?.base_address1              ?? ""),
          base_address2:               String((existingProfile as any)?.base_address2              ?? ""),
          base_city:                   String((existingProfile as any)?.base_city                  ?? ""),
          base_province:               String((existingProfile as any)?.base_province              ?? ""),
          base_postcode:               String((existingProfile as any)?.base_postcode              ?? ""),
          base_country:                String((existingProfile as any)?.base_country               ?? ""),
          base_lat:                    existingProfile?.base_lat != null ? String(existingProfile.base_lat) : "",
          base_lng:                    existingProfile?.base_lng != null ? String(existingProfile.base_lng) : "",
          search_address:              String(existingProfile?.base_address                        ?? ""),
          default_currency:            savedCurrency ?? (country ? inferCurrencyFromCountry(country) : "EUR"),
          same_as_business:            false,
          legal_company_name:          String((existingProfile as any)?.legal_company_name         ?? ""),
          vat_number:                  String((existingProfile as any)?.vat_number                 ?? ""),
          company_registration_number: String((existingProfile as any)?.company_registration_number ?? ""),
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
      if (key === "country" && typeof value === "string") next.default_currency = inferCurrencyFromCountry(value);
      return next;
    });
  }

  function applyAddressParts(item: Suggestion) {
    setProfile(prev => ({
      ...prev,
      search_address:   item.display_name  || prev.search_address,
      base_address:     item.display_name  || prev.base_address,
      base_lat:         item.lat !== null  ? String(item.lat) : prev.base_lat,
      base_lng:         item.lng !== null  ? String(item.lng) : prev.base_lng,
      base_address1:    item.address_line1 || prev.base_address1,
      base_address2:    item.address_line2 || prev.base_address2,
      base_province:    item.province      || prev.base_province,
      base_postcode:    item.postcode      || prev.base_postcode,
      base_country:     item.country       || prev.base_country,
      default_currency: item.country ? inferCurrencyFromCountry(item.country) : prev.default_currency,
    }));
  }

  function toggleSameAsBusiness(checked: boolean) {
    setSaved(false);
    if (checked) {
      setProfile(prev => ({
        ...prev, same_as_business: true,
        base_address: prev.address, base_address1: prev.address1, base_address2: prev.address2,
        base_province: prev.province, base_postcode: prev.postcode, base_country: prev.country,
        search_address: prev.address,
      }));
    } else {
      setProfile(prev => ({ ...prev, same_as_business: false }));
    }
  }

  function pickSuggestion(item: Suggestion) {
    if (item.lat === null || item.lng === null) return;
    setSaved(false); setError(null);
    applyAddressParts(item);
    setSuggestions([]); setShowSuggestions(false);
  }

  // Business address search
  function handleBizSearchChange(q: string) {
    setBizQuery(q);
    if (bizTimer.current) clearTimeout(bizTimer.current);
    if (q.length < 2) { setBizSuggestions([]); setBizShowSug(false); return; }
    bizTimer.current = setTimeout(() => runBizSearch(q), 350);
  }

  async function runBizSearch(q: string) {
    setBizSearching(true); setError(null);
    try {
      const url  = `/api/geocode?q=${encodeURIComponent(q)}&biasLat=${searchCity.lat}&biasLng=${searchCity.lng}`;
      const res  = await fetch(url, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Search failed.");
      const results = Array.isArray(json?.results) ? json.results as Suggestion[] : [];
      setBizSuggestions(results);
      setBizShowSug(results.length > 0);
    } catch (e: any) { setError(e?.message || "Search failed."); }
    finally { setBizSearching(false); }
  }

  function pickBizSuggestion(item: Suggestion) {
    setSaved(false); setError(null);
    const street  = item.address_line1 || "";
    const poiName = (item.label && item.label !== street) ? item.label : "";
    const addr1   = poiName ? `${poiName}${street ? `, ${street}` : ""}` : (street || item.display_name.split(",")[0]);
    const city    = (item as any).city || item.address_line2 || "";
    const province = item.province || "";
    const postcode = item.postcode || "";
    const country  = item.country  || "";
    setProfile(prev => ({
      ...prev,
      address:  item.display_name || prev.address,
      address1: addr1    || prev.address1,
      address2: String((item as any).address_line2 || "") || prev.address2,
      city:     String((item as any).city || "")          || prev.city,
      province: province || prev.province,
      postcode: postcode || prev.postcode,
      country:  country  || prev.country,
      default_currency: country ? inferCurrencyFromCountry(country) : prev.default_currency,
    }));
    setBizQuery(""); setBizSuggestions([]); setBizShowSug(false);
  }

  function handleFleetSearchChange(q: string) {
    updateField("search_address", q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimer.current = setTimeout(() => runSearch(q), 350);
  }

  async function runSearch(q: string) {
    setSearching(true); setError(null);
    try {
      // Pass city bias coords to geocode API
      const url = `/api/geocode?q=${encodeURIComponent(q)}&biasLat=${searchCity.lat}&biasLng=${searchCity.lng}`;
      const res  = await fetch(url, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Search failed.");
      const results = Array.isArray(json?.results) ? json.results as Suggestion[] : [];
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      if (!results.length) setError("No results found — try a different search or move the map pin.");
    } catch (e: any) { setError(e?.message || "Search failed."); }
    finally { setSearching(false); }
  }

  async function handleMapPick(lat: number, lng: number) {
    setSaved(false); setError(null);
    setProfile(prev => ({ ...prev, base_lat: String(lat), base_lng: String(lng) }));
    try {
      const res  = await fetch(`/api/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Failed to get address.");
      applyAddressParts({
        display_name:  String(json?.display_name  || ""),
        lat, lng,
        address_line1: String(json?.address_line1 || ""),
        address_line2: String(json?.address_line2 || ""),
        province:      String(json?.province      || ""),
        postcode:      String(json?.postcode      || ""),
        country:       String(json?.country       || ""),
      });
    } catch (e: any) { setError(e?.message || "Failed to get address."); }
  }

  async function useCurrentLocation() {
    setError(null); setSaved(false);
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        // Also update the city bias to match current location
        await handleMapPick(pos.coords.latitude, pos.coords.longitude);
      },
      err => setError(err.message || "Could not get location."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false); setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in.");
      const userId = userData.user.id;
      const lat    = parseCoordinate(profile.base_lat, "lat");
      const lng    = parseCoordinate(profile.base_lng, "lng");
      if (lat === null || lng === null) throw new Error("Base latitude and longitude must be valid numbers.");
      const radius = Number(profile.service_radius_km);
      if (!Number.isFinite(radius) || radius <= 0) throw new Error("Service radius must be a valid number.");

      const { error: upsertErr } = await supabase.from("partner_profiles").upsert({
        user_id:                     userId,
        company_name:                profile.company_name.trim()                || null,
        contact_name:                profile.contact_name.trim()                || null,
        phone:                       profile.phone.trim()                       || null,
        address:                     profile.address.trim()                     || null,
        address1:                    profile.address1.trim()                    || null,
        address2:                    profile.address2.trim()                    || null,
        city:                        profile.city.trim()                        || null,
        province:                    profile.province.trim()                    || null,
        postcode:                    profile.postcode.trim()                    || null,
        country:                     profile.country.trim()                     || null,
        website:                     profile.website.trim()                     || null,
        service_radius_km:           radius,
        base_address:                profile.base_address.trim() || profile.search_address.trim() || null,
        base_lat:                    lat,
        base_lng:                    lng,
        default_currency:            profile.default_currency,
        legal_company_name:          profile.legal_company_name.trim()          || null,
        vat_number:                  profile.vat_number.trim()                  || null,
        company_registration_number: profile.company_registration_number.trim() || null,
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
    <div className="border border-black/10 bg-white p-8">
      <p className="text-sm font-semibold text-black/50">Loading…</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {saved && <div className="border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ Profile saved successfully.</div>}

      <form onSubmit={handleSave} className="space-y-4">

        {/* Company Information */}
        <SectionCard title="Company Information" description="Your basic company details shown to customers when you win a bid.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Company name"><TextInput value={profile.company_name} onChange={v => updateField("company_name", v)} placeholder="e.g. Valencia Cars" /></Field>
            <Field label="Contact name"><TextInput value={profile.contact_name} onChange={v => updateField("contact_name", v)} placeholder="e.g. Nick Smith" /></Field>
            <Field label="Phone"><TextInput value={profile.phone} onChange={v => updateField("phone", v)} placeholder="+34 600 000 000" /></Field>
            <Field label="Website"><TextInput value={profile.website} onChange={v => updateField("website", v)} placeholder="https://yourcompany.com" /></Field>
          </div>
        </SectionCard>

        {/* Service Settings */}
        <SectionCard title="Service Settings" description="Control your service radius and the currency you bid in.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Service radius (km)">
              <p className="mt-1 mb-2 text-xs font-semibold text-black/50">Customer requests within this distance from your base will be sent to you.</p>
              <TextInput type="number" value={profile.service_radius_km} onChange={v => updateField("service_radius_km", v)} placeholder="30" />
            </Field>
            <Field label="Billing currency">
              <p className="mt-1 mb-2 text-xs font-semibold text-black/50">The currency your bids and bookings will be quoted in.</p>
              <div className="flex gap-2">
                {(["GBP", "EUR", "USD"] as Currency[]).map(c => (
                  <button key={c} type="button" onClick={() => updateField("default_currency", c)}
                    className={`flex-1 px-3 py-3 text-sm font-black transition-all ${profile.default_currency === c ? "bg-[#ff7a00] text-white" : "bg-[#f0f0f0] text-black hover:bg-[#e8e8e8]"}`}>
                    {c === "GBP" ? "£ GBP" : c === "EUR" ? "€ Euro" : "$ USD"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Business & Billing */}
        <SectionCard title="Business & Billing" description="Your legal details used for commission invoicing.">
          <div className="bg-[#f0f0f0] px-4 py-3 text-sm text-black mb-5">
            <p className="font-black mb-0.5">🔒 These details are managed by Camel Global</p>
            <p className="font-semibold text-black/60">Your legal company name and VAT / NIF number are used for cross-border commission invoicing and can only be changed by the Camel Global team. If you need to update these details please use our <a href="/partner/contact" className="underline font-black text-black">contact form</a>.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className={labelCls}>Legal company name</p>
              <p className="mt-1 border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black">
                {profile.legal_company_name || <span className="text-black/40 italic">Not set — contact support</span>}
              </p>
            </div>
            <div>
              <p className={labelCls}>Company registration number</p>
              <p className="mt-1 border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black">
                {profile.company_registration_number || <span className="text-black/40 italic">Not set</span>}
              </p>
            </div>
            <div>
              <p className={labelCls}>VAT / NIF Number</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="flex-1 border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black">
                  {profile.vat_number || <span className="text-black/40 italic">Not set — contact support</span>}
                </p>
                {profile.vat_number
                  ? <span className="shrink-0 border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-black text-green-700">✓</span>
                  : <span className="shrink-0 border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">Required</span>}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Business Address */}
        <SectionCard title="Business Address" description="Your registered company address for correspondence and records.">

          {/* City selector — shared with fleet search */}
          <div className="bg-black px-4 py-3 flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-white">Searching near</span>
            <select
              value={`${searchCity.country}|${searchCity.city}`}
              onChange={e => {
                const [country, city] = e.target.value.split("|");
                const found = CITIES.find(c => c.country === country && c.city === city);
                if (found) { setSearchCity(found); setBizSuggestions([]); setSuggestions([]); }
              }}
              className="bg-[#ff7a00] text-white font-black text-sm px-3 py-1.5 outline-none cursor-pointer appearance-none"
            >
              {Object.entries(grouped).map(([country, cities]) => (
                <optgroup key={country} label={country}>
                  {cities.map(c => (
                    <option key={c.city} value={`${c.country}|${c.city}`}>{c.city}, {c.country}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="text-xs font-black text-white">Change to search a different city</span>
          </div>

          {/* Use my current location for business address */}
          <button type="button"           onClick={async () => {
            setError(null);
            if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
            navigator.geolocation.getCurrentPosition(async pos => {
              try {
                const res  = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`, { cache: "no-store" });
                const json = await safeJson(res);
                if (!res.ok) throw new Error(json?.error || "Failed to get address.");
                const addr1    = String(json?.address_line1 || "");
                const city     = String(json?.city          || "");
                const province = String(json?.province      || "");
                const postcode = String(json?.postcode      || "");
                const country  = String(json?.country       || "");
                setProfile(prev => ({
                  ...prev,
                  address:  String(json?.display_name || prev.address),
                  address1: addr1    || prev.address1,
                  address2: city     || prev.address2,
                  province: province || prev.province,
                  postcode: postcode || prev.postcode,
                  country:  country  || prev.country,
                  default_currency: country ? inferCurrencyFromCountry(country) : prev.default_currency,
                }));
              } catch (e: any) { setError(e?.message || "Failed to get address."); }
            }, err => setError(err.message || "Could not get location."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
          }} className="mb-4 border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#e8e8e8] transition-colors">
            📍 Use my current location
          </button>

          {/* Business address search */}
          <div className="relative mb-5">
            <p className={labelCls}>Search your business address</p>
            <p className="mt-0.5 mb-2 text-xs font-semibold text-black/50">Type to search — selecting a result auto-fills the fields below.</p>
            <input
              type="text"
              value={bizQuery}
              onChange={e => handleBizSearchChange(e.target.value)}
              onFocus={() => { if (bizSuggestions.length) setBizShowSug(true); }}
              placeholder={`Search in ${searchCity.city}…`}
              className="w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors"
            />
            {bizSearching && <span className="absolute right-4 top-[60px] text-xs font-semibold text-black/30">Searching…</span>}
            {bizShowSug && bizSuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-0.5 border border-black/10 bg-white shadow-xl overflow-hidden">
                {bizSuggestions.map((item, idx) => (
                  <SuggestionRow key={`biz-${item.display_name}-${idx}`} item={item} onClick={() => pickBizSuggestion(item)} />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Full address (auto-filled)">
                <p className="mt-1 mb-1 text-xs font-semibold text-black/50">Combined — updated from search or fields below.</p>
                <TextInput value={profile.address} onChange={v => updateField("address", v)} placeholder="Full address" />
              </Field>
            </div>
            <Field label="Address line 1"><TextInput value={profile.address1} onChange={v => setProfile(prev => ({ ...prev, address1: v, address: [v, prev.address2, prev.city, prev.province, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Calle Mayor 12" /></Field>
            <Field label="Address line 2"><TextInput value={profile.address2} onChange={v => setProfile(prev => ({ ...prev, address2: v, address: [prev.address1, v, prev.city, prev.province, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Floor 2, Office A" /></Field>
            <Field label="City / Town"><TextInput value={profile.city} onChange={v => setProfile(prev => ({ ...prev, city: v, address: [prev.address1, prev.address2, v, prev.province, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Valencia" /></Field>
            <Field label="Province / Region"><TextInput value={profile.province} onChange={v => setProfile(prev => ({ ...prev, province: v, address: [prev.address1, prev.address2, prev.city, v, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Comunitat Valenciana" /></Field>
            <Field label="Postcode"><TextInput value={profile.postcode} onChange={v => setProfile(prev => ({ ...prev, postcode: v, address: [prev.address1, prev.address2, prev.city, prev.province, v, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. 46001" /></Field>
            <div className="md:col-span-2">
              <Field label="Country"><TextInput value={profile.country} onChange={v => setProfile(prev => ({ ...prev, country: v, address: [prev.address1, prev.address2, prev.city, prev.province, prev.postcode, v].filter(Boolean).join(", "), default_currency: inferCurrencyFromCountry(v) }))} placeholder="e.g. Spain" /></Field>
            </div>
          </div>
        </SectionCard>

        {/* Car Fleet Base Location */}
        <SectionCard title="Car Fleet Base Location" description="Where your vehicles are dispatched from. The coordinates set here control your service radius.">

          {/* 1 — Same as business */}
          <label className="flex cursor-pointer items-center gap-3 bg-[#f0f0f0] px-4 py-3 mb-5">
            <input type="checkbox" checked={profile.same_as_business} onChange={e => toggleSameAsBusiness(e.target.checked)} className="h-4 w-4" />
            <div>
              <span className="text-sm font-black text-black">Same as business address</span>
              <p className="text-xs font-semibold text-black/50">Tick to copy your business address as the fleet base address</p>
            </div>
          </label>

          {/* 2 — Location tools: GPS + city selector + search */}
          <div className="bg-[#f0f0f0] p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-1">📍 Set Fleet Base Location</p>
            <p className="text-xs font-semibold text-black/50 mb-4">Use your current location, search, or click the map below to set your base.</p>

            <button type="button" onClick={useCurrentLocation}
              className="mb-4 border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#e8e8e8] transition-colors">
              📍 Use my current location
            </button>

            <div className="bg-black px-4 py-3 flex flex-wrap items-center gap-3 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-white">Searching near</span>
              <select
                value={`${searchCity.country}|${searchCity.city}`}
                onChange={e => {
                  const [country, city] = e.target.value.split("|");
                  const found = CITIES.find(c => c.country === country && c.city === city);
                  if (found) { setSearchCity(found); setSuggestions([]); setShowSuggestions(false); }
                }}
                className="bg-[#ff7a00] text-white font-black text-sm px-3 py-1.5 outline-none cursor-pointer appearance-none"
              >
                {Object.entries(grouped).map(([country, cities]) => (
                  <optgroup key={country} label={country}>
                    {cities.map(c => (
                      <option key={c.city} value={`${c.country}|${c.city}`}>{c.city}, {c.country}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="text-xs font-black text-white">Change to bias search to a different city</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={profile.search_address}
                onChange={e => handleFleetSearchChange(e.target.value)}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                placeholder={`Type to search in ${searchCity.city}…`}
                className="w-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none focus:bg-[#f0f0f0] transition-colors"
              />
              {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/30">Searching…</span>}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-0.5 border border-black/10 bg-white shadow-xl overflow-hidden" style={{ zIndex: 10000 }}>
                  {suggestions.map((item, idx) => (
                    <SuggestionRow key={`${item.display_name}-${idx}`} item={item} onClick={() => pickSuggestion(item)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3 — Map */}
          <div className="mb-4">
            <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
            <p className="mt-2 text-xs font-semibold text-black/50">💡 Click the map to move the pin and update your GPS coordinates and address.</p>
          </div>

          {/* 4 — Auto-filled address fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Fleet base full address (auto-filled)">
                <p className="mt-1 mb-1 text-xs font-semibold text-black/50">Populated automatically from search, GPS or map click. Edit manually if needed.</p>
                <TextInput value={profile.base_address} onChange={v => updateField("base_address", v)} />
              </Field>
            </div>
            <Field label="Address line 1"><TextInput value={profile.base_address1} onChange={v => setProfile(prev => ({ ...prev, base_address1: v, base_address: [v, prev.base_address2, prev.base_province, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Carrer de la Marina 5" /></Field>
            <Field label="Address line 2"><TextInput value={profile.base_address2} onChange={v => setProfile(prev => ({ ...prev, base_address2: v, base_address: [prev.base_address1, v, prev.base_province, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Unit 3" /></Field>
            <Field label="Province / Region"><TextInput value={profile.base_province} onChange={v => setProfile(prev => ({ ...prev, base_province: v, base_address: [prev.base_address1, prev.base_address2, v, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Comunitat Valenciana" /></Field>
            <Field label="Postcode"><TextInput value={profile.base_postcode} onChange={v => setProfile(prev => ({ ...prev, base_postcode: v, base_address: [prev.base_address1, prev.base_address2, prev.base_province, v, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. 46001" /></Field>
            <div className="md:col-span-2">
              <Field label="Country"><TextInput value={profile.base_country} onChange={v => setProfile(prev => ({ ...prev, base_country: v, base_address: [prev.base_address1, prev.base_address2, prev.base_province, prev.base_postcode, v].filter(Boolean).join(", ") }))} placeholder="e.g. Spain" /></Field>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <Field label="Latitude"><TextInput value={profile.base_lat} onChange={v => updateField("base_lat", v)} placeholder="e.g. 38.842" /></Field>
              <Field label="Longitude"><TextInput value={profile.base_lng} onChange={v => updateField("base_lng", v)} placeholder="e.g. 0.112" /></Field>
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="bg-[#ff7a00] px-8 py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm font-black text-green-600">✓ Saved successfully</p>}
        </div>
      </form>
    </div>
  );
}