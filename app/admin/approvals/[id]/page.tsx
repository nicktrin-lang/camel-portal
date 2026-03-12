"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PartnerLocationMap from "./PartnerLocationMap";

type AppStatus = "pending" | "approved" | "rejected";

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
  id: string;
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

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

function buildAddress(parts: Array<string | null | undefined>) {
  return parts.map((v) => (v || "").trim()).filter(Boolean).join(", ");
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
        setError("Not authorized");
        return;
      }

      const res = await fetch(`/api/admin/applications/${params.id}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || json?._raw || "Failed to load partner details.");
      }

      setApplication((json?.application || null) as PartnerApplication | null);
      setProfile((json?.profile || null) as PartnerProfile | null);
    } catch (e: any) {
      setError(e?.message || "Failed to load partner details.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const profileStructuredAddress = buildAddress([
    profile?.address1,
    profile?.address2,
    profile?.province,
    profile?.postcode,
    profile?.country,
  ]);

  const applicationStructuredAddress = buildAddress([
    application?.address1,
    application?.address2,
    application?.province,
    application?.postcode,
    application?.country,
  ]);

  const primaryAddress =
    profile?.base_address ||
    profileStructuredAddress ||
    profile?.address ||
    applicationStructuredAddress ||
    application?.address ||
    "—";

  const status = (application?.status || "pending") as AppStatus;

  const badge =
    status === "approved"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-yellow-50 text-yellow-800 border-yellow-200";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003768]">Partner Detail</h1>
          <p className="mt-2 text-gray-600">
            View the full partner record and approve, reject, or pause them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/approvals"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Back to Approvals
          </Link>

          <Link
            href="/admin/users"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Admin Users
          </Link>

          <Link
            href="/partner/dashboard"
            className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Partner Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-white p-6 text-gray-600">
          Loading…
        </div>
      ) : application ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#003768]">
                    {profile?.contact_name || application.full_name || "—"}
                  </h2>
                  <p className="mt-1 text-gray-600">
                    {profile?.company_name || application.company_name || "—"}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}
                >
                  {status}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-[#003768]">Email:</span>{" "}
                  <span className="text-gray-800">{application.email || "—"}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Phone:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.phone || application.phone || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Website:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.website || application.website || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Created:</span>{" "}
                  <span className="text-gray-800">{fmtDateTime(application.created_at)}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Service radius:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("approved")}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingStatus === "approved" ? "Saving…" : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("rejected")}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                >
                  {savingStatus === "rejected" ? "Saving…" : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => setStatus("pending")}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5 disabled:opacity-60"
                >
                  {savingStatus === "pending" ? "Saving…" : "Pause / Set pending"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-6">
              <h2 className="text-xl font-semibold text-[#003768]">Address</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-[#003768]">Primary address:</span>{" "}
                  <span className="text-gray-800">{primaryAddress}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Address line 1:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.address1 || application.address1 || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Address line 2:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.address2 || application.address2 || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Province:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.province || application.province || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Postcode:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.postcode || application.postcode || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Country:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.country || application.country || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Base address:</span>{" "}
                  <span className="text-gray-800">{profile?.base_address || "—"}</span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Base latitude:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.base_lat !== null && profile?.base_lat !== undefined
                      ? profile.base_lat
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-[#003768]">Base longitude:</span>{" "}
                  <span className="text-gray-800">
                    {profile?.base_lng !== null && profile?.base_lng !== undefined
                      ? profile.base_lng
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <PartnerLocationMap
              lat={profile?.base_lat ?? null}
              lng={profile?.base_lng ?? null}
              label={profile?.base_address || primaryAddress}
            />
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-black/10 bg-white p-6 text-gray-600">
          Partner record not found.
        </div>
      )}
    </div>
  );
}