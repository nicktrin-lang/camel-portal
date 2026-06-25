"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@/app/components/HCaptcha";
import { CITIES, citiesByCountry, type CityEntry } from "@/lib/cities";
import { downloadPartnerTermsPDF } from "@/lib/portal/partnerTerms";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLanguage, Locale } from "@/lib/i18n/LanguageContext";

const inputCls     = "w-full bg-[#f0f0f0] px-4 py-3 text-base font-medium text-black outline-none focus:bg-[#e8e8e8] transition-colors placeholder:text-black/40";
const labelCls     = "block text-xs font-black uppercase tracking-widest text-black mb-2";
const btnPrimary   = "w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity";
const btnSecondary = "flex-1 border border-black/20 py-4 text-base font-black text-black hover:bg-[#f0f0f0] transition-colors";

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

/** Compact EN/ES toggle for tight mobile headers */
function CompactLanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center border border-white/20 overflow-hidden">
      {options.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            "px-2 py-1.5 text-xs font-black transition-colors",
            i < options.length - 1 ? "border-r border-white/20" : "",
            locale === code
              ? "bg-[#ff7a00] text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ step, stepLabels }: { step: number; stepLabels: string[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {stepLabels.map((label, i) => {
          const done = i + 1 < step, active = i + 1 === step;
          return (
            <div key={i} className={`flex items-center ${i < stepLabels.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-8 h-8 flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                done ? "bg-green-500 text-white" : active ? "bg-[#ff7a00] text-white" : "bg-[#f0f0f0] text-black/40"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`h-1 flex-1 mx-1 transition-colors ${done ? "bg-green-500" : "bg-[#f0f0f0]"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center">
        {stepLabels.map((label, i) => {
          const done = i + 1 < step, active = i + 1 === step;
          return (
            <div key={i} className={`${i < stepLabels.length - 1 ? "flex-1" : ""} min-w-0`}>
              {active && <span className="text-xs font-black uppercase tracking-wide text-[#ff7a00] truncate block">{label}</span>}
              {done  && <span className="text-xs font-black uppercase tracking-wide text-green-600 truncate hidden sm:block">{label}</span>}
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

function PhotonSearch({ city, onCityChange, query, onQueryChange, results, onSelect, searching, placeholder }: {
  city: CityEntry; onCityChange: (c: CityEntry) => void;
  query: string; onQueryChange: (q: string) => void;
  results: PhotonResult[]; onSelect: (r: PhotonResult) => void;
  searching: boolean; placeholder?: string;
}) {
  const { t } = useTranslation();
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
                    lat:           pos.coords.latitude, lng: pos.coords.longitude,
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
          {t("signup.step2.useLocation")}
        </button>
      </div>
      <div className="bg-black px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-black uppercase tracking-widest text-white">{t("signup.step2.searchingNear")}</span>
        <select value={`${city.country}|${city.city}`}
          onChange={e => { const [country, c] = e.target.value.split("|"); const found = CITIES.find(x => x.country === country && x.city === c); if (found) onCityChange(found); }}
          className="bg-[#ff7a00] text-white font-black text-sm px-3 py-1.5 outline-none cursor-pointer appearance-none">
          {Object.entries(grouped).map(([country, cities]) => (
            <optgroup key={country} label={country}>
              {cities.map(c => <option key={c.city} value={`${c.country}|${c.city}`}>{c.city}, {c.country}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="relative">
        <input type="text" value={query} onChange={e => onQueryChange(e.target.value)}
          placeholder={placeholder || `Search in ${city.city}…`} className={inputCls} />
        {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/30">{t("common.searching")}</span>}
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

function usePhotonSearch(city: CityEntry) {
  const [query, setQueryRaw]  = useState("");
  const [results, setResults] = useState<PhotonResult[]>([]);
  const [searching, setS]     = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setQuery(q: string) {
    setQueryRaw(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setS(true);
      try {
        const res  = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&biasLat=${city.lat}&biasLng=${city.lng}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        setResults(Array.isArray(json?.results) ? json.results : []);
      } catch { setResults([]); } finally { setS(false); }
    }, 350);
  }
  function clear() { setQueryRaw(""); setResults([]); }
  return { query, setQuery, results, setResults, searching, clear };
}

function Step1({ data, onChange, onNext, error }: { data: FormData; onChange: (k: keyof FormData, v: string) => void; onNext: () => void; error: string }) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.companyName.trim()) e.companyName = t("signup.step1.err.companyName");
    if (!data.contactName.trim()) e.contactName = t("signup.step1.err.contactName");
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = t("signup.step1.err.email");
    if (!data.phone.trim()) e.phone = t("signup.step1.err.phone");
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("signup.step1.tag")}</p>
        <h2 className="text-3xl font-black text-black">{t("signup.step1.title")}</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">{t("signup.step1.subtitle")}</p>
      </div>
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("signup.step1.companyName")} required error={errors.companyName}><input value={data.companyName} onChange={e => onChange("companyName", e.target.value)} placeholder={t("signup.step1.companyName.placeholder")} className={inputCls} /></Field>
        <Field label={t("signup.step1.contactName")} required error={errors.contactName}><input value={data.contactName} onChange={e => onChange("contactName", e.target.value)} placeholder={t("signup.step1.contactName.placeholder")} className={inputCls} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("signup.step1.email")} required error={errors.email}><input type="email" value={data.email} onChange={e => onChange("email", e.target.value)} placeholder={t("signup.step1.email.placeholder")} autoComplete="email" className={inputCls} /></Field>
        <Field label={t("signup.step1.phone")} required error={errors.phone}><input type="tel" value={data.phone} onChange={e => onChange("phone", e.target.value)} placeholder={t("signup.step1.phone.placeholder")} autoComplete="tel" className={inputCls} /></Field>
      </div>
      <Field label={t("signup.step1.website")}><input type="url" value={data.website} onChange={e => onChange("website", e.target.value)} placeholder={t("signup.step1.website.placeholder")} className={inputCls} /></Field>
      <button type="button" onClick={() => validate() && onNext()} className={btnPrimary}>{t("signup.step1.cta")}</button>
    </div>
  );
}

function Step2({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string | number | null) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [errors, setErrors]   = useState<Partial<Record<keyof FormData, string>>>({});
  const [city, setCity]       = useState<CityEntry>(CITIES[0]);
  const [selected, setSelected] = useState(false);
  const search = usePhotonSearch(city);
  function handleSelect(r: PhotonResult) {
    const street = r.address_line1 || ""; const poi = r.label && r.label !== street ? r.label : "";
    const addr1  = poi ? `${poi}${street ? `, ${street}` : ""}` : (street || r.display_name.split(",")[0]);
    onChange("address1", addr1); onChange("address2", r.address_line2 || ""); onChange("city", r.city || "");
    onChange("province", r.province || ""); onChange("postcode", r.postcode || ""); onChange("country", r.country || "Spain");
    onChange("addressLat", r.lat); onChange("addressLng", r.lng); search.clear(); setSelected(true);
  }
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.address1.trim()) e.address1 = t("signup.step2.err.addr1");
    if (!data.province.trim()) e.province = t("signup.step2.err.province");
    if (!data.postcode.trim()) e.postcode = t("signup.step2.err.postcode");
    if (!data.country.trim())  e.country  = t("signup.step2.err.country");
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("signup.step2.tag")}</p>
        <h2 className="text-3xl font-black text-black">{t("signup.step2.title")}</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">{t("signup.step2.subtitle")}</p>
      </div>
      <PhotonSearch city={city} onCityChange={c => { setCity(c); search.clear(); }}
        query={search.query} onQueryChange={search.setQuery} results={search.results}
        onSelect={handleSelect} searching={search.searching} placeholder={`${t("signup.step2.searchingNear")} ${city.city}…`} />
      {selected && <p className="text-xs font-semibold text-green-700">{t("signup.step2.addressFound")}</p>}
      <div className="space-y-4">
        <Field label={t("signup.step2.addr1")} required error={errors.address1}><input value={data.address1} onChange={e => onChange("address1", e.target.value)} placeholder={t("signup.step2.addr1.placeholder")} className={inputCls} /></Field>
        <Field label={t("signup.step2.addr2")}><input value={data.address2} onChange={e => onChange("address2", e.target.value)} placeholder={t("signup.step2.addr2.placeholder")} className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signup.step2.city")}><input value={data.city} onChange={e => onChange("city", e.target.value)} placeholder={t("signup.step2.city.placeholder")} className={inputCls} /></Field>
          <Field label={t("signup.step2.province")} required error={errors.province}><input value={data.province} onChange={e => onChange("province", e.target.value)} placeholder={t("signup.step2.province.placeholder")} className={inputCls} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signup.step2.postcode")} required error={errors.postcode}><input value={data.postcode} onChange={e => onChange("postcode", e.target.value)} placeholder={t("signup.step2.postcode.placeholder")} className={inputCls} /></Field>
          <Field label={t("signup.step2.country")} required error={errors.country}><input value={data.country} onChange={e => onChange("country", e.target.value)} placeholder={t("signup.step2.country.placeholder")} className={inputCls} /></Field>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← {t("common.back")}</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">{t("signup.step2.cta")}</button>
      </div>
    </div>
  );
}

function Step3({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string | number | null | boolean) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [errors, setErrors]             = useState<Partial<Record<keyof FormData, string>>>({});
  const [city, setCity]                 = useState<CityEntry>(CITIES[0]);
  const [selected, setSelected]         = useState(false);
  const [sameAsBusiness, setSameAsBiz]  = useState(false);
  const search = usePhotonSearch(city);
  function handleSameAsBusiness(checked: boolean) {
    setSameAsBiz(checked);
    if (checked) {
      onChange("fleetAddress1", data.address1); onChange("fleetAddress2", data.address2);
      onChange("fleetCity", data.city); onChange("fleetProvince", data.province);
      onChange("fleetPostcode", data.postcode); onChange("fleetCountry", data.country);
      onChange("fleetLat", data.addressLat); onChange("fleetLng", data.addressLng);
    }
  }
  function handleSelect(r: PhotonResult) {
    const street = r.address_line1 || ""; const poi = r.label && r.label !== street ? r.label : "";
    const addr1  = poi ? `${poi}${street ? `, ${street}` : ""}` : (street || r.display_name.split(",")[0]);
    onChange("fleetAddress1", addr1); onChange("fleetAddress2", r.address_line2 || "");
    onChange("fleetCity", r.city || ""); onChange("fleetProvince", r.province || "");
    onChange("fleetPostcode", r.postcode || ""); onChange("fleetCountry", r.country || "Spain");
    onChange("fleetLat", r.lat); onChange("fleetLng", r.lng); search.clear(); setSelected(true);
  }
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.fleetAddress1.trim()) e.fleetAddress1 = t("signup.step3.err.addr1");
    if (!data.fleetCountry.trim())  e.fleetCountry  = t("signup.step3.err.country");
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("signup.step3.tag")}</p>
        <h2 className="text-3xl font-black text-black">{t("signup.step3.title")}</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">{t("signup.step3.subtitle")}</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer bg-[#f0f0f0] px-4 py-3">
        <input type="checkbox" checked={sameAsBusiness} onChange={e => handleSameAsBusiness(e.target.checked)} className="h-4 w-4" />
        <div>
          <span className="text-sm font-black text-black">{t("signup.step3.sameAsBusiness")}</span>
          <p className="text-xs font-semibold text-black/50">{t("signup.step3.sameAsBusinessHint")}</p>
        </div>
      </label>
      {!sameAsBusiness && (
        <>
          <PhotonSearch city={city} onCityChange={c => { setCity(c); search.clear(); }}
            query={search.query} onQueryChange={search.setQuery} results={search.results}
            onSelect={handleSelect} searching={search.searching} placeholder={`${t("signup.step2.searchingNear")} ${city.city}…`} />
          {selected && <p className="text-xs font-semibold text-green-700">{t("signup.step2.addressFound")}</p>}
        </>
      )}
      <div className="space-y-4">
        <Field label={t("signup.step2.addr1")} required error={errors.fleetAddress1}><input value={data.fleetAddress1} onChange={e => onChange("fleetAddress1", e.target.value)} placeholder={t("signup.step2.addr1.placeholder")} className={inputCls} /></Field>
        <Field label={t("signup.step2.addr2")}><input value={data.fleetAddress2} onChange={e => onChange("fleetAddress2", e.target.value)} placeholder={t("signup.step3.addr2.placeholder")} className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signup.step2.city")}><input value={data.fleetCity} onChange={e => onChange("fleetCity", e.target.value)} placeholder={t("signup.step2.city.placeholder")} className={inputCls} /></Field>
          <Field label={t("signup.step2.province")}><input value={data.fleetProvince} onChange={e => onChange("fleetProvince", e.target.value)} placeholder={t("signup.step2.province.placeholder")} className={inputCls} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("signup.step2.postcode")}><input value={data.fleetPostcode} onChange={e => onChange("fleetPostcode", e.target.value)} placeholder={t("signup.step2.postcode.placeholder")} className={inputCls} /></Field>
          <Field label={t("signup.step2.country")} required error={errors.fleetCountry}><input value={data.fleetCountry} onChange={e => onChange("fleetCountry", e.target.value)} placeholder={t("signup.step2.country.placeholder")} className={inputCls} /></Field>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← {t("common.back")}</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">{t("signup.step3.cta")}</button>
      </div>
    </div>
  );
}

function Step4({ data, onChange, onNext, onBack }: { data: FormData; onChange: (k: keyof FormData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPw, setShowPw] = useState(false);
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.password || data.password.length < 8) e.password = t("signup.step4.err.password");
    if (data.password !== data.confirmPassword) e.confirmPassword = t("signup.step4.err.confirm");
    setErrors(e); return Object.keys(e).length === 0;
  }
  const strength = data.password.length === 0 ? 0 : data.password.length < 8 ? 1 : data.password.length < 12 ? 2 : 3;
  const strengthLabel = strength === 1 ? t("signup.step4.weak") : strength === 2 ? t("signup.step4.good") : t("signup.step4.strong");
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("signup.step4.tag")}</p>
        <h2 className="text-3xl font-black text-black">{t("signup.step4.title")}</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">{t("signup.step4.subtitle")}</p>
      </div>
      <Field label={t("signup.step4.password")} required error={errors.password}>
        <div className="relative">
          <input type={showPw ? "text" : "password"} value={data.password} onChange={e => onChange("password", e.target.value)} placeholder={t("signup.step4.password.placeholder")} autoComplete="new-password" className={inputCls} />
          <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-black/50 hover:text-black">{showPw ? t("signup.step4.hide") : t("signup.step4.show")}</button>
        </div>
        {data.password.length > 0 && (
          <div className="mt-2 flex gap-1 items-center">
            {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 transition-colors ${i <= strength ? strength === 1 ? "bg-red-400" : strength === 2 ? "bg-yellow-400" : "bg-green-500" : "bg-[#f0f0f0]"}`} />)}
            <span className="text-xs font-black ml-2 text-black/40">{strengthLabel}</span>
          </div>
        )}
      </Field>
      <Field label={t("signup.step4.confirm")} required error={errors.confirmPassword}>
        <input type={showPw ? "text" : "password"} value={data.confirmPassword} onChange={e => onChange("confirmPassword", e.target.value)} placeholder={t("signup.step4.confirm.placeholder")} autoComplete="new-password" className={inputCls} />
        {data.confirmPassword && data.password === data.confirmPassword && <p className="mt-1 text-xs font-black text-green-600">{t("signup.step4.match")}</p>}
      </Field>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← {t("common.back")}</button>
        <button type="button" onClick={() => validate() && onNext()} className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 transition-opacity">{t("signup.step4.cta")}</button>
      </div>
    </div>
  );
}

function Step5({ data, onChange, onBack, onSubmit, submitting, error, onCaptchaVerify, captchaKey }: {
  data: FormData; onChange: (k: keyof FormData, v: boolean) => void; onBack: () => void;
  onSubmit: () => void; submitting: boolean; error: string;
  onCaptchaVerify: (token: string) => void; captchaKey: number;
}) {
  const { t, locale } = useTranslation();
  const bizAddress   = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
  const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    [t("signup.step5.company"),      data.companyName],
    [t("signup.step5.contact"),      data.contactName],
    [t("signup.step5.email"),        data.email],
    [t("signup.step5.phone"),        data.phone],
    [t("signup.step5.website"),      data.website || "—"],
    [t("signup.step5.bizAddress"),   bizAddress],
    [t("signup.step5.fleetAddress"), fleetAddress],
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">{t("signup.step5.tag")}</p>
        <h2 className="text-3xl font-black text-black">{t("signup.step5.title")}</h2>
        <p className="mt-1 text-sm font-semibold text-black/50">{t("signup.step5.subtitle")}</p>
      </div>
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="bg-[#f0f0f0] p-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-32 shrink-0 font-black text-black/50 uppercase tracking-wide text-xs">{label}</span>
            <span className="font-semibold text-black break-words min-w-0">{value}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#f0f0f0] px-4 py-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.agreedToTerms} onChange={e => onChange("agreedToTerms", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold text-black">
            {t("signup.step5.terms")}{" "}
            <button type="button" onClick={() => downloadPartnerTermsPDF(locale as "en" | "es")} className="font-black text-black underline hover:opacity-70">{t("signup.step5.termsLink")}</button>
            {" "}{t("signup.step5.termsEnd")}
          </span>
        </label>
      </div>
      <HCaptcha key={captchaKey} onVerify={onCaptchaVerify} onExpire={() => onCaptchaVerify("")} />
      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-black">{t("signup.step5.whatNext")}</p>
        <p className="mt-1 font-semibold">{t("signup.step5.whatNextBody")}</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={btnSecondary}>← {t("common.back")}</button>
        <button type="button" onClick={onSubmit} disabled={!data.agreedToTerms || submitting}
          className="flex-[2] bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {submitting ? t("common.submitting") : t("signup.step5.cta")}
        </button>
      </div>
    </div>
  );
}

export default function PartnerSignupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep]               = useState(1);

  useEffect(() => { trackSignupStep(1, "company_details"); }, []);

  function trackSignupStep(stepNum: number, stepName: string) {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "signup_step", {
        event_category: "partner_signup",
        step_number: stepNum,
        step_name: stepName,
      });
    }
  }
  const [data, setData]               = useState<FormData>(EMPTY);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey]   = useState(0);

  const handleCaptcha = useCallback((t: string) => setCaptchaToken(t), []);
  function resetCaptcha() { setCaptchaToken(""); setCaptchaKey(k => k + 1); }
  function setField(k: keyof FormData, v: string | number | boolean | null) { setData(prev => ({ ...prev, [k]: v })); }

  const stepLabels = [
    t("signup.step.yourBusiness"),
    t("signup.step.businessAddress"),
    t("signup.step.fleetAddress"),
    t("signup.step.password"),
    t("signup.step.review"),
  ];

  async function submit() {
    if (!captchaToken) { setError(t("signup.step5.err.captcha")); return; }
    const captchaRes = await fetch("/api/auth/verify-captcha", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: captchaToken }),
    });
    if (!captchaRes.ok) { setError(t("signup.step5.err.captchaFail")); resetCaptcha(); return; }
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
      if (!res.ok) throw new Error(json?.error || t("common.error"));
      router.replace("/partner/application-submitted");
    } catch (e: any) {
      setError(e?.message || t("common.error"));
      resetCaptcha(); setStep(5);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/"><Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" /></Link>
          <div className="flex items-center gap-3">
            <CompactLanguageToggle />
            <Link href="/partner/login" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">{t("common.partnerLogin")}</Link>
          </div>
        </div>
      </header>
      <div className="w-full bg-black px-4 sm:px-6 pb-12 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">{t("signup.tag")}</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">{t("signup.title")}</h1>
          <p className="mt-3 text-base font-semibold text-white/70">{t("signup.subtitle")}</p>
        </div>
      </div>
      <div className="w-full bg-[#f0f0f0] px-3 sm:px-6 py-8 flex-1">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white p-4 sm:p-8">
            <ProgressBar step={step} stepLabels={stepLabels} />
            {step === 1 && <Step1 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(2); trackSignupStep(2, "business_address"); }} error={error} />}
            {step === 2 && <Step2 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(3); trackSignupStep(3, "fleet_address"); }} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(4); trackSignupStep(4, "password"); }} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 data={data} onChange={(k, v) => setField(k, v as string)} onNext={() => { setError(""); setStep(5); trackSignupStep(5, "terms"); }} onBack={() => setStep(3)} />}
            {step === 5 && <Step5 data={data} onChange={(k, v) => setField(k, v as boolean)} onBack={() => setStep(4)} onSubmit={submit} submitting={submitting} error={error} onCaptchaVerify={handleCaptcha} captchaKey={captchaKey} />}
          </div>
          <p className="mt-6 text-center text-sm font-semibold text-black/50">
            {t("common.alreadyHaveAccount")}{" "}
            <Link href="/partner/login" className="font-black text-black hover:underline">{t("common.signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}