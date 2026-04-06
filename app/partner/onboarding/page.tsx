"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";

const MapPicker = dynamic(() => import("../profile/MapPicker"), { ssr: false });

type Step = "location" | "currency" | "fleet" | "drivers" | "golive";

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
  { key: "location", label: "Fleet Location", icon: "📍" },
  { key: "currency", label: "Currency",       icon: "💱" },
  { key: "fleet",    label: "Car Fleet",      icon: "🚗" },
  { key: "drivers",  label: "Drivers",        icon: "👤" },
  { key: "golive",   label: "Go Live",        icon: "🚀" },
];

function StepNav({ current, completed }: { current: Step; completed: Set<Step> }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => {
        const done = completed.has(s.key);
        const active = s.key === current;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-colors ${
                done ? "bg-green-500 text-white" :
                active ? "bg-[#ff7a00] text-white shadow-[0_4px_12px_rgba(255,122,0,0.4)]" :
                "bg-slate-100 text-slate-400"
              }`}>
                {done ? "✓" : s.icon}
              </div>
              <span className={`mt-1 text-xs font-medium hidden sm:block ${
                active ? "text-[#ff7a00]" : done ? "text-green-600" : "text-slate-400"
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 rounded transition-colors ${done ? "bg-green-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <h2 className="text-2xl font-bold text-[#003768]">{title}</h2>
      <p className="mt-1 text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768]">
      {children}
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#003768] mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a] bg-white" />
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, saving, canSkip, onSkip }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string;
  saving?: boolean; canSkip?: boolean; onSkip?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mt-6">
      {onBack && (
        <button type="button" onClick={onBack}
          className="rounded-full border border-black/10 px-6 py-3 font-semibold text-[#003768] hover:bg-black/5 transition-colors">
          Back
        </button>
      )}
      {canSkip && onSkip && (
        <button type="button" onClick={onSkip}
          className="rounded-full border border-black/10 px-6 py-3 font-semibold text-slate-500 hover:bg-black/5 transition-colors">
          Skip for now
        </button>
      )}
      <button type="button" onClick={onNext} disabled={saving}
        className="flex-1 rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-50 transition-opacity">
        {saving ? "Saving..." : (nextLabel ?? "Save & Continue")}
      </button>
    </div>
  );
}

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
      <label className="block text-sm font-semibold text-[#003768] mb-1.5">Search for your address</label>
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Start typing your address..."
          className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a] bg-white"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Searching...</span>}
      </div>
      <p className="mt-1 text-xs text-slate-400">Or click the map below to drop a pin - fields fill automatically.</p>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden">
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => pick(r)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-[#f3f8ff] border-b border-black/5 last:border-b-0">
              <span className="font-medium text-[#003768]">{r.address_line1 || r.display_name.split(",")[0]}</span>
              <span className="ml-2 text-slate-400 text-xs">{[r.city || r.town, r.province, r.country].filter(Boolean).join(", ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepLocation({ profile, onDone }: { profile: Profile | null; onDone: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [addr1,     setAddr1]     = useState(profile?.base_address1 ?? "");
  const [addr2,     setAddr2]     = useState(profile?.base_address2 ?? "");
  const [town,      setTown]      = useState(profile?.base_town ?? "");
  const [city,      setCity]      = useState(profile?.base_city ?? "");
  const [province,  setProvince]  = useState(profile?.base_province ?? "");
  const [postcode,  setPostcode]  = useState(profile?.base_postcode ?? "");
  const [country,   setCountry]   = useState(profile?.base_country ?? "Spain");
  const [lat,       setLat]       = useState<number>(profile?.base_lat ?? 39.4699);
  const [lng,       setLng]       = useState<number>(profile?.base_lng ?? -0.3763);
  const [radius,    setRadius]    = useState<number>(profile?.service_radius_km ?? 30);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.base_address1) setAddr1(profile.base_address1);
    if (profile.base_address2) setAddr2(profile.base_address2);
    if (profile.base_town)     setTown(profile.base_town);
    if (profile.base_city)     setCity(profile.base_city);
    if (profile.base_province) setProvince(profile.base_province);
    if (profile.base_postcode) setPostcode(profile.base_postcode);
    if (profile.base_country)  setCountry(profile.base_country);
    if (profile.base_lat)      setLat(profile.base_lat);
    if (profile.base_lng)      setLng(profile.base_lng);
    if (profile.service_radius_km) setRadius(profile.service_radius_km);
  }, [profile]);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState("");

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
          <p className="font-semibold mb-1">Why this matters</p>
          <p>Camel Global uses your fleet base location to match you with customers within your service radius. Only requests within your radius will be sent to you - set this accurately to your depot or office location.</p>
        </InfoBox>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <AddressSearch onSelect={applyResult} />
        {geocoding && <div className="rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-2 text-sm text-[#003768]">Fetching address...</div>}
        <div>
          <label className="block text-sm font-semibold text-[#003768] mb-1.5">Pin your exact location on the map</label>
          <p className="text-xs text-slate-400 mb-2">Click anywhere on the map - the address fields below will update automatically.</p>
          <div className="rounded-2xl overflow-hidden border border-black/10"><MapPicker lat={lat} lng={lng} onPick={handleMapPick} /></div>
          <p className="mt-1.5 text-xs text-slate-400">GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
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
        <div className="rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-5">
          <h3 className="text-base font-bold text-[#003768] mb-3">Service Radius</h3>
          <label className="block text-sm font-semibold text-[#003768] mb-1.5">Coverage: <span className="text-[#ff7a00]">{radius} km</span></label>
          <input type="range" min={5} max={150} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full accent-[#ff7a00]" />
          <div className="flex justify-between text-xs text-slate-400 mt-1"><span>5 km</span><span>Local area</span><span>150 km</span></div>
          <p className="mt-3 text-sm text-[#003768]">A <strong>{radius} km</strong> radius means you will receive requests from customers within {radius} km of your base. Start with 30 km and expand once established.</p>
        </div>
        <NavButtons onNext={save} saving={saving} nextLabel="Save Location & Continue" />
      </div>
    </Card>
  );
  );
}

function StepCurrency({ profile, onDone, onBack }: { profile: Profile | null; onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [currency, setCurrency] = useState(profile?.default_currency || "EUR");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

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
          <p className="font-semibold mb-1">Why this matters</p>
          <p>All your bids will be submitted in this currency. Customers will see the equivalent in their preferred currency automatically. You can change this later in your profile settings.</p>
        </InfoBox>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => setCurrency(o.value)}
              className={`rounded-2xl border-2 p-5 text-left transition-all ${
                currency === o.value
                  ? "border-[#ff7a00] bg-[#fff8f3] shadow-[0_4px_12px_rgba(255,122,0,0.15)]"
                  : "border-black/10 bg-white hover:border-[#003768]/30"
              }`}>
              <div className="text-3xl font-black text-[#003768]">{o.symbol}</div>
              <div className="mt-2 font-bold text-[#003768]">{o.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{o.desc}</div>
              {currency === o.value && <div className="mt-2 text-xs font-bold text-[#ff7a00]">Selected</div>}
            </button>
          ))}
        </div>
        <NavButtons onBack={onBack} onNext={save} saving={saving} />
      </div>
    </Card>
  );
}

function StepFleet({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fleet,   setFleet]   = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ category_slug: "", max_passengers: 4, max_suitcases: 2, max_hand_luggage: 2 });

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
          <p className="font-semibold mb-1">Why this matters</p>
          <p>Customers request specific vehicle types - Standard Saloon, SUV, Minivan etc. You will only receive requests that match the categories you add here. Add all categories you can service to maximise your opportunities.</p>
        </InfoBox>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <p className="text-slate-500 text-sm">Loading fleet...</p> : (
          <div className="space-y-2">
            {fleet.length === 0 && !adding && <p className="text-sm text-slate-400 italic">No vehicles added yet.</p>}
            {fleet.map(f => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#003768]">{f.category_name}</p>
                  <p className="text-xs text-slate-500">{f.max_passengers} passengers · {f.max_suitcases} suitcases</p>
                </div>
                <button type="button" onClick={() => removeVehicle(f.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Remove</button>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-5 space-y-4">
            <h3 className="font-semibold text-[#003768]">Add a vehicle category</h3>
            <div>
              <label className="text-sm font-medium text-[#003768] mb-1.5 block">Vehicle category</label>
              <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]">
                <option value="">Select category...</option>
                {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: "max_passengers",   label: "Max passengers" },
                { key: "max_suitcases",    label: "Max suitcases" },
                { key: "max_hand_luggage", label: "Hand luggage" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-[#003768] mb-1.5 block">{label}</label>
                  <input type="number" min={0} max={20} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-semibold text-slate-600 hover:bg-black/5">Cancel</button>
              <button type="button" onClick={addVehicle} disabled={saving}
                className="flex-[2] rounded-full bg-[#003768] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Add vehicle"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full rounded-xl border-2 border-dashed border-[#003768]/20 py-3 text-sm font-semibold text-[#003768] hover:border-[#003768]/40 hover:bg-[#f3f8ff] transition-colors">
            + Add vehicle category
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone}
          nextLabel={fleet.length > 0 ? "Save & Continue" : undefined} />
      </div>
    </Card>
  );
}

function StepDrivers({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const supabase  = useMemo(() => createBrowserSupabaseClient(), []);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ full_name: "", email: "", phone: "" });

  async function load() {
    const res  = await fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => null);
    setDrivers((json?.data || []).filter((d: DriverRow) => d.is_active));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDriver() {
    if (!form.full_name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/partner/drivers", {
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
          <p className="font-semibold mb-1">Why this matters</p>
          <p>Drivers meet customers at collection and return. Each driver needs an account to use the Camel Global driver app - which records fuel levels and confirms collections. Add at least one driver before going live.</p>
        </InfoBox>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <p className="text-slate-500 text-sm">Loading drivers...</p> : (
          <div className="space-y-2">
            {drivers.length === 0 && !adding && <p className="text-sm text-slate-400 italic">No drivers added yet.</p>}
            {drivers.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#003768]">{d.full_name}</p>
                  <p className="text-xs text-slate-500">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                </div>
                <span className="text-xs font-semibold text-green-600">Added</span>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-5 space-y-4">
            <h3 className="font-semibold text-[#003768]">Add a driver</h3>
            {[
              { key: "full_name", label: "Full name",     placeholder: "Juan Garcia",           required: true },
              { key: "email",     label: "Email address", placeholder: "juan@valenciacars.com",  required: true },
              { key: "phone",     label: "Phone number",  placeholder: "+34 600 000 000" },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="text-sm font-medium text-[#003768] mb-1.5 block">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input value={(form as any)[key]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]" />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-semibold text-slate-600 hover:bg-black/5">Cancel</button>
              <button type="button" onClick={addDriver} disabled={saving}
                className="flex-[2] rounded-full bg-[#003768] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Add driver"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full rounded-xl border-2 border-dashed border-[#003768]/20 py-3 text-sm font-semibold text-[#003768] hover:border-[#003768]/40 hover:bg-[#f3f8ff] transition-colors">
            + Add driver
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone}
          nextLabel={drivers.length > 0 ? "Save & Continue" : undefined} />
      </div>
    </Card>
  );
}

function StepGoLive({ profile, fleetCount, driverCount, onBack }: {
  profile: Profile | null; fleetCount: number; driverCount: number; onBack: () => void;
}) {
  const router = useRouter();
  const checks = [
    { label: "Fleet base location set",    done: !!(profile?.base_lat && profile?.base_lng && profile?.base_address1) },
    { label: "Service radius configured",  done: !!(profile?.service_radius_km) },
    { label: "Bidding currency selected",  done: !!(profile?.default_currency) },
    { label: "At least one vehicle added", done: fleetCount > 0 },
    { label: "At least one driver added",  done: driverCount > 0 },
  ];
  const allDone = checks.every(c => c.done);
  const donePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  return (
    <Card title="Ready to Go Live?" subtitle="Review your setup and request activation when you are ready.">
      <div className="space-y-5">
        <InfoBox>
          <p className="font-semibold mb-1">What happens when you go live?</p>
          <p>Once activated, customer requests within your service radius will be sent to you in real time. You will be able to submit competitive bids and start receiving bookings immediately.</p>
        </InfoBox>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#003768]">Setup progress</span>
            <span className="text-sm font-bold text-[#ff7a00]">{donePct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#ff7a00] transition-all" style={{ width: `${donePct}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {checks.map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${done ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-green-500 text-white" : "bg-amber-200 text-amber-700"}`}>
                {done ? "✓" : "!"}
              </span>
              <span className={`text-sm font-medium ${done ? "text-green-800" : "text-amber-800"}`}>{label}</span>
              {!done && <span className="ml-auto text-xs text-amber-600 font-semibold">Incomplete</span>}
            </div>
          ))}
        </div>
        {allDone ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-800 text-lg">You are all set!</p>
            <p className="text-sm text-green-700 mt-1">Your account is ready. The Camel Global team will review and activate you shortly. You will receive an email once you are live.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">A few things still to complete</p>
            <p className="mt-1">You can still request to go live - our team will review your account. However we recommend completing all steps first to start receiving bookings immediately.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="rounded-full border border-black/10 px-6 py-3 font-semibold text-[#003768] hover:bg-black/5">Back</button>
          <button type="button" onClick={() => router.replace("/partner/dashboard")}
            className="flex-1 rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(255,122,0,0.3)] hover:opacity-95">
            {allDone ? "Go to Dashboard" : "Save progress & go to Dashboard"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function PartnerOnboardingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();
  const [step,        setStep]        = useState<Step>("location");
  const [completed,   setCompleted]   = useState<Set<Step>>(new Set());
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [fleetCount,  setFleetCount]  = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  const cols = "company_name,contact_name,base_address,base_address1,base_address2,base_town,base_city,base_province,base_postcode,base_country,base_lat,base_lng,service_radius_km,default_currency";

  async function refreshProfile(userId: string) {
    const { data } = await supabase.from("partner_profiles").select(cols).eq("user_id", userId).maybeSingle();
    if (data) setProfile(data as Profile);
    return data;
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/partner/login?reason=not_signed_in"); return; }
      const [{ data: prof }, { data: fleet }, driversRes] = await Promise.all([
        supabase.from("partner_profiles").select(cols).eq("user_id", user.id).maybeSingle(),
        supabase.from("partner_fleet").select("id").eq("user_id", user.id).eq("is_active", true),
        fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" }),
      ]);
      const driversJson = await driversRes.json().catch(() => null);
      setProfile(prof as Profile | null);
      setFleetCount(fleet?.length ?? 0);
      setDriverCount((driversJson?.data || []).filter((d: DriverRow) => d.is_active).length);
      const done = new Set<Step>();
      if (prof?.base_lat && prof?.base_lng && prof?.base_address1) done.add("location");
      if (prof?.default_currency) done.add("currency");
      if (fleet && fleet.length > 0) done.add("fleet");
      if ((driversJson?.data || []).filter((d: DriverRow) => d.is_active).length > 0) done.add("drivers");
      setCompleted(done);
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
      <p className="text-slate-500">Loading your account...</p>
    </div>
  );

  return (
    <div className="w-full px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#003768]">Get Started</h1>
        <p className="mt-1 text-slate-500">Complete your setup to start receiving bookings.</p>
      </div>
      <StepNav current={step} completed={completed} />
      {step === "location" && (
        <StepLocation profile={profile} onDone={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await refreshProfile(user.id);
          complete("location", "currency");
        }} />
      )}
      {step === "currency" && (
        <StepCurrency profile={profile} onDone={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await refreshProfile(user.id);
          complete("currency", "fleet");
        }} onBack={() => setStep("location")} />
      )}
      {step === "fleet" && (
        <StepFleet onDone={() => { setFleetCount(c => c + 1); complete("fleet", "drivers"); }} onBack={() => setStep("currency")} />
      )}
      {step === "drivers" && (
        <StepDrivers onDone={() => { setDriverCount(c => c + 1); complete("drivers", "golive"); }} onBack={() => setStep("fleet")} />
      )}
      {step === "golive" && (
        <StepGoLive profile={profile} fleetCount={fleetCount} driverCount={driverCount} onBack={() => setStep("drivers")} />
      )}
    </div>
  );
}