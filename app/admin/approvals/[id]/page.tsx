"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import dynamic from "next/dynamic";

const PartnerLocationMap = dynamic(() => import("./PartnerLocationMap"), {
  ssr: false,
});

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
  base_lat: number | null;
  base_lng: number | null;
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

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

function labelServiceLevel(value?: string | null) {
  const v = String(value || "").trim();
  if (!v) return "Standard";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function AdminApprovalDetailPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<AppStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [fleet, setFleet] = useState<FleetRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const id = String(params?.id || "").trim();
      if (!id) {
        throw new Error("Missing application id.");
      }

      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load partner detail.");
      }

      const nextApplication = (json?.application || null) as PartnerApplication | null;
      const nextProfile = (json?.profile || null) as PartnerProfile | null;

      setApplication(nextApplication);
      setProfile(nextProfile);

      const profileUserId =
        String(nextProfile?.user_id || "").trim() ||
        String(nextApplication?.user_id || "").trim();

      if (profileUserId) {
        const { data: fleetRows, error: fleetErr } = await supabase
          .from("partner_fleet")
          .select(
            "id, category_slug, category_name, max_passengers, max_suitcases, max_hand_luggage, service_level, notes, is_active, created_at"
          )
          .eq("user_id", profileUserId)
          .order("created_at", { ascending: false });

        if (fleetErr) {
          throw new Error(fleetErr.message || "Failed to load partner fleet.");
        }

        setFleet((fleetRows || []) as FleetRow[]);
      } else {
        setFleet([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load partner detail.");
      setApplication(null);
      setProfile(null);
      setFleet([]);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: AppStatus) {
    if (!application?.id) return;

    setSavingStatus(status);
    setError(null);

    try {
      const res = await fetch("/api/admin/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: application.id,
          status,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to update status.");
      }

      setApplication((prev) => (prev ? { ...prev, status } : prev));
    } catch (e: any) {
      setError(e?.message || "Failed to update status.");
    } finally {
      setSavingStatus(null);
    }
  }

  useEffect(() => {
    load();
  }, [params?.id]);

  const primaryAddress =
    application?.address ||
    profile?.address ||
    [
      application?.address1 || profile?.address1,
      application?.address2 || profile?.address2,
      application?.province || profile?.province,
      application?.postcode || profile?.postcode,
      application?.country || profile?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    "—";

  const addressLine1 = application?.address1 || profile?.address1 || "—";
  const addressLine2 = application?.address2 || profile?.address2 || "—";
  const province = application?.province || profile?.province || "—";
  const postcode = application?.postcode || profile?.postcode || "—";
  const country = application?.country || profile?.country || "—";

  const status = (application?.status || "pending") as AppStatus;

  const badgeClass =
    status === "approved" || status === "live"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-yellow-200 bg-yellow-50 text-yellow-800";

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          Loading...
        </div>
      ) : !application ? (
        <div className="rounded-3xl border border-black/5 bg-white p-6 text-slate-600 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          Partner application not found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#003768]">
                    {application.full_name || profile?.contact_name || "—"}
                  </h2>
                  <p className="mt-2 text-lg text-slate-600">
                    {application.company_name || profile?.company_name || "—"}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}
                >
                  {status}
                </span>
              </div>

              <div className="mt-8 space-y-4 text-sm">
                <div>
                  <span className="font-medium text-[#003768]">Email:</span>{" "}
                  <span className="text-slate-800">{application.email || "—"}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Phone:</span>{" "}
                  <span className="text-slate-800">
                    {application.phone || profile?.phone || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Website:</span>{" "}
                  <span className="text-slate-800">
                    {application.website || profile?.website || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Created:</span>{" "}
                  <span className="text-slate-800">{fmtDateTime(application.created_at)}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Service radius:</span>{" "}
                  <span className="text-slate-800">
                    {profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("approved")}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingStatus === "approved" ? "Saving..." : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("rejected")}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                >
                  {savingStatus === "rejected" ? "Saving..." : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("pending")}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                >
                  {savingStatus === "pending" ? "Saving..." : "Pause / Set pending"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h2 className="text-2xl font-semibold text-[#003768]">Address</h2>

              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <span className="font-medium text-[#003768]">Business address:</span>{" "}
                  <span className="text-slate-800">{primaryAddress}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Address line 1:</span>{" "}
                  <span className="text-slate-800">{addressLine1}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Address line 2:</span>{" "}
                  <span className="text-slate-800">{addressLine2}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Province:</span>{" "}
                  <span className="text-slate-800">{province}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Postcode:</span>{" "}
                  <span className="text-slate-800">{postcode}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Country:</span>{" "}
                  <span className="text-slate-800">{country}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Car Fleet Address:</span>{" "}
                  <span className="text-slate-800">{profile?.base_address || "—"}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Base latitude:</span>{" "}
                  <span className="text-slate-800">
                    {profile?.base_lat !== null && profile?.base_lat !== undefined
                      ? profile.base_lat
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Base longitude:</span>{" "}
                  <span className="text-slate-800">
                    {profile?.base_lng !== null && profile?.base_lng !== undefined
                      ? profile.base_lng
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">Fleet</h2>

            {fleet.length === 0 ? (
              <p className="mt-4 text-slate-600">No fleet items added yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {fleet.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-black/10 p-5"
                  >
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-[#003768]">
                        {row.category_name || "—"}
                      </h3>

                      <p className="text-slate-700">
                        Passengers: {row.max_passengers ?? "—"} · Suitcases:{" "}
                        {row.max_suitcases ?? "—"} · Hand luggage:{" "}
                        {row.max_hand_luggage ?? "—"}
                      </p>

                      <p className="text-slate-700">
                        Service level: {labelServiceLevel(row.service_level)}
                      </p>

                      <p className="text-slate-700">
                        Status:{" "}
                        <span
                          className={
                            row.is_active
                              ? "font-semibold text-green-700"
                              : "font-semibold text-slate-500"
                          }
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </p>

                      {row.notes ? (
                        <p className="text-slate-600">{row.notes}</p>
                      ) : null}

                      <p className="text-xs text-slate-500">
                        Added: {fmtDateTime(row.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <PartnerLocationMap
              lat={profile?.base_lat ?? null}
              lng={profile?.base_lng ?? null}
              label={profile?.base_address || primaryAddress}
            />
          </div>
        </>
      )}
    </div>
  );
}