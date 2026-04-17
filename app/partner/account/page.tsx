"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { OPERATING_RULES, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";

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
  default_currency: string | null;
  legal_company_name: string | null;
  vat_number: string | null;
  company_registration_number: string | null;
};

type ApplicationRow = {
  status: string | null;
  created_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
};

type LiveStatus = {
  isLive: boolean;
  missing: string[];
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
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return value; }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved": return "border-green-200 bg-green-50 text-green-700";
    case "pending":  return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-slate-700";
  }
}

function currencyLabel(currency?: string | null) {
  switch (String(currency || "").toUpperCase()) {
    case "EUR": return "Euro (€)";
    case "GBP": return "British Pound (£)";
    case "USD": return "US Dollar ($)";
    default: return "Not set";
  }
}

const MISSING_LABELS: Record<string, { label: string; href: string }> = {
  service_radius_km: { label: "Service radius not set",                href: "/partner/profile" },
  base_address:      { label: "Fleet base address missing",            href: "/partner/profile" },
  base_location:     { label: "Fleet base location (map pin) missing", href: "/partner/profile" },
  base_lat:          { label: "Fleet base location (lat) missing",     href: "/partner/profile" },
  base_lng:          { label: "Fleet base location (lng) missing",     href: "/partner/profile" },
  fleet:             { label: "No active fleet vehicles added",        href: "/partner/fleet" },
  driver:            { label: "No active drivers added",               href: "/partner/drivers" },
  default_currency:  { label: "Billing currency not set",              href: "/partner/profile" },
  vat_number:        { label: "VAT / NIF number not set",              href: "/partner/profile" },
};

export default function PartnerAccountPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [email, setEmail] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_signed_in"); return; }
        const user = userData.user;
        const normalizedEmail = String(user.email || "").toLowerCase().trim();

        const [{ data: profileRow, error: profileErr }, { data: applicationRow, error: appErr }] =
          await Promise.all([
            supabase.from("partner_profiles")
              .select("company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number")
              .eq("user_id", user.id).maybeSingle(),
            supabase.from("partner_applications")
              .select("status,created_at,terms_accepted_at,terms_version")
              .eq("email", normalizedEmail)
              .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);

        if (profileErr) throw new Error(profileErr.message || "Failed to load account.");
        if (appErr) throw new Error(appErr.message || "Failed to load application.");
        if (!mounted) return;

        setProfile((profileRow || null) as AccountProfile | null);
        setApplication((applicationRow || null) as ApplicationRow | null);
        setEmail(normalizedEmail);

        try {
          const liveRes = await fetch("/api/partner/refresh-live-status", {
            method: "POST", cache: "no-store", credentials: "include",
          });
          if (liveRes.ok) {
            const liveJson = await liveRes.json();
            if (mounted) {
              setLiveStatus({
                isLive: liveJson?.isLiveNow ?? liveJson?.becameLive ?? false,
                missing: Array.isArray(liveJson?.missing) ? liveJson.missing : [],
              });
            }
          }
        } catch {}
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load account.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [router, supabase]);

  const fullAddress =
    profile?.address ||
    [profile?.address1, profile?.address2, profile?.province, profile?.postcode, profile?.country]
      .filter(Boolean).join(", ") || "—";

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <p className="text-slate-600">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Company</p>
          <p className="mt-1 text-lg font-semibold text-[#003768]">{fmtValue(profile?.company_name)}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Application Status</p>
          <div className="mt-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(application?.status)}`}>
              {fmtStatus(application?.status)}
            </span>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Service Radius</p>
          <p className="mt-1 text-lg font-semibold text-[#003768]">
            {profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-500">Billing Currency</p>
          <p className="mt-1 text-lg font-semibold text-[#003768]">{currencyLabel(profile?.default_currency)}</p>
        </div>
      </div>

      {/* Live Status Banner */}
      {liveStatus && (
        liveStatus.isLive ? (
          <div className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">Your account is live</p>
                <p className="text-sm text-green-700">You are visible to customers and can receive and bid on requests within your service radius.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Your account is not yet live</p>
                <p className="mt-1 text-sm text-amber-700">Complete the following to go live and start receiving customer requests:</p>
                {liveStatus.missing.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {liveStatus.missing.map(m => {
                      const info = MISSING_LABELS[m] ?? { label: m, href: "/partner/profile" };
                      return (
                        <li key={m}>
                          <a href={info.href}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                            <span className="text-amber-500">→</span>
                            {info.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {/* Company Details */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Company Details</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div><span className="text-slate-500">Contact Name</span><p className="font-medium text-slate-800">{fmtValue(profile?.contact_name)}</p></div>
              <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{fmtValue(email)}</p></div>
              <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800">{fmtValue(profile?.phone)}</p></div>
              <div><span className="text-slate-500">Website</span><p className="font-medium text-slate-800">{fmtValue(profile?.website)}</p></div>
              <div><span className="text-slate-500">Billing Currency</span><p className="font-medium text-slate-800">{currencyLabel(profile?.default_currency)}</p></div>
              <div><span className="text-slate-500">Service Radius</span><p className="font-medium text-slate-800">{profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}</p></div>
            </div>
          </div>

          {/* Business & Billing */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Business & Billing</h2>
            <p className="mt-1 text-sm text-slate-500">Your legal details used for commission invoicing.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2">
                <span className="text-slate-500">Legal Company Name</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.legal_company_name)}</p>
              </div>
              <div>
                <span className="text-slate-500">Company Registration Number</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.company_registration_number)}</p>
              </div>
              <div>
                <span className="text-slate-500">VAT / NIF Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-medium text-slate-800">{fmtValue(profile?.vat_number)}</p>
                  {profile?.vat_number
                    ? <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Provided</span>
                    : <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Required</span>
                  }
                </div>
              </div>
            </div>
            {!profile?.vat_number && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ Your VAT / NIF number is required before your account can go live.{" "}
                <a href="/partner/profile" className="font-semibold underline">Add it in your profile →</a>
              </div>
            )}
          </div>

          {/* Business Address */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Business Address</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Full Address</span>
                <p className="font-medium text-slate-800">{fullAddress}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><span className="text-slate-500">Address Line 1</span><p className="font-medium text-slate-800">{fmtValue(profile?.address1)}</p></div>
                <div><span className="text-slate-500">Address Line 2</span><p className="font-medium text-slate-800">{fmtValue(profile?.address2)}</p></div>
                <div><span className="text-slate-500">Province</span><p className="font-medium text-slate-800">{fmtValue(profile?.province)}</p></div>
                <div><span className="text-slate-500">Postcode</span><p className="font-medium text-slate-800">{fmtValue(profile?.postcode)}</p></div>
                <div className="md:col-span-2"><span className="text-slate-500">Country</span><p className="font-medium text-slate-800">{fmtValue(profile?.country)}</p></div>
              </div>
            </div>
          </div>

          {/* Fleet Base Location */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Fleet Base Location</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2">
                <span className="text-slate-500">Base Address</span>
                <p className="font-medium text-slate-800">{fmtValue(profile?.base_address)}</p>
              </div>
              <div><span className="text-slate-500">Latitude</span><p className="font-medium text-slate-800">{profile?.base_lat ?? "—"}</p></div>
              <div><span className="text-slate-500">Longitude</span><p className="font-medium text-slate-800">{profile?.base_lng ?? "—"}</p></div>
              {profile?.service_radius_km && (
                <div className="md:col-span-2">
                  <span className="text-slate-500">Coverage Radius</span>
                  <p className="font-medium text-slate-800">{profile.service_radius_km} km — Customer requests within this radius will be sent to you.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Account Actions */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Account Actions</h2>
            <div className="mt-5 space-y-3">
              <a href="/partner/profile" className="block rounded-full bg-[#ff7a00] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">Edit Profile</a>
              <a href="/partner/fleet" className="block rounded-full border border-[#003768] px-5 py-3 text-center text-sm font-semibold text-[#003768] hover:bg-[#003768]/5">Manage Fleet</a>
              <a href="/partner/drivers" className="block rounded-full border border-[#003768] px-5 py-3 text-center text-sm font-semibold text-[#003768] hover:bg-[#003768]/5">Manage Drivers</a>
            </div>
          </div>

          {/* Application */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Application</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(application?.status)}`}>
                    {fmtStatus(application?.status)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Applied</span>
                <p className="font-medium text-slate-800">{fmtDateTime(application?.created_at)}</p>
              </div>
              {application?.status === "pending" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">Your application is under review. You will be notified by email once approved.</div>
              )}
              {application?.status === "approved" && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">Your account is approved. Complete your profile setup to go live.</div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Terms & Conditions</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Version accepted</span>
                <p className="font-medium text-slate-800">
                  {application?.terms_version ? `v${application.terms_version}` : "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Accepted on</span>
                <p className="font-medium text-slate-800">
                  {fmtDate(application?.terms_accepted_at)}
                </p>
              </div>
              {application?.terms_accepted_at && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                  ✓ You have accepted the current Partner Terms and Conditions.
                </div>
              )}
              <div className="pt-1">
                <a
                  href="/partner/terms"
                  target="_blank"
                  className="block rounded-full border border-[#003768] px-5 py-2.5 text-center text-sm font-semibold text-[#003768] hover:bg-[#003768]/5"
                >
                  View Current T&Cs
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-[#003768]">Quick Links</h2>
            <div className="mt-4 space-y-2 text-sm">
              {[
                { label: "View My Bookings",  href: "/partner/bookings" },
                { label: "View My Requests",  href: "/partner/requests" },
                { label: "Report Management", href: "/partner/reports" },
                { label: "My Drivers",        href: "/partner/drivers" },
                { label: "My Fleet",          href: "/partner/fleet" },
              ].map(({ label, href }) => (
                <a key={href} href={href} className="flex items-center justify-between rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 font-medium text-[#003768] hover:bg-[#f3f8ff] transition-colors">
                  {label}<span className="text-slate-400">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operating Rules */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Partner Operating Rules</h2>
            <p className="mt-1 text-sm text-slate-500">These rules govern your conduct as a Camel Global partner. By operating on the platform you agree to comply with all sections below.</p>
          </div>
          <button
            type="button"
            onClick={() => downloadOperatingRulesPDF(profile?.company_name || "Partner")}
            className="shrink-0 rounded-full bg-[#003768] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            ⬇ Download PDF
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {OPERATING_RULES.map(({ section, rules }) => (
            <div key={section} className="rounded-2xl border border-black/5 bg-slate-50 p-5">
              <h3 className="text-base font-bold text-[#003768]">{section}</h3>
              <ol className="mt-3 space-y-2">
                {rules.map((rule, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="shrink-0 font-semibold text-[#003768]">{i + 1}.</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400 text-center">Camel Global Partner Operating Rules — Last updated April 2026 — Subject to change with 14 days' notice.</p>
      </div>
    </div>
  );
}