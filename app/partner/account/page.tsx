"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { OPERATING_RULES, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router   = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [profile,     setProfile]     = useState<AccountProfile | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [email,       setEmail]       = useState<string>("");
  const [liveStatus,  setLiveStatus]  = useState<LiveStatus | null>(null);

  // Build MISSING_LABELS from translated strings
  const MISSING_LABELS: Record<string, { label: string; href: string }> = {
    service_radius_km: { label: t("account.missing.service_radius_km"), href: "/partner/profile" },
    base_address:      { label: t("account.missing.base_address"),       href: "/partner/profile" },
    base_location:     { label: t("account.missing.base_location"),      href: "/partner/profile" },
    base_lat:          { label: t("account.missing.base_lat"),           href: "/partner/profile" },
    base_lng:          { label: t("account.missing.base_lng"),           href: "/partner/profile" },
    fleet:             { label: t("account.missing.fleet"),              href: "/partner/fleet" },
    driver:            { label: t("account.missing.driver"),             href: "/partner/drivers" },
    default_currency:  { label: t("account.missing.default_currency"),   href: "/partner/profile" },
    vat_number:        { label: t("account.missing.vat_number"),         href: "/partner/profile" },
  };

  function currencyLabel(currency?: string | null) {
    switch (String(currency || "").toUpperCase()) {
      case "EUR": return t("account.currency.eur");
      case "GBP": return t("account.currency.gbp");
      case "USD": return t("account.currency.usd");
      default:    return t("account.currency.notSet");
    }
  }

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

        if (profileErr) throw new Error(profileErr.message || t("account.error.load"));
        if (appErr)     throw new Error(appErr.message     || t("account.error.load"));
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
        setError(e?.message || t("account.error.load"));
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
      <p className="text-sm font-bold text-black/50">{t("account.loading")}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("account.card.company"),         value: fmtValue(profile?.company_name) },
          { label: t("account.card.appStatus"),        value: fmtStatus(application?.status), pill: true, status: application?.status },
          { label: t("account.card.serviceRadius"),    value: profile?.service_radius_km ? `${profile.service_radius_km} km` : "—" },
          { label: t("account.card.billingCurrency"),  value: currencyLabel(profile?.default_currency) },
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
                <p className="font-black text-white">{t("account.live.title")}</p>
                <p className="text-sm font-bold text-white/60">{t("account.live.body")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-black text-amber-800">{t("account.notLive.title")}</p>
                <p className="mt-1 text-sm font-bold text-amber-700">{t("account.notLive.body")}</p>
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
          <Section title={t("account.section.companyDetails")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("account.field.contactName")}>{fmtValue(profile?.contact_name)}</Field>
              <Field label={t("account.field.email")}>{fmtValue(email)}</Field>
              <Field label={t("account.field.phone")}>{fmtValue(profile?.phone)}</Field>
              <Field label={t("account.field.website")}>{fmtValue(profile?.website)}</Field>
              <Field label={t("account.field.billingCurrency")}>{currencyLabel(profile?.default_currency)}</Field>
              <Field label={t("account.field.serviceRadius")}>{profile?.service_radius_km ? `${profile.service_radius_km} km` : "—"}</Field>
            </div>
          </Section>

          {/* Commission Rate */}
          <Section title={t("account.section.commission")} subtitle={t("account.section.commission.subtitle")}>
            <div className="flex items-center gap-4">
              <div className="border border-black/10 bg-[#f0f0f0] px-6 py-4">
                <p className="text-xs font-black uppercase tracking-widest text-black/40">{t("account.commission.currentRate")}</p>
                <p className="mt-1 text-3xl font-black text-black">{commissionRate}%</p>
              </div>
              <div className="text-sm font-bold text-black/50 space-y-1">
                <p>{t("account.commission.note1")} <strong className="text-black">{t("account.commission.note1.bold")}</strong>{t("account.commission.note1.end")}</p>
                <p>{t("account.commission.note2.pre")} <strong className="text-black">{t("account.commission.note2.bold")}</strong>{t("account.commission.note2.end")}</p>
                <p>{t("account.commission.note3.pre")} <strong className="text-black">{t("account.commission.note3.bold")}</strong> {t("account.commission.note3.end")}</p>
                {commissionRate < 20 && (
                  <p className="text-[#ff7a00] font-black">{t("account.commission.reduced")}</p>
                )}
              </div>
            </div>
          </Section>

          {/* Business & Billing */}
          <Section title={t("account.section.billing")} subtitle={t("account.section.billing.subtitle")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label={t("account.field.legalName")}>{fmtValue(profile?.legal_company_name)}</Field>
              </div>
              <Field label={t("account.field.regNumber")}>{fmtValue(profile?.company_registration_number)}</Field>
              <Field label={t("account.field.vatNumber")}>
                <div className="flex items-center gap-2">
                  <span>{fmtValue(profile?.vat_number)}</span>
                  {profile?.vat_number
                    ? <span className="border border-black/20 px-2 py-0.5 text-xs font-black text-black">{t("account.vat.provided")}</span>
                    : <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">{t("account.vat.required")}</span>}
                </div>
              </Field>
            </div>
            {!profile?.vat_number && (
              <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {t("account.vat.warning")}{" "}
                <a href="/partner/profile" className="font-black underline">{t("account.vat.warningLink")}</a>
              </div>
            )}
          </Section>

          {/* Business Address */}
          <Section title={t("account.section.bizAddress")}>
            <div className="space-y-4">
              <Field label={t("account.field.fullAddress")}>{fullBizAddress}</Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t("account.field.addr1")}>{fmtValue(profile?.address1)}</Field>
                <Field label={t("account.field.addr2")}>{fmtValue(profile?.address2)}</Field>
                <Field label={t("account.field.city")}>{fmtValue(profile?.city)}</Field>
                <Field label={t("account.field.province")}>{fmtValue(profile?.province)}</Field>
                <Field label={t("account.field.postcode")}>{fmtValue(profile?.postcode)}</Field>
                <Field label={t("account.field.country")}>{fmtValue(profile?.country)}</Field>
              </div>
            </div>
          </Section>

          {/* Fleet Base Location */}
          <Section title={t("account.section.fleetBase")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label={t("account.field.fullAddress")}>{fullFleetAddress}</Field>
              </div>
              <Field label={t("account.field.addr1")}>{fmtValue(profile?.base_address1)}</Field>
              <Field label={t("account.field.addr2")}>{fmtValue(profile?.base_address2)}</Field>
              <Field label={t("account.field.city")}>{fmtValue(profile?.base_city)}</Field>
              <Field label={t("account.field.province")}>{fmtValue(profile?.base_province)}</Field>
              <Field label={t("account.field.postcode")}>{fmtValue(profile?.base_postcode)}</Field>
              <Field label={t("account.field.country")}>{fmtValue(profile?.base_country)}</Field>
              <Field label={t("account.field.gps")}>{profile?.base_lat && profile?.base_lng ? `${profile.base_lat}, ${profile.base_lng}` : "—"}</Field>
              {profile?.service_radius_km && (
                <div className="md:col-span-2">
                  <Field label={t("account.field.coverageRadius")}>
                    {t("account.field.coverageRadius.body", { radius: String(profile.service_radius_km) })}
                  </Field>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title={t("account.actions.title")}>
            <div className="space-y-3">
              <a href="/partner/profile" className="block bg-[#ff7a00] px-5 py-3 text-center text-sm font-black text-white hover:opacity-90 transition-opacity">{t("account.actions.editProfile")}</a>
              <a href="/partner/fleet"   className="block border border-black/20 px-5 py-3 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">{t("account.actions.manageFleet")}</a>
              <a href="/partner/drivers" className="block border border-black/20 px-5 py-3 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">{t("account.actions.manageDrivers")}</a>
            </div>
          </Section>

          <Section title={t("account.application.title")}>
            <div className="space-y-3 text-sm">
              <Field label={t("account.field.status")}>
                <span className={`inline-flex border px-3 py-1 text-xs font-black uppercase tracking-widest capitalize ${statusPillClasses(application?.status)}`}>
                  {fmtStatus(application?.status)}
                </span>
              </Field>
              <Field label={t("account.field.applied")}>{fmtDateTime(application?.created_at)}</Field>
              {application?.status === "pending" && (
                <div className="border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
                  {t("account.application.pending")}
                </div>
              )}
              {application?.status === "approved" && (
                <div className="border border-black/10 bg-[#f0f0f0] p-3 text-xs font-bold text-black/60">
                  {t("account.application.approved")}
                </div>
              )}
            </div>
          </Section>

          <Section title={t("account.terms.title")}>
            <div className="space-y-3 text-sm">
              <Field label={t("account.terms.versionAccepted")}>{application?.terms_version ? `v${application.terms_version}` : "—"}</Field>
              <Field label={t("account.terms.acceptedOn")}>{fmtDate(application?.terms_accepted_at)}</Field>
              {application?.terms_accepted_at && (
                <div className="border border-black/10 bg-[#f0f0f0] p-3 text-xs font-bold text-black/60">
                  {t("account.terms.confirmed")}
                </div>
              )}
              <a href="/partner/terms" target="_blank"
                className="block border border-black/20 px-5 py-2.5 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">
                {t("account.terms.viewCta")}
              </a>
            </div>
          </Section>

          <Section title={t("account.quickLinks.title")}>
            <div className="space-y-2">
              {[
                { label: t("account.quickLinks.bookings"), href: "/partner/bookings" },
                { label: t("account.quickLinks.requests"), href: "/partner/requests" },
                { label: t("account.quickLinks.reports"),  href: "/partner/reports" },
                { label: t("account.quickLinks.drivers"),  href: "/partner/drivers" },
                { label: t("account.quickLinks.fleet"),    href: "/partner/fleet" },
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
            <h2 className="text-2xl font-black text-black">{t("account.rules.title")}</h2>
            <p className="mt-1 text-xs font-bold text-black/40">{t("account.rules.subtitle")}</p>
          </div>
          <button type="button" onClick={() => downloadOperatingRulesPDF(profile?.company_name || "Partner")}
            className="shrink-0 bg-black px-5 py-2.5 text-sm font-black text-white hover:opacity-80 transition-opacity">
            {t("account.rules.downloadPdf")}
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
        <p className="mt-6 text-xs font-bold text-black/30 text-center">{t("account.rules.footer")}</p>
      </div>
    </div>
  );
}