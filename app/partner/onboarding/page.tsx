"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { useTranslation } from "@/lib/i18n/useTranslation";

const MapPicker = dynamic(() => import("../profile/MapPicker"), { ssr: false });

type Step = "location" | "currency" | "billing" | "fleet" | "drivers" | "payouts" | "golive";
type Profile = {
  company_name: string | null; contact_name: string | null; base_address: string | null;
  base_address1: string | null; base_address2: string | null; base_town: string | null;
  base_city: string | null; base_province: string | null; base_postcode: string | null;
  base_country: string | null; base_lat: number | null; base_lng: number | null;
  service_radius_km: number | null; default_currency: string | null;
  legal_company_name: string | null; vat_number: string | null;
  company_registration_number: string | null; stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
};
type AddressResult = {
  display_name: string; lat: number; lng: number; address_line1: string; address_line2: string;
  town: string; city: string; province: string; postcode: string; country: string;
};
type FleetRow  = { id: string; category_slug: string; category_name: string; max_passengers: number; max_suitcases: number; is_active: boolean };
type DriverRow = { id: string; full_name: string; email: string; phone: string | null; is_active: boolean };

const STEP_KEYS: Step[] = ["location","currency","billing","fleet","drivers","payouts","golive"];
const STEP_ICONS: Record<Step, string> = {
  location: "📍", currency: "💱", billing: "🧾", fleet: "🚗", drivers: "👤", payouts: "💳", golive: "🚀",
};

function StepNav({ current, completed }: { current: Step; completed: Set<Step> }) {
  const { t } = useTranslation();
  const currentIdx = STEP_KEYS.indexOf(current);
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEP_KEYS.map((key, i) => {
          const done = completed.has(key), active = key === current;
          return (
            <div key={key} className={`flex items-center ${i < STEP_KEYS.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-9 h-9 flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                done ? "bg-black text-white" : active ? "bg-[#ff7a00] text-white" : "bg-[#e0e0e0] text-black/40"
              }`}>
                {done ? "✓" : STEP_ICONS[key]}
              </div>
              {i < STEP_KEYS.length - 1 && <div className={`h-0.5 flex-1 mx-1 transition-colors ${done ? "bg-black" : "bg-black/10"}`} />}
            </div>
          );
        })}
      </div>
      <div className="mt-2">
        <span className="text-xs font-black uppercase tracking-widest text-[#ff7a00]">
          {t("onboarding.stepOf", { current: String(currentIdx + 1), total: String(STEP_KEYS.length) })} {t(`onboarding.step.${current}`)}
        </span>
      </div>
    </div>
  );
}

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
  return <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold text-black">{children}</div>;
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 mt-6">
      {onBack && (
        <button type="button" onClick={onBack} className="border border-black/20 px-5 py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
          {t("common.back")}
        </button>
      )}
      {canSkip && onSkip && (
        <button type="button" onClick={onSkip} className="border border-black/10 px-5 py-3 text-sm font-black text-black/50 hover:bg-black/5 transition-colors">
          {t("common.skip")}
        </button>
      )}
      <button type="button" onClick={onNext} disabled={saving}
        className="flex-1 min-w-[120px] bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
        {saving ? t("common.saving") : (nextLabel ?? t("common.saveAndContinue"))}
      </button>
    </div>
  );
}

function AddressSearch({ onSelect }: { onSelect: (r: AddressResult) => void }) {
  const { t } = useTranslation();
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">{t("onboarding.location.searchLabel")}</label>
      <div className="relative">
        <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder={t("onboarding.location.searchPlaceholder")}
          className="w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-black/40">{t("common.searching")}</span>}
      </div>
      <p className="mt-1 text-xs font-bold text-black/40">{t("onboarding.location.searchHint")}</p>
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

function StepLocation({ profile, onDone }: { profile: Profile | null; onDone: () => void }) {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [addr1, setAddr1]       = useState(profile?.base_address1 ?? "");
  const [addr2, setAddr2]       = useState(profile?.base_address2 ?? "");
  const [town, setTown]         = useState(profile?.base_town ?? "");
  const [city, setCity]         = useState(profile?.base_city ?? "");
  const [province, setProvince] = useState(profile?.base_province ?? "");
  const [postcode, setPostcode] = useState(profile?.base_postcode ?? "");
  const [country, setCountry]   = useState(profile?.base_country ?? "Spain");
  const [lat, setLat]           = useState<number>(profile?.base_lat ?? 39.4699);
  const [lng, setLng]           = useState<number>(profile?.base_lng ?? -0.3763);
  const [radius, setRadius]     = useState<number>(profile?.service_radius_km ?? 30);
  const [saving, setSaving]     = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError]       = useState("");

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

  const fullAddress = [addr1, addr2, town, city, province, postcode, country].filter(Boolean).join(", ");

  function applyResult(r: AddressResult) {
    setLat(r.lat); setLng(r.lng);
    if (r.address_line1) setAddr1(r.address_line1);
    setAddr2(r.address_line2 ?? ""); setTown(r.town ?? ""); setCity(r.city ?? "");
    setProvince(r.province ?? ""); setPostcode(r.postcode ?? "");
    if (r.country) setCountry(r.country);
  }

  async function handleMapPick(newLat: number, newLng: number) {
    setLat(newLat); setLng(newLng); setGeocoding(true);
    try {
      const res  = await fetch(`/api/maps/reverse?lat=${newLat}&lng=${newLng}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        if (json.address_line1) setAddr1(json.address_line1);
        setAddr2(json.address_line2 ?? ""); setTown(json.town ?? ""); setCity(json.city ?? "");
        setProvince(json.province ?? ""); setPostcode(json.postcode ?? "");
        if (json.country) setCountry(json.country);
      }
    } catch {} finally { setGeocoding(false); }
  }

  async function save() {
    if (!addr1.trim()) { setError(t("onboarding.location.err.addr1")); return; }
    if (!country.trim()) { setError(t("onboarding.location.err.country")); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("partner_profiles").select("company_name,contact_name").eq("user_id", user.id).maybeSingle();
      const { error: e } = await supabase.from("partner_profiles").upsert({
        user_id: user.id, company_name: existing?.company_name ?? "", contact_name: existing?.contact_name ?? null,
        base_address: fullAddress, base_address1: addr1, base_address2: addr2 || null,
        base_town: town || null, base_city: city || null, base_province: province || null,
        base_postcode: postcode || null, base_country: country, base_lat: lat, base_lng: lng,
        service_radius_km: radius,
      }, { onConflict: "user_id" });
      if (e) throw new Error(e.message);
      onDone();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Card title={t("onboarding.location.title")} subtitle={t("onboarding.location.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.location.whyTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.location.whyBody")}</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <AddressSearch onSelect={applyResult} />
        {geocoding && <div className="border border-black/10 bg-[#f0f0f0] px-4 py-2 text-sm font-bold text-black/60">{t("onboarding.location.fetching")}</div>}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">{t("onboarding.location.pinLabel")}</label>
          <p className="text-xs font-bold text-black/40 mb-2">{t("onboarding.location.pinHint")}</p>
          <div className="overflow-hidden border border-black/10"><MapPicker lat={lat} lng={lng} onPick={handleMapPick} /></div>
          <p className="mt-1.5 text-xs font-bold text-black/40">{t("onboarding.location.gps")} {lat.toFixed(5)}, {lng.toFixed(5)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldInput label={t("onboarding.location.addr1")} value={addr1} onChange={setAddr1} placeholder={t("onboarding.location.addr1.placeholder")} required /></div>
          <div className="sm:col-span-2"><FieldInput label={t("onboarding.location.addr2")} value={addr2} onChange={setAddr2} placeholder={t("onboarding.location.addr2.placeholder")} /></div>
          <FieldInput label={t("onboarding.location.town")} value={town} onChange={setTown} placeholder={t("onboarding.location.town.placeholder")} />
          <FieldInput label={t("onboarding.location.city")} value={city} onChange={setCity} placeholder={t("onboarding.location.city.placeholder")} />
          <FieldInput label={t("onboarding.location.province")} value={province} onChange={setProvince} placeholder={t("onboarding.location.province.placeholder")} />
          <FieldInput label={t("onboarding.location.postcode")} value={postcode} onChange={setPostcode} placeholder={t("onboarding.location.postcode.placeholder")} />
          <div className="sm:col-span-2"><FieldInput label={t("onboarding.location.country")} value={country} onChange={setCountry} placeholder={t("onboarding.location.country.placeholder")} required /></div>
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-black mb-3">{t("onboarding.location.radiusTitle")}</h3>
          <label className="block text-xs font-black uppercase tracking-widest text-black mb-1.5">
            {t("onboarding.location.radiusCoverage")} <span className="text-[#ff7a00]">{radius} km</span>
          </label>
          <input type="range" min={5} max={150} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full accent-[#ff7a00]" />
          <div className="flex justify-between text-xs font-bold text-black/40 mt-1">
            <span>{t("onboarding.location.radiusMin")}</span><span>{t("onboarding.location.radiusMid")}</span><span>{t("onboarding.location.radiusMax")}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-black/60">{t("onboarding.location.radiusBody", { radius: String(radius) })}</p>
        </div>
        <NavButtons onNext={save} saving={saving} nextLabel={t("onboarding.location.cta")} />
      </div>
    </Card>
  );
}

function StepCurrency({ onDone, onBack }: { profile: Profile | null; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <Card title={t("onboarding.currency.title")} subtitle={t("onboarding.currency.subtitle")}>
      <div className="space-y-6">
        <InfoBox>
          <p className="text-sm font-black text-black">{t("onboarding.currency.whyTitle")}</p>
          <p className="mt-1 text-sm font-semibold text-black/60 leading-relaxed">{t("onboarding.currency.whyBody")}</p>
        </InfoBox>
        <NavButtons onBack={onBack} onNext={onDone} />
      </div>
    </Card>
  );
}

function StepBilling({ profile, onDone, onBack }: { profile: Profile | null; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [legalName, setLegalName] = useState(profile?.legal_company_name ?? "");
  const [regNumber, setRegNumber] = useState(profile?.company_registration_number ?? "");
  const [vatNumber, setVatNumber] = useState(profile?.vat_number ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!profile) return;
    if (profile.legal_company_name) setLegalName(profile.legal_company_name);
    if (profile.company_registration_number) setRegNumber(profile.company_registration_number);
    if (profile.vat_number) setVatNumber(profile.vat_number);
  }, [profile]);

  async function save() {
    if (!legalName.trim()) { setError(t("onboarding.billing.err.legalName")); return; }
    if (!vatNumber.trim()) { setError(t("onboarding.billing.err.vatNumber")); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("partner_profiles").select("company_name,contact_name").eq("user_id", user.id).maybeSingle();
      const { error: e } = await supabase.from("partner_profiles").upsert({
        user_id: user.id, company_name: existing?.company_name ?? "", contact_name: existing?.contact_name ?? null,
        legal_company_name: legalName.trim(), company_registration_number: regNumber.trim() || null, vat_number: vatNumber.trim(),
      }, { onConflict: "user_id" });
      if (e) throw new Error(e.message);
      onDone();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Card title={t("onboarding.billing.title")} subtitle={t("onboarding.billing.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.billing.whyTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.billing.whyBody")}</p>
        </InfoBox>
        <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm">
          <p className="font-black text-black mb-1">{t("onboarding.billing.commissionTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.billing.commissionBody")}</p>
        </div>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="space-y-4">
          <FieldInput label={t("onboarding.billing.legalName")} value={legalName} onChange={setLegalName} placeholder={t("onboarding.billing.legalName.placeholder")} required hint={t("onboarding.billing.legalName.hint")} />
          <FieldInput label={t("onboarding.billing.regNumber")} value={regNumber} onChange={setRegNumber} placeholder={t("onboarding.billing.regNumber.placeholder")} hint={t("onboarding.billing.regNumber.hint")} />
          <FieldInput label={t("onboarding.billing.vatNumber")} value={vatNumber} onChange={setVatNumber} placeholder={t("onboarding.billing.vatNumber.placeholder")} required hint={t("onboarding.billing.vatNumber.hint")} />
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm">
          <p className="font-black text-black">{t("onboarding.billing.secure")}</p>
          <p className="mt-0.5 font-bold text-black/60">{t("onboarding.billing.secureBody")}</p>
        </div>
        <NavButtons onBack={onBack} onNext={save} saving={saving} canSkip onSkip={onDone} />
      </div>
    </Card>
  );
}

function StepFleet({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fleet, setFleet]   = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm] = useState({ category_slug: "", max_passengers: 4, max_suitcases: 2, max_hand_luggage: 2 });

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("partner_fleet").select("*").eq("user_id", user.id).eq("is_active", true);
    setFleet(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addVehicle() {
    if (!form.category_slug) { setError(t("onboarding.fleet.err.category")); return; }
    setSaving(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const cat = FLEET_CATEGORIES.find(c => c.slug === form.category_slug);
      const { error: e } = await supabase.from("partner_fleet").insert({
        user_id: user.id, category_slug: form.category_slug, category_name: cat?.name || form.category_slug,
        max_passengers: form.max_passengers, max_suitcases: form.max_suitcases,
        max_hand_luggage: form.max_hand_luggage, service_level: "standard", is_active: true,
      });
      if (e) throw new Error(e.message);
      await load(); setAdding(false);
      setForm({ category_slug: "", max_passengers: 4, max_suitcases: 2, max_hand_luggage: 2 });
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function removeVehicle(id: string) {
    await supabase.from("partner_fleet").update({ is_active: false }).eq("id", id);
    await load();
  }

  return (
    <Card title={t("onboarding.fleet.title")} subtitle={t("onboarding.fleet.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.fleet.whyTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.fleet.whyBody")}</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {loading ? <p className="text-sm font-bold text-black/50">{t("onboarding.fleet.loading")}</p> : (
          <div className="space-y-2">
            {fleet.length === 0 && !adding && <p className="text-sm font-bold text-black/40 italic">{t("onboarding.fleet.none")}</p>}
            {fleet.map(f => (
              <div key={f.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                <div>
                  <p className="font-black text-black">{f.category_name}</p>
                  <p className="text-xs font-bold text-black/50">{f.max_passengers} {t("onboarding.fleet.passengers").toLowerCase()} · {f.max_suitcases} {t("onboarding.fleet.suitcases").toLowerCase()}</p>
                </div>
                <button type="button" onClick={() => removeVehicle(f.id)} className="text-xs font-black text-red-500 hover:text-red-700">{t("common.remove")}</button>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">{t("onboarding.fleet.addTitle")}</h3>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-black mb-1.5 block">{t("onboarding.fleet.categoryLabel")}</label>
              <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                className="w-full border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-black">
                <option value="">{t("onboarding.fleet.categoryPlaceholder")}</option>
                {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 grid-cols-3">
              {[
                { key: "max_passengers",   label: t("onboarding.fleet.passengers") },
                { key: "max_suitcases",    label: t("onboarding.fleet.suitcases") },
                { key: "max_hand_luggage", label: t("onboarding.fleet.handLuggage") },
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
              <button type="button" onClick={() => setAdding(false)} className="flex-1 border border-black/20 py-2.5 text-sm font-black text-black hover:bg-black/5">{t("common.cancel")}</button>
              <button type="button" onClick={addVehicle} disabled={saving} className="flex-[2] bg-black py-2.5 text-sm font-black text-white hover:opacity-80 disabled:opacity-50">
                {saving ? t("common.saving") : t("onboarding.fleet.addBtn")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-black/20 py-3 text-sm font-black text-black/50 hover:border-black/40 hover:bg-[#f0f0f0] transition-colors">
            {t("onboarding.fleet.addCta")}
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone} nextLabel={fleet.length > 0 ? t("common.saveAndContinue") : undefined} />
      </div>
    </Card>
  );
}

function StepDrivers({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  async function load() {
    const res  = await fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" });
    const json = await res.json().catch(() => null);
    setDrivers((json?.data || []).filter((d: DriverRow) => d.is_active)); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addDriver() {
    if (!form.full_name.trim() || !form.email.trim()) { setError(t("onboarding.drivers.err.required")); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/partner/drivers", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("common.error"));
      await load(); setAdding(false); setForm({ full_name: "", email: "", phone: "" });
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <Card title={t("onboarding.drivers.title")} subtitle={t("onboarding.drivers.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.drivers.whyTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.drivers.whyBody")}</p>
        </InfoBox>
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {loading ? <p className="text-sm font-bold text-black/50">{t("onboarding.drivers.loading")}</p> : (
          <div className="space-y-2">
            {drivers.length === 0 && !adding && <p className="text-sm font-bold text-black/40 italic">{t("onboarding.drivers.none")}</p>}
            {drivers.map(d => (
              <div key={d.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                <div>
                  <p className="font-black text-black">{d.full_name}</p>
                  <p className="text-xs font-bold text-black/50">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                </div>
                <span className="text-xs font-black text-black border border-black/20 px-2 py-0.5">{t("common.added")}</span>
              </div>
            ))}
          </div>
        )}
        {adding ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">{t("onboarding.drivers.addTitle")}</h3>
            {[
              { key: "full_name", label: t("onboarding.drivers.fullName"),  placeholder: t("onboarding.drivers.fullName.placeholder"),  required: true },
              { key: "email",     label: t("onboarding.drivers.email"),      placeholder: t("onboarding.drivers.email.placeholder"),      required: true },
              { key: "phone",     label: t("onboarding.drivers.phone"),      placeholder: t("onboarding.drivers.phone.placeholder") },
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
              <button type="button" onClick={() => setAdding(false)} className="flex-1 border border-black/20 py-2.5 text-sm font-black text-black hover:bg-black/5">{t("common.cancel")}</button>
              <button type="button" onClick={addDriver} disabled={saving} className="flex-[2] bg-black py-2.5 text-sm font-black text-white hover:opacity-80 disabled:opacity-50">
                {saving ? t("common.saving") : t("onboarding.drivers.addBtn")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-black/20 py-3 text-sm font-black text-black/50 hover:border-black/40 hover:bg-[#f0f0f0] transition-colors">
            {t("onboarding.drivers.addCta")}
          </button>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone} nextLabel={drivers.length > 0 ? t("common.saveAndContinue") : undefined} />
      </div>
    </Card>
  );
}

function StepPayouts({ profile, onDone, onBack, onRefreshProfile }: {
  profile: Profile | null; onDone: () => void; onBack: () => void; onRefreshProfile: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus]       = useState<{ connected: boolean; onboarding_complete: boolean; payouts_enabled: boolean } | null>(null);
  const [error, setError]         = useState("");
  const searchParams = useSearchParams();
  const stripeReturn = searchParams.get("stripe");

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    setRefreshing(true);
    try {
      const res  = await fetch("/api/partner/stripe/status", { credentials: "include" });
      const json = await res.json();
      setStatus(json); await onRefreshProfile();
    } catch {} finally { setRefreshing(false); }
  }

  async function startOnboarding() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/partner/stripe/connect", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || t("common.error"));
      window.location.href = json.url;
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  const isComplete = status?.onboarding_complete || profile?.stripe_onboarding_complete;

  return (
    <Card title={t("onboarding.payouts.title")} subtitle={t("onboarding.payouts.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.payouts.howTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.payouts.howBody")}</p>
        </InfoBox>
        <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm space-y-2">
          <p className="font-black text-black">{t("onboarding.payouts.stripeTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.payouts.stripeBody")}</p>
          <p className="font-bold text-black/60">{t("onboarding.payouts.stripeInvoice")}</p>
        </div>
        {stripeReturn === "complete" && !isComplete && (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{t("onboarding.payouts.reviewing")}</div>
        )}
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {isComplete ? (
          <div className="border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-green-600 text-white font-black text-sm">✓</span>
              <div>
                <p className="font-black text-green-800">{t("onboarding.payouts.connected")}</p>
                <p className="text-sm font-bold text-green-700">{t("onboarding.payouts.connectedBody")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border border-black/10 bg-white p-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#e0e0e0] text-black/40 font-black text-lg">💳</span>
              <div>
                <p className="font-black text-black">{t("onboarding.payouts.notConnected")}</p>
                <p className="text-sm font-bold text-black/50">{t("onboarding.payouts.notConnectedBody")}</p>
              </div>
            </div>
            <button type="button" onClick={startOnboarding} disabled={loading}
              className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? t("onboarding.payouts.redirecting") : t("onboarding.payouts.cta")}
            </button>
            <button type="button" onClick={checkStatus} disabled={refreshing}
              className="w-full border border-black/20 py-2.5 text-sm font-black text-black/50 hover:bg-black/5 disabled:opacity-50 transition-colors">
              {refreshing ? t("onboarding.payouts.refreshing") : t("onboarding.payouts.refresh")}
            </button>
          </div>
        )}
        <NavButtons onBack={onBack} onNext={onDone} canSkip onSkip={onDone} nextLabel={isComplete ? t("common.continue") : undefined} />
      </div>
    </Card>
  );
}

function StepGoLive({ profile, onBack }: { profile: Profile | null; onBack: () => void }) {
  const { t } = useTranslation();
  const router   = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fleetCount, setFleetCount]   = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [stripeComplete, setStripe]   = useState(false);
  const [checking, setChecking]       = useState(true);

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
      setStripe(stripeJson?.onboarding_complete ?? false); setChecking(false);
    }
    check();
  }, [supabase]);

  if (checking) return (
    <div className="bg-white border border-black/5 p-8">
      <p className="text-sm font-bold text-black/50">{t("onboarding.golive.checking")}</p>
    </div>
  );

  const checks = [
    { label: t("onboarding.golive.check.location"), done: !!(profile?.base_lat && profile?.base_lng && profile?.base_address1) },
    { label: t("onboarding.golive.check.radius"),   done: !!(profile?.service_radius_km) },
    { label: t("onboarding.golive.check.currency"), done: !!(profile?.default_currency) },
    { label: t("onboarding.golive.check.legalName"),done: !!(profile?.legal_company_name) },
    { label: t("onboarding.golive.check.vat"),      done: !!(profile?.vat_number) },
    { label: t("onboarding.golive.check.fleet"),    done: fleetCount > 0 },
    { label: t("onboarding.golive.check.driver"),   done: driverCount > 0 },
    { label: t("onboarding.golive.check.stripe"),   done: stripeComplete },
  ];
  const allDone = checks.every(c => c.done);
  const donePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  return (
    <Card title={t("onboarding.golive.title")} subtitle={t("onboarding.golive.subtitle")}>
      <div className="space-y-5">
        <InfoBox>
          <p className="font-black mb-1">{t("onboarding.golive.whyTitle")}</p>
          <p className="font-bold text-black/60">{t("onboarding.golive.whyBody")}</p>
        </InfoBox>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-black">{t("onboarding.golive.progress")}</span>
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
              {!done && <span className="ml-auto text-xs font-black text-amber-600 shrink-0">{t("common.incomplete")}</span>}
            </div>
          ))}
        </div>
        {allDone ? (
          <div className="border border-black/10 bg-[#f0f0f0] p-5 text-center">
            <p className="text-2xl mb-2">{t("onboarding.golive.allDone")}</p>
            <p className="font-black text-black text-lg">{t("onboarding.golive.allDoneTitle")}</p>
            <p className="text-sm font-bold text-black/60 mt-1">{t("onboarding.golive.allDoneBody")}</p>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-black text-amber-800">{t("onboarding.golive.incomplete")}</p>
            <p className="mt-1 font-bold text-amber-700">{t("onboarding.golive.incompleteBody")}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="border border-black/20 px-5 py-3 text-sm font-black text-black hover:bg-black/5">{t("common.back")}</button>
          <button type="button" onClick={async () => {
            try { await fetch("/api/partner/refresh-live-status", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }); } catch {}
            router.replace("/partner/dashboard");
          }} className="flex-1 bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90">
            {allDone ? t("onboarding.golive.ctaDone") : t("onboarding.golive.ctaSave")}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function PartnerOnboardingPage() {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep]           = useState<Step>("location");

  function trackOnboardingStep(stepName: string) {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      // Fire unique event per step so GA4 funnel works without custom dimensions
      (window as any).gtag("event", `onboarding_step_${stepName}`, {
        event_category: "partner_onboarding",
        step_name: stepName,
      });
    }
  }
  const [completed, setCompleted] = useState<Set<Step>>(new Set());
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);

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
    setStep(next); trackOnboardingStep(next); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm font-bold text-black/50">{t("onboarding.loading")}</p>
    </div>
  );

  return (
    <div className="w-full px-0 sm:px-4 py-6 md:px-8">
      <div className="mb-6 px-4 sm:px-0">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-1">{t("onboarding.tag")}</p>
        <h1 className="text-3xl font-black text-black">{t("onboarding.title")}</h1>
        <p className="mt-1 text-sm font-bold text-black/50">{t("onboarding.subtitle")}</p>
      </div>
      <div className="px-4 sm:px-0"><StepNav current={step} completed={completed} /></div>
      {step === "location" && <StepLocation profile={profile} onDone={async () => { await refreshProfile(); complete("location", "currency"); }} />}
      {step === "currency" && <StepCurrency profile={profile} onDone={async () => { await refreshProfile(); complete("currency", "billing"); }} onBack={() => setStep("location")} />}
      {step === "billing"  && <StepBilling  profile={profile} onDone={async () => { await refreshProfile(); complete("billing", "fleet"); }}   onBack={() => setStep("currency")} />}
      {step === "fleet"    && <StepFleet    onDone={() => complete("fleet", "drivers")}   onBack={() => setStep("billing")} />}
      {step === "drivers"  && <StepDrivers  onDone={() => complete("drivers", "payouts")} onBack={() => setStep("fleet")} />}
      {step === "payouts"  && <StepPayouts  profile={profile} onRefreshProfile={refreshProfile} onDone={async () => { await refreshProfile(); complete("payouts", "golive"); }} onBack={() => setStep("drivers")} />}
      {step === "golive"   && <StepGoLive   profile={profile} onBack={() => setStep("payouts")} />}
    </div>
  );
}