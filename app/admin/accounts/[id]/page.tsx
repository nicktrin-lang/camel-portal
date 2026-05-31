"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MapPicker = dynamic(() => import("@/app/partner/profile/MapPicker"), { ssr: false });

type AppStatus = "pending" | "approved" | "rejected";

type AccountApplication = {
  id: string; user_id: string | null; email: string | null;
  company_name: string | null; full_name: string | null; phone: string | null;
  address: string | null; address1?: string | null; address2?: string | null; city?: string | null;
  province?: string | null; postcode?: string | null; country?: string | null;
  website?: string | null; status: string | null; created_at: string | null;
  terms_accepted_at: string | null; terms_version: string | null;
};

type AccountProfile = {
  id: string; user_id: string | null; role?: string | null;
  company_name: string | null; contact_name: string | null; phone: string | null;
  address: string | null; address1?: string | null; address2?: string | null; city?: string | null;
  province?: string | null; postcode?: string | null; country?: string | null;
  website: string | null; service_radius_km: number | null;
  base_address: string | null; base_address1?: string | null; base_address2?: string | null;
  base_town?: string | null; base_city?: string | null; base_province?: string | null;
  base_postcode?: string | null; base_country?: string | null;
  base_lat: number | null; base_lng: number | null;
  default_currency?: string | null; legal_company_name?: string | null;
  vat_number?: string | null; company_registration_number?: string | null;
  commission_rate?: number | null;
};

type FleetRow  = { id: string; category_name: string; category_slug: string; max_passengers: number; max_suitcases: number; };
type DriverRow = { id: string; full_name: string; email: string; phone: string | null; };

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso ?? "—"; }
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return iso ?? "—"; }
}
function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}
function fmtLabel(value?: string | null) { return String(value || "—").replaceAll("_", " "); }

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved": return "border-green-200 bg-green-50 text-green-700";
    case "pending":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-black/60";
  }
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-black uppercase tracking-widest text-black/40">{label}</span>
      <div className="mt-1 text-sm font-bold text-black">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return <Field label={label}>{fmtValue(value)}</Field>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-black/5 bg-white p-6">
      <h2 className="text-lg font-black text-black mb-5">{title}</h2>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
  { value: "USD", label: "USD — US Dollar ($)" },
];

export default function AdminAccountDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();
  const params   = useParams<{ id: string }>();

  const [loading,          setLoading]          = useState(true);
  const [savingStatus,     setSavingStatus]     = useState<AppStatus | null>(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [savingCurrency,   setSavingCurrency]   = useState(false);
  const [savingBilling,    setSavingBilling]    = useState(false);
  const [editingBilling,   setEditingBilling]   = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [notice,           setNotice]           = useState<string | null>(null);
  const [application,      setApplication]      = useState<AccountApplication | null>(null);
  const [profile,          setProfile]          = useState<AccountProfile | null>(null);
  const [fleet,            setFleet]            = useState<FleetRow[]>([]);
  const [drivers,          setDrivers]          = useState<DriverRow[]>([]);
  const [isLiveProfile,    setIsLiveProfile]    = useState(false);
  const [liveProfileReason, setLiveProfileReason] = useState("");
  const [commissionInput,  setCommissionInput]  = useState("");
  const [currencyInput,    setCurrencyInput]    = useState("EUR");
  const [billingInput,     setBillingInput]     = useState({ legal_company_name: "", company_registration_number: "", vat_number: "" });

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }
      const adminRes  = await fetch("/api/admin/is-admin", { method: "GET", cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }
      const id = String(params?.id || "").trim();
      if (!id) throw new Error("Missing partner account id.");
      const res  = await fetch(`/api/admin/accounts/${id}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to load partner account.");
      const profileData = (json?.profile || null) as AccountProfile | null;
      setApplication((json?.application || null) as AccountApplication | null);
      setProfile(profileData);
      setFleet(Array.isArray(json?.fleet) ? json.fleet : []);
      setDrivers(Array.isArray(json?.drivers) ? json.drivers : []);
      setIsLiveProfile(!!json?.is_live_profile);
      setLiveProfileReason(String(json?.live_profile_reason || ""));
      setCommissionInput(String(profileData?.commission_rate ?? 20));
      setCurrencyInput(profileData?.default_currency || "EUR");
      setBillingInput({
        legal_company_name: String(profileData?.legal_company_name ?? ""),
        company_registration_number: String(profileData?.company_registration_number ?? ""),
        vat_number: String(profileData?.vat_number ?? ""),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load partner account.");
    } finally { setLoading(false); }
  }

  async function setStatus(status: AppStatus) {
    if (!application?.id) return;
    setSavingStatus(status); setError(null); setNotice(null);
    try {
      const res  = await fetch("/api/admin/applications/update-status", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id: application.id, status }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to update status.");
      setApplication(prev => prev ? { ...prev, status } : prev);
      setNotice(json?.warning ? String(json.warning) : `Status updated to ${status}.`);
    } catch (e: any) { setError(e?.message || "Failed to update status."); }
    finally { setSavingStatus(null); }
  }

  async function saveBillingDetails() {
    if (!profile?.user_id) return;
    setSavingBilling(true); setError(null); setNotice(null);
    try {
      const { error: e } = await supabase.from("partner_profiles").update({
        legal_company_name: billingInput.legal_company_name.trim() || null,
        company_registration_number: billingInput.company_registration_number.trim() || null,
        vat_number: billingInput.vat_number.trim() || null,
      }).eq("user_id", profile.user_id);
      if (e) throw new Error(e.message);
      setProfile(prev => prev ? { ...prev, legal_company_name: billingInput.legal_company_name.trim()||null, company_registration_number: billingInput.company_registration_number.trim()||null, vat_number: billingInput.vat_number.trim()||null } : prev);
      setEditingBilling(false);
      setNotice("Business & Billing details updated successfully.");
    } catch (e: any) { setError(e?.message || "Failed to update billing details."); }
    finally { setSavingBilling(false); }
  }

  async function saveCommissionRate() {
    const id = String(params?.id || "").trim();
    if (!id) return;
    const rate = parseFloat(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) { setError("Commission rate must be between 0 and 100."); return; }
    setSavingCommission(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commission_rate: rate }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to update commission rate.");
      setProfile(prev => prev ? { ...prev, commission_rate: rate } : prev);
      setNotice(`Commission rate updated to ${rate}% for this partner.`);
    } catch (e: any) { setError(e?.message || "Failed to update commission rate."); }
    finally { setSavingCommission(false); }
  }

  async function saveCurrency() {
    const id = String(params?.id || "").trim();
    if (!id || !currencyInput) return;
    setSavingCurrency(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ default_currency: currencyInput }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to update currency.");
      setProfile(prev => prev ? { ...prev, default_currency: currencyInput } : prev);
      setNotice(`Billing currency updated to ${currencyInput}. Note: if the partner has already connected Stripe, their Stripe account currency cannot be changed here — contact Stripe support.`);
    } catch (e: any) { setError(e?.message || "Failed to update currency."); }
    finally { setSavingCurrency(false); }
  }

  useEffect(() => { load(); }, [params?.id]);

  const displayCompany  = profile?.company_name  || application?.company_name || "—";
  const displayContact  = profile?.contact_name  || application?.full_name    || "—";
  const displayPhone    = profile?.phone         || application?.phone        || "—";
  const displayWebsite  = profile?.website       || application?.website      || "—";
  const businessAddress = profile?.address || application?.address || [profile?.address1 || application?.address1, profile?.address2 || application?.address2, profile?.city || application?.city, profile?.province || application?.province, profile?.postcode || application?.postcode, profile?.country || application?.country].filter(Boolean).join(", ") || "—";

  if (loading) return (
    <div className="border border-black/5 bg-white p-6">
      <p className="text-sm font-bold text-black/50">Loading…</p>
    </div>
  );

  if (!application) return (
    <div className="space-y-4">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="border border-black/5 bg-white p-6 text-sm font-bold text-black/50">Partner account not found.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error  && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="border border-black/10 bg-[#f0f0f0] p-3 text-sm font-bold text-black">{notice}</div>}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Company",          value: displayCompany },
          { label: "Status",           value: fmtLabel(application.status), pill: true, status: application.status },
          { label: "Fleet Categories", value: String(fleet.length) },
          { label: "Active Drivers",   value: String(drivers.length) },
        ].map(({ label, value, pill, status }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            {pill ? (
              <div className="mt-2">
                <span className={`inline-flex border px-3 py-1 text-xs font-black capitalize ${statusPillClasses(status)}`}>{value}</span>
              </div>
            ) : (
              <p className="mt-1 text-xl font-black text-black">{value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {/* Company Details */}
          <Section title="Company Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoRow label="Contact Name"    value={displayContact} />
              <InfoRow label="Email"           value={application.email} />
              <InfoRow label="Phone"           value={displayPhone} />
              <InfoRow label="Website"         value={displayWebsite} />
              <InfoRow label="Service Radius"  value={profile?.service_radius_km ? `${profile.service_radius_km} km` : null} />
              <InfoRow label="Bidding Currency" value={profile?.default_currency || null} />
              <InfoRow label="Applied"         value={fmtDateTime(application.created_at)} />
              <InfoRow label="Live Profile"    value={isLiveProfile ? "Yes" : "No"} />
            </div>
          </Section>

          {/* Business & Billing */}
          <Section title="Business & Billing">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-black/50">Legal details for commission invoicing.</p>
              {!editingBilling ? (
                <button type="button" onClick={() => { setEditingBilling(true); setBillingInput({ legal_company_name: profile?.legal_company_name ?? "", company_registration_number: profile?.company_registration_number ?? "", vat_number: profile?.vat_number ?? "" }); }}
                  className="border border-black/20 px-4 py-1.5 text-xs font-black text-black hover:bg-black/5 transition-colors">
                  ✏️ Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingBilling(false)}
                    className="border border-black/20 px-4 py-1.5 text-xs font-black text-black hover:bg-black/5">Cancel</button>
                  <button type="button" onClick={saveBillingDetails} disabled={savingBilling}
                    className="bg-[#ff7a00] px-4 py-1.5 text-xs font-black text-white hover:opacity-90 disabled:opacity-60">
                    {savingBilling ? "Saving…" : "Save changes"}
                  </button>
                </div>
              )}
            </div>
            {editingBilling ? (
              <div className="space-y-4">
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                  ⚠️ Only update these details if the partner has contacted Camel Global to request a change.
                </div>
                <div>
                  <label className={labelCls}>Legal company name</label>
                  <input value={billingInput.legal_company_name} onChange={e => setBillingInput(p => ({ ...p, legal_company_name: e.target.value }))}
                    placeholder="e.g. Valencia Cars S.L." className={`mt-1 ${inputCls}`} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Company registration number</label>
                    <input value={billingInput.company_registration_number} onChange={e => setBillingInput(p => ({ ...p, company_registration_number: e.target.value }))}
                      placeholder="e.g. B12345678" className={`mt-1 ${inputCls}`} />
                  </div>
                  <div>
                    <label className={labelCls}>VAT / NIF Number</label>
                    <input value={billingInput.vat_number} onChange={e => setBillingInput(p => ({ ...p, vat_number: e.target.value }))}
                      placeholder="e.g. ESB12345678" className={`mt-1 ${inputCls}`} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2"><InfoRow label="Legal Company Name" value={profile?.legal_company_name} /></div>
                <InfoRow label="Company Registration Number" value={profile?.company_registration_number} />
                <Field label="VAT / NIF Number">
                  <div className="flex items-center gap-2">
                    <span>{fmtValue(profile?.vat_number)}</span>
                    {profile?.vat_number
                      ? <span className="border border-black/20 px-2 py-0.5 text-xs font-black text-black">✓ Provided</span>
                      : <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">Missing</span>
                    }
                  </div>
                </Field>
              </div>
            )}
          </Section>

          {/* Business Address */}
          <Section title="Business Address">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><InfoRow label="Full Address" value={businessAddress} /></div>
              <InfoRow label="Address Line 1" value={profile?.address1 || application?.address1} />
              <InfoRow label="Address Line 2" value={profile?.address2 || application?.address2} />
              <InfoRow label="City / Town"    value={profile?.city    || application?.city} />
              <InfoRow label="Province"       value={profile?.province || application?.province} />
              <InfoRow label="Postcode"       value={profile?.postcode || application?.postcode} />
              <InfoRow label="Country"        value={profile?.country  || application?.country} />
            </div>
          </Section>

          {/* Fleet Base Location */}
          <Section title="Fleet Base Location">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-5">
              <div className="md:col-span-2"><InfoRow label="Full Address" value={profile?.base_address} /></div>
              <InfoRow label="Address Line 1" value={profile?.base_address1} />
              <InfoRow label="Address Line 2" value={profile?.base_address2} />
              <InfoRow label="Town"           value={profile?.base_town} />
              <InfoRow label="City"           value={profile?.base_city} />
              <InfoRow label="Province"       value={profile?.base_province} />
              <InfoRow label="Postcode"       value={profile?.base_postcode} />
              <InfoRow label="Country"        value={profile?.base_country} />
              <InfoRow label="GPS Coordinates" value={profile?.base_lat && profile?.base_lng ? `${profile.base_lat}, ${profile.base_lng}` : null} />
            </div>
            {profile?.base_lat && profile?.base_lng ? (
              <div className="overflow-hidden border border-black/10">
                <MapPicker lat={profile.base_lat} lng={profile.base_lng} onPick={() => {}} />
              </div>
            ) : (
              <div className="border border-black/5 bg-[#f0f0f0] p-4 text-sm font-bold text-black/40">No location set yet.</div>
            )}
          </Section>

          {/* Fleet */}
          <Section title="Car Fleet">
            {fleet.length === 0 ? (
              <p className="text-sm font-bold italic text-black/40">No fleet categories added yet.</p>
            ) : (
              <div className="space-y-2">
                {fleet.map(f => (
                  <div key={f.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                    <div>
                      <p className="font-black text-black text-sm">{f.category_name}</p>
                      <p className="text-xs font-bold text-black/50">{f.max_passengers} passengers · {f.max_suitcases} suitcases</p>
                    </div>
                    <span className="text-xs font-black text-black border border-black/20 px-2 py-0.5">Active</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Drivers */}
          <Section title="Drivers">
            {drivers.length === 0 ? (
              <p className="text-sm font-bold italic text-black/40">No drivers added yet.</p>
            ) : (
              <div className="space-y-2">
                {drivers.map(d => (
                  <div key={d.id} className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3">
                    <div>
                      <p className="font-black text-black text-sm">{d.full_name}</p>
                      <p className="text-xs font-bold text-black/50">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                    </div>
                    <span className="text-xs font-black text-black border border-black/20 px-2 py-0.5">Active</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Admin Controls */}
          <Section title="Admin Controls">
            <div className="space-y-3">
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("approved")}
                className="w-full bg-[#ff7a00] px-5 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {savingStatus === "approved" ? "Saving…" : "Approve"}
              </button>
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("rejected")}
                className="w-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors">
                {savingStatus === "rejected" ? "Saving…" : "Reject"}
              </button>
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("pending")}
                className="w-full border border-black/20 bg-white px-5 py-3 text-sm font-black text-black hover:bg-black/5 disabled:opacity-60 transition-colors">
                {savingStatus === "pending" ? "Saving…" : "Pause / Set pending"}
              </button>
            </div>
          </Section>

          {/* Commission Override */}
          <Section title="Commission Rate">
            <p className="text-xs font-bold text-black/50 mb-4">
              Override the platform default (20%) for this partner. Minimum €10 per booking always applies.
              This rate is stored on the partner profile and applied to all future bids.
            </p>
            <div className="flex gap-2 items-center">
              <input type="number" min={0} max={100} step={0.5} value={commissionInput}
                onChange={e => setCommissionInput(e.target.value)}
                className="w-20 border border-black/10 bg-[#f0f0f0] px-3 py-2 text-sm font-black outline-none focus:border-black" />
              <span className="text-sm font-black text-black/50">%</span>
              <button type="button" onClick={saveCommissionRate} disabled={savingCommission}
                className="flex-1 bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 disabled:opacity-60 transition-opacity">
                {savingCommission ? "Saving…" : "Save rate"}
              </button>
            </div>
            <p className="mt-2 text-xs font-bold text-black/40">
              Current rate: <strong className="text-black">{profile?.commission_rate ?? 20}%</strong>
            </p>
          </Section>

          {/* Currency Override */}
          <Section title="Billing Currency Override">
            <p className="text-xs font-bold text-black/50 mb-4">
              Correct the partner's billing currency if they selected the wrong one during setup. Only do this before they have connected Stripe — changing it after Stripe onboarding will not update their Stripe account currency.
            </p>
            <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 mb-4">
              ⚠️ Only change this if the partner has not yet completed Stripe onboarding, or has contacted Camel Global to request a correction.
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Currency</label>
                <select value={currencyInput} onChange={e => setCurrencyInput(e.target.value)}
                  className="mt-1 w-full border border-black/10 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
                  {CURRENCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={saveCurrency} disabled={savingCurrency}
                className="w-full bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80 disabled:opacity-60 transition-opacity">
                {savingCurrency ? "Saving…" : "Save currency"}
              </button>
            </div>
            <p className="mt-2 text-xs font-bold text-black/40">
              Current: <strong className="text-black">{profile?.default_currency || "Not set"}</strong>
            </p>
          </Section>

          {/* Live Profile Check */}
          <Section title="Live Profile Check">
            <div className="space-y-3">
              {[
                { label: "Fleet address set",   value: !!profile?.base_address },
                { label: "Fleet added",         value: fleet.length > 0 },
                { label: "Drivers added",       value: drivers.length > 0 },
                { label: "Currency set",        value: !!profile?.default_currency },
                { label: "VAT / NIF provided",  value: !!profile?.vat_number },
                { label: "Live profile status", value: isLiveProfile },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-black/60">{label}</span>
                  <span className={`border px-2 py-0.5 text-xs font-black ${
                    value ? "border-black/20 bg-black text-white" : "border-black/10 bg-[#f0f0f0] text-black/50"
                  }`}>{value ? "Yes" : "No"}</span>
                </div>
              ))}
              {!isLiveProfile && liveProfileReason && (
                <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{liveProfileReason}</div>
              )}
            </div>
          </Section>

          {/* Application */}
          <Section title="Application">
            <div className="space-y-3">
              <Field label="Status">
                <span className={`inline-flex border px-3 py-1 text-xs font-black capitalize ${statusPillClasses(application.status)}`}>
                  {fmtLabel(application.status)}
                </span>
              </Field>
              <InfoRow label="Created" value={fmtDateTime(application.created_at)} />
            </div>
          </Section>

          {/* Terms & Conditions */}
          <Section title="Terms & Conditions">
            <div className="space-y-3">
              <InfoRow label="Version accepted" value={application.terms_version ? `v${application.terms_version}` : "—"} />
              <InfoRow label="Accepted on" value={fmtDate(application.terms_accepted_at)} />
              {application.terms_accepted_at ? (
                <div className="border border-black/10 bg-[#f0f0f0] p-3 text-xs font-bold text-black/60">
                  ✓ Partner accepted T&Cs at signup.
                </div>
              ) : (
                <div className="border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
                  ⚠️ No T&Cs acceptance recorded.
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}