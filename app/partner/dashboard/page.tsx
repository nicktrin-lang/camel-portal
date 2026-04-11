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

type LiveStatus = {
  isLive: boolean;
  missing: string[];
};

const MISSING_LABELS: Record<string, { label: string; href: string }> = {
  service_radius_km: { label: "Service radius not set",            href: "/partner/profile" },
  base_address:      { label: "Fleet base address missing",        href: "/partner/profile" },
  base_location:     { label: "Fleet base map pin missing",        href: "/partner/profile" },
  base_lat:          { label: "Fleet base location missing",       href: "/partner/profile" },
  base_lng:          { label: "Fleet base location missing",       href: "/partner/profile" },
  fleet:             { label: "No active fleet vehicles added",    href: "/partner/fleet" },
  driver:            { label: "No active drivers added",           href: "/partner/drivers" },
  default_currency:  { label: "Billing currency not set",         href: "/partner/profile" },
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
  return "border-black/10 bg-white text-slate-700";
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

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [appStatus,   setAppStatus]   = useState("pending");
  const [email,       setEmail]       = useState("");
  const [bookings,    setBookings]    = useState<BookingRow[]>([]);
  const [requests,    setRequests]    = useState<RequestRow[]>([]);
  const [driverCount, setDriverCount] = useState(0);
  const [fleetCount,  setFleetCount]  = useState(0);
  const [liveStatus,  setLiveStatus]  = useState<LiveStatus | null>(null);

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
          bkRes,
          reqRes,
          drvRes,
          fleetRes,
        ] = await Promise.all([
          supabase.from("partner_profiles")
            .select("contact_name,company_name,address,service_radius_km,country,default_currency,base_lat,base_lng")
            .eq("user_id", user.id).maybeSingle(),
          supabase.from("partner_applications")
            .select("status").eq("email", userEmail)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" }),
          fetch("/api/partner/requests", { cache: "no-store", credentials: "include" }),
          fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" }),
          supabase.from("partner_fleet").select("id").eq("user_id", user.id).eq("is_active", true),
        ]);

        const bkJson  = await safeJson(bkRes);
        const reqJson = await safeJson(reqRes);
        const drvJson = await safeJson(drvRes);

        if (!mounted) return;

        setProfile(profileRow as Profile | null);
        setAppStatus(String(appRow?.status || "pending"));
        setEmail(userEmail);
        setBookings(Array.isArray(bkJson?.data) ? bkJson.data.slice(0, 5) : []);
        setRequests(Array.isArray(reqJson?.data) ? reqJson.data.slice(0, 5) : []);
        setDriverCount(Array.isArray(drvJson?.data) ? drvJson.data.filter((d: any) => d.is_active).length : 0);
        setFleetCount(Array.isArray(fleetRes?.data) ? fleetRes.data.length : 0);

        // Fetch live status
        try {
          const liveRes = await fetch("/api/partner/refresh-live-status", {
            method: "POST", cache: "no-store", credentials: "include",
          });
          if (liveRes.ok) {
            const liveJson = await liveRes.json();
            if (mounted) {
              setLiveStatus({
                isLive: !!(liveJson?.becameLive || liveJson?.alreadyLive),
                missing: Array.isArray(liveJson?.missing) ? liveJson.missing : [],
              });
            }
          }
        } catch {}

      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [router, supabase]);

  if (loading) return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <p className="text-slate-600">Loading dashboard…</p>
    </div>
  );

  const isApproved = appStatus.toLowerCase() === "approved";

  const activeBookings    = bookings.filter(b => ["confirmed","driver_assigned","en_route","arrived","collected","returned"].includes(String(b.booking_status||"").toLowerCase()));
  const completedBookings = bookings.filter(b => String(b.booking_status||"").toLowerCase() === "completed");
  const openRequests      = requests.filter(r => String(r.status||"").toLowerCase() === "open");

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Partner Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Welcome back{profile?.contact_name ? `, ${profile.contact_name}` : ""}
            {profile?.company_name ? ` — ${profile.company_name}` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
            isApproved ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            {isApproved ? "✓ Account Approved" : "⏳ Pending Approval"}
          </span>
        </div>
      </div>

      {/* Live status banner */}
      {liveStatus && !liveStatus.isLive && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Your account is not yet live</p>
              <p className="mt-1 text-sm text-amber-700">Complete the following to start receiving customer requests:</p>
              {liveStatus.missing.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {liveStatus.missing.map(m => {
                    const info = MISSING_LABELS[m] ?? { label: m, href: "/partner/profile" };
                    return (
                      <li key={m}>
                        <a href={info.href}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
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
      )}

      {/* Pending approval banner */}
      {!isApproved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-semibold">Your account is under review.</span> You will receive an email once approved. In the meantime you can complete your profile, add your fleet and drivers.
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Active Bookings</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{activeBookings.length}</p>
          <Link href="/partner/bookings" className="mt-2 block text-xs text-[#003768] hover:underline">View all →</Link>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Open Requests</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{openRequests.length}</p>
          <Link href="/partner/requests" className="mt-2 block text-xs text-[#003768] hover:underline">View all →</Link>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{completedBookings.length}</p>
          <Link href="/partner/reports" className="mt-2 block text-xs text-[#003768] hover:underline">View reports →</Link>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-medium text-slate-500">Active Drivers</p>
          <p className="mt-2 text-3xl font-bold text-[#003768]">{driverCount}</p>
          <Link href="/partner/drivers" className="mt-2 block text-xs text-[#003768] hover:underline">Manage drivers →</Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "📋 View Requests", href: "/partner/requests", primary: true },
          { label: "📅 View Bookings", href: "/partner/bookings", primary: false },
          { label: "📊 Reports",       href: "/partner/reports",  primary: false },
          { label: "✏️ Edit Profile",  href: "/partner/profile",  primary: false },
        ].map(({ label, href, primary }) => (
          <Link key={href} href={href}
            className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
              primary
                ? "bg-[#ff7a00] text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                : "border border-[#003768]/20 bg-white text-[#003768] hover:bg-[#003768]/5"
            }`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Bookings */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#003768]">Recent Bookings</h2>
            <Link href="/partner/bookings" className="text-sm font-medium text-[#ff7a00] hover:underline">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-black/5 bg-slate-50 p-6 text-center">
              <p className="text-slate-500 text-sm">No bookings yet.</p>
              <p className="mt-1 text-xs text-slate-400">Bookings will appear here once a customer accepts your bid.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {bookings.map(b => (
                <Link key={b.id} href={`/partner/bookings/${b.id}`}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 hover:bg-[#f3f8ff] transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#003768] text-sm">Job #{b.job_number ?? "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{b.pickup_address || "—"}</p>
                    <p className="text-xs text-slate-400">{b.customer_name || "—"} · {fmtDateTime(b.created_at)}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPill(b.booking_status)}`}>
                      {fmtStatus(b.booking_status)}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{fmtAmt(b.amount, b.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#003768]">Recent Requests</h2>
            <Link href="/partner/requests" className="text-sm font-medium text-[#ff7a00] hover:underline">View all</Link>
          </div>
          {requests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-black/5 bg-slate-50 p-6 text-center">
              <p className="text-slate-500 text-sm">No requests yet.</p>
              <p className="mt-1 text-xs text-slate-400">Customer requests within your service radius will appear here.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map(r => (
                <Link key={r.id} href={`/partner/requests/${r.id}`}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 hover:bg-[#f3f8ff] transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#003768] text-sm">Job #{r.job_number ?? "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{r.pickup_address || "—"}</p>
                    <p className="text-xs text-slate-400">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <span className={`ml-3 shrink-0 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPill(r.status)}`}>
                    {fmtStatus(r.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account summary + setup checklist + navigation */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Account summary */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Account Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: "Email",          value: email },
              { label: "Company",        value: profile?.company_name || "—" },
              { label: "Contact",        value: profile?.contact_name || "—" },
              { label: "Service Radius", value: profile?.service_radius_km ? `${profile.service_radius_km} km` : "—" },
              { label: "Country",        value: profile?.country || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">{label}</span>
                <span className="font-medium text-slate-800 text-right truncate">{value}</span>
              </div>
            ))}
          </div>
          <Link href="/partner/account"
            className="mt-5 block rounded-full border border-[#003768]/20 px-4 py-2.5 text-center text-sm font-semibold text-[#003768] hover:bg-[#003768]/5">
            View Full Account →
          </Link>
        </div>

        {/* Setup checklist */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Setup Checklist</h2>
          <p className="mt-1 text-xs text-slate-500">Complete these steps to start receiving bookings.</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "Fleet location set",   done: !!(profile?.base_lat && profile?.base_lng), href: "/partner/profile" },
              { label: "Bidding currency set",  done: !!(profile?.default_currency),              href: "/partner/profile" },
              { label: "Account approved",      done: isApproved,                                 href: "/partner/account" },
              { label: "Drivers added",         done: driverCount > 0,                            href: "/partner/drivers" },
              { label: "Fleet added",           done: fleetCount > 0,                             href: "/partner/fleet" },
            ].map(({ label, done, href }) => (
              <Link key={label} href={href}
                className="flex items-center gap-3 rounded-xl border border-black/5 bg-slate-50 px-3 py-2.5 hover:bg-[#f3f8ff] transition-colors">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-green-500 text-white" : "border-2 border-slate-300 text-slate-300"
                }`}>
                  {done ? "✓" : ""}
                </span>
                <span className={`text-sm font-medium ${done ? "text-slate-600 line-through" : "text-[#003768]"}`}>{label}</span>
                {!done && <span className="ml-auto text-xs text-[#ff7a00] font-semibold">Set up →</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation links */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Navigation</h2>
          <div className="mt-4 space-y-2">
            {[
              { label: "📋 Requests", desc: "View & bid on customer requests", href: "/partner/requests" },
              { label: "📅 Bookings", desc: "Manage confirmed bookings",        href: "/partner/bookings" },
              { label: "📊 Reports",  desc: "Revenue & fuel reconciliation",    href: "/partner/reports" },
              { label: "🚗 Car Fleet", desc: "Manage your vehicles",            href: "/partner/fleet" },
              { label: "👤 Drivers",  desc: "Manage your drivers",              href: "/partner/drivers" },
              { label: "⚙️ Account",  desc: "Profile, rules & settings",        href: "/partner/account" },
            ].map(({ label, desc, href }) => (
              <Link key={href} href={href}
                className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-3 py-2.5 hover:bg-[#f3f8ff] transition-colors">
                <div>
                  <p className="text-sm font-semibold text-[#003768]">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <span className="text-slate-300 text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}