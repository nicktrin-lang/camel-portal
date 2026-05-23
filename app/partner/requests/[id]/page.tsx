"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Currency = "EUR" | "GBP" | "USD";

const CURRENCY_META: Record<Currency, { symbol: string; label: string; locale: string }> = {
  EUR: { symbol: "€", label: "Euros (€)",          locale: "es-ES" },
  GBP: { symbol: "£", label: "British Pounds (£)", locale: "en-GB" },
  USD: { symbol: "$", label: "US Dollars ($)",     locale: "en-US" },
};

type FleetOption = {
  id: string; category_slug: string; category_name: string;
  max_passengers: number; max_suitcases: number; max_hand_luggage: number;
  service_level: string | null; label: string;
};

type ExistingBid = {
  id: string; fleet_id: string | null; vehicle_category_slug: string | null;
  vehicle_category_name: string | null; car_hire_price: number; fuel_price: number;
  total_price: number; full_insurance_included: boolean; full_tank_included: boolean;
  notes: string | null; status: string; created_at: string; currency: Currency;
  mileage_limit: string | null;
  security_deposit_amount: number | null;
  security_deposit_notes: string | null;
};

type ExistingBooking = {
  id: string; request_id: string; partner_user_id: string; booking_status: string;
};

type RequestRow = {
  id: string; job_number: number | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  pickup_address: string; dropoff_address: string | null;
  pickup_at: string; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number;
  suitcases: number; hand_luggage: number;
  sport_equipment: string | null;
  driver_age: number | null;
  additional_drivers: number;
  additional_driver_ages: string | null;
  vehicle_category_slug: string | null; vehicle_category_name: string | null;
  notes: string | null; status: string; created_at: string;
  expires_at: string | null; matched_status: string | null;
};

type ApiResponse = {
  request: RequestRow; existingBid: ExistingBid | null;
  existingBooking: ExistingBooking | null; fleetOptions: FleetOption[];
  adminMode: boolean; role: string | null;
  partnerCurrency: Currency;
  commissionRate: number;
  minimumCommission: number;
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function formatDuration(m?: number | null) {
  if (m === null || m === undefined || Number.isNaN(m)) return "—";
  if (m >= 1440) { const d = Math.ceil(m / 1440); return `${d} day${d === 1 ? "" : "s"}`; }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function sportEquipmentLabel(v: string | null): string {
  if (!v || v === "none") return "None";
  const map: Record<string, string> = {
    golf_single: "Golf clubs — 1 bag", golf_two: "Golf clubs — 2 bags",
    golf_three: "Golf clubs — 3 bags", golf_four: "Golf clubs — 4+ bags",
    skis_pair: "Skis / snowboard — 1 set", skis_two: "Skis / snowboard — 2 sets",
    skis_three: "Skis / snowboard — 3+ sets",
    bikes_one: "Bikes — 1", bikes_two: "Bikes — 2", bikes_three: "Bikes — 3+",
    other: "Other large equipment",
  };
  return map[v] || v;
}

function getTimeRemaining(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: "Expired" };
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  return { expired: false, label };
}

function fmtCurrency(value: number | null | undefined, currency: Currency) {
  if (value == null || isNaN(value)) return "—";
  const { locale } = CURRENCY_META[currency] ?? CURRENCY_META.EUR;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

function getPartnerHistoryStatus(params: {
  requestStatus?: string | null; expiresAt?: string | null;
  bidStatus?: string | null; hasBooking?: boolean;
}) {
  const requestStatus = String(params.requestStatus || "").trim();
  const bidStatus     = String(params.bidStatus || "").trim();
  const expired       = !!params.expiresAt && new Date(params.expiresAt).getTime() <= Date.now();
  if (params.hasBooking || bidStatus === "accepted") return "Bid successful";
  if (bidStatus === "unsuccessful" || bidStatus === "rejected") return "Bid unsuccessful";
  if (expired || requestStatus === "expired") return "Expired";
  if (bidStatus === "submitted") return "Bid submitted — awaiting customer";
  return "Open";
}

const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30 disabled:opacity-50";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-black uppercase tracking-widest text-black/40">{label}</span>
      <span className="text-sm font-bold text-black">{children}</span>
    </div>
  );
}

export default function PartnerRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [requestId,       setRequestId]       = useState("");
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [ok,              setOk]              = useState<string | null>(null);
  const [data,            setData]            = useState<ApiResponse | null>(null);
  const [timeLabel,       setTimeLabel]       = useState("—");
  const [expired,         setExpired]         = useState(false);
  const [partnerCurrency, setPartnerCurrency] = useState<Currency>("EUR");

  const [fleetId,               setFleetId]               = useState("");
  const [carHirePrice,          setCarHirePrice]          = useState("");
  const [fuelPrice,             setFuelPrice]             = useState("");
  const [fullInsuranceIncluded, setFullInsuranceIncluded] = useState(true);
  const [fullTankIncluded,      setFullTankIncluded]      = useState(true);
  const [notes,                 setNotes]                 = useState("");
  const [mileageLimit,          setMileageLimit]          = useState("");
  const [securityDepositAmount, setSecurityDepositAmount] = useState("");
  const [securityDepositNotes,  setSecurityDepositNotes]  = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  async function load() {
    if (!requestId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/partner/requests/${requestId}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load request.");
      const nextData = json as ApiResponse;
      setData(nextData);
      const raw      = nextData.partnerCurrency;
      const currency: Currency = (raw === "EUR" || raw === "GBP" || raw === "USD") ? raw : "EUR";
      setPartnerCurrency(currency);
      if (nextData.existingBid) {
        setFleetId(nextData.existingBid.fleet_id || "");
        setCarHirePrice(String(nextData.existingBid.car_hire_price ?? ""));
        setFuelPrice(String(nextData.existingBid.fuel_price ?? ""));
        setFullInsuranceIncluded(!!nextData.existingBid.full_insurance_included);
        setFullTankIncluded(!!nextData.existingBid.full_tank_included);
        setNotes(nextData.existingBid.notes || "");
        setMileageLimit(nextData.existingBid.mileage_limit || "");
        setSecurityDepositAmount(nextData.existingBid.security_deposit_amount != null ? String(nextData.existingBid.security_deposit_amount) : "");
        setSecurityDepositNotes(nextData.existingBid.security_deposit_notes || "");
      } else {
        setFleetId(nextData.fleetOptions?.[0]?.id || "");
        setCarHirePrice(""); setFuelPrice(""); setFullInsuranceIncluded(true); setFullTankIncluded(true);
        setNotes(""); setMileageLimit(""); setSecurityDepositAmount(""); setSecurityDepositNotes("");
      }
    } catch (e: any) { setError(e?.message || "Failed to load request."); setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [requestId]);

  useEffect(() => {
    const exp = data?.request?.expires_at || null;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick = () => { const r = getTimeRemaining(exp); setTimeLabel(r?.label || "—"); setExpired(!!r?.expired); };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data?.request?.expires_at]);

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.request) return;
    setSaving(true); setError(null); setOk(null);
    try {
      const selectedFleet = data.fleetOptions.find(f => f.id === fleetId);
      if (!selectedFleet) throw new Error("Please select a vehicle from your fleet.");
      const carHire  = Number(carHirePrice || 0);
      const fuel     = Number(fuelPrice || 0);
      if (isNaN(carHire) || carHire < 0) throw new Error("Please enter a valid car hire price.");
      if (isNaN(fuel)    || fuel    < 0) throw new Error("Please enter a valid fuel price.");
      const secDeposit = securityDepositAmount !== "" ? Number(securityDepositAmount) : 0;
      if (isNaN(secDeposit) || secDeposit < 0) throw new Error("Please enter a valid security deposit amount.");
      const res = await fetch("/api/partner/bids", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: data.request.id, fleet_id: selectedFleet.id,
          vehicle_category_slug: selectedFleet.category_slug, vehicle_category_name: selectedFleet.category_name,
          car_hire_price: carHire, fuel_price: fuel, total_price: carHire + fuel,
          full_insurance_included: fullInsuranceIncluded, full_tank_included: fullTankIncluded,
          notes, currency: partnerCurrency,
          mileage_limit: mileageLimit.trim() || null,
          security_deposit_amount: secDeposit > 0 ? secDeposit : 0,
          security_deposit_notes: securityDepositNotes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit bid.");
      setOk("Bid submitted successfully.");
      await load();
    } catch (e: any) { setError(e?.message || "Failed to submit bid."); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="border border-black/5 bg-white p-8">
      <p className="text-sm font-bold text-black/50">Loading request…</p>
    </div>
  );

  if (!data?.request) return (
    <div className="border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{error || "Request not found"}</div>
  );

  const { request, existingBid, existingBooking } = data;
  const { symbol, label: currencyLabel } = CURRENCY_META[partnerCurrency];
  const commissionRate    = data.commissionRate ?? 20;
  const minimumCommission = data.minimumCommission ?? 10;

  // Young driver info
  const mainAge = request.driver_age;
  const isYoungMain = mainAge != null && mainAge >= 21 && mainAge <= 24;
  const addAges = (request.additional_driver_ages || "").split(",").map(a => Number(a.trim())).filter(n => !isNaN(n) && n > 0);
  const hasYoungAdditional = addAges.some(n => n >= 21 && n <= 24);
  const showYoungDriverAlert = isYoungMain || hasYoungAdditional;

  const partnerStatus = getPartnerHistoryStatus({
    requestStatus: request.status, expiresAt: request.expires_at,
    bidStatus: existingBid?.status, hasBooking: !!existingBooking,
  });

  const formDisabled = expired || !!existingBooking || request.status === "confirmed" ||
    request.status === "expired" || existingBid?.status === "accepted" ||
    existingBid?.status === "unsuccessful" || existingBid?.status === "rejected";

  const total    = Number(carHirePrice || 0) + Number(fuelPrice || 0);
  const hireNum  = Number(carHirePrice || 0);
  const rawComm  = (hireNum * commissionRate) / 100;
  const commission = Math.max(rawComm, minimumCommission);
  const payout   = Math.max(0, hireNum - commission);
  const showCommissionPreview = hireNum > 0 && !formDisabled;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok    && <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Request Detail</h1>
          <p className="mt-1 text-sm font-bold text-black/50">Review this request and submit your bid.</p>
        </div>
        <Link href="/partner/requests" className="border border-black/20 px-5 py-2 text-sm font-black text-black hover:bg-black/5 transition-colors">
          Back to Requests
        </Link>
      </div>

      {/* Status strips */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`border px-4 py-3 text-sm font-black ${expired ? "border-red-200 bg-red-50 text-red-700" : "border-[#ff7a00]/30 bg-[#ff7a00]/5 text-[#ff7a00]"}`}>
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">Time remaining</span>
          {timeLabel}
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">Your status</span>
          {partnerStatus}
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">Request status</span>
          <span className="capitalize">{String(request.status || "—").replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        {/* Request info */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Request Information</h2>
          <div className="space-y-3">
            <Field label="Job No.">{request.job_number ?? "—"}</Field>
            <Field label="Customer">{request.customer_name || "—"}</Field>
            <Field label="Email">{request.customer_email || "—"}</Field>
            <Field label="Phone">{request.customer_phone || "—"}</Field>
            <Field label="Pickup">{request.pickup_address}</Field>
            <Field label="Dropoff">{request.dropoff_address || "—"}</Field>
            <Field label="Pickup time">{fmtDateTime(request.pickup_at)}</Field>
            <Field label="Dropoff time">{fmtDateTime(request.dropoff_at)}</Field>
            <Field label="Duration">{formatDuration(request.journey_duration_minutes)}</Field>
            <Field label="Passengers">{request.passengers}</Field>
            <Field label="Suitcases">{request.suitcases}</Field>
            <Field label="Hand luggage">{request.hand_luggage}</Field>
            <Field label="Sport equipment">{sportEquipmentLabel(request.sport_equipment)}</Field>
            <Field label="Main driver age">{request.driver_age ?? "—"}</Field>
            <Field label="Additional drivers">
              {request.additional_drivers > 0
                ? `${request.additional_drivers} (ages: ${request.additional_driver_ages || "—"})`
                : "None"}
            </Field>
            <Field label="Vehicle">{request.vehicle_category_name || "—"}</Field>
            <Field label="Notes">{request.notes || "—"}</Field>
            <Field label="Created">{fmtDateTime(request.created_at)}</Field>
            <Field label="Expires at">{fmtDateTime(request.expires_at)}</Field>
          </div>

          {/* Young driver alert for partner */}
          {showYoungDriverAlert && (
            <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800 mb-1">⚠ Young driver (21–24) on this booking</p>
              <p className="text-sm font-semibold text-amber-700">
                {isYoungMain && `Main driver is aged ${mainAge}. `}
                {hasYoungAdditional && `Additional driver(s) aged 21–24. `}
                If you apply a young driver surcharge, please include it in your car hire price and mention it in your bid notes.
              </p>
            </div>
          )}
        </div>

        {/* Bid section */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">Bid Outcome</h2>

          {(expired || request.status === "expired") && (
            <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black/60 mb-4">This request has expired.</div>
          )}
          {existingBooking && (
            <div className="border border-black/20 bg-black p-4 text-sm font-black text-white mb-4">✓ Your bid was successful — this request is now in Bookings.</div>
          )}
          {!existingBooking && existingBid?.status === "accepted" && (
            <div className="border border-black/20 bg-black p-4 text-sm font-black text-white mb-4">✓ Your bid was accepted.</div>
          )}
          {(existingBid?.status === "unsuccessful" || existingBid?.status === "rejected") && (
            <div className="border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700 mb-4">Your bid was unsuccessful.</div>
          )}
          {existingBid?.status === "submitted" && (
            <div className="border border-[#ff7a00]/30 bg-[#ff7a00]/5 p-4 text-sm font-black text-[#ff7a00] mb-4">Bid submitted — awaiting customer decision.</div>
          )}

          {existingBid && (
            <div className="space-y-3 mb-4">
              <Field label="Bid status"><span className="capitalize">{existingBid.status.replaceAll("_", " ")}</span></Field>
              <Field label="Currency">{CURRENCY_META[existingBid.currency ?? partnerCurrency]?.label ?? existingBid.currency}</Field>
              <Field label="Vehicle">{existingBid.vehicle_category_name || "—"}</Field>
              <Field label="Car hire price">{fmtCurrency(existingBid.car_hire_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label="Fuel price">{fmtCurrency(existingBid.fuel_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label="Total price">{fmtCurrency(existingBid.total_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label="Full insurance included">{existingBid.full_insurance_included ? "Yes" : "No"}</Field>
              <Field label="Full tank included">{existingBid.full_tank_included ? "Yes" : "No"}</Field>
              <Field label="Mileage limit">{existingBid.mileage_limit || "Unlimited"}</Field>
              <Field label="Security deposit">
                {existingBid.security_deposit_amount && existingBid.security_deposit_amount > 0
                  ? fmtCurrency(existingBid.security_deposit_amount, existingBid.currency ?? partnerCurrency)
                  : "None"}
              </Field>
              {existingBid.security_deposit_notes && (
                <Field label="Deposit notes">{existingBid.security_deposit_notes}</Field>
              )}
              <Field label="Notes">{existingBid.notes || "—"}</Field>
              <Field label="Submitted">{fmtDateTime(existingBid.created_at)}</Field>
              {existingBooking && (
                <div className="pt-2">
                  <Link href="/partner/bookings" className="inline-block bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity">
                    Go to Booking →
                  </Link>
                </div>
              )}
            </div>
          )}

          {!existingBid && data.fleetOptions.length === 0 && (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">No compatible vehicles found in your fleet for this request.</div>
          )}

          {!existingBid && data.fleetOptions.length > 0 && (
            <form onSubmit={submitBid} className="space-y-5">
              <div className="inline-flex items-center gap-2 border border-black/20 bg-[#f0f0f0] px-3 py-1.5 text-sm font-black text-black">
                <span>{symbol}</span>
                Bidding in {currencyLabel}
                <Link href="/partner/profile" className="ml-1 text-xs font-black text-black/40 underline hover:text-black">Change in profile</Link>
              </div>

              <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm">
                <p className="font-black text-black mb-1">💰 Commission on this booking</p>
                <p className="font-bold text-black/60">
                  Camel Global deducts a <strong className="text-black">{commissionRate}% commission</strong> on the car hire price,
                  with a <strong className="text-black">minimum of {fmtCurrency(minimumCommission, partnerCurrency)} per booking</strong>.
                  Fuel is passed through to you in full — no commission on fuel.
                </p>
                {showCommissionPreview && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-black/10 bg-white px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-black/40">Car hire</p>
                      <p className="font-black text-black">{fmtCurrency(hireNum, partnerCurrency)}</p>
                    </div>
                    <div className="border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-black/40">Commission</p>
                      <p className="font-black text-amber-700">− {fmtCurrency(commission, partnerCurrency)}</p>
                    </div>
                    <div className="border border-black/20 bg-black px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-white/40">Your payout</p>
                      <p className="font-black text-white">{fmtCurrency(payout, partnerCurrency)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Vehicle from your fleet</label>
                <select value={fleetId} onChange={e => setFleetId(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls} bg-white`} required>
                  {data.fleetOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Car hire price ({symbol})</label>
                <input type="number" min="0" step="0.01" value={carHirePrice}
                  onChange={e => setCarHirePrice(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls}`} required />
              </div>

              <div>
                <label className={labelCls}>Full fuel price ({symbol})</label>
                <input type="number" min="0" step="0.01" value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls}`} required />
              </div>

              <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
                <span className="text-black/40">Current total:</span> {fmtCurrency(total, partnerCurrency)}
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm font-black text-black cursor-pointer">
                  <input type="checkbox" checked={fullInsuranceIncluded}
                    onChange={e => setFullInsuranceIncluded(e.target.checked)}
                    disabled={formDisabled} className="h-4 w-4 accent-[#ff7a00]" />
                  Full insurance included
                </label>
                <label className="flex items-center gap-3 text-sm font-black text-black cursor-pointer">
                  <input type="checkbox" checked={fullTankIncluded}
                    onChange={e => setFullTankIncluded(e.target.checked)}
                    disabled={formDisabled} className="h-4 w-4 accent-[#ff7a00]" />
                  Full tank included
                </label>
              </div>

              {/* Mileage limit */}
              <div>
                <label className={labelCls}>Mileage limit <span className="font-semibold normal-case tracking-normal">(optional)</span></label>
                <input
                  type="text"
                  value={mileageLimit}
                  onChange={e => setMileageLimit(e.target.value)}
                  disabled={formDisabled}
                  placeholder="e.g. 200km/day, 1000km total, Unlimited"
                  className={`mt-2 ${inputCls}`}
                />
                <p className="mt-1 text-xs font-semibold text-black/40">Leave blank for unlimited. If you apply a limit, state the terms clearly — e.g. excess charge per km.</p>
              </div>

              {/* Security deposit */}
              <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
                <div>
                  <label className={labelCls}>Security deposit amount ({symbol}) <span className="font-semibold normal-case tracking-normal">(optional)</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={securityDepositAmount}
                    onChange={e => setSecurityDepositAmount(e.target.value)}
                    disabled={formDisabled}
                    placeholder="e.g. 500"
                    className={`mt-2 ${inputCls} bg-white`}
                  />
                  <p className="mt-1 text-xs font-semibold text-black/40">Enter 0 or leave blank if no security deposit is required.</p>
                </div>
                {(Number(securityDepositAmount) > 0) && (
                  <div>
                    <label className={labelCls}>Deposit explanation</label>
                    <textarea
                      rows={3}
                      value={securityDepositNotes}
                      onChange={e => setSecurityDepositNotes(e.target.value)}
                      disabled={formDisabled}
                      placeholder="e.g. A refundable security deposit will be blocked on your credit card at collection and released within 7 days of return, subject to no damage."
                      className={`mt-2 ${inputCls} resize-none bg-white`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
                  disabled={formDisabled}
                  className={`mt-2 ${inputCls} resize-none`}
                  placeholder="Optional notes for this bid (e.g. young driver surcharge included, pickup instructions)" />
              </div>

              <button type="submit" disabled={saving || formDisabled}
                className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? "Saving…" : "Submit Bid"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}