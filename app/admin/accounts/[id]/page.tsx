"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MapPicker = dynamic(() => import("@/app/partner/profile/MapPicker"), { ssr: false });

type AppStatus = "pending" | "approved" | "rejected";

type AccountApplication = {
  id: string;
  user_id: string | null;
  email: string | null;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  address1?: string | null;
  address2?: string | null;
  province?: string | null;
  postcode?: string | null;
  country?: string | null;
  website?: string | null;
  status: string | null;
  created_at: string | null;
};

type AccountProfile = {
  id: string;
  user_id: string | null;
  role?: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  address1?: string | null;
  address2?: string | null;
  province?: string | null;
  postcode?: string | null;
  country?: string | null;
  website: string | null;
  service_radius_km: number | null;
  base_address: string | null;
  base_address1?: string | null;
  base_address2?: string | null;
  base_town?: string | null;
  base_city?: string | null;
  base_province?: string | null;
  base_postcode?: string | null;
  base_country?: string | null;
  base_lat: number | null;
  base_lng: number | null;
  default_currency?: string | null;
  legal_company_name?: string | null;
  vat_number?: string | null;
  company_registration_number?: string | null;
  commission_rate?: number | null;
};

type FleetRow = { id: string; category_name: string; category_slug: string; max_passengers: number; max_suitcases: number; };
type DriverRow = { id: string; full_name: string; email: string; phone: string | null; };

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso ?? "—"; }
}

function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function fmtLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved": return "border-green-200 bg-green-50 text-green-700";
    case "pending":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-slate-700";
  }
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <span className="text-slate-500 text-sm">{label}</span>
      <p className="font-medium text-slate-800">{fmtValue(value)}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <h2 className="text-xl font-semibold text-[#003768] mb-5">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminAccountDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AppStatus | null>(null);
  const [savingCommission, setSavingCommission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [application, setApplication] = useState<AccountApplication | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [isLiveProfile, setIsLiveProfile] = useState(false);
  const [liveProfileReason, setLiveProfileReason] = useState("");
  const [commissionInput, setCommissionInput] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }

      const adminRes = await fetch("/api/admin/is-admin", { method: "GET", cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }

      const id = String(params?.id || "").trim();
      if (!id) throw new Error("Missing partner account id.");

      const res = await fetch(`/api/admin/accounts/${id}`, { method: "GET", cache: "no-store", credentials: "include" });
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
    } catch (e: any) {
      setError(e?.message || "Failed to load partner account.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: AppStatus) {
    if (!application?.id) return;
    setSavingStatus(status); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/admin/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: application.id, status }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to update status.");
      setApplication(prev => prev ? { ...prev, status } : prev);
      setNotice(json?.warning ? String(json.warning) : `Status updated to ${status}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingStatus(null);
    }
  }

  async function saveCommissionRate() {
    if (!profile?.user_id) return;
    const rate = parseFloat(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) { setError("Commission rate must be between 0 and 100."); return; }
    setSavingCommission(true); setError(null); setNotice(null);
    try {
      const { error: e } = await supabase
        .from("partner_profiles")
        .update({ commission_rate: rate })
        .eq("user_id", profile.user_id);
      if (e) throw new Error(e.message);
      setProfile(prev => prev ? { ...prev, commission_rate: rate } : prev);
      setNotice(`Commission rate updated to ${rate}% for this partner.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update commission rate.");
    } finally {
      setSavingCommission(false);
    }
  }

  useEffect(() => { load(); }, [params?.id]);

  const displayCompany  = profile?.company_name || application?.company_name || "—";
  const displayContact  = profile?.contact_name || application?.full_name || "—";
  const displayPhone    = profile?.phone || application?.phone || "—";
  const displayWebsite  = profile?.website || application?.website || "—";
  const businessAddress = profile?.address || application?.address || "—";

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">Loading...</div>
  );

  if (!application) return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">Partner account not found.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error  && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Company",          value: displayCompany },
          { label: "Status",           value: fmtLabel(application.status), pill: true, status: application.status },
          { label: "Fleet Categories", value: String(fleet.length) },
          { label: "Active Drivers",   value: String(drivers.length) },
        ].map(({ label, value, pill, status }) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-slate-500">{label}</p>
            {pill ? (
              <div className="mt-2"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(status)}`}>{value}</span></div>
            ) : (
              <p className="mt-1 text-xl font-semibold text-[#003768]">{value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {/* Company Details */}
          <SectionCard title="Company Details">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <InfoRow label="Contact Name" value={displayContact} />
              <InfoRow label="Email" value={application.email} />
              <InfoRow label="Phone" value={displayPhone} />
              <InfoRow label="Website" value={displayWebsite} />
              <InfoRow label="Service Radius" value={profile?.service_radius_km ? `${profile.service_radius_km} km` : null} />
              <InfoRow label="Bidding Currency" value={profile?.default_currency || null} />
              <InfoRow label="Applied" value={fmtDateTime(application.created_at)} />
              <InfoRow label="Live Profile" value={isLiveProfile ? "Yes" : "No"} />
            </div>
          </SectionCard>

          {/* Business & Billing */}
          <SectionCard title="Business & Billing">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2"><InfoRow label="Legal Company Name" value={profile?.legal_company_name} /></div>
              <InfoRow label="Company Registration Number" value={profile?.company_registration_number} />
              <div>
                <span className="text-slate-500 text-sm">VAT / NIF Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-medium text-slate-800">{fmtValue(profile?.vat_number)}</p>
                  {profile?.vat_number
                    ? <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Provided</span>
                    : <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Missing</span>
                  }
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Business Address */}
          <SectionCard title="Business Address">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2"><InfoRow label="Full Address" value={businessAddress} /></div>
              <InfoRow label="Address Line 1" value={profile?.address1 || application?.address1} />
              <InfoRow label="Address Line 2" value={profile?.address2 || application?.address2} />
              <InfoRow label="Province" value={profile?.province || application?.province} />
              <InfoRow label="Postcode" value={profile?.postcode || application?.postcode} />
              <InfoRow label="Country" value={profile?.country || application?.country} />
            </div>
          </SectionCard>

          {/* Fleet Base Location */}
          <SectionCard title="Fleet Base Location">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 mb-5">
              <div className="md:col-span-2"><InfoRow label="Full Address" value={profile?.base_address} /></div>
              <InfoRow label="Address Line 1" value={profile?.base_address1} />
              <InfoRow label="Address Line 2" value={profile?.base_address2} />
              <InfoRow label="Town" value={profile?.base_town} />
              <InfoRow label="City" value={profile?.base_city} />
              <InfoRow label="Province" value={profile?.base_province} />
              <InfoRow label="Postcode" value={profile?.base_postcode} />
              <InfoRow label="Country" value={profile?.base_country} />
              <InfoRow label="GPS Coordinates" value={
                profile?.base_lat && profile?.base_lng ? `${profile.base_lat}, ${profile.base_lng}` : null
              } />
            </div>
            {profile?.base_lat && profile?.base_lng ? (
              <div className="rounded-2xl overflow-hidden border border-black/10">
                <MapPicker lat={profile.base_lat} lng={profile.base_lng} onPick={() => {}} />
              </div>
            ) : (
              <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 text-sm text-slate-400">No location set yet.</div>
            )}
          </SectionCard>

          {/* Fleet */}
          <SectionCard title="Car Fleet">
            {fleet.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No fleet categories added yet.</p>
            ) : (
              <div className="space-y-2">
                {fleet.map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-[#003768] text-sm">{f.category_name}</p>
                      <p className="text-xs text-slate-500">{f.max_passengers} passengers · {f.max_suitcases} suitcases</p>
                    </div>
                    <span className="text-xs font-semibold text-green-600">Active</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Drivers */}
          <SectionCard title="Drivers">
            {drivers.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No drivers added yet.</p>
            ) : (
              <div className="space-y-2">
                {drivers.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-[#003768] text-sm">{d.full_name}</p>
                      <p className="text-xs text-slate-500">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-600">Active</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Admin Controls */}
          <SectionCard title="Admin Controls">
            <div className="space-y-3">
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("approved")}
                className="w-full rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {savingStatus === "approved" ? "Saving..." : "Approve"}
              </button>
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("rejected")}
                className="w-full rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">
                {savingStatus === "rejected" ? "Saving..." : "Reject"}
              </button>
              <button type="button" disabled={savingStatus !== null} onClick={() => setStatus("pending")}
                className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60">
                {savingStatus === "pending" ? "Saving..." : "Pause / Set pending"}
              </button>
            </div>
          </SectionCard>

          {/* Commission Override */}
          <SectionCard title="Commission Rate">
            <p className="text-sm text-slate-500 mb-4">Override the platform default (20%) for this partner. Minimum €10 per booking always applies.</p>
            <div className="flex gap-2 items-center">
              <input
                type="number" min={0} max={100} step={0.5}
                value={commissionInput}
                onChange={e => setCommissionInput(e.target.value)}
                className="w-24 rounded-xl border border-black/10 px-3 py-2 text-sm font-bold text-[#003768] outline-none focus:border-[#0f4f8a]"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
              <button type="button" onClick={saveCommissionRate} disabled={savingCommission}
                className="flex-1 rounded-full bg-[#003768] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {savingCommission ? "Saving..." : "Save rate"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Current rate: <strong>{profile?.commission_rate ?? 20}%</strong></p>
          </SectionCard>

          {/* Live Profile Check */}
          <SectionCard title="Live Profile Check">
            <div className="space-y-3 text-sm">
              {[
                { label: "Fleet address set",    value: !!profile?.base_address },
                { label: "Fleet added",          value: fleet.length > 0 },
                { label: "Drivers added",        value: drivers.length > 0 },
                { label: "Currency set",         value: !!profile?.default_currency },
                { label: "VAT / NIF provided",   value: !!profile?.vat_number },
                { label: "Live profile status",  value: isLiveProfile },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${
                    value ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>{value ? "Yes" : "No"}</span>
                </div>
              ))}
              {!isLiveProfile && liveProfileReason && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{liveProfileReason}</div>
              )}
            </div>
          </SectionCard>

          {/* Application */}
          <SectionCard title="Application">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(application.status)}`}>
                    {fmtLabel(application.status)}
                  </span>
                </div>
              </div>
              <InfoRow label="Created" value={fmtDateTime(application.created_at)} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}