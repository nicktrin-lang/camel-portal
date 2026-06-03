"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";

const MapPicker = dynamic(() => import("../profile/MapPicker"), { ssr: false });

type Step = "location" | "currency" | "billing" | "fleet" | "drivers" | "payouts" | "golive";

type Profile = {
  company_name: string | null;
  contact_name: string | null;
  base_address: string | null;
  base_address1: string | null;
  base_address2: string | null;
  base_town: string | null;
  base_city: string | null;
  base_province: string | null;
  base_postcode: string | null;
  base_country: string | null;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number | null;
  default_currency: string | null;
  legal_company_name: string | null;
  vat_number: string | null;
  company_registration_number: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
};

type AddressResult = {
  display_name: string; lat: number; lng: number;
  address_line1: string; address_line2: string;
  town: string; city: string; province: string; postcode: string; country: string;
};

type FleetRow = {
  id: string; category_slug: string; category_name: string;
  max_passengers: number; max_suitcases: number; is_active: boolean;
};

type DriverRow = {
  id: string; full_name: string; email: string; phone: string | null; is_active: boolean;
};

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "location", label: "Fleet Location",     icon: "📍" },
  { key: "currency", label: "Currency",           icon: "💱" },
  { key: "billing",  label: "Business & Billing", icon: "🧾" },
  { key: "fleet",    label: "Car Fleet",          icon: "🚗" },
  { key: "drivers",  label: "Drivers",            icon: "👤" },
  { key: "payouts",  label: "Payouts",            icon: "💳" },
  { key: "golive",   label: "Go Live",            icon: "🚀" },
];

// ── Step nav ───────────────────────────────────────────────────────────────────
function StepNav({ current, completed }: { current: Step; completed: Set<Step> }) {
  const currentIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="mb-8">
      {/* Circles + connectors — no labels to avoid overflow */}
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = completed.has(s.key);
          const active = s.key === current;
          return (
            <div key={s.key} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-9 h-9 flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                done   ? "bg-black text-white" :
                active ? "bg-[#ff7a00] text-white" :
                         "bg-[#e0e0e0] text-black/40"
              }`}>
                {done ? "✓" : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 transition-colors ${done ? "bg-black" : "bg-black/10"}`} />
              )}
            </div>
          );
        })}
      </div>
      {/* Active step label below */}
      <div className="mt-2">
        <span className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">
          Step {currentIdx + 1} of {STEPS.length} — {STEPS[currentIdx]?.label}
        </span>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────
function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/5 p-4 sm:p-8">
      <h2 className="text-2xl font-black text-black">{title}</h2>
      <p className="mt-1 text-sm font-bold text-black/50">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold text-black">
      {children}
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs font-bold text-black/40 mb-1.5">{hint}</p>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, saving, canSkip, onSkip }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string;
  saving?: boolean; canSkip?: boolean; onSkip?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-6">
      {onBack && (
        <button type="button" onClick={onBack}
          className="border border-black/20 px-5 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
          Back
        </button>
      )}
      {canSkip && onSkip && (
        <button type="button" onClick={onSkip}
          className="border border-black/10 px-5 py-3 text-sm font-black text-black/50 hover:bg-black/5 transition-colors">
          Skip for now
        </button>
      )}
      <button type="button" onClick={onNext} disabled={saving}
        className="flex-1 min-w-[120px] bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
        {saving ? "Saving…" : (nextLabel ?? "Save & Continue")}
      </button>
    </div>
  );
}

// ── Address search ─────────────────────────────────────────────────────────────
function AddressSearch({ onSelect }: { onSelect: (r: AddressResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length < 3) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/maps/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const data = json?.data || [];
        setResults(data); setOpen(data.length > 0);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 350);
  }, [query]);

  function pick(r: AddressResult) { onSelect(r); setQuery(r.display_name); setOpen(false); }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Search for your address</label>
      <div className="relative">
        <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Start typing your address..."
          className="w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-black/40">Searching…</span>}
      </div>
      <p className="mt-1 text-xs font-bold text-black/40">Or click the map below to drop a pin — fields fill automatically.</p>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-black/10 bg-white shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => pick(r)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-[#f0f0f0] border-b border-black/5 last:border-b-0">
              <span className="font-black text-black">{r.address_line1 || r.display_name.split(",")[0]}</span>
              <span className="ml-2 text-xs font-bold text-black/40">{[r.city || r.town, r.province, r.country].filter(Boolean).join(", ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step: Location ─────────────────────────────────────────────────────────────
function StepLocation({ profile, onDone }: { profile: Profile | null; onDone: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [addr1, setAddr1] = useState(profile?.base_address1 ?? "");
  const [addr2, setAddr2] = useState(profile?.base_address2 ?? "");
  const [town, setTown] = useState(profile?.base_town ?? "");
  const [city, setCity] = useState(profile?.base_city ?? "");
  const [province, setProvince] = useState(profile?.base_province ?? "");
  const [postcode, setPostcode] = useState(profile?.base_postcode ?? "");
  const [country, setCountry] = useState(profile?.base_country ?? "Spain");
  const [lat, setLat] = useState<number>(profile?.base_lat ?? 39.4699);
  const [lng, setLng] = useState<number>(profile?.base_lng ?? -0.3763);
  const [radius, setRadius] = useState<number>(profile?.service_radius_km ?? 30);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    if (profile.base_address1) setAddr1(profile.base_address1);
    if (profile.base_address2) setAddr2(profile.base_address2);
    if (profile.base_town) setTown(profile.base_town);
    if (profile.base_city) setCity(profile.base_city);
    if (profile.base_province) setProvince(profile.base_province);
    if (profile.base_postcode) setPostcode(profile.base_postcode);
    if (profile.base_country) setCountry(profile.base_country);
    if (profile.base_lat) setLat(profile.base_lat);
    if (profile.base_lng) setLng(profile.base_lng);
    if (profile.service_radius_km) setRadius(profile.service_radius_km);
  }, [profile]);

  const fullAddress = [addr1, addr2, town, city, province, postcode, country].filter(Boolean).join(", ");

  function applyResult(r: AddressResult) {
    setLat(r.lat); setLng(r.lng);
    if (r.address_line1) setAddr1(r.address_line1);
    setAddr2(r.address_line2 ?? "");
    setTown(r.town ?? "");
    setCity(r.city ?? "");
    setProvince(r.province ?? "");
    setPostcode(r.postcode ?? "");
    if (r.country) setCountry(r.country);
  }

  async function handleMapPick(newLat: number, newLng: number) {
    setLat(newLat); setLng(newLng); setGeocoding(true);
    try {
      const res = await fetch(`/api/maps/reverse?lat=${newLat}&lng=${newLng}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        if (json.address_line1) setAddr1(json.address_line1);
        setAddr2(json.address_line2 ?? "");
        setTown(json.town ?? "");
        setCity(json.city ?? "");
        setProvince(json.province ?? "");
        setPostcode(json.postcode ?? "");
        if (json.country) setCountry(json.country);
      }
    } catch {} finally { setGeocoding(false); }
  }

  async function save() {
    if (!addr1.trim()) { setError("Address line 1 is required."); return; }
    if (!country.trim()) { setError("Country is required."); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("partner_profiles").select("company_name,contact_name").eq("user_id", user.id).maybeSingle();
      const { error: e } = await supabase.from("partner_profiles").upsert({
        user_id: user.id,
        company_name: existing?.company_name ?? "",
        contact_name: existing?.contact_name ?? null,
        base_address: fullAddress,
        base_address1: addr1,
        base_address2: addr2 || null,
        base_town: town || null,
        base_city: city || null,
        base_province: province || null,
        base_postcode: postcode || null,
        base_country: country,
        base_lat: lat,
        base_lng: lng,
        service_radius_km: radius,
      }, { onConflict: "user_id" });
      if (e) throw new Error(e.message);
      onDone();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card title="Fleet Base Location" subtitle="Set the address your vehicles operate from. This determines which customer requests you receive.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">Why this matters</p>
          <p className="font-bold text-black/60">Camel Global uses your fleet base location to match you with customers within your service radius. Only requests within your radius will be sent to you.</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <AddressSearch onSelect={applyResult} />
        {geocoding && <div className="border border-black/10 bg-[#f0f0f0] px-4 py-2 text-sm font-bold text-black/60">Fetching address…</div>}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Pin your exact location on the map</label>
          <p className="text-xs font-bold text-black/40 mb-2">Click anywhere on the map — the address fields below will update automatically.</p>
          <div className="overflow-hidden border border-black/10"><MapPicker lat={lat} lng={lng} onPick={handleMapPick} /></div>
          <p className="mt-1.5 text-xs font-bold text-black/40">GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldInput label="Address line 1" value={addr1} onChange={setAddr1} placeholder="e.g. Calle Mayor 12" required /></div>
          <div className="sm:col-span-2"><FieldInput label="Address line 2" value={addr2} onChange={setAddr2} placeholder="e.g. Unit 3 (optional)" /></div>
          <FieldInput label="Town" value={town} onChange={setTown} placeholder="e.g. Paterna" />
          <FieldInput label="City" value={city} onChange={setCity} placeholder="e.g. Valencia" />
          <FieldInput label="Province / Region" value={province} onChange={setProvince} placeholder="e.g. Comunitat Valenciana" />
          <FieldInput label="Postcode" value={postcode} onChange={setPostcode} placeholder="e.g. 46001" />
          <div className="sm:col-span-2"><FieldInput label="Country" value={country} onChange={setCountry} placeholder="e.g. Spain" required /></div>
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-black mb-3">Service Radius</h3>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">Coverage: <span className="text-[#ff7a00]">{radius} km</span></label>
          <input type="range" min={5} max={150} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full accent-[#ff7a00]" />
          <div className="flex justify-between text-xs font-bold text-black/40 mt-1"><span>5 km</span><span>Local area</span><span>150 km</span></div>
          <p className="mt-3 text-sm font-bold text-black/60">A <strong className="text-black">{radius} km</strong> radius means you will receive requests from customers within {radius} km of your base.</p>
        </div>
        <NavButtons onNext={save} saving={saving} nextLabel="Save Location & Continue" />
      </div>
    </Card>
  );
}

// ── Step: Currency ─────────────────────────────────────────────────────────────
function StepCurrency({ profile, onDone, onBack }: { profile: Profile | null; onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [currency, setCurrency] = useState(profile?.default_currency || "EUR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const options = [
    { value: "EUR", label: "Euro",          symbol: "€", desc: "Default for Spain and most of Europe" },
    { value: "GBP", label: "British Pound", symbol: "£", desc: "For UK-based partners" },
    { value: "USD", label: "US Dollar",     symbol: "$", desc: "For US or international operations" },
  ];

  async function save() {
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("partner_profiles").select("company_name,contact_name").eq("user_id", user.id).maybeSingle();
      const { error: e } = await supabase.from("partner_profiles").upsert({
        user_id: user.id,
        company_name: existing?.company_name ?? "",
        contact_name: existing?.contact_name ?? null,
        default_currency: currency,
      }, { onConflict: "user_id" });
      if (e) throw new Error(e.message);
      onDone();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card title="Bidding Currency" subtitle="Choose the currency you will use to price your bids.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">Why this matters</p>
          <p className="font-bold text-black/60">All your bids will be submitted in this currency. Customers will see the equivalent in their preferred currency automatically.</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => setCurrency(o.value)}
              className={`border-2 p-4 text-left transition-all ${
                currency === o.value
                  ? "border-[#ff7a00] bg-white"
                  : "border-black/10 bg-[#f0f0f0] hover:border-black/30"
              }`}>
              <div className="text-3xl font-black text-black">{o.symbol}</div>
              <div className="mt-2 font-black text-black">{o.label}</div>
              <div className="mt-0.5 text-xs font-bold text-black/50">{o.desc}</div>
              {currency === o.value && <div className="mt-2 text-xs font-black text-[#ff7a00]">Selected ✓</div>}
            </button>
          ))}
        </div>
        <NavButtons onBack={onBack} onNext={save} saving={saving} />
      </div>
    </Card>
  );
}

// ── Step: Business & Billing ───────────────────────────────────────────────────
function StepBilling({ profile, onDone, onBack }: { profile: Profile | null; onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [legalName, setLegalName] = useState(profile?.legal_company_name ?? "");
  const [regNumber, setRegNumber] = useState(profile?.company_registration_number ?? "");
  const [vatNumber, setVatNumber] = useState(profile?.vat_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    if (profile.legal_company_name) setLegalName(profile.legal_company_name);
    if (profile.company_registration_number) setRegNumber(profile.company_registration_number);
    if (profile.vat_number) setVatNumber(profile.vat_number);
  }, [profile]);

  async function save() {
    if (!legalName.trim()) { setError("Legal company name is required."); return; }
    if (!vatNumber.trim()) { setError("VAT / NIF number is required. Your account cannot go live without this."); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("partner_profiles").select("company_name,contact_name").eq("user_id", user.id).maybeSingle();
      const { error: e } = await supabase.from("partner_profiles").upsert({
        user_id: user.id,
        company_name: existing?.company_name ?? "",
        contact_name: existing?.contact_name ?? null,
        legal_company_name: legalName.trim(),
        company_registration_number: regNumber.trim() || null,
        vat_number: vatNumber.trim(),
      }, { onConflict: "user_id" });
      if (e) throw new Error(e.message);
      onDone();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card title="Business & Billing Details" subtitle="Your legal details are required for invoicing and commission processing.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">Why we need this</p>
          <p className="font-bold text-black/60">Camel Global takes a commission from each completed booking. Your VAT number and legal company name are required so we can issue correct cross-border commission invoices. Without a VAT number your account cannot go live.</p>
        </InfoBox>
        <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm">
          <p className="font-black text-black mb-1">📋 How commission works</p>
          <p className="font-bold text-black/60">Camel Global charges a <strong className="text-black">20% commission</strong> on the car hire price for each completed booking, with a <strong className="text-black">minimum commission of €10 per booking</strong>. Fuel charges are passed through to you in full — we take no commission on fuel.</p>
        </div>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="space-y-4">
          <FieldInput label="Legal company name" value={legalName} onChange={setLegalName} placeholder="e.g. Valencia Cars S.L." required hint="Your full registered legal name — this appears on commission invoices." />
          <FieldInput label="Company registration number" value={regNumber} onChange={setRegNumber} placeholder="e.g. B12345678" hint="Your company registration number from your country of incorporation." />
          <FieldInput label="VAT / NIF Number" value={vatNumber} onChange={setVatNumber} placeholder="e.g. ESB12345678" required hint="Your VAT or NIF number for cross-border invoicing. Spanish companies use a NIF (e.g. B12345678), which becomes ESB12345678 for EU transactions. Your account cannot go live without this." />
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm">
          <p className="font-black text-black">🔒 Your details are secure</p>
          <p className="mt-0.5 font-bold text-black/60">These details are used solely for commission invoicing and are never shared with customers.</p>
        </div>
        <NavButtons onBack={onBack} onNext={save} saving={saving} canSkip onSkip={onDone} />
      </div>
    </Card>
  );
}

// ── Step: Fleet ────────────────────────────────────────────────────────────────
function StepFleet({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category_slug: "", max_passengers: 4, max_suitcases: 2, max_hand_luggage: 2 });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("partner_fleet").select("*").eq("user_id", user.id).eq("is_active", true);
    setFleet(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addVehicle() {
    if (!form.category_slug) { setError("Please select a vehicle category."); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const cat = FLEET_CATEGORIES.find(c => c.slug === form.category_slug);
      const { error: e } = await supabase.from("partner_fleet").insert({
        user_id: user.id,
        category_slug: form.category_slug,
        category_name: cat?.name || form.category_slug,
        max_passengers: form.max_passengers,
        max_suitcases: form.max_suitcases,
        max_hand_luggage: form.max_hand_luggage,
        service_level: "standard",
        is_active: true,
      });
      if (e) throw new Error(e.message);
      await load();
      setAdding(false);
      setForm({ category_slug: "", max_passengers: 4, max_suitcases: 2, max_hand_luggage: 2 });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function removeVehicle(id: string) {
    await supabase.from("partner_fleet").update({ is_active: false }).eq("id", id);
    await load();
  }

  return (
    <Card title="Your Car Fleet" subtitle="Add the vehicle categories you can offer to customers.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">Why this matters</p>
          <p className="font-bold text-black/60">Customers request specific vehicle types. You will only receive requests that match the categories you add here.</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {loading ? <p className="text-sm font-bold text-black/50">Loading fleet…</p> : (
          <div className="space-y-2">
            {fleet.length === 0 && !adding && <p className="text-sm font-bold text-black/40 italic">No vehicles added yet.</p>}
            {fleet.map(f => (
              <div key={f.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                <div>
                  <p className="font-black text-black">{f.category_name}</p>
                  <p className="text-xs font-bold text-black/50">{f.max_passengers} passengers · {f.max_suitcases} suitcases</p>
                </div>
                <button type="button" onClick={() => removeVehicle(f.id)} className="text-xs font-black text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">Add a vehicle category</h3>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black mb-1.5 block">Vehicle category</label>
              <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                className="w-full border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-black">
                <option value="">Select category…</option>
                {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 grid-cols-3">
              {[
                { key: "max_passengers",   label: "Passengers" },
                { key: "max_suitcases",    label: "Suitcases" },
                { key: "max_hand_luggage", label: "Hand luggage" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-black uppercase tracking-widest text-black mb-1.5 block">{label}</label>
                  <input type="number" min={0} max={20} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full border border-black/10 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-black" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)}
                className="flex-1 border border-black/20 py-2.5 text-sm font-black text-black hover:bg-black/5">Cancel</button>
              <button type="button" onClick={addVehicle} disabled={saving}
                className="flex-[2] bg-black py-2.5 text-sm font-black text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Saving…" : "Add vehicle"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-black/20 py-3 text-sm font-black text-black/50 hover:border-black/40 hover:bg-[#f0f0f0] transition-colors">
            + Add vehicle category
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone}
          nextLabel={fleet.length > 0 ? "Save & Continue" : undefined} />
      </div>
    </Card>
  );
}

// ── Step: Drivers ──────────────────────────────────────────────────────────────
function StepDrivers({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  async function load() {
    const res = await fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => null);
    setDrivers((json?.data || []).filter((d: DriverRow) => d.is_active));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDriver() {
    if (!form.full_name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/partner/drivers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add driver.");
      await load();
      setAdding(false);
      setForm({ full_name: "", email: "", phone: "" });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card title="Your Drivers" subtitle="Add the drivers who will deliver and collect vehicles for your customers.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">Why this matters</p>
          <p className="font-bold text-black/60">Drivers meet customers at collection and return. Each driver needs an account to use the Camel Global driver app. Add at least one driver before going live.</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {loading ? <p className="text-sm font-bold text-black/50">Loading drivers…</p> : (
          <div className="space-y-2">
            {drivers.length === 0 && !adding && <p className="text-sm font-bold text-black/40 italic">No drivers added yet.</p>}
            {drivers.map(d => (
              <div key={d.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                <div>
                  <p className="font-black text-black">{d.full_name}</p>
                  <p className="text-xs font-bold text-black/50">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                </div>
                <span className="text-xs font-black text-black border border-black/20 px-2 py-0.5">Added ✓</span>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">Add a driver</h3>
            {[
              { key: "full_name", label: "Full name",     placeholder: "Juan Garcia",           required: true },
              { key: "email",     label: "Email address", placeholder: "juan@valenciacars.com",  required: true },
              { key: "phone",     label: "Phone number",  placeholder: "+34 600 000 000" },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="text-xs font-black uppercase tracking-widest text-black mb-1.5 block">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input value={(form as any)[key]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)}
                className="flex-1 border border-black/20 py-2.5 text-sm font-black text-black hover:bg-black/5">Cancel</button>
              <button type="button" onClick={addDriver} disabled={saving}
                className="flex-[2] bg-black py-2.5 text-sm font-black text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Saving…" : "Add driver"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-black/20 py-3 text-sm font-black text-black/50 hover:border-black/40 hover:bg-[#f0f0f0] transition-colors">
            + Add driver
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone}
          nextLabel={drivers.length > 0 ? "Save & Continue" : undefined} />
      </div>
    </Card>
  );
}

// ── Step: Payouts ──────────────────────────────────────────────────────────────
function StepPayouts({ profile, onDone, onBack, onRefreshProfile }: {
  profile: Profile | null; onDone: () => void; onBack: () => void;
  onRefreshProfile: () => Promise<void>;
}) {
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; onboarding_complete: boolean; payouts_enabled: boolean } | null>(null);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const stripeReturn = searchParams.get("stripe");

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/partner/stripe/status", { credentials: "include" });
      const json = await res.json();
      setStatus(json);
      // Also refresh profile so stripe_onboarding_complete is up to date
      await onRefreshProfile();
    } catch {}
    finally { setRefreshing(false); }
  }

  async function startOnboarding() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/partner/stripe/connect", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start onboarding");
      window.location.href = json.url;
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  const isComplete = status?.onboarding_complete || profile?.stripe_onboarding_complete;

  return (
    <Card title="Set Up Payouts" subtitle="Connect your bank account to receive payments from completed bookings.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">How payouts work</p>
          <p className="font-bold text-black/60">When a customer pays for their booking, funds are split automatically — Camel Global's commission goes to us, and your net amount (car hire minus commission, plus fuel) is held securely in your Stripe account. At the end of each month, all completed bookings are paid out to your bank account in one transfer.</p>
        </InfoBox>

        <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm space-y-2">
          <p className="font-black text-black">💳 Powered by Stripe</p>
          <p className="font-bold text-black/60">Payouts are handled securely by Stripe. You will be asked to provide your business details and bank account information directly with Stripe — Camel Global never sees your bank details.</p>
          <p className="font-bold text-black/60">Monthly commission invoices are generated automatically and emailed to you.</p>
        </div>

        {stripeReturn === "complete" && !isComplete && (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Stripe is reviewing your details. This usually takes a few minutes. Use the refresh button below to check your status.
          </div>
        )}

        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        {isComplete ? (
          <div className="border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-green-600 text-white font-black text-sm">✓</span>
              <div>
                <p className="font-black text-green-800">Payouts connected</p>
                <p className="text-sm font-bold text-green-700">Your Stripe account is set up and ready to receive payments.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border border-black/10 bg-white p-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#e0e0e0] text-black/40 font-black text-lg">💳</span>
              <div>
                <p className="font-black text-black">Not yet connected</p>
                <p className="text-sm font-bold text-black/50">Click below to set up your Stripe Express account. You will be redirected to Stripe and returned here when complete.</p>
              </div>
            </div>
            <button type="button" onClick={startOnboarding} disabled={loading}
              className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? "Redirecting to Stripe…" : "Set Up Payouts with Stripe →"}
            </button>
            <button type="button" onClick={checkStatus} disabled={refreshing}
              className="w-full border border-black/20 py-2.5 text-sm font-black text-black/50 hover:bg-black/5 disabled:opacity-50 transition-colors">
              {refreshing ? "Checking…" : "Refresh status"}
            </button>
          </div>
        )}

        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone}
          nextLabel={isComplete ? "Continue" : undefined} />
      </div>
    </Card>
  );
}

// ── Step: Go Live ──────────────────────────────────────────────────────────────
function StepGoLive({ profile, onBack }: { profile: Profile | null; onBack: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fleetCount, setFleetCount] = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [stripeComplete, setStripeComplete] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const [{ data: fleet }, driversRes, stripeRes] = await Promise.all([
        supabase.from("partner_fleet").select("id").eq("user_id", user.id).eq("is_active", true),
        fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" }),
        fetch("/api/partner/stripe/status", { credentials: "include" }),
      ]);
      const driversJson = await driversRes.json().catch(() => null);
      const stripeJson  = await stripeRes.json().catch(() => null);
      setFleetCount(fleet?.length ?? 0);
      setDriverCount((driversJson?.data || []).filter((d: DriverRow) => d.is_active).length);
      setStripeComplete(stripeJson?.onboarding_complete ?? false);
      setChecking(false);
    }
    check();
  }, [supabase]);

  if (checking) return (
    <div className="bg-white border border-black/5 p-8">
      <p className="text-sm font-bold text-black/50">Checking your setup…</p>
    </div>
  );

  const checks = [
    { label: "Fleet base location set",    done: !!(profile?.base_lat && profile?.base_lng && profile?.base_address1) },
    { label: "Service radius configured",  done: !!(profile?.service_radius_km) },
    { label: "Bidding currency selected",  done: !!(profile?.default_currency) },
    { label: "Legal company name provided",done: !!(profile?.legal_company_name) },
    { label: "VAT number provided",        done: !!(profile?.vat_number) },
    { label: "At least one vehicle added", done: fleetCount > 0 },
    { label: "At least one driver added",  done: driverCount > 0 },
    { label: "Stripe payouts connected",   done: stripeComplete },
  ];
  const allDone = checks.every(c => c.done);
  const donePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  return (
    <Card title="Ready to Go Live?" subtitle="Review your setup and request activation when you are ready.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">What happens when you go live?</p>
          <p className="font-bold text-black/60">Once activated, customer requests within your service radius will be sent to you in real time. You will be able to submit competitive bids and start receiving bookings immediately.</p>
        </InfoBox>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-black">Setup progress</span>
            <span className="text-sm font-black text-[#ff7a00]">{donePct}%</span>
          </div>
          <div className="h-2 bg-black/10 overflow-hidden">
            <div className="h-full bg-[#ff7a00] transition-all" style={{ width: `${donePct}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {checks.map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-3 border px-3 py-3 ${done ? "border-black/10 bg-[#f0f0f0]" : "border-amber-200 bg-amber-50"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-black ${done ? "bg-black text-white" : "bg-amber-200 text-amber-700"}`}>
                {done ? "✓" : "!"}
              </span>
              <span className={`text-sm font-bold ${done ? "text-black" : "text-amber-800"}`}>{label}</span>
              {!done && <span className="ml-auto text-xs font-black text-amber-600 shrink-0">Incomplete</span>}
            </div>
          ))}
        </div>
        {allDone ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-black text-black text-lg">You are all set!</p>
            <p className="text-sm font-bold text-black/60 mt-1">Your account is now live. You will start receiving customer booking requests immediately.</p>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-black text-amber-800">A few things still to complete</p>
            <p className="mt-1 font-bold text-amber-700">You can complete the remaining steps from your dashboard. Note: a VAT number and Stripe payout account are required before your account can go live.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="border border-black/20 px-5 py-3 text-sm font-black text-black hover:bg-black/5">Back</button>
          <button type="button" onClick={async () => {
            try { await fetch("/api/partner/refresh-live-status", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }); } catch {}
            router.replace("/partner/dashboard");
          }}
            className="flex-1 bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90">
            {allDone ? "Go to Dashboard" : "Save progress & go to Dashboard"}
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PartnerOnboardingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("location");
  const [completed, setCompleted] = useState<Set<Step>>(new Set());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const cols = "company_name,contact_name,base_address,base_address1,base_address2,base_town,base_city,base_province,base_postcode,base_country,base_lat,base_lng,service_radius_km,default_currency,legal_company_name,vat_number,company_registration_number,stripe_account_id,stripe_onboarding_complete";

  async function refreshProfile(userId?: string) {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("partner_profiles").select(cols).eq("user_id", uid).maybeSingle();
      if (data) setProfile(data as Profile);
    } catch {}
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/partner/login?reason=not_signed_in"); return; }
      const [{ data: prof }, { data: fleet }, driversRes, stripeRes] = await Promise.all([
        supabase.from("partner_profiles").select(cols).eq("user_id", user.id).maybeSingle(),
        supabase.from("partner_fleet").select("id").eq("user_id", user.id).eq("is_active", true),
        fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" }),
        fetch("/api/partner/stripe/status", { credentials: "include" }),
      ]);
      const driversJson = await driversRes.json().catch(() => null);
      const stripeJson  = await stripeRes.json().catch(() => null);
      setProfile(prof as Profile | null);
      const done = new Set<Step>();
      if (prof?.base_lat && prof?.base_lng && prof?.base_address1) done.add("location");
      if (prof?.default_currency) done.add("currency");
      if (prof?.legal_company_name && prof?.vat_number) done.add("billing");
      if (fleet && fleet.length > 0) done.add("fleet");
      if ((driversJson?.data || []).filter((d: DriverRow) => d.is_active).length > 0) done.add("drivers");
      if (stripeJson?.onboarding_complete) done.add("payouts");
      setCompleted(done);
      if (searchParams.get("stripe")) setStep("payouts");
      setLoading(false);
    }
    load();
  }, []);

  function complete(s: Step, next: Step) {
    setCompleted(prev => new Set([...prev, s]));
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm font-bold text-black/50">Loading your account…</p>
    </div>
  );

  return (
    <div className="w-full px-0 sm:px-4 py-6 md:px-8">
      <div className="mb-6 px-4 sm:px-0">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-1">Partner Portal</p>
        <h1 className="text-3xl font-black text-black">Get Started</h1>
        <p className="mt-1 text-sm font-bold text-black/50">Complete your setup to start receiving bookings.</p>
      </div>
      <div className="px-4 sm:px-0">
        <StepNav current={step} completed={completed} />
      </div>
      {step === "location" && (
        <StepLocation profile={profile} onDone={async () => {
          await refreshProfile();
          complete("location", "currency");
        }} />
      )}
      {step === "currency" && (
        <StepCurrency profile={profile} onDone={async () => {
          await refreshProfile();
          complete("currency", "billing");
        }} onBack={() => setStep("location")} />
      )}
      {step === "billing" && (
        <StepBilling profile={profile} onDone={async () => {
          await refreshProfile();
          complete("billing", "fleet");
        }} onBack={() => setStep("currency")} />
      )}
      {step === "fleet" && (
        <StepFleet onDone={() => complete("fleet", "drivers")} onBack={() => setStep("billing")} />
      )}
      {step === "drivers" && (
        <StepDrivers onDone={() => complete("drivers", "payouts")} onBack={() => setStep("fleet")} />
      )}
      {step === "payouts" && (
        <StepPayouts
          profile={profile}
          onRefreshProfile={refreshProfile}
          onDone={async () => {
            await refreshProfile();
            complete("payouts", "golive");
          }}
          onBack={() => setStep("drivers")}
        />
      )}
      {step === "golive" && (
        <StepGoLive profile={profile} onBack={() => setStep("payouts")} />
      )}
    </div>
  );
}