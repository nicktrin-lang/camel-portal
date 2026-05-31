"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@/app/components/HCaptcha";
import { CITIES, citiesByCountry, type CityEntry } from "@/lib/cities";
import { downloadPartnerTermsPDF } from "@/lib/portal/partnerTerms";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls     = "w-full bg-[#f0f0f0] px-4 py-3 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const selectCls    = "w-full bg-[#f0f0f0] px-4 py-3 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors appearance-none cursor-pointer";
const labelCls     = "block text-xs font-black uppercase tracking-widest text-black mb-2";
const btnPrimary   = "w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity";
const btnSecondary = "flex-1 border border-black/20 py-4 text-base font-black text-black hover:bg-[#f0f0f0] transition-colors";

const STEP_LABELS = ["Your Business", "Business Address", "Fleet Address", "Password", "Review"];

// ── Types ─────────────────────────────────────────────────────────────────────
type PhotonResult = {
  display_name: string; label?: string; subtitle?: string; type?: string;
  lat: number | null; lng: number | null; city?: string;
  address_line1?: string; address_line2?: string; province?: string; postcode?: string; country?: string;
};

const TYPE_ICON: Record<string, string> = {
  airport: "✈", hotel: "🏨", food: "🍽", train: "🚆", bus: "🚌", street: "🏠", place: "📍",
};

type FormData = {
  companyName: string; contactName: string; email: string; phone: string; website: string;
  address1: string; address2: string; city: string; province: string; postcode: string; country: string;
  addressLat: number | null; addressLng: number | null;
  fleetAddress1: string; fleetAddress2: string; fleetCity: string; fleetProvince: string;
  fleetPostcode: string; fleetCountry: string; fleetLat: number | null; fleetLng: number | null;
  password: string; confirmPassword: string; agreedToTerms: boolean;
};

const EMPTY: FormData = {
  companyName: "", contactName: "", email: "", phone: "", website: "",
  address1: "", address2: "", city: "", province: "", postcode: "", country: "Spain",
  addressLat: null, addressLng: null,
  fleetAddress1: "", fleetAddress2: "", fleetCity: "", fleetProvince: "", fleetPostcode: "", fleetCountry: "Spain",
  fleetLat: null, fleetLng: null, password: "", confirmPassword: "", agreedToTerms: false,
};

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const done = i + 1 < step, active = i + 1 === step;
          return (
            <div key={label} className={`flex items-center ${i < STEP_LABELS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 flex items-center justify-center text-sm font-black shrink-0 transition-colors ${done ? "bg-green-500 text-white" : active ? "bg-[#ff7a00] text-white" : "bg-[#f0f0f0] text-black/40"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`mt-1.5 text-xs font-black uppercase tracking-wide whitespace-nowrap ${active ? "text-[#ff7a00]" : done ? "text-green-600" : "text-black/30"}`}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className={`h-1 flex-1 mx-2 mb-5 transition-colors ${done ? "bg-green-500" : "bg-[#f0f0f0]"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

// ── Photon address search widget ──────────────────────────────────────────────
function PhotonSearch({
  city, onCityChange, query, onQueryChange, results, onSelect, searching, placeholder,
}: {
  city: CityEntry; onCityChange: (c: CityEntry) => void;
  query: string; onQueryChange: (q: string) => void;
  results: PhotonResult[]; onSelect: (r: PhotonResult) => void;
  searching: boolean; placeholder?: string;
}) {
  const grouped = citiesByCountry();
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button type="button"
          onClick={async () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(async pos => {
              try {
                const res  = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`, { cache: "no-store" });
                const json = await res.json().catch(() => null);
                if (json?.display_name) {
                  onSelect({
                    display_name:  String(json.display_name),
                    label:         String(json.address_line1 || json.display_name),
                    subtitle:      [json.address_line2, json.city, json.country].filter(Boolean).join(", "),
                    lat:           pos.coords.latitude,
                    lng:           pos.coords.longitude,
                    city:          String(json.city          || ""),
                    address_line1: String(json.address_line1 || ""),
                    address_line2: String(json.address_line2 || ""),
                    province:      String(json.province      || ""),
                    postcode:      String(json.postcode      || ""),
                    country:       String(json.country       || ""),
                  });
                }
              } catch {}
            }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
          }}
          className="border border-black/20 bg-[#f0f0f0] px-4 py-2 text-xs font-black text-black hover:bg-[#e8e8e8] transition-colors">
          📍 Use my current location
        </button>
      </div>

      <div className="bg-black px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-black uppercase tracking-widest text-white">Searching near</span>
        <select
          value={`${city.country}|${city.city}`}
          onChange={e => {
            const [country, c] = e.target.value.split("|");
            const found = CITIES.find(x => x.country === country && x.city === c);
            if (found) onCityChange(found);
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
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={placeholder || `Search in ${city.city}…`}
          className={inputCls}
        />
        {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/30">Searching…</span>}
        {results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-0.5 border border-black/10 bg-white shadow-xl overflow-hidden">
            {results.map((r, i) => {
              const icon = TYPE_ICON[r.type || ""] || "📍";
              return (
                <button key={i} type="button" onClick={() => onSelect(r)}
                  className="flex w-full items-start gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-[#f0f0f0] last:border-b-0">
                  <span className="mt-0.5 w-5 shrink-0 text-center text-base">{icon}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-black text-black">{r.label || r.display_name}</span>
                    {r.subtitle && <span className="truncate text-xs font-semibold text-black/50">{r.subtitle}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared Photon search hook ─────────────────────────────────────────────────
function usePhotonSearch(city: CityEntry) {
  const [query,     setQueryRaw]   = useState("");
  const [results,   setResults]    = useState<PhotonResult[]>([]);
  const [searching, setSearching]  = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setQuery(q: string) {
    setQueryRaw(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&biasLat=${city.lat}&biasLng=${city.lng}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        setResults(Array.isArray(json?.results) ? json.results : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }

  function clear() { setQueryRaw(""); setResults([]); }

  return { query, setQuery, results, setResults, searching, clear };
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ data, onChange, onNext, error }: { data: FormData; onChange: (k: keyof FormData, v: string) => void; onNext: () => void; error: string }) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.companyName.trim()) e.companyName = "Company name is required";
    if (!data.contactName.trim()) e.contactName = "Contact name is required";
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Valid email is required";
    if (!data.phone.trim()) e.phone = "Phone number is required";
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Step 1 of 5</p>
        <h2 className="text-3xl font-black text-black">Your Business</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">Tell us about your car hire company.</p>
      </div>
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={errors.companyName}><input value={data.companyName} onChange={e => onChange("companyName", e.target.value)} placeholder="Valencia Cars S.L." className={inputCls} /></Field>
        <Field label="Contact name" required error={errors.contactName}><input value={data.contactName} onChange={e => onChange("contactName", e.target.value)} placeholder="Juan Garcia" className={inputCls} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email address" required error={errors.email}><input type="email" value={data.email} onChange={e => onChange("email", e.target.value)} placeholder="info@valenciacars.com" autoComplete="email" className={inputCls} /></Field>
        <Field label="Phone number" required error={errors.phone}><input type="tel" value={data.phone} onChange={e => onChange("phone", e.target.value)} placeholder="+34 600 000 000" autoComplete="tel" className={inputCls} /></Field>
      </div>
      <Field label="Website"><input type="url" value={data.website} onChange={e => onChange("website", e.target.value)} placeholder="https://valenciacars.com" className={inputCls} /></Field>
      <button type="button" onClick={() => validate() && onNext()} className={btnPrimary}>Continue to Business Address →</button>
    </div>
  );
}

// ── Step 2 — Business Address ─────────────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string | number | null) => void; onNext: () => void; onBack: () => void }) {
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({});
  const [city,    setCity]    = useState<CityEntry>(CITIES[0]);
  const [selected, setSelected] = useState(false);
  const search = usePhotonSearch(city);

  function handleSelect(r: PhotonResult) {
    const street  = r.address_line1 || "";
    const poi     = r.label && r.label !== street ? r.label : "";
    const addr1   = poi ? `${poi}${street ? `, ${street}` : ""}` : (street || r.display_name.split(",")[0]);
    onChange("address1",   addr1);
    onChange("address2",   r.address_line2 || "");
    onChange("city",       r.city || "");
    onChange("province",   r.province || "");
    onChange("postcode",   r.postcode  || "");
    onChange("country",    r.country   || "Spain");
    onChange("addressLat", r.lat);
    onChange("addressLng", r.lng);
    search.clear();
    setSelected(true);
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.address1.trim()) e.address1 = "Address line 1 is required";
    if (!data.province.trim()) e.province  = "Province is required";
    if (!data.postcode.trim()) e.postcode  = "Postcode is required";
    if (!data.country.trim())  e.country   = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Step 2 of 5</p>
        <h2 className="text-3xl font-black text-black">Business Address</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">Your registered company address for correspondence and records.</p>
      </div>

      <PhotonSearch
        city={city} onCityChange={c => { setCity(c); search.clear(); }}
        query={search.query} onQueryChange={search.setQuery}
        results={search.results} onSelect={handleSelect}
        searching={search.searching}
        placeholder={`Search your business address in ${city.city}…`}
      />
      {selected && <p className="text-xs font-semibold text-green-700">✓ Address found — check fields below and correct if needed</p>}

      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.address1}><input value={data.address1} onChange={e => onChange("address1", e.target.value)} placeholder="Street name and number" className={inputCls} /></Field>
        <Field label="Address line 2"><input value={data.address2} onChange={e => onChange("address2", e.target.value)} placeholder="Apartment, unit, floor (optional)" className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town"><input value={data.city} onChange={e => onChange("city", e.target.value)} placeholder="Valencia" className={inputCls} /></Field>
          <Field label="Province / Region" required error={errors.province}><input value={data.province} onChange={e => onChange("province", e.target.value)} placeholder="Comunitat Valenciana" className={inputCls} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode" required error={errors.postcode}><input value={data.postcode} onChange={e => onChange("postcode", e.target.value)} placeholder="46001" className={inputCls} /></Field>
          <Field label="Country" required error={errors.country}><input value={data.country} onChange={e => onChange("country", e.target.value)} placeholder="Spain" className={inputCls} /></Field>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">Continue to Fleet Address →</button>
      </div>
    </div>
  );
}

// ── Step 3 — Fleet Address ────────────────────────────────────────────────────
function Step3({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string | number | null | boolean) => void; onNext: () => void; onBack: () => void }) {
  const [errors,         setErrors]         = useState<Partial<Record<keyof FormData, string>>>({});
  const [city,           setCity]           = useState<CityEntry>(CITIES[0]);
  const [selected,       setSelected]       = useState(false);
  const [sameAsBusiness, setSameAsBusiness] = useState(false);
  const search = usePhotonSearch(city);

  function handleSameAsBusiness(checked: boolean) {
    setSameAsBusiness(checked);
    if (checked) {
      onChange("fleetAddress1", data.address1); onChange("fleetAddress2", data.address2);
      onChange("fleetCity",     data.city);     onChange("fleetProvince", data.province);
      onChange("fleetPostcode", data.postcode); onChange("fleetCountry",  data.country);
      onChange("fleetLat",      data.addressLat); onChange("fleetLng",    data.addressLng);
    }
  }

  function handleSelect(r: PhotonResult) {
    const street  = r.address_line1 || "";
    const poi     = r.label && r.label !== street ? r.label : "";
    const addr1   = poi ? `${poi}${street ? `, ${street}` : ""}` : (street || r.display_name.split(",")[0]);
    onChange("fleetAddress1", addr1);
    onChange("fleetAddress2", r.address_line2 || "");
    onChange("fleetCity",     r.city || "");
    onChange("fleetProvince", r.province || "");
    onChange("fleetPostcode", r.postcode  || "");
    onChange("fleetCountry",  r.country   || "Spain");
    onChange("fleetLat",      r.lat);
    onChange("fleetLng",      r.lng);
    search.clear();
    setSelected(true);
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.fleetAddress1.trim()) e.fleetAddress1 = "Address line 1 is required";
    if (!data.fleetCountry.trim())  e.fleetCountry  = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Step 3 of 5</p>
        <h2 className="text-3xl font-black text-black">Fleet Base Address</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">Where your vehicles are based. Used to match you with nearby customers.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer bg-[#f0f0f0] px-4 py-3">
        <input type="checkbox" checked={sameAsBusiness} onChange={e => handleSameAsBusiness(e.target.checked)} className="h-4 w-4" />
        <div>
          <span className="text-sm font-black text-black">Same as business address</span>
          <p className="text-xs font-semibold text-black/50">Tick if your fleet is based at your registered business address</p>
        </div>
      </label>

      {!sameAsBusiness && (
        <>
          <PhotonSearch
            city={city} onCityChange={c => { setCity(c); search.clear(); }}
            query={search.query} onQueryChange={search.setQuery}
            results={search.results} onSelect={handleSelect}
            searching={search.searching}
            placeholder={`Search your fleet address in ${city.city}…`}
          />
          {selected && <p className="text-xs font-semibold text-green-700">✓ Address found — check fields below and correct if needed</p>}
        </>
      )}

      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.fleetAddress1}><input value={data.fleetAddress1} onChange={e => onChange("fleetAddress1", e.target.value)} placeholder="Street name and number" className={inputCls} /></Field>
        <Field label="Address line 2"><input value={data.fleetAddress2} onChange={e => onChange("fleetAddress2", e.target.value)} placeholder="Unit, depot, yard (optional)" className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town"><input value={data.fleetCity} onChange={e => onChange("fleetCity", e.target.value)} placeholder="Valencia" className={inputCls} /></Field>
          <Field label="Province / Region"><input value={data.fleetProvince} onChange={e => onChange("fleetProvince", e.target.value)} placeholder="Comunitat Valenciana" className={inputCls} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode"><input value={data.fleetPostcode} onChange={e => onChange("fleetPostcode", e.target.value)} placeholder="46001" className={inputCls} /></Field>
          <Field label="Country" required error={errors.fleetCountry}><input value={data.fleetCountry} onChange={e => onChange("fleetCountry", e.target.value)} placeholder="Spain" className={inputCls} /></Field>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">Continue to Password →</button>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function Step4({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPw, setShowPw] = useState(false);
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.password || data.password.length < 8) e.password = "Password must be at least 8 characters";
    if (data.password !== data.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e); return Object.keys(e).length === 0;
  }
  const strength = data.password.length === 0 ? 0 : data.password.length < 8 ? 1 : data.password.length < 12 ? 2 : 3;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Step 4 of 5</p>
        <h2 className="text-3xl font-black text-black">Set Your Password</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">Choose a strong password to secure your partner account.</p>
      </div>
      <Field label="Password" required error={errors.password}>
        <div className="relative">
          <input type={showPw ? "text" : "password"} value={data.password} onChange={e => onChange("password", e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" className={inputCls} />
          <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-black/50 hover:text-black">{showPw ? "Hide" : "Show"}</button>
        </div>
        {data.password.length > 0 && (
          <div className="mt-2 flex gap-1 items-center">
            {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 transition-colors ${i <= strength ? strength === 1 ? "bg-red-400" : strength === 2 ? "bg-yellow-400" : "bg-green-500" : "bg-[#f0f0f0]"}`} />)}
            <span className="text-xs font-black ml-2 text-black/40">{strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}</span>
          </div>
        )}
      </Field>
      <Field label="Confirm password" required error={errors.confirmPassword}>
        <input type={showPw ? "text" : "password"} value={data.confirmPassword} onChange={e => onChange("confirmPassword", e.target.value)} placeholder="Repeat your password" autoComplete="new-password" className={inputCls} />
        {data.confirmPassword && data.password === data.confirmPassword && <p className="mt-1 text-xs font-black text-green-600">Passwords match ✓</p>}
      </Field>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">Review & Submit →</button>
      </div>
    </div>
  );
}

// ── Step 5 ────────────────────────────────────────────────────────────────────
function Step5({ data, onChange, onBack, onSubmit, submitting, error, onCaptchaVerify, captchaKey }: {
  data: FormData; onChange: (k: keyof FormData, v: boolean) => void; onBack: () => void;
  onSubmit: () => void; submitting: boolean; error: string;
  onCaptchaVerify: (token: string) => void; captchaKey: number;
}) {
  const bizAddress   = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
  const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Company",          data.companyName],
    ["Contact",          data.contactName],
    ["Email",            data.email],
    ["Phone",            data.phone],
    ["Website",          data.website || "—"],
    ["Business address", bizAddress],
    ["Fleet address",    fleetAddress],
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Step 5 of 5</p>
        <h2 className="text-3xl font-black text-black">Review Your Details</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">Check everything looks correct before submitting.</p>
      </div>
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="bg-[#f0f0f0] p-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-36 shrink-0 font-black text-black/50 uppercase tracking-wide text-xs">{label}</span>
            <span className="font-semibold text-black">{value}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#f0f0f0] px-4 py-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.agreedToTerms} onChange={e => onChange("agreedToTerms", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold text-black">
            I agree to the{" "}
            <button type="button" onClick={downloadPartnerTermsPDF} className="font-black text-black underline hover:opacity-70">Camel Global Partner Terms & Conditions</button>
            {" "}and confirm all information is accurate.
          </span>
        </label>
      </div>
      <HCaptcha key={captchaKey} onVerify={onCaptchaVerify} onExpire={() => onCaptchaVerify("")} />
      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-black">What happens next?</p>
        <p className="mt-1 font-semibold">Your application will be reviewed by our team. You will receive an email confirmation shortly, and we will be in touch once your account has been approved.</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← Back</button>
        <button type="button" onClick={onSubmit} disabled={!data.agreedToTerms || submitting}
          className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {submitting ? "Submitting…" : "Create my account →"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartnerSignupPage() {
  const router = useRouter();
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState<FormData>(EMPTY);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey,   setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);
  function resetCaptcha() { setCaptchaToken(""); setCaptchaKey(k => k + 1); }
  function setField(k: keyof FormData, v: string | number | boolean | null) { setData(prev => ({ ...prev, [k]: v })); }

  async function submit() {
    if (!captchaToken) { setError("Please complete the CAPTCHA."); return; }
    const captchaRes = await fetch("/api/auth/verify-captcha", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: captchaToken }),
    });
    if (!captchaRes.ok) { setError("CAPTCHA verification failed. Please try again."); resetCaptcha(); return; }
    setSubmitting(true); setError("");
    try {
      const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
      const bizAddress   = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
      const res = await fetch("/api/partner/complete-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName, contactName: data.contactName, email: data.email,
          phone: data.phone, website: data.website, password: data.password,
          address1: data.address1, address2: data.address2, city: data.city,
          province: data.province, postcode: data.postcode, country: data.country,
          addressLat: data.addressLat, addressLng: data.addressLng, address: bizAddress,
          baseAddress: fleetAddress, baseAddress1: data.fleetAddress1, baseAddress2: data.fleetAddress2,
          baseCity: data.fleetCity, baseProvince: data.fleetProvince, basePostcode: data.fleetPostcode,
          baseCountry: data.fleetCountry, baseLat: data.fleetLat, baseLng: data.fleetLng,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
      router.replace("/partner/application-submitted");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      resetCaptcha(); setStep(5);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/"><Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" /></Link>
          <Link href="/partner/login" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">Partner Login</Link>
        </div>
      </header>
      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Become a Partner</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Join Camel Global.</h1>
          <p className="mt-3 text-base font-semibold text-white/70">Apply to list your car hire company on the platform. It takes less than 5 minutes.</p>
        </div>
      </div>
      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white p-8">
            <ProgressBar step={step} />
            {step === 1 && <Step1 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(2); }} error={error} />}
            {step === 2 && <Step2 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(3); }} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(4); }} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 data={data} onChange={(k, v) => setField(k, v as string)} onNext={() => { setError(""); setStep(5); }} onBack={() => setStep(3)} />}
            {step === 5 && <Step5 data={data} onChange={(k, v) => setField(k, v as boolean)} onBack={() => setStep(4)} onSubmit={submit} submitting={submitting} error={error} onCaptchaVerify={handleCaptcha} captchaKey={captchaKey} />}
          </div>
          <p className="mt-6 text-center text-sm font-semibold text-black/50">
            Already have an account?{" "}
            <Link href="/partner/login" className="font-black text-black hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}