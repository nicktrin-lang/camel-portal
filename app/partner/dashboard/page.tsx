"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Profile = {
  contact_name: string | null;
  company_name: string | null;
  address: string | null;
  service_radius_km: number | null;
  default_currency: string | null;
  base_lat: number | null;
  base_lng: number | null;
  country: string | null;
  vat_number: string | null;
  stripe_onboarding_complete: boolean | null;
};

type BookingRow = {
  id: string;
  booking_status: string | null;
  amount: number | null;
  currency: string | null;
  job_number: number | null;
  created_at: string | null;
  pickup_address: string | null;
  customer_name: string | null;
  driver_name: string | null;
};

type RequestRow = {
  id: string;
  status: string | null;
  job_number: number | null;
  created_at: string | null;
  pickup_address: string | null;
  expires_at: string | null;
};

type LiveStatus = { isLive: boolean; missing: string[] };

const MISSING_LABELS: Record<string, { label: string; href: string }> = {
  service_radius_km: { label: "Service radius not set",         href: "/partner/profile" },
  base_address:      { label: "Fleet base address missing",     href: "/partner/profile" },
  base_location:     { label: "Fleet base map pin missing",     href: "/partner/profile" },
  base_lat:          { label: "Fleet base location missing",    href: "/partner/profile" },
  base_lng:          { label: "Fleet base location missing",    href: "/partner/profile" },
  fleet:             { label: "No active fleet vehicles added", href: "/partner/fleet" },
  driver:            { label: "No active drivers added",        href: "/partner/drivers" },
  default_currency:  { label: "Billing currency not set",       href: "/partner/profile" },
  vat_number:        { label: "VAT / NIF number not set",       href: "/partner/profile" },
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso ?? "—"; }
}

function fmtAmt(amount: number | null, currency: string | null) {
  if (amount == null || isNaN(amount)) return "—";
  const curr = (currency ?? "EUR") as "EUR" | "GBP" | "USD";
  const locale = curr === "EUR" ? "es-ES" : curr === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
}

function statusPill(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (["completed", "confirmed", "bid_successful"].includes(s)) return "border-green-200 bg-green-50 text-green-700";
  if (["driver_assigned", "en_route", "arrived", "collected", "returned"].includes(s)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["open", "bid_submitted"].includes(s)) return "border-blue-200 bg-blue-50 text-blue-700";
  if (["cancelled", "expired", "bid_unsuccessful"].includes(s)) return "border-red-200 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-black/60";
}

function fmtStatus(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "collected": case "returned": return "On Hire";
    case "driver_assigned": return "Driver Assigned";
    case "en_route": return "En Route";
    case "bid_submitted": return "Bid Submitted";
    case "bid_successful": return "Bid Won";
    case "bid_unsuccessful": return "Bid Lost";
    default: return String(s || "—").replaceAll("_", " ");
  }
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export default function PartnerDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [appStatus,      setAppStatus]      = useState("pending");
  const [email,          setEmail]          = useState("");
  const [bookings,       setBookings]       = useState<BookingRow[]>([]);
  const [requests,       setRequests]       = useState<RequestRow[]>([]);
  const [driverCount,    setDriverCount]    = useState(0);
  const [fleetCount,     setFleetCount]     = useState(0);
  const [liveStatus,     setLiveStatus]     = useState<LiveStatus | null>(null);
  const [stripeComplete, setStripeComplete] = useState(false);
  const [stripeLinking,  setStripeLinking]  = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) { router.replace("/partner/login?reason=not_signed_in"); return; }
        const user = userData.user;
        const userEmail = String(user.email || "").trim().toLowerCase();

        const [
          { data: profileRow },
          { data: appRow },
          bkRes, reqRes, drvRes, fleetRes, stripeRes,
        ] = await Promise.all([
          supabase.from("partner_profiles")
            .select("contact_name,company_name,address,service_radius_km,country,default_currency,base_lat,base_lng,vat_number,stripe_onboarding_complete")
            .eq("user_id", user.id).maybeSingle(),
          supabase.from("partner_applications")
            .select("status").eq("email", userEmail)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          fetch("/api/partner/bookings",       { cache: "no-store", credentials: "include" }),
          fetch("/api/partner/requests",       { cache: "no-store", credentials: "include" }),
          fetch("/api/partner/drivers",        { cache: "no-store", credentials: "include" }),
          supabase.from("partner_fleet").select("id").eq("user_id", user.id).eq("is_active", true),
          fetch("/api/partner/stripe/status",  { credentials: "include" }),
        ]);

        const bkJson     = await safeJson(bkRes);
        const reqJson    = await safeJson(reqRes);
        const drvJson    = await safeJson(drvRes);
        const stripeJson = await safeJson(stripeRes);
        if (!mounted) return;

        setProfile(profileRow as Profile | null);
        setAppStatus(String(appRow?.status || "pending"));
        setEmail(userEmail);
        setBookings(Array.isArray(bkJson?.data)   ? bkJson.data.slice(0, 5)  : []);
        setRequests(Array.isArray(reqJson?.data)   ? reqJson.data.slice(0, 5) : []);
        setDriverCount(Array.isArray(drvJson?.data) ? drvJson.data.filter((d: any) => d.is_active).length : 0);
        setFleetCount(Array.isArray(fleetRes?.data)  ? fleetRes.data.length : 0);
        setStripeComplete(stripeJson?.onboarding_complete ?? false);

        try {
          const liveRes = await fetch("/api/partner/refresh-live-status", {
            method: "POST", cache: "no-store", credentials: "include",
          });
          if (liveRes.ok) {
            const liveJson = await liveRes.json();
            if (mounted) setLiveStatus({
              isLive: !!(liveJson?.becameLive || liveJson?.alreadyLive),
              missing: Array.isArray(liveJson?.missing) ? liveJson.missing : [],
            });
          }
        } catch {}
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [router, supabase]);

  async function openStripeDashboard() {
    setStripeLinking(true);
    try {
      const res = await fetch("/api/partner/stripe/dashboard-link", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json?.url) window.open(json.url, "_blank");
    } catch {} finally { setStripeLinking(false); }
  }

  if (loading) return (
    <div className="border border-black/5 bg-white p-8">
      <p className="text-sm font-bold text-black/50">Loading dashboard…</p>
    </div>
  );

  const isApproved        = appStatus.toLowerCase() === "approved";
  const activeBookings    = bookings.filter(b => ["confirmed","driver_assigned","en_route","arrived","collected","returned"].includes(String(b.booking_status||"").toLowerCase()));
  const completedBookings = bookings.filter(b => String(b.booking_status||"").toLowerCase() === "completed");
  const openRequests      = requests.filter(r => String(r.status||"").toLowerCase() === "open");

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Partner Dashboard</h1>
          <p className="mt-1 text-sm font-bold text-black/50">
            Welcome back{profile?.contact_name ? `, ${profile.contact_name}` : ""}
            {profile?.company_name ? ` — ${profile.company_name}` : ""}.
          </p>
        </div>
        <span className={`inline-flex w-full sm:w-auto border px-3 py-1 text-xs font-black uppercase tracking-widest ${
          isApproved ? "border-black/20 bg-black text-white" : "border-amber-300 bg-amber-50 text-amber-700"
        }`}>
          {isApproved ? "✓ Account Approved" : "⏳ Pending Approval"}
        </span>
      </div>

      {/* Stripe payout banner */}
      {!stripeComplete && (
        <div className="border border-[#ff7a00]/30 bg-[#fff7f0] p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">💳</span>
            <div className="flex-1">
              <p className="font-black text-[#c05c00]">Set up payouts to receive booking payments</p>
              <p className="mt-1 text-sm font-bold text-[#c05c00]/80">Connect your bank account via Stripe so you can receive your earnings from completed bookings. Takes about 5 minutes.</p>
              <Link href="/partner/onboarding?step=payouts"
                className="mt-3 inline-flex items-center gap-2 bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 transition-opacity">
                Set Up Payouts →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stripe connected banner */}
      {stripeComplete && (
        <div className="border border-green-200 bg-green-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-green-600 text-white font-black text-xs">✓</span>
            <div>
              <p className="font-black text-green-800">Payouts active</p>
              <p className="text-xs font-bold text-green-700">Completed bookings are paid out monthly to your bank account.</p>
            </div>
          </div>
          <button onClick={openStripeDashboard} disabled={stripeLinking}
            className="w-full sm:w-auto shrink-0 border border-green-300 px-3 py-1.5 text-xs font-black text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50">
            {stripeLinking ? "Opening…" : "Manage Payouts →"}
          </button>
        </div>
      )}

      {/* Live status banner */}
      {liveStatus && !liveStatus.isLive && (
        <div className="border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-black text-amber-800">Your account is not yet live</p>
              <p className="mt-1 text-sm font-bold text-amber-700">Complete the following to start receiving customer requests:</p>
              {liveStatus.missing.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 sm:flex-wrap sm:flex-row">
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
      )}

      {/* Pending approval banner */}
      {!isApproved && (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm">
          <span className="font-black text-amber-800">Your account is under review.</span>
          <span className="font-bold text-amber-700"> You will receive an email once approved. In the meantime you can complete your profile, add your fleet and drivers.</span>
        </div>
      )}

      {/* Stats cards — 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active Bookings", value: activeBookings.length,    link: "/partner/bookings", linkLabel: "View all →",      color: "text-[#ff7a00]" },
          { label: "Open Requests",   value: openRequests.length,      link: "/partner/requests", linkLabel: "View all →",      color: "text-[#ff7a00]" },
          { label: "Completed",       value: completedBookings.length, link: "/partner/reports",  linkLabel: "View reports →",  color: "text-black" },
          { label: "Active Drivers",  value: driverCount,              link: "/partner/drivers",  linkLabel: "Manage drivers →",color: "text-black" },
        ].map(({ label, value, link, linkLabel, color }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
            <Link href={link} className="mt-2 block text-xs font-black text-black/40 hover:text-[#ff7a00] transition-colors">{linkLabel}</Link>
          </div>
        ))}
      </div>

      {/* Quick actions — 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "📋 View Requests", href: "/partner/requests", primary: true },
          { label: "📅 View Bookings", href: "/partner/bookings", primary: false },
          { label: "📊 Reports",       href: "/partner/reports",  primary: false },
          { label: "✏️ Edit Profile",  href: "/partner/profile",  primary: false },
        ].map(({ label, href, primary }) => (
          <Link key={href} href={href}
            className={`px-4 py-3 text-center text-sm font-black transition-opacity hover:opacity-90 ${
              primary ? "bg-[#ff7a00] text-white" : "border border-black/20 bg-white text-black hover:bg-black/5"
            }`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Recent Bookings + Requests — 1 col mobile, 2 cols xl */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Bookings */}
        <div className="border border-black/5 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-black">Recent Bookings</h2>
            <Link href="/partner/bookings" className="text-xs font-black text-[#ff7a00] hover:underline">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="border border-black/5 bg-[#f0f0f0] p-6 text-center">
              <p className="text-sm font-bold text-black/50">No bookings yet.</p>
              <p className="mt-1 text-xs font-bold text-black/30">Bookings will appear here once a customer accepts your bid.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <Link key={b.id} href={`/partner/bookings/${b.id}`}
                  className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3 hover:bg-black/5 transition-colors">
                  <div className="min-w-0">
                    <p className="font-black text-black text-sm">Job #{b.job_number ?? "—"}</p>
                    <p className="text-xs font-bold text-black/50 truncate">{b.pickup_address || "—"}</p>
                    <p className="text-xs font-bold text-black/30">{b.customer_name || "—"} · {fmtDateTime(b.created_at)}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex border px-2 py-0.5 text-xs font-black ${statusPill(b.booking_status)}`}>
                      {fmtStatus(b.booking_status)}
                    </span>
                    <span className="text-xs font-black text-black/60">{fmtAmt(b.amount, b.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="border border-black/5 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-black">Recent Requests</h2>
            <Link href="/partner/requests" className="text-xs font-black text-[#ff7a00] hover:underline">View all</Link>
          </div>
          {requests.length === 0 ? (
            <div className="border border-black/5 bg-[#f0f0f0] p-6 text-center">
              <p className="text-sm font-bold text-black/50">No requests yet.</p>
              <p className="mt-1 text-xs font-bold text-black/30">Customer requests within your service radius will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <Link key={r.id} href={`/partner/requests/${r.id}`}
                  className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-4 py-3 hover:bg-black/5 transition-colors">
                  <div className="min-w-0">
                    <p className="font-black text-black text-sm">Job #{r.job_number ?? "—"}</p>
                    <p className="text-xs font-bold text-black/50 truncate">{r.pickup_address || "—"}</p>
                    <p className="text-xs font-bold text-black/30">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <span className={`ml-3 shrink-0 inline-flex border px-2 py-0.5 text-xs font-black ${statusPill(r.status)}`}>
                    {fmtStatus(r.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account summary + setup checklist + navigation — 1 col mobile, 3 cols xl */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Account summary */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Account Summary</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: "Email",          value: email },
              { label: "Company",        value: profile?.company_name || "—" },
              { label: "Contact",        value: profile?.contact_name || "—" },
              { label: "Service Radius", value: profile?.service_radius_km ? `${profile.service_radius_km} km` : "—" },
              { label: "Country",        value: profile?.country || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-black/40 shrink-0">{label}</span>
                <span className="font-bold text-black text-right truncate">{value}</span>
              </div>
            ))}
          </div>
          <Link href="/partner/account"
            className="mt-5 block border border-black/20 px-4 py-2.5 text-center text-sm font-black text-black hover:bg-black/5 transition-colors">
            View Full Account →
          </Link>
        </div>

        {/* Setup checklist */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black">Setup Checklist</h2>
          <p className="mt-1 text-xs font-bold text-black/40 mb-4">Complete these steps to start receiving bookings.</p>
          <div className="space-y-2">
            {[
              { label: "Fleet location set",   done: !!(profile?.base_lat && profile?.base_lng), href: "/partner/profile" },
              { label: "Bidding currency set",  done: !!(profile?.default_currency),              href: "/partner/profile" },
              { label: "VAT / NIF number set",  done: !!(profile?.vat_number),                    href: "/partner/profile" },
              { label: "Payouts connected",     done: stripeComplete,                             href: "/partner/onboarding?step=payouts" },
              { label: "Account approved",      done: isApproved,                                 href: "/partner/account" },
              { label: "Drivers added",         done: driverCount > 0,                            href: "/partner/drivers" },
              { label: "Fleet added",           done: fleetCount > 0,                             href: "/partner/fleet" },
            ].map(({ label, done, href }) => (
              <Link key={label} href={href}
                className="flex items-center gap-3 border border-black/5 bg-[#f0f0f0] px-3 py-2.5 hover:bg-black/5 transition-colors">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center text-xs font-black ${
                  done ? "bg-black text-white" : "border-2 border-black/20 text-black/20"
                }`}>
                  {done ? "✓" : ""}
                </span>
                <span className={`text-sm font-bold ${done ? "text-black/40 line-through" : "text-black"}`}>{label}</span>
                {!done && <span className="ml-auto text-xs font-black text-[#ff7a00]">Set up →</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation links */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Navigation</h2>
          <div className="space-y-2">
            {[
              { label: "📋 Requests",  desc: "View & bid on customer requests", href: "/partner/requests" },
              { label: "📅 Bookings",  desc: "Manage confirmed bookings",        href: "/partner/bookings" },
              { label: "📊 Reports",   desc: "Revenue & fuel reconciliation",    href: "/partner/reports" },
              { label: "🚗 Car Fleet", desc: "Manage your vehicles",             href: "/partner/fleet" },
              { label: "👤 Drivers",   desc: "Manage your drivers",              href: "/partner/drivers" },
              { label: "⚙️ Account",   desc: "Profile, rules & settings",        href: "/partner/account" },
            ].map(({ label, desc, href }) => (
              <Link key={href} href={href}
                className="flex items-center justify-between border border-black/5 bg-[#f0f0f0] px-3 py-2.5 hover:bg-black/5 transition-colors">
                <div>
                  <p className="text-sm font-black text-black">{label}</p>
                  <p className="text-xs font-bold text-black/40">{desc}</p>
                </div>
                <span className="text-black/30 font-black text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}