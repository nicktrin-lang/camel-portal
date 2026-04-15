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
  default_currency:  { label: "Billing currency not set",             href: "/partner/profile" },
  vat_number:        { label: "VAT / NIF number not set",             href: "/partner/profile" },
};

// ── Operating Rules ───────────────────────────────────────────────────────────

const OPERATING_RULES = [
  {
    section: "1. Platform Overview",
    rules: [
      "Camel Global is a meet-and-greet car hire platform connecting customers with independent car hire partners across Spain and internationally.",
      "Partners are independent businesses that agree to operate within the Camel Global marketplace in accordance with these rules.",
      "Camel Global acts as a marketplace facilitator and does not own or operate any vehicles directly.",
      "By registering and operating as a partner, you agree to be bound by these operating rules in full.",
    ],
  },
  {
    section: "2. Partner Eligibility & Approval",
    rules: [
      "All partner applications are subject to review and approval by Camel Global before any bids can be submitted.",
      "Partners must hold all legally required licences, permits, and insurance required to operate a car hire business in their jurisdiction.",
      "Partners must maintain a valid public liability insurance policy for a minimum of €5,000,000 coverage.",
      "Partners must have a physical base location within the service area from which vehicles can be dispatched.",
      "Any change in company ownership, legal status, or operating licences must be reported to Camel Global within 7 days.",
      "Camel Global reserves the right to suspend or terminate partner accounts at any time for breach of these rules.",
    ],
  },
  {
    section: "3. Bidding & Pricing",
    rules: [
      "Partners may bid on any customer request that falls within their service radius.",
      "All bid prices must be submitted in the partner's designated billing currency (EUR, GBP, or USD).",
      "Prices quoted must be fully inclusive — no additional charges may be added to the customer after a bid is accepted.",
      "Car hire prices must cover all standard costs including vehicle delivery, collection, and return.",
      "The fuel deposit quoted must reflect the actual full tank cost of the vehicle being offered.",
      "Partners must not submit bids they are unable to fulfil. Unfulfilled bookings may result in account suspension.",
      "Partners may only submit one bid per customer request.",
      "Bid windows are set by the customer at time of request. Bids submitted after expiry will not be accepted.",
    ],
  },
  {
    section: "4. Vehicle Standards",
    rules: [
      "All vehicles offered must be roadworthy, legally registered, and fully insured at the time of hire.",
      "Vehicles must be clean, well-maintained, and presented to the customer in a professional condition.",
      "The vehicle delivered must match the category bid upon (e.g. Standard Saloon, SUV, Minivan).",
      "Substituting a lower-category vehicle without customer agreement is not permitted and may result in a dispute.",
      "Partners must ensure all vehicles have at least a full tank of fuel at the point of collection.",
      "Vehicles must comply with all local emissions and environmental regulations.",
      "Air conditioning must be fully functional on all vehicles offered during summer months (April–October in Spain).",
    ],
  },
  {
    section: "5. Fuel Policy & Charging",
    rules: [
      "Camel Global operates a fair fuel policy: customers pay only for the fuel they use, rounded to the nearest quarter tank.",
      "The driver must record the fuel level at collection and at return using the Camel Global driver app.",
      "The customer must confirm and agree with the fuel reading at both collection and return stages.",
      "In the event of a dispute over fuel levels, the partner's office may override the driver reading with photographic evidence.",
      "Fuel charges are calculated automatically: fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Any unused fuel is refunded to the customer. Partners must not retain fuel refund amounts.",
      "Failure to accurately record fuel levels that results in overcharging a customer will result in the full disputed amount being refunded and a formal warning issued.",
    ],
  },
  {
    section: "6. Driver Standards",
    rules: [
      "All drivers dispatched via the Camel Global platform must be registered in the partner's driver portal.",
      "Drivers must hold a valid driving licence appropriate for the vehicle category being delivered.",
      "Drivers must behave professionally and courteously at all times when interacting with customers.",
      "Drivers must carry a copy of the booking confirmation when delivering or collecting a vehicle.",
      "Drivers must not use their mobile phone while driving during any Camel Global booking.",
      "Any driver receiving two or more customer complaints may be removed from the platform at Camel Global's discretion.",
      "Partners are fully responsible for the conduct of all drivers registered under their account.",
    ],
  },
  {
    section: "7. Customer Service",
    rules: [
      "Partners must respond to customer enquiries related to active bookings within 2 hours during business hours.",
      "Business hours are defined as 08:00–20:00 local time, 7 days a week.",
      "Out-of-hours emergency contact must be provided for all active bookings.",
      "Partners must honour any booking accepted through the platform. Cancellations initiated by the partner without exceptional justification are a breach of these rules.",
      "If a vehicle cannot be provided due to a breakdown or emergency, a suitable replacement must be offered within 2 hours.",
      "Customer complaints must be acknowledged within 24 hours and resolved or escalated within 5 business days.",
    ],
  },
  {
    section: "8. Insurance & Liability",
    rules: [
      "Partners are fully responsible for the insurance of all vehicles on the platform at all times.",
      "Full comprehensive insurance must be in place for each vehicle hired through the platform.",
      "Where the bid includes 'Full Insurance Included', this must be genuinely comprehensive insurance and not a damage waiver with excess.",
      "Partners indemnify Camel Global against any claims arising from the partner's vehicles, drivers, or operations.",
      "Camel Global is not liable for any loss, damage, or injury caused by a partner's vehicle or driver.",
      "Partners must report any accident, theft, or significant incident involving a Camel Global booking within 24 hours.",
    ],
  },
  {
    section: "9. Revenue & Payments",
    rules: [
      "Camel Global charges a 20% commission on the car hire price for each completed booking, with a minimum commission of €10 per booking.",
      "Fuel charges are passed through to the partner in full — Camel Global takes no commission on fuel.",
      "Commission is deducted automatically at the point of payment via Stripe Connect — partners receive their net amount directly.",
      "Partners are responsible for all applicable taxes on income received through the platform.",
      "In the event of a customer refund dispute, Camel Global may mediate but the financial liability rests with the partner.",
      "All fuel refunds owed to customers must be processed within 5 business days of the booking completion.",
    ],
  },
  {
    section: "10. Data & Privacy",
    rules: [
      "Customer data shared via the platform (name, phone, email, pickup/dropoff address) may only be used for the purpose of fulfilling the booking.",
      "Partners must not use customer data for marketing, re-targeting, or any other commercial purpose.",
      "Customer data must be stored securely and not shared with third parties.",
      "Partners must comply with GDPR (General Data Protection Regulation) and any applicable local data protection laws.",
      "On request, customer data must be deleted from partner systems within 30 days.",
    ],
  },
  {
    section: "11. Suspension & Termination",
    rules: [
      "Camel Global may suspend a partner account immediately in the event of: a serious customer complaint, breach of vehicle or driver standards, failure to fulfil a confirmed booking, or misrepresentation of pricing or services.",
      "Suspended accounts will be notified by email and given the opportunity to respond within 5 business days.",
      "Camel Global reserves the right to permanently terminate accounts for repeated breaches or a single serious violation.",
      "Partners may terminate their account at any time by providing 30 days written notice, provided no active bookings remain outstanding.",
      "On termination, all access to the platform will be revoked and customer data must be deleted within 30 days.",
    ],
  },
  {
    section: "12. Amendments",
    rules: [
      "Camel Global reserves the right to amend these operating rules at any time.",
      "Partners will be notified of any material changes by email with a minimum of 14 days' notice.",
      "Continued use of the platform after the notice period constitutes acceptance of the updated rules.",
      "The current version of these rules is always available in the partner account management section.",
    ],
  },
];

function downloadOperatingRulesPDF(companyName: string) {
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const rulesHtml = OPERATING_RULES.map(({ section, rules }) => `
    <div style="margin-bottom:24px;">
      <h3 style="color:#003768;font-size:14px;font-weight:700;margin:0 0 8px 0;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${section}</h3>
      <ol style="margin:0;padding-left:20px;">
        ${rules.map(r => `<li style="font-size:11px;color:#334155;margin-bottom:5px;line-height:1.5;">${r}</li>`).join("")}
      </ol>
    </div>
  `).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Camel Global — Partner Operating Rules</title>
  <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #003768; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; color: #003768; letter-spacing: -1px; } .logo span { color: #ff7a00; }
  .meta { text-align: right; font-size: 11px; color: #64748b; } h1 { font-size: 20px; color: #003768; font-weight: 800; margin-bottom: 4px; }
  h2 { font-size: 12px; color: #64748b; font-weight: 400; margin-bottom: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }</style>
  </head><body>
  <div class="header"><div><div class="logo">🐪 Camel <span>Global</span></div><div style="font-size:11px;color:#64748b;margin-top:4px;">Meet and greet car hire</div></div>
  <div class="meta"><div><strong>Partner Operating Rules</strong></div><div>Issued to: ${companyName || "Partner"}</div><div>Generated: ${dateStr}</div></div></div>
  <h1>Partner Operating Rules</h1>
  <h2>These rules govern the conduct of all partners operating on the Camel Global platform. By operating as a partner you agree to comply with all sections below.</h2>
  ${rulesHtml}
  <div class="footer">Camel Global — Partner Operating Rules — Generated ${dateStr} — camelglobal.com</div>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) { win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500); }; }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
          <button type="button" onClick={() => downloadOperatingRulesPDF(profile?.company_name || "Partner")}
            className="shrink-0 rounded-full bg-[#003768] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
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