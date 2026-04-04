"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { useCurrency } from "@/lib/useCurrency";
import { getEurToGbpRateWithSource } from "@/lib/currency";

// ── Types ────────────────────────────────────────────────────────────────────

type RequestData = {
  id: string; job_number: number | null; pickup_address: string;
  dropoff_address: string | null; pickup_at: string; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number; suitcases: number;
  hand_luggage: number; vehicle_category_name: string | null; notes: string | null;
  status: string; created_at: string; expires_at: string | null;
};

type BidRow = {
  id: string; partner_user_id: string; partner_company_name: string | null;
  partner_contact_name: string | null; partner_phone: string | null;
  partner_address: string | null; vehicle_category_name: string;
  car_hire_price: number; fuel_price: number; total_price: number;
  full_insurance_included: boolean; full_tank_included: boolean;
  notes: string | null; status: string; created_at: string;
  currency: "EUR" | "GBP";
};

type BookingData = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  company_name: string | null; company_phone: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  currency: "EUR" | "GBP";
  collection_confirmed_by_driver: boolean; collection_confirmed_by_driver_at: string | null;
  collection_fuel_level_driver: string | null;
  return_confirmed_by_driver: boolean; return_confirmed_by_driver_at: string | null;
  return_fuel_level_driver: string | null;
  collection_confirmed_by_partner: boolean; collection_confirmed_by_partner_at: string | null;
  collection_fuel_level_partner: string | null; collection_partner_notes: string | null;
  return_confirmed_by_partner: boolean; return_confirmed_by_partner_at: string | null;
  return_fuel_level_partner: string | null; return_partner_notes: string | null;
  collection_confirmed_by_customer: boolean; collection_confirmed_by_customer_at: string | null;
  collection_fuel_level_customer: string | null; collection_customer_notes: string | null;
  return_confirmed_by_customer: boolean; return_confirmed_by_customer_at: string | null;
  return_fuel_level_customer: string | null; return_customer_notes: string | null;
};

type ResponseShape = { request: RequestData; bids: BidRow[]; booking: BookingData | null };
type ConfirmSection = "collection" | "return";

// ── Fuel helpers ──────────────────────────────────────────────────────────────

function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty") return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half") return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full") return "full";
  return null;
}

function fuelLabel(v: unknown): string {
  switch (normalizeFuel(v)) {
    case "empty": return "Empty";
    case "quarter": return "¼ Tank";
    case "half": return "½ Tank";
    case "3/4": return "¾ Tank";
    case "full": return "Full Tank";
    default: return "—";
  }
}

const FUEL_BARS: Record<string, number> = { empty: 0, quarter: 1, half: 2, "3/4": 3, full: 4 };

function FuelBar({ level }: { level: string | null }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-1">
      {[0,1,2,3].map(i => (
        <div key={i} className={[
          "h-3 flex-1 rounded-full",
          i < filled
            ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400"
            : "bg-slate-200"
        ].join(" ")} />
      ))}
    </div>
  );
}

// ── General helpers ───────────────────────────────────────────────────────────

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function formatDuration(m?: number | null) {
  if (!m) return "—";
  if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), mins = m%60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function getTimeRemaining(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: "Expired" };
  const s = Math.floor(diff/1000);
  const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), sec = s%60;
  const label = d>0 ? `${d}d ${h}h ${m}m` : h>0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  return { expired: false, label };
}

function bookingStatusLabel(s?: string | null) {
  switch (String(s||"").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}

const QUARTER_LABELS: Record<number, string> = {
  0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank",
};

// ── Currency helpers ──────────────────────────────────────────────────────────

function fmtCurr(amount: number, curr: "EUR" | "GBP"): string {
  return new Intl.NumberFormat(curr === "EUR" ? "es-ES" : "en-GB", {
    style: "currency", currency: curr,
  }).format(amount);
}

function convertAmount(amount: number, from: "EUR" | "GBP", to: "EUR" | "GBP", rate: number): number {
  if (from === to) return amount;
  if (from === "EUR" && to === "GBP") return Math.round(amount * rate * 100) / 100;
  return Math.round((amount / rate) * 100) / 100;
}

// Show amount in customer's currency, with partner's original in brackets if different
function BidAmount({ amount, bidCurrency, customerCurrency, rate }: {
  amount: number | null | undefined;
  bidCurrency: "EUR" | "GBP";
  customerCurrency: "EUR" | "GBP";
  rate: number;
}) {
  if (amount == null || isNaN(amount)) return <span>—</span>;
  const primaryAmt = convertAmount(amount, bidCurrency, customerCurrency, rate);
  const primaryStr = fmtCurr(primaryAmt, customerCurrency);
  const secondaryStr = bidCurrency !== customerCurrency ? fmtCurr(amount, bidCurrency) : null;
  return (
    <span>
      {primaryStr}
      {secondaryStr && <span className="opacity-60 text-[0.85em] font-normal ml-1">({secondaryStr})</span>}
    </span>
  );
}

// Show a booking amount in customer's preferred currency with other currency secondary
function BookingAmount({ amount, storedCurrency, customerCurrency, rate }: {
  amount: number | null | undefined;
  storedCurrency: "EUR" | "GBP";
  customerCurrency: "EUR" | "GBP";
  rate: number;
}) {
  if (amount == null || isNaN(Number(amount))) return <span>—</span>;
  const amt = Number(amount);
  const primaryAmt = convertAmount(amt, storedCurrency, customerCurrency, rate);
  const secondaryAmt = convertAmount(amt, storedCurrency, storedCurrency === "EUR" ? "GBP" : "EUR", rate);
  return (
    <span>
      {fmtCurr(primaryAmt, customerCurrency)}{" "}
      <span className="opacity-60 text-[0.85em] font-normal">
        ({fmtCurr(secondaryAmt, storedCurrency === "EUR" ? "GBP" : "EUR")})
      </span>
    </span>
  );
}

// ── Payment Summary Card ──────────────────────────────────────────────────────

function CustomerPaymentSummary({ booking, rate, rateIsLive, customerCurrency }: {
  booking: BookingData; rate: number; rateIsLive: boolean; customerCurrency: "EUR" | "GBP";
}) {
  const storedCurr: "EUR" | "GBP" = booking.currency ?? "GBP";

  const totalAmt      = Number(booking.amount || 0);
  const carHireAmt    = Number(booking.car_hire_price || 0);
  const fullTankAmt   = Number(booking.fuel_price || 0);
  const fuelChargeAmt = Number(booking.fuel_charge || 0);
  const fuelRefundAmt = Number(booking.fuel_refund || 0);
  const perQtrAmt     = fullTankAmt / 4;
  const usedQuarters  = booking.fuel_used_quarters ?? null;

  const collFuel = normalizeFuel(booking.collection_fuel_level_driver) ||
    normalizeFuel(booking.collection_fuel_level_partner);
  const retFuel = normalizeFuel(booking.return_fuel_level_driver) ||
    normalizeFuel(booking.return_fuel_level_partner);

  // Convert stored amount to customer display currency
  const toDisplay = (amt: number) => convertAmount(amt, storedCurr, customerCurrency, rate);
  // Get opposite currency for secondary display
  const otherCurr: "EUR" | "GBP" = customerCurrency === "GBP" ? "EUR" : "GBP";
  const toOther = (amt: number) => convertAmount(amt, storedCurr, otherCurr, rate);

  const primary = (amt: number) => fmtCurr(toDisplay(amt), customerCurrency);
  const secondary = (amt: number) => `(${fmtCurr(toOther(amt), otherCurr)})`;

  const gbpStr = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

  return (
    <div className="rounded-3xl border border-[#003768]/20 bg-[#003768] p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Payment Summary</h2>
        <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-bold text-green-900">Finalised</span>
      </div>

      {/* Total */}
      <div className="mt-6 rounded-2xl bg-white/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Total you paid at booking</p>
        <p className="mt-1 text-4xl font-black">
          {primary(totalAmt)}{" "}
          <span className="text-2xl font-normal opacity-60">{secondary(totalAmt)}</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Car hire</p>
            <p className="mt-0.5 font-bold text-white">{primary(carHireAmt)}</p>
            <p className="text-xs text-white/50">{secondary(carHireAmt)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Full tank deposit</p>
            <p className="mt-0.5 font-bold text-white">{primary(fullTankAmt)}</p>
            <p className="text-xs text-white/50">{secondary(fullTankAmt)}</p>
          </div>
        </div>
      </div>

      {/* Fuel levels */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Collected at</p>
          <p className="mt-1 text-lg font-bold">{fuelLabel(collFuel)}</p>
          <FuelBar level={collFuel} />
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Returned at</p>
          <p className="mt-1 text-lg font-bold">{fuelLabel(retFuel)}</p>
          <FuelBar level={retFuel} />
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Fuel used</p>
          <p className="mt-1 text-lg font-bold">
            {usedQuarters !== null ? QUARTER_LABELS[usedQuarters] ?? `${usedQuarters}/4` : "—"}
          </p>
          <p className="mt-1 text-xs text-white/60">
            {primary(perQtrAmt)}{" "}
            <span className="text-white/40">{secondary(perQtrAmt)}</span> per quarter
          </p>
        </div>
      </div>

      {/* Fuel charge + refund */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#ff7a00]/20 border border-[#ff7a00]/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">You pay for fuel</p>
          <p className="mt-2 text-4xl font-black">
            {primary(fuelChargeAmt)}{" "}
            <span className="text-2xl font-normal opacity-60">{secondary(fuelChargeAmt)}</span>
          </p>
          <p className="mt-1 text-sm text-white/60">
            {usedQuarters ?? "—"} quarter{usedQuarters !== 1 ? "s" : ""} used
          </p>
        </div>
        <div className="rounded-2xl bg-green-500/20 border border-green-400/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Your refund</p>
          <p className="mt-2 text-4xl font-black">
            {primary(fuelRefundAmt)}{" "}
            <span className="text-2xl font-normal opacity-60">{secondary(fuelRefundAmt)}</span>
          </p>
          <p className="mt-1 text-sm text-white/60">Unused fuel returned to you</p>
        </div>
      </div>

      {/* Rate badge */}
      <div className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base font-bold ${
        rateIsLive ? "bg-green-400/20 text-green-200" : "bg-white/10 text-white/70"
      }`}>
        <span className={`h-2.5 w-2.5 rounded-full ${rateIsLive ? "bg-green-400" : "bg-white/40"}`} />
        1€ = {gbpStr(rate)}{rateIsLive ? " · Live rate (frankfurter.app)" : ""}
      </div>
    </div>
  );
}

// ── Fuel Confirmation Card ────────────────────────────────────────────────────

function FuelConfirmCard({
  title, driverConfirmed, driverFuel, driverConfirmedAt,
  customerConfirmed, customerConfirmedAt, locked, notes,
  onNotesChange, onConfirm, onUnconfirm, saving,
}: {
  title: string; driverConfirmed: boolean; driverFuel: string | null;
  driverConfirmedAt: string | null; customerConfirmed: boolean;
  customerConfirmedAt: string | null; locked: boolean; notes: string;
  onNotesChange: (v: string) => void; onConfirm: () => void;
  onUnconfirm: () => void; saving: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-6 ${locked ? "border-green-200 bg-green-50" : "border-black/5 bg-white"} shadow-[0_18px_45px_rgba(0,0,0,0.08)]`}>
      <h2 className="text-2xl font-semibold text-[#003768]">{title}</h2>
      <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver recorded</p>
        {driverConfirmed && driverFuel ? (
          <>
            <p className="mt-1 text-2xl font-bold text-[#003768]">{fuelLabel(driverFuel)}</p>
            <FuelBar level={driverFuel} />
            <p className="mt-1 text-xs text-slate-400">{fmt(driverConfirmedAt)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500 italic">Waiting for driver to record fuel level…</p>
        )}
      </div>
      {locked ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-100 p-4 text-sm text-green-800 font-semibold">
          ✓ Confirmed and locked — you and the driver agree on {fuelLabel(driverFuel)}
        </div>
      ) : (
        <>
          {customerConfirmed && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              You confirmed this at {fmt(customerConfirmedAt)}
            </div>
          )}
          <div className="mt-4">
            <label className="text-sm font-medium text-[#003768]">Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={e => onNotesChange(e.target.value)}
              disabled={locked}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#0f4f8a] disabled:opacity-60"
              placeholder="Any notes about the fuel level or condition…" />
          </div>
          <div className="mt-4 flex gap-3">
            {!customerConfirmed ? (
              <button type="button" onClick={onConfirm}
                disabled={saving || !driverConfirmed}
                className="flex-1 rounded-full bg-[#ff7a00] py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-50 active:scale-95 transition-transform">
                {saving ? "Saving…" : !driverConfirmed ? "Waiting for driver…" : "✓ I agree with this fuel level"}
              </button>
            ) : (
              <button type="button" onClick={onUnconfirm} disabled={saving}
                className="flex-1 rounded-full border border-black/10 bg-white py-3 font-semibold text-slate-700 hover:bg-black/5 disabled:opacity-50">
                {saving ? "Saving…" : "Dispute / Change"}
              </button>
            )}
          </div>
          {!driverConfirmed && (
            <p className="mt-2 text-xs text-slate-400">
              The confirm button will activate once the driver has recorded the fuel level.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TestBookingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const { rate: hookRate, currency } = useCurrency();
  const [liveRate, setLiveRate] = useState<number>(hookRate ?? 0.85);
  const [rateIsLive, setRateIsLive] = useState(false);

  useEffect(() => {
    getEurToGbpRateWithSource().then(({ rate: r, live }) => {
      setLiveRate(r);
      setRateIsLive(live);
    }).catch(() => {});
  }, []);

  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [savingConfirm, setSavingConfirm] = useState<ConfirmSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);
  const [timeLabel, setTimeLabel] = useState("—");
  const [expired, setExpired] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  async function load(showSpinner = false) {
    if (!requestId) return;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res = await fetch(`/api/test-booking/requests/${requestId}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load request.");
      setData(json);
      if (json.booking) {
        setCollectionNotes(json.booking.collection_customer_notes || "");
        setReturnNotes(json.booking.return_customer_notes || "");
      }
    } catch (e: any) { setError(e?.message || "Failed to load request."); }
    finally { if (showSpinner) setLoading(false); }
  }

  useEffect(() => { load(true); }, [requestId]);
  useEffect(() => {
    if (!requestId) return;
    const t = setInterval(() => load(false), 10000);
    return () => clearInterval(t);
  }, [requestId]);

  useEffect(() => {
    const exp = data?.request?.expires_at;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick = () => {
      const r = getTimeRemaining(exp);
      setTimeLabel(r?.label || "—");
      setExpired(!!r?.expired);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data?.request?.expires_at]);

  async function acceptBid(bidId: string) {
    setAcceptingId(bidId); setError(null); setOk(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res = await fetch("/api/test-booking/bids/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bid_id: bidId, currency }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to accept bid.");
      setOk("Bid accepted. Booking confirmed.");
      await load(false);
    } catch (e: any) { setError(e?.message || "Failed to accept bid."); }
    finally { setAcceptingId(null); }
  }

  async function saveConfirmation(section: ConfirmSection, confirmed: boolean) {
    if (!data?.booking?.id) return;
    setSavingConfirm(section); setError(null); setOk(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res = await fetch(`/api/test-booking/bookings/${data.booking.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ section, confirmed, notes: section === "collection" ? collectionNotes : returnNotes }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setOk(section === "collection" ? "Collection confirmed." : "Return confirmed.");
      await load(false);
    } catch (e: any) { setError(e?.message || "Failed to save."); }
    finally { setSavingConfirm(null); }
  }

  if (loading) return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading request…</p>
      </div>
    </div>
  );

  if (!data?.request) return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Request not found"}
      </div>
    </div>
  );

  const bk = data.booking;
  const bookingStoredCurr: "EUR" | "GBP" = bk?.currency ?? "GBP";

  const collectionLocked = !!bk?.collection_confirmed_by_driver &&
    !!bk?.collection_confirmed_by_customer &&
    normalizeFuel(bk.collection_fuel_level_driver) === normalizeFuel(bk.collection_fuel_level_customer);

  const returnLocked = !!bk?.return_confirmed_by_driver &&
    !!bk?.return_confirmed_by_customer &&
    normalizeFuel(bk.return_fuel_level_driver) === normalizeFuel(bk.return_fuel_level_customer);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Request Detail</h1>
          <p className="mt-2 text-slate-600">Review your request and any partner bids received.</p>
        </div>
        <Link href="/test-booking/requests"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
          Back to Requests
        </Link>
      </div>

      {/* Only show bid window when request is still open */}
      {data.request.status === "open" && (
        <div className={`rounded-2xl border p-4 text-sm ${expired ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <span className="font-semibold">Bid window:</span> {timeLabel}
        </div>
      )}

      {/* Request info */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>
        <div className="mt-6 grid gap-3 text-slate-700 sm:grid-cols-2">
          {[
            ["Job No.", data.request.job_number ?? "—"],
            ["Pickup", data.request.pickup_address],
            ["Dropoff", data.request.dropoff_address || "—"],
            ["Pickup time", new Date(data.request.pickup_at || "").toLocaleString()],
            ["Dropoff time", new Date(data.request.dropoff_at || "").toLocaleString()],
            ["Duration", formatDuration(data.request.journey_duration_minutes)],
            ["Passengers", data.request.passengers],
            ["Bags", `${data.request.suitcases} suitcases / ${data.request.hand_luggage} hand luggage`],
            ["Vehicle", data.request.vehicle_category_name || "—"],
            ["Status", data.request.status],
          ].map(([label, value]) => (
            <p key={String(label)}>
              <span className="font-semibold text-slate-900">{label}:</span> {String(value)}
            </p>
          ))}
        </div>
      </div>

      {/* Accepted booking */}
      {bk && (
        <>
          <div className="rounded-3xl border border-green-200 bg-green-50 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">Your Booking</h2>
            <div className="mt-6 grid gap-3 text-slate-700 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-900">Status:</span> {bookingStatusLabel(bk.booking_status)}</p>
              <p><span className="font-semibold text-slate-900">Car hire company:</span> {bk.company_name || "—"}</p>
              <p><span className="font-semibold text-slate-900">Company phone:</span> {bk.company_phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver:</span> {bk.driver_name || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver phone:</span> {bk.driver_phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver vehicle:</span> {bk.driver_vehicle || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver assigned at:</span> {fmt(bk.driver_assigned_at)}</p>
            </div>
            {/* Price breakdown */}
            <div className="mt-6 rounded-2xl border border-green-200 bg-white p-4 space-y-2 text-slate-700">
              <p className="text-sm font-semibold text-slate-900 mb-3">Price Breakdown</p>
              <div className="flex justify-between text-sm">
                <span>Car hire</span>
                <span className="font-semibold">
                  <BookingAmount amount={bk.car_hire_price} storedCurrency={bookingStoredCurr} customerCurrency={currency} rate={liveRate} />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Full tank deposit <span className="text-slate-400">(refundable)</span></span>
                <span className="font-semibold">
                  <BookingAmount amount={bk.fuel_price} storedCurrency={bookingStoredCurr} customerCurrency={currency} rate={liveRate} />
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                <span className="font-semibold text-slate-900">Total paid</span>
                <span className="font-bold text-[#003768]">
                  <BookingAmount amount={bk.amount} storedCurrency={bookingStoredCurr} customerCurrency={currency} rate={liveRate} />
                </span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          {collectionLocked && returnLocked && bk.fuel_charge !== null && (
            <CustomerPaymentSummary
              booking={bk}
              rate={liveRate}
              rateIsLive={rateIsLive}
              customerCurrency={currency}
            />
          )}

          {/* Fuel confirmation */}
          {(!collectionLocked || !returnLocked) && (
            <div className="grid gap-6 xl:grid-cols-2">
              <FuelConfirmCard
                title="Collection Fuel"
                driverConfirmed={bk.collection_confirmed_by_driver}
                driverFuel={bk.collection_fuel_level_driver}
                driverConfirmedAt={bk.collection_confirmed_by_driver_at}
                customerConfirmed={bk.collection_confirmed_by_customer}
                customerConfirmedAt={bk.collection_confirmed_by_customer_at}
                locked={collectionLocked} notes={collectionNotes}
                onNotesChange={setCollectionNotes}
                onConfirm={() => saveConfirmation("collection", true)}
                onUnconfirm={() => saveConfirmation("collection", false)}
                saving={savingConfirm === "collection"}
              />
              <FuelConfirmCard
                title="Return Fuel"
                driverConfirmed={bk.return_confirmed_by_driver}
                driverFuel={bk.return_fuel_level_driver}
                driverConfirmedAt={bk.return_confirmed_by_driver_at}
                customerConfirmed={bk.return_confirmed_by_customer}
                customerConfirmedAt={bk.return_confirmed_by_customer_at}
                locked={returnLocked} notes={returnNotes}
                onNotesChange={setReturnNotes}
                onConfirm={() => saveConfirmation("return", true)}
                onUnconfirm={() => saveConfirmation("return", false)}
                saving={savingConfirm === "return"}
              />
            </div>
          )}
        </>
      )}

      {/* Partner Bids */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>
        {expired || data.request.status === "expired" ? (
          <p className="mt-4 text-red-700">This request has expired and can no longer be accepted.</p>
        ) : data.bids.length === 0 ? (
          <p className="mt-4 text-slate-600">No bids submitted yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map(bid => (
              <div key={bid.id} className="rounded-2xl border border-black/10 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2 text-slate-700">
                    <h3 className="text-xl font-semibold text-[#003768]">{bid.partner_company_name || "Car Hire Company"}</h3>
                    <p><span className="font-semibold text-slate-900">Phone:</span> {bid.partner_phone || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Vehicle:</span> {bid.vehicle_category_name}</p>
                    <p><span className="font-semibold text-slate-900">Car hire:</span>{" "}
                      <BidAmount amount={bid.car_hire_price} bidCurrency={bid.currency ?? "EUR"} customerCurrency={currency} rate={liveRate} /></p>
                    <p><span className="font-semibold text-slate-900">Fuel deposit:</span>{" "}
                      <BidAmount amount={bid.fuel_price} bidCurrency={bid.currency ?? "EUR"} customerCurrency={currency} rate={liveRate} /></p>
                    <p><span className="font-semibold text-slate-900">Total:</span>{" "}
                      <BidAmount amount={bid.total_price} bidCurrency={bid.currency ?? "EUR"} customerCurrency={currency} rate={liveRate} /></p>
                    <p><span className="font-semibold text-slate-900">Insurance included:</span> {bid.full_insurance_included ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-slate-900">Full tank included:</span> {bid.full_tank_included ? "Yes" : "No"}</p>
                    {bid.notes && <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes}</p>}
                  </div>
                  <div>
                    {bid.status === "accepted" ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">Accepted</span>
                    ) : data.request.status === "confirmed" ? (
                      <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-500">Closed</span>
                    ) : (
                      <button type="button" onClick={() => acceptBid(bid.id)}
                        disabled={!!acceptingId || expired}
                        className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                        {acceptingId === bid.id ? "Accepting..." : "Accept Bid"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}