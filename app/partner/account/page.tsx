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
  city: string | null;
  province: string | null;
  postcode: string | null;
  country: string | null;
  website: string | null;
  service_radius_km: number | null;
  base_address: string | null;
  base_address1: string | null;
  base_address2: string | null;
  base_city: string | null;
  base_province: string | null;
  base_postcode: string | null;
  base_country: string | null;
  base_lat: number | null;
  base_lng: number | null;
  default_currency: string | null;
  legal_company_name: string | null;
  vat_number: string | null;
  company_registration_number: string | null;
  commission_rate: number | null;
};

type ApplicationRow = {
  status: string | null;
  created_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
};

type LiveStatus = { isLive: boolean; missing: string[] };

function fmtValue(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}
function fmtStatus(value?: string | null) { return String(value || "—").replaceAll("_", " "); }
function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}
function fmtDate(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return value; }
}
function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved": return "border-black/20 bg-black text-white";
    case "pending":  return "border-amber-300 bg-amber-50 text-amber-700";
    case "rejected": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-black/10 bg-white text-black/60";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-black uppercase tracking-widest text-black/40">{label}</span>
      <div className="mt-1 font-bold text-black">{children}</div>
    </div>
  );
}
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-black/5 bg-white p-6">
      <h2 className="text-lg font-black text-black">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs font-bold text-black/40">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function PartnerAccountPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [profile,     setProfile]     = useState<AccountProfile | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [email,       setEmail]       = useState<string>("");
  const [liveStatus,  setLiveStatus]  = useState<LiveStatus | null>(null);

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
              .select("company_name,contact_name,phone,address,address1,address2,city,province,postcode,country,website,service_radius_km,base_address,base_address1,base_address2,base_city,base_province,base_postcode,base_country,base_lat,base_lng,default_currency,legal_company_name,vat_number,company_registration_number,commission_rate")
              .eq("user_id", user.id).maybeSingle(),
            supabase.from("partner_applications")
              .select("status,created_at,terms_accepted_at,terms_version")
              .eq("email", normalizedEmail)
              .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);

        if (profileErr) throw new Error(profileErr.message || "Failed to load account.");
        if (appErr)     throw new Error(appErr.message     || "Failed to load application.");
        if (!mounted) return;

        setProfile((profileRow || null) as AccountProfile | null);
        setApplication((applicationRow || null) as ApplicationRow | null);
        setEmail(normalizedEmail);

        try {
          const liveRes = await fetch("/api/partner/refresh-live-status", { method: "POST", cache: "no-store", credentials: "include" });
          if (liveRes.ok) {
            const liveJson = await liveRes.json();
            if (mounted) setLiveStatus({
              isLive:  liveJson?.isLiveNow ?? liveJson?.becameLive ?? false,
              missing: Array.isArray(liveJson?.missing) ? liveJson.missing : [],
            });
          }
        } catch {}
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load account.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [router, supabase]);

  const fullBizAddress = profile?.address ||
    [profile?.address1, profile?.address2, profile?.city, profile?.province, profile?.postcode, profile?.country]
      .filter(Boolean).join(", ") || "—";

  const fullFleetAddress = profile?.base_address ||
    [profile?.base_address1, profile?.base_address2, profile?.base_city, profile?.base_province, profile?.base_postcode, profile?.base_country]
      .filter(Boolean).join(", ") || "—";

  const commissionRate = profile?.commission_rate ?? 20;

  if (loading) return (
    <div className="border border-black/5 bg-white p-8">
      <p className="text-sm font-bold text-black/50">Loading…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Company",            value: fmtValue(profile?.company_name) },
          { label: "Application Status", value: fmtStatus(application?.status), pill: true, status: application?.status },
          { label: "Service Radius",     value: profile?.service_radius_km ? `${profile.service_radius_km} km` : "—" },
          { label: "Billing Currency",   value: currencyLabel(profile?.default_currency) },
        ].map(({ label, value, pill, status }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            {pill ? (
              <div className="mt-2">
                <span className={`inline-flex border px-3 py-1 text-xs font-black uppercase tracking-widest capitalize ${statusPillClasses(status)}`}>{value}</span>
              </div>
            ) : (
              <p className="mt-1 text-lg font-black text-black">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Live Status Banner */}
      {liveStatus && (
        liveStatus.isLive ? (
          <div className="border border-black/10 bg-black p-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-black text-white">Your account is live</p>
                <p className="text-sm font-bold text-white/60">You are visible to customers and can receive and bid on requests within your service radius.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-black text-amber-800">Your account is not yet live</p>
                <p className="mt-1 text-sm font-bold text-amber-700">Complete the following to go live and start receiving customer requests:</p>
                {liveStatus.missing.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {liveStatus.missing.map(m => {
                      const info = MISSING_LABELS[m] ?? { label: m, href: "/partner/profile" };
                      return (
                        <li key={m}>
                          <a href={info.href}
                            className="inline-flex items-center gap-1.5 border border-amber-300 bg-white px-3 py-1.5 text-sm font-black text-amber-800 hover:bg-amber-100 transition-colors">
                            → {info.label}
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
          <Section title="Company Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Contact Name">{fmtValue(profile?.contact_name)}</Field>
              <Field label="Email">{fmtValue(email)}</Field>
              <Field label="Phone">{fmtValue(profile?.phone)}</Field>
              <Field label="Website">{fmtValue(profile?.website)}</Field>
              <Field label="Billing Currency">{currencyLabel(profile?.default_currency)}</Field>
              <Field label="Service Radius">{profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}</Field>
            </div>
          </Section>

          {/* Commission Rate */}
          <Section title="Camel Commission Rate" subtitle="The rate applied to your car hire price on each completed booking.">
            <div className="flex items-center gap-4">
              <div className="border border-black/10 bg-[#f0f0f0] px-6 py-4">
                <p className="text-xs font-black uppercase tracking-widest text-black/40">Your current rate</p>
                <p className="mt-1 text-3xl font-black text-black">{commissionRate}%</p>
              </div>
              <div className="text-sm font-bold text-black/50 space-y-1">
                <p>Applied to the <strong className="text-black">car hire price only</strong>.</p>
                <p>Fuel charges pass through to you at <strong className="text-black">100%</strong>.</p>
                <p>Minimum commission of <strong className="text-black">€10</strong> per booking always applies.</p>
                {commissionRate < 20 && (
                  <p className="text-[#ff7a00] font-black">✓ You have a reduced rate by agreement with Camel Global.</p>
                )}
              </div>
            </div>
          </Section>

          {/* Business & Billing */}
          <Section title="Business & Billing" subtitle="Your legal details used for commission invoicing.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Legal Company Name">{fmtValue(profile?.legal_company_name)}</Field>
              </div>
              <Field label="Company Registration Number">{fmtValue(profile?.company_registration_number)}</Field>
              <Field label="VAT / NIF Number">
                <div className="flex items-center gap-2">
                  <span>{fmtValue(profile?.vat_number)}</span>
                  {profile?.vat_number
                    ? <span className="border border-black/20 px-2 py-0.5 text-xs font-black text-black">✓ Provided</span>
                    : <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">Required</span>}
                </div>
              </Field>
            </div>
            {!profile?.vat_number && (
              <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                ⚠️ Your VAT / NIF number is required before your account can go live.{" "}
                <a href="/partner/profile" className="font-black underline">Add it in your profile →</a>
              </div>
            )}
          </Section>

          {/* Business Address */}
          <Section title="Business Address">
            <div className="space-y-4">
              <Field label="Full Address">{fullBizAddress}</Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Address Line 1">{fmtValue(profile?.address1)}</Field>
                <Field label="Address Line 2">{fmtValue(profile?.address2)}</Field>
                <Field label="City / Town">{fmtValue(profile?.city)}</Field>
                <Field label="Province">{fmtValue(profile?.province)}</Field>
                <Field label="Postcode">{fmtValue(profile?.postcode)}</Field>
                <Field label="Country">{fmtValue(profile?.country)}</Field>
              </div>
            </div>
          </Section>

          {/* Fleet Base Location */}
          <Section title="Fleet Base Location">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Full Address">{fullFleetAddress}</Field>
              </div>
              <Field label="Address Line 1">{fmtValue(profile?.base_address1)}</Field>
              <Field label="Address Line 2">{fmtValue(profile?.base_address2)}</Field>
              <Field label="City / Town">{fmtValue(profile?.base_city)}</Field>
              <Field label="Province">{fmtValue(profile?.base_province)}</Field>
              <Field label="Postcode">{fmtValue(profile?.base_postcode)}</Field>
              <Field label="Country">{fmtValue(profile?.base_country)}</Field>
              <Field label="GPS">{profile?.base_lat && profile?.base_lng ? `${profile.base_lat}, ${profile.base_lng}` : "—"}</Field>
              {profile?.service_radius_km && (
                <div className="md:col-span-2">
                  <Field label="Coverage Radius">{profile.service_radius_km} km — Customer requests within this radius will be sent to you.</Field>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Account Actions">
            <div className="space-y-3">
              <a href="/partner/profile" className="block bg-[#ff7a00] px-5 py-3 text-center text-sm font-black text-white hover:opacity-90 transition-opacity">Edit Profile</a>
              <a href="/partner/fleet"   className="block border border-black/20 px-5 py-3 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">Manage Fleet</a>
              <a href="/partner/drivers" className="block border border-black/20 px-5 py-3 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">Manage Drivers</a>
            </div>
          </Section>

          <Section title="Application">
            <div className="space-y-3 text-sm">
              <Field label="Status">
                <span className={`inline-flex border px-3 py-1 text-xs font-black uppercase tracking-widest capitalize ${statusPillClasses(application?.status)}`}>
                  {fmtStatus(application?.status)}
                </span>
              </Field>
              <Field label="Applied">{fmtDateTime(application?.created_at)}</Field>
              {application?.status === "pending" && (
                <div className="border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
                  Your application is under review. You will be notified by email once approved.
                </div>
              )}
              {application?.status === "approved" && (
                <div className="border border-black/10 bg-[#f0f0f0] p-3 text-xs font-bold text-black/60">
                  Your account is approved. Complete your profile setup to go live.
                </div>
              )}
            </div>
          </Section>

          <Section title="Terms & Conditions">
            <div className="space-y-3 text-sm">
              <Field label="Version accepted">{application?.terms_version ? `v${application.terms_version}` : "—"}</Field>
              <Field label="Accepted on">{fmtDate(application?.terms_accepted_at)}</Field>
              {application?.terms_accepted_at && (
                <div className="border border-black/10 bg-[#f0f0f0] p-3 text-xs font-bold text-black/60">
                  ✓ You have accepted the current Partner Terms and Conditions.
                </div>
              )}
              <a href="/partner/terms" target="_blank"
                className="block border border-black/20 px-5 py-2.5 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">
                View Current T&Cs
              </a>
            </div>
          </Section>

          <Section title="Quick Links">
            <div className="space-y-2">
              {[
                { label: "View My Bookings",  href: "/partner/bookings" },
                { label: "View My Requests",  href: "/partner/requests" },
                { label: "Report Management", href: "/partner/reports" },
                { label: "My Drivers",        href: "/partner/drivers" },
                { label: "My Fleet",          href: "/partner/fleet" },
              ].map(({ label, href }) => (
                <a key={href} href={href}
                  className="flex items-center justify-between border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
                  {label}<span className="text-black/30">→</span>
                </a>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Operating Rules */}
      <div className="border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-black">Partner Operating Rules</h2>
            <p className="mt-1 text-xs font-bold text-black/40">These rules govern your conduct as a Camel Global partner. By operating on the platform you agree to comply with all sections below.</p>
          </div>
          <button type="button" onClick={() => downloadOperatingRulesPDF(profile?.company_name || "Partner")}
            className="shrink-0 bg-black px-5 py-2.5 text-sm font-black text-white hover:opacity-80 transition-opacity">
            ⬇ Download PDF
          </button>
        </div>
        <div className="mt-6 space-y-4">
          {OPERATING_RULES.map(({ section, rules }) => (
            <div key={section} className="border border-black/5 bg-[#f0f0f0] p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-black">{section}</h3>
              <ol className="mt-3 space-y-2">
                {rules.map((rule, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 font-black text-black/40">{i + 1}.</span>
                    <span className="font-bold text-black/70">{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs font-bold text-black/30 text-center">Camel Global Partner Operating Rules — Last updated April 2026 — Subject to change with 14 days' notice.</p>
      </div>
    </div>
  );
}