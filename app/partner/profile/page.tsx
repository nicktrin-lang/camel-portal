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
  base_address1: string;
  base_address2: string;
  base_province: string;
  base_postcode: string;
  base_country: string;
  base_lat: string;
  base_lng: string;
  search_address: string;
  default_currency: Currency;
  same_as_business: boolean;
  legal_company_name: string;
  vat_number: string;
  company_registration_number: string;
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
    base_address1: "", base_address2: "", base_province: "", base_postcode: "", base_country: "",
    base_lat: "", base_lng: "", search_address: "", default_currency: "EUR",
    same_as_business: false,
    legal_company_name: "", vat_number: "", company_registration_number: "",
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
          .select("company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number")
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
          base_address1: String((existingProfile as any)?.base_address1 ?? ""),
          base_address2: String((existingProfile as any)?.base_address2 ?? ""),
          base_province: String((existingProfile as any)?.base_province ?? ""),
          base_postcode: String((existingProfile as any)?.base_postcode ?? ""),
          base_country: String((existingProfile as any)?.base_country ?? ""),
          base_lat: existingProfile?.base_lat != null ? String(existingProfile.base_lat) : "",
          base_lng: existingProfile?.base_lng != null ? String(existingProfile.base_lng) : "",
          search_address: String(existingProfile?.base_address ?? ""),
          default_currency: savedCurrency ?? (country ? inferCurrencyFromCountry(country) : "EUR"),
          same_as_business: false,
          legal_company_name: String((existingProfile as any)?.legal_company_name ?? ""),
          vat_number: String((existingProfile as any)?.vat_number ?? ""),
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
      base_address1: item.address_line1 || prev.base_address1,
      base_address2: item.address_line2 || prev.base_address2,
      base_province: item.province || prev.base_province,
      base_postcode: item.postcode || prev.base_postcode,
      base_country: item.country || prev.base_country,
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
        legal_company_name: profile.legal_company_name.trim() || null,
        vat_number: profile.vat_number.trim() || null,
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
        <SectionCard title="Company Information" description="Your basic company details shown to customers when you win a bid.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Company name"><TextInput value={profile.company_name} onChange={v => updateField("company_name", v)} placeholder="e.g. Valencia Cars" /></Field>
            <Field label="Contact name"><TextInput value={profile.contact_name} onChange={v => updateField("contact_name", v)} placeholder="e.g. Nick Smith" /></Field>
            <Field label="Phone"><TextInput value={profile.phone} onChange={v => updateField("phone", v)} placeholder="+34 600 000 000" /></Field>
            <Field label="Website"><TextInput value={profile.website} onChange={v => updateField("website", v)} placeholder="https://yourcompany.com" /></Field>
          </div>
        </SectionCard>

        {/* ── Section 2: Service Settings ── */}
        <SectionCard title="Service Settings" description="Control your service radius and the currency you bid in.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Service radius (km)">
              <p className="mt-0.5 mb-1 text-xs text-slate-500">Customer requests within this distance from your base will be sent to you.</p>
              <TextInput type="number" value={profile.service_radius_km} onChange={v => updateField("service_radius_km", v)} placeholder="30" />
            </Field>
            <Field label="Billing currency">
              <p className="mt-0.5 mb-2 text-xs text-slate-500">The currency your bids and bookings will be quoted in.</p>
              <div className="flex gap-2">
                {(["EUR", "GBP", "USD"] as Currency[]).map(c => (
                  <button key={c} type="button" onClick={() => updateField("default_currency", c)}
                    className={["flex-1 rounded-xl border px-3 py-3 text-sm font-bold transition-all",
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

        {/* ── Section 3: Business & Billing ── */}
        <SectionCard title="Business & Billing" description="Your legal details used for commission invoicing. Required before your account can go live.">
          <div className="rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768] mb-5">
            <p className="font-semibold mb-0.5">💡 Why we need this</p>
            <p>Camel Global charges a 20% commission (minimum €10) on completed bookings. Your legal name and VAT / NIF number are required to issue correct cross-border commission invoices. Your account cannot go live without a VAT / NIF number.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Legal company name">
                <p className="text-xs text-slate-400 mt-0.5 mb-1">Your full registered legal name — appears on commission invoices.</p>
                <TextInput value={profile.legal_company_name} onChange={v => updateField("legal_company_name", v)} placeholder="e.g. Valencia Cars S.L." />
              </Field>
            </div>
            <Field label="Company registration number">
              <p className="text-xs text-slate-400 mt-0.5 mb-1">From your country of incorporation.</p>
              <TextInput value={profile.company_registration_number} onChange={v => updateField("company_registration_number", v)} placeholder="e.g. B12345678" />
            </Field>
            <Field label="VAT / NIF Number *">
              <p className="text-xs text-slate-400 mt-0.5 mb-1">Spanish companies: NIF (e.g. B12345678) becomes ESB12345678 for EU transactions.</p>
              <TextInput value={profile.vat_number} onChange={v => updateField("vat_number", v)} placeholder="e.g. ESB12345678" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Section 4: Business Address ── */}
        <SectionCard title="Business Address" description="Your registered company address for correspondence and records.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Full address (auto-filled)">
                <p className="mt-0.5 mb-1 text-xs text-slate-500">Combined address — updated automatically from the fields below.</p>
                <TextInput value={profile.address} onChange={v => updateField("address", v)} placeholder="Full address" />
              </Field>
            </div>
            <Field label="Address line 1">
              <TextInput value={profile.address1} onChange={v => setProfile(prev => ({ ...prev, address1: v, address: [v, prev.address2, prev.province, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Calle Mayor 12" />
            </Field>
            <Field label="Address line 2">
              <TextInput value={profile.address2} onChange={v => setProfile(prev => ({ ...prev, address2: v, address: [prev.address1, v, prev.province, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Floor 2, Office A" />
            </Field>
            <Field label="Province / Region">
              <TextInput value={profile.province} onChange={v => setProfile(prev => ({ ...prev, province: v, address: [prev.address1, prev.address2, v, prev.postcode, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. Comunitat Valenciana" />
            </Field>
            <Field label="Postcode">
              <TextInput value={profile.postcode} onChange={v => setProfile(prev => ({ ...prev, postcode: v, address: [prev.address1, prev.address2, prev.province, v, prev.country].filter(Boolean).join(", ") }))} placeholder="e.g. 46001" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Country">
                <TextInput value={profile.country} onChange={v => setProfile(prev => ({ ...prev, country: v, address: [prev.address1, prev.address2, prev.province, prev.postcode, v].filter(Boolean).join(", "), default_currency: inferCurrencyFromCountry(v) }))} placeholder="e.g. España" />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 5: Car Fleet Base Location ── */}
        <SectionCard title="Car Fleet Base Location" description="Where your vehicles are dispatched from. The coordinates set here control your service radius.">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#003768]/20 bg-[#f3f8ff] px-4 py-3 mb-6">
            <input type="checkbox" checked={profile.same_as_business} onChange={e => toggleSameAsBusiness(e.target.checked)} className="h-4 w-4 accent-[#003768]" />
            <div>
              <span className="text-sm font-semibold text-[#003768]">Same as business address</span>
              <p className="text-xs text-slate-500">Tick to copy your business address as the fleet base address</p>
            </div>
          </label>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Fleet base full address">
                <p className="mt-0.5 mb-1 text-xs text-slate-500">Combined — auto-fills from the fields below, search or map.</p>
                <TextInput value={profile.base_address} onChange={v => updateField("base_address", v)} />
              </Field>
            </div>
            <Field label="Address line 1"><TextInput value={profile.base_address1} onChange={v => setProfile(prev => ({ ...prev, base_address1: v, base_address: [v, prev.base_address2, prev.base_province, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Carrer de la Marina 5" /></Field>
            <Field label="Address line 2"><TextInput value={profile.base_address2} onChange={v => setProfile(prev => ({ ...prev, base_address2: v, base_address: [prev.base_address1, v, prev.base_province, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Unit 3" /></Field>
            <Field label="Province / Region"><TextInput value={profile.base_province} onChange={v => setProfile(prev => ({ ...prev, base_province: v, base_address: [prev.base_address1, prev.base_address2, v, prev.base_postcode, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. Comunitat Valenciana" /></Field>
            <Field label="Postcode"><TextInput value={profile.base_postcode} onChange={v => setProfile(prev => ({ ...prev, base_postcode: v, base_address: [prev.base_address1, prev.base_address2, prev.base_province, v, prev.base_country].filter(Boolean).join(", ") }))} placeholder="e.g. 46001" /></Field>
            <div className="md:col-span-2"><Field label="Country"><TextInput value={profile.base_country} onChange={v => setProfile(prev => ({ ...prev, base_country: v, base_address: [prev.base_address1, prev.base_address2, prev.base_province, prev.base_postcode, v].filter(Boolean).join(", ") }))} placeholder="e.g. España" /></Field></div>
          </div>
          <div className="mt-6 rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-4">
            <p className="text-sm font-semibold text-[#003768] mb-1">📍 GPS Coordinates — Service Radius Centre Point</p>
            <p className="text-xs text-slate-500 mb-3">These coordinates determine the centre of your service radius. Use search, GPS or click the map to set them.</p>
            <div className="flex flex-wrap gap-3 mb-3">
              <button type="button" onClick={useCurrentLocation} className="rounded-full border border-[#003768]/20 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-[#003768]/5">Use my current location</button>
            </div>
            <div className="flex gap-2">
              <input type="text" value={profile.search_address}
                onChange={e => { updateField("search_address", e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
                placeholder="Search to set GPS pin location…"
                className="flex-1 rounded-xl border border-black/10 p-3 text-black outline-none focus:border-[#0f4f8a]" />
              <button type="button" onClick={searchAddress} className="rounded-xl bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
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
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Latitude"><TextInput value={profile.base_lat} onChange={v => updateField("base_lat", v)} placeholder="e.g. 38.842" /></Field>
              <Field label="Longitude"><TextInput value={profile.base_lng} onChange={v => updateField("base_lng", v)} placeholder="e.g. 0.112" /></Field>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
            <MapPicker lat={lat} lng={lng} onPick={handleMapPick} />
          </div>
          <p className="mt-2 text-xs text-slate-500">💡 Click the map to move the pin and update your GPS coordinates.</p>
        </SectionCard>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm font-medium text-green-600">✓ Saved successfully</p>}
        </div>
      </form>
    </div>
  );
}