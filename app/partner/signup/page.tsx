"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string; house_number?: string; suburb?: string; city?: string;
    town?: string; village?: string; state?: string; postcode?: string;
    country?: string;
  };
};

const COUNTRIES = [
  "Spain", "United Kingdom", "Gibraltar", "Ireland", "Portugal",
  "France", "Italy", "Germany", "Netherlands", "Belgium",
  "United States", "Canada", "Australia", "Other",
];

function parseSuggestion(s: Suggestion) {
  const a = s.address ?? {};
  const road = [a.house_number, a.road].filter(Boolean).join(" ");
  const area = a.suburb || a.city || a.town || a.village || "";
  return {
    address1: road || s.display_name.split(",")[0] || "",
    address2: area,
    province: a.state || "",
    postcode: a.postcode || "",
    country: a.country || "",
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lon),
    display: s.display_name,
  };
}

const STEP_LABELS = ["Your Business", "Business Address", "Fleet Address", "Password", "Review"];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
              i + 1 < step ? "bg-green-500 text-white" :
              i + 1 === step ? "bg-[#ff7a00] text-white" :
              "bg-slate-200 text-slate-500"
            }`}>
              {i + 1 < step ? "✓" : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-1 flex-1 mx-1 rounded transition-colors ${i + 1 < step ? "bg-green-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex text-xs text-slate-500 mt-1">
        <div className="flex items-start mt-1">{STEP_LABELS.map((l, i) => (<div key={l} className="flex flex-col items-center flex-1"><span className="text-xs text-slate-500 text-center leading-tight">{l}</span></div>))}</div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#003768] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0f4f8a] focus:ring-2 focus:ring-[#0f4f8a]/10 ${className}`}
      {...props}
    />
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768]">
      {children}
    </div>
  );
}

function AddressSearch({ onSelect, placeholder }: {
  onSelect: (r: ReturnType<typeof parseSuggestion>) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  function search(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.length < 3) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setSuggestions(data); setOpen(true);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }

  function select(s: Suggestion) {
    const parsed = parseSuggestion(s);
    setQuery(parsed.display);
    setSuggestions([]); setOpen(false);
    onSelect(parsed);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input value={query} onChange={e => search(e.target.value)}
          placeholder={placeholder ?? "Search for your address..."}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f4f8a] border-t-transparent" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <button key={i} type="button"
              className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl border-b border-black/5 last:border-0"
              onMouseDown={() => select(s)}>
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type FormData = {
  companyName: string; contactName: string; email: string;
  phone: string; website: string;
  // Business address
  address1: string; address2: string; city: string;
  province: string; postcode: string; country: string;
  addressLat: number | null; addressLng: number | null;
  // Fleet address
  fleetAddress1: string; fleetAddress2: string; fleetCity: string;
  fleetProvince: string; fleetPostcode: string; fleetCountry: string;
  fleetLat: number | null; fleetLng: number | null;
  // Auth
  password: string; confirmPassword: string;
  agreedToTerms: boolean;
};

const EMPTY: FormData = {
  companyName: "", contactName: "", email: "", phone: "", website: "",
  address1: "", address2: "", city: "", province: "", postcode: "", country: "Spain",
  addressLat: null, addressLng: null,
  fleetAddress1: "", fleetAddress2: "", fleetCity: "", fleetProvince: "",
  fleetPostcode: "", fleetCountry: "Spain", fleetLat: null, fleetLng: null,
  password: "", confirmPassword: "", agreedToTerms: false,
};

// Step 1 — Business Details
function Step1({ data, onChange, onNext, error }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void; error: string;
}) {
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
        <h2 className="text-2xl font-bold text-[#003768]">Your Business</h2>
        <p className="mt-1 text-slate-500">Tell us about your car hire company.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={errors.companyName}>
          <Input value={data.companyName} onChange={e => onChange("companyName", e.target.value)} placeholder="Valencia Cars S.L." />
        </Field>
        <Field label="Contact name" required error={errors.contactName}>
          <Input value={data.contactName} onChange={e => onChange("contactName", e.target.value)} placeholder="Juan Garcia" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email address" required error={errors.email}>
          <Input type="email" value={data.email} onChange={e => onChange("email", e.target.value)} placeholder="info@valenciacars.com" autoComplete="email" />
        </Field>
        <Field label="Phone number" required error={errors.phone}>
          <Input type="tel" value={data.phone} onChange={e => onChange("phone", e.target.value)} placeholder="+34 600 000 000" autoComplete="tel" />
        </Field>
      </div>
      <Field label="Website">
        <Input type="url" value={data.website} onChange={e => onChange("website", e.target.value)} placeholder="https://valenciacars.com" />
      </Field>
      <button type="button" onClick={() => validate() && onNext()}
        className="w-full rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
        Continue to Business Address
      </button>
    </div>
  );
}

// Step 2 — Business Address
function Step2({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string | number | null) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [searchDone, setSearchDone] = useState(false);

  function handleSelect(r: ReturnType<typeof parseSuggestion>) {
    onChange("address1", r.address1);
    onChange("address2", r.address2);
    onChange("city", r.address2 || "");
    onChange("province", r.province);
    onChange("postcode", r.postcode);
    onChange("country", r.country || "Spain");
    onChange("addressLat", r.lat);
    onChange("addressLng", r.lng);
    setSearchDone(true);
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.address1.trim()) e.address1 = "Address line 1 is required";
    if (!data.province.trim()) e.province = "Province is required";
    if (!data.postcode.trim()) e.postcode = "Postcode is required";
    if (!data.country.trim()) e.country = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Business Address</h2>
        <p className="mt-1 text-slate-500">Your registered company address for correspondence and records.</p>
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">Search your address</p>
        <AddressSearch onSelect={handleSelect} placeholder="e.g. Calle Mayor 12, Valencia..." />
        {searchDone && <p className="mt-2 text-xs text-green-700 font-medium">Address found — check fields below and correct if needed</p>}
      </InfoBox>
      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.address1}>
          <Input value={data.address1} onChange={e => onChange("address1", e.target.value)} placeholder="Street name and number" />
        </Field>
        <Field label="Address line 2">
          <Input value={data.address2} onChange={e => onChange("address2", e.target.value)} placeholder="Apartment, unit, floor (optional)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town">
            <Input value={data.city} onChange={e => onChange("city", e.target.value)} placeholder="Valencia" />
          </Field>
          <Field label="Province / Region" required error={errors.province}>
            <Input value={data.province} onChange={e => onChange("province", e.target.value)} placeholder="Comunitat Valenciana" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode" required error={errors.postcode}>
            <Input value={data.postcode} onChange={e => onChange("postcode", e.target.value)} placeholder="46001" />
          </Field>
          <Field label="Country" required error={errors.country}>
            <select value={data.country} onChange={e => onChange("country", e.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none focus:border-[#0f4f8a]">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Continue to Fleet Address
        </button>
      </div>
    </div>
  );
}

// Step 3 — Fleet Base Address
function Step3({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string | number | null | boolean) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [searchDone, setSearchDone] = useState(false);
  const [sameAsBusiness, setSameAsBusiness] = useState(false);

  function handleSameAsBusiness(checked: boolean) {
    setSameAsBusiness(checked);
    if (checked) {
      onChange("fleetAddress1", data.address1);
      onChange("fleetAddress2", data.address2);
      onChange("fleetCity", data.city);
      onChange("fleetProvince", data.province);
      onChange("fleetPostcode", data.postcode);
      onChange("fleetCountry", data.country);
      onChange("fleetLat", data.addressLat);
      onChange("fleetLng", data.addressLng);
    }
  }

  function handleSelect(r: ReturnType<typeof parseSuggestion>) {
    onChange("fleetAddress1", r.address1);
    onChange("fleetAddress2", r.address2);
    onChange("fleetCity", r.address2 || "");
    onChange("fleetProvince", r.province);
    onChange("fleetPostcode", r.postcode);
    onChange("fleetCountry", r.country || "Spain");
    onChange("fleetLat", r.lat);
    onChange("fleetLng", r.lng);
    setSearchDone(true);
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.fleetAddress1.trim()) e.fleetAddress1 = "Address line 1 is required";
    if (!data.fleetCountry.trim()) e.fleetCountry = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Fleet Base Address</h2>
        <p className="mt-1 text-slate-500">Where your vehicles are based and dispatched from. This is used to match you with nearby customers.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3">
        <input type="checkbox" checked={sameAsBusiness} onChange={e => handleSameAsBusiness(e.target.checked)}
          className="h-4 w-4 accent-[#003768]" />
        <div>
          <span className="text-sm font-semibold text-[#003768]">Same as business address</span>
          <p className="text-xs text-slate-500">Tick if your fleet is based at your registered business address</p>
        </div>
      </label>

      {!sameAsBusiness && (
        <InfoBox>
          <p className="font-semibold mb-1">Search your fleet address</p>
          <AddressSearch onSelect={handleSelect} placeholder="e.g. Cami del Coscollar, Manises..." />
          {searchDone && <p className="mt-2 text-xs text-green-700 font-medium">Address found — check fields below and correct if needed</p>}
        </InfoBox>
      )}

      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.fleetAddress1}>
          <Input value={data.fleetAddress1} onChange={e => onChange("fleetAddress1", e.target.value)} placeholder="Street name and number" />
        </Field>
        <Field label="Address line 2">
          <Input value={data.fleetAddress2} onChange={e => onChange("fleetAddress2", e.target.value)} placeholder="Unit, depot, yard (optional)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town">
            <Input value={data.fleetCity} onChange={e => onChange("fleetCity", e.target.value)} placeholder="Valencia" />
          </Field>
          <Field label="Province / Region">
            <Input value={data.fleetProvince} onChange={e => onChange("fleetProvince", e.target.value)} placeholder="Comunitat Valenciana" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode">
            <Input value={data.fleetPostcode} onChange={e => onChange("fleetPostcode", e.target.value)} placeholder="46001" />
          </Field>
          <Field label="Country" required error={errors.fleetCountry}>
            <select value={data.fleetCountry} onChange={e => onChange("fleetCountry", e.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none focus:border-[#0f4f8a]">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Continue to Password
        </button>
      </div>
    </div>
  );
}

// Step 4 — Password
function Step4({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
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
        <h2 className="text-2xl font-bold text-[#003768]">Set Your Password</h2>
        <p className="mt-1 text-slate-500">Choose a strong password to secure your partner account.</p>
      </div>
      <Field label="Password" required error={errors.password}>
        <div className="relative">
          <Input type={showPw ? "text" : "password"} value={data.password}
            onChange={e => onChange("password", e.target.value)}
            placeholder="Minimum 8 characters" autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700">
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        {data.password.length > 0 && (
          <div className="mt-2 flex gap-1 items-center">
            {[1,2,3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= strength ? strength === 1 ? "bg-red-400" : strength === 2 ? "bg-yellow-400" : "bg-green-500" : "bg-slate-200"
              }`} />
            ))}
            <span className="text-xs ml-2 text-slate-500">
              {strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}
            </span>
          </div>
        )}
      </Field>
      <Field label="Confirm password" required error={errors.confirmPassword}>
        <Input type={showPw ? "text" : "password"} value={data.confirmPassword}
          onChange={e => onChange("confirmPassword", e.target.value)}
          placeholder="Repeat your password" autoComplete="new-password" />
        {data.confirmPassword && data.password === data.confirmPassword && (
          <p className="mt-1 text-xs text-green-600 font-medium">Passwords match</p>
        )}
      </Field>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Review & Submit
        </button>
      </div>
    </div>
  );
}

// Step 5 — Review & Submit
function Step5({ data, onChange, onBack, onSubmit, submitting, error }: {
  data: FormData; onChange: (k: keyof FormData, v: boolean) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean; error: string;
}) {
  const bizAddress = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
  const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");

  const rows: [string, string][] = [
    ["Company", data.companyName],
    ["Contact", data.contactName],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Website", data.website || "—"],
    ["Business Address", bizAddress],
    ["Fleet Address", fleetAddress],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Review Your Details</h2>
        <p className="mt-1 text-slate-500">Check everything looks correct before submitting.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-2xl border border-black/5 bg-slate-50 p-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-32 shrink-0 font-semibold text-slate-500">{label}</span>
            <span className="text-slate-800">{value}</span>
          </div>
        ))}
      </div>
      <InfoBox>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.agreedToTerms}
            onChange={e => onChange("agreedToTerms", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#ff7a00]" />
          <span className="text-sm text-slate-700">
            I agree to the{" "}
            <a href="/partner/terms" target="_blank" className="font-semibold text-[#003768] underline">
              Camel Global Partner Terms & Conditions
            </a>{" "}
            and confirm all information is accurate.
          </span>
        </label>
      </InfoBox>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">What happens next?</p>
        <p className="mt-1">Your application will be reviewed by our team. You will receive an email confirmation shortly, and we will be in touch once your account has been approved.</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={onSubmit}
          disabled={!data.agreedToTerms || submitting}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-50">
          {submitting ? "Submitting..." : "Create my account"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PartnerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setField(k: keyof FormData, v: string | number | boolean | null) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setSubmitting(true); setError("");
    try {
      const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
      const bizAddress = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");

      const res = await fetch("/api/partner/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          website: data.website,
          password: data.password,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          province: data.province,
          postcode: data.postcode,
          country: data.country,
          addressLat: data.addressLat,
          addressLng: data.addressLng,
          address: bizAddress,
          baseAddress: fleetAddress,
          baseAddress1: data.fleetAddress1,
          baseAddress2: data.fleetAddress2,
          baseCity: data.fleetCity,
          baseProvince: data.fleetProvince,
          basePostcode: data.fleetPostcode,
          baseCountry: data.fleetCountry,
          baseLat: data.fleetLat,
          baseLng: data.fleetLng,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
      router.replace("/partner/application-submitted");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 bg-[#0f4f8a] shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center px-6 md:px-12">
          <Link href="/partner/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={54} priority className="h-[48px] w-auto" />
          </Link>
        </div>
      </header>

      <div className="pt-28 pb-16 px-4 sm:px-8 md:px-16 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-black/5 bg-white p-8 md:p-12 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <ProgressBar step={step} total={5} />

            {step === 1 && <Step1 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(2); }} error={error} />}
            {step === 2 && <Step2 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(3); }} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(4); }} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 data={data} onChange={(k, v) => setField(k, v as string)} onNext={() => { setError(""); setStep(5); }} onBack={() => setStep(3)} />}
            {step === 5 && <Step5 data={data} onChange={(k, v) => setField(k, v as boolean)} onBack={() => setStep(4)} onSubmit={submit} submitting={submitting} error={error} />}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/partner/login" className="font-semibold text-[#003768] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}