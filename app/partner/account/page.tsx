"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AccountProfile = {
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  address1: string | null;
  address2: string | null;
  province: string | null;
  postcode: string | null;
  country: string | null;
  website: string | null;
  service_radius_km: number | null;
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
};

type ApplicationRow = {
  status: string | null;
  created_at: string | null;
};

function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function fmtStatus(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

export default function PartnerAccountPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const user = userData.user;
        const normalizedEmail = String(user.email || "").toLowerCase().trim();

        const [{ data: profileRow, error: profileErr }, { data: applicationRow, error: appErr }] =
          await Promise.all([
            supabase
              .from("partner_profiles")
              .select(
                "company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
              )
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("partner_applications")
              .select("status,created_at")
              .eq("email", normalizedEmail)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        if (profileErr) {
          throw new Error(profileErr.message || "Failed to load account.");
        }

        if (appErr) {
          throw new Error(appErr.message || "Failed to load application.");
        }

        if (!mounted) return;

        setProfile((profileRow || null) as AccountProfile | null);
        setApplication((applicationRow || null) as ApplicationRow | null);
        setEmail(normalizedEmail);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load account.");
        setProfile(null);
        setApplication(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const fullAddress =
    profile?.address ||
    [profile?.address1, profile?.address2, profile?.province, profile?.postcode, profile?.country]
      .filter(Boolean)
      .join(", ") ||
    "—";

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Company</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">
            {fmtValue(profile?.company_name)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Application Status</p>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                application?.status
              )}`}
            >
              {fmtStatus(application?.status)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Service Radius</p>
          <p className="mt-1 text-xl font-semibold text-[#003768]">
            {profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Company Details</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-500">Contact Name</span>
                <p className="font-medium text-slate-800">
                  {fmtValue(profile?.contact_name)}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium text-slate-800">{fmtValue(email)}</p>
              </div>

              <div>
                <span className="text-slate-500">Phone</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.phone)}</p>
              </div>

              <div>
                <span className="text-slate-500">Website</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.website)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Business Address</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Full Address</span>
                <p className="font-medium text-slate-800">{fullAddress}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <span className="text-slate-500">Address Line 1</span>
                  <p className="font-medium text-slate-800">
                    {fmtValue(profile?.address1)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Address Line 2</span>
                  <p className="font-medium text-slate-800">
                    {fmtValue(profile?.address2)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Province</span>
                  <p className="font-medium text-slate-800">
                    {fmtValue(profile?.province)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Postcode</span>
                  <p className="font-medium text-slate-800">
                    {fmtValue(profile?.postcode)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <span className="text-slate-500">Country</span>
                  <p className="font-medium text-slate-800">
                    {fmtValue(profile?.country)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Fleet Base Location</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-500">Base Address</span>
                <p className="font-medium text-slate-800">
                  {fmtValue(profile?.base_address)}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Coordinates</span>
                <p className="font-medium text-slate-800">
                  {profile?.base_lat !== null &&
                  profile?.base_lat !== undefined &&
                  profile?.base_lng !== null &&
                  profile?.base_lng !== undefined
                    ? `${profile.base_lat}, ${profile.base_lng}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Account Actions</h2>

            <div className="mt-5 space-y-3">
              <a
                href="/partner/profile"
                className="block rounded-full bg-[#ff7a00] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
              >
                Edit Profile
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Next Build</h2>

            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• Payout settings</li>
              <li>• Operating rules</li>
              <li>• Fleet categories</li>
              <li>• Reporting summary</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Application</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                      application?.status
                    )}`}
                  >
                    {fmtStatus(application?.status)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500">Created</span>
                <p className="font-medium text-slate-800">
                  {fmtDateTime(application?.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}