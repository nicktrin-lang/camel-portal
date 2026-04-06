"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MapPicker = dynamic(() => import("@/app/partner/profile/MapPicker"), { ssr: false });

type AppStatus = "pending" | "approved" | "rejected" | "live";

type PartnerApplication = {
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
  status: AppStatus;
  created_at: string | null;
};

type PartnerProfile = {
  id?: string;
  user_id: string | null;
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
};

type FleetRow = {
  id: string;
  category_slug: string | null;
  category_name: string | null;
  max_passengers: number | null;
  max_suitcases: number | null;
  max_hand_luggage: number | null;
  service_level: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type DriverRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso ?? "—"; }
}

function fmtValue(v?: string | number | null) {
  if (v === null || v === undefined) return "—";
  const t = String(v).trim();
  return t || "—";
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

export default function AdminApprovalDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AppStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [bizLat, setBizLat] = useState<number | null>(null);
  const [bizLng, setBizLng] = useState<number | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_authorized"); return; }

      const adminRes = await fetch("/api/admin/is-admin", { method: "GET", cache: "no-store", credentials: "include" });
      const adminJson = await safeJson(adminRes);
      if (!adminJson?.isAdmin) { router.replace("/partner/login?reason=not_authorized"); return; }

      const id = String(params?.id || "").trim();
      if (!id) throw new Error("Missing application id.");

      const res = await fetch(`/api/admin/applications/${id}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?._raw || "Failed to load partner detail.");

      const app = (json?.application || null) as PartnerApplication | null;
      const prof = (json?.profile || null) as PartnerProfile | null;
      setApplication(app);
      setProfile(prof);
      setFleet(Array.isArray(json?.fleet) ? json.fleet : []);
      setDrivers(Array.isArray(json?.drivers) ? json.drivers : []);

      // Geocode business address for map
      const bizAddr = app?.address || prof?.address || [app?.address1, app?.address2, app?.province, app?.postcode, app?.country].filter(Boolean).join(", ");
      if (bizAddr) {
        try {
          const geoRes = await fetch(`/api/maps/search?q=${encodeURIComponent(bizAddr)}`, { cache: "no-store" });
          const geoJson = await geoRes.json().catch(() => null);
          const first = geoJson?.data?.[0];
          if (first?.lat && first?.lng) { setBizLat(first.lat); setBizLng(first.lng); }
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load partner detail.");
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
      setNotice(`Status updated to ${status}.`);
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingStatus(null);
    }
  }

  useEffect(() => { load(); }, [params?.id]);

  const status = (application?.status || "pending") as AppStatus;
  const badgeClass = status === "approved" || status === "live"
    ? "border-green-200 bg-green-50 text-green-700"
    : status === "rejected"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-yellow-200 bg-yellow-50 text-yellow-800";

  const businessAddress = application?.address || profile?.address || "—";
  const activeFleet = fleet.filter(f => f.is_active);

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">Loading...</div>
  );

  if (!application) return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">Partner application not found.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error  && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Company</p>
          <p className="mt-1 text-lg font-semibold text-[#003768]">{fmtValue(application.company_name || profile?.company_name)}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}>{status}</span>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Fleet Categories</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">{activeFleet.length}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Active Drivers</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">{drivers.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {/* Company Details */}
          <SectionCard title="Company Details">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <InfoRow label="Contact Name" value={application.full_name || profile?.contact_name} />
              <InfoRow label="Email" value={application.email} />
              <InfoRow label="Phone" value={application.phone || profile?.phone} />
              <InfoRow label="Website" value={application.website || profile?.website} />
              <InfoRow label="Service Radius" value={profile?.service_radius_km ? `${profile.service_radius_km} km` : null} />
              <InfoRow label="Bidding Currency" value={profile?.default_currency} />
              <InfoRow label="Applied" value={fmtDateTime(application.created_at)} />
            </div>
          </SectionCard>

          {/* Business Address */}
          <SectionCard title="Business Address">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2"><InfoRow label="Full Address" value={businessAddress} /></div>
              <InfoRow label="Address Line 1" value={application.address1 || profile?.address1} />
              <InfoRow label="Address Line 2" value={application.address2 || profile?.address2} />
              <InfoRow label="Province" value={application.province || profile?.province} />
              <InfoRow label="Postcode" value={application.postcode || profile?.postcode} />
              <InfoRow label="Country" value={application.country || profile?.country} />
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
              <InfoRow label="GPS" value={profile?.base_lat && profile?.base_lng ? `${profile.base_lat}, ${profile.base_lng}` : null} />
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
                      <p className="font-semibold text-[#003768] text-sm">{f.category_name || "—"}</p>
                      <p className="text-xs text-slate-500">
                        {f.max_passengers ?? "—"} passengers · {f.max_suitcases ?? "—"} suitcases · {f.max_hand_luggage ?? "—"} hand luggage
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${f.is_active ? "text-green-600" : "text-slate-400"}`}>
                      {f.is_active ? "Active" : "Inactive"}
                    </span>
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

          <SectionCard title="Setup Summary">
            <div className="space-y-3 text-sm">
              {[
                { label: "Fleet location set",  value: !!(profile?.base_lat && profile?.base_lng) },
                { label: "Currency set",        value: !!profile?.default_currency },
                { label: "Fleet added",         value: activeFleet.length > 0 },
                { label: "Drivers added",       value: drivers.length > 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${
                    value ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>{value ? "Yes" : "No"}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Application">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}>{status}</span>
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