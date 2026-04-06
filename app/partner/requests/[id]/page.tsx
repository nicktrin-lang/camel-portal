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
  vehicle_category_slug: string | null; vehicle_category_name: string | null;
  notes: string | null; status: string; created_at: string;
  expires_at: string | null; matched_status: string | null;
};

type ApiResponse = {
  request: RequestRow; existingBid: ExistingBid | null;
  existingBooking: ExistingBooking | null; fleetOptions: FleetOption[];
  adminMode: boolean; role: string | null;
  partnerCurrency: Currency;
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
  const bidStatus = String(params.bidStatus || "").trim();
  const expired = !!params.expiresAt && new Date(params.expiresAt).getTime() <= Date.now();
  if (params.hasBooking || bidStatus === "accepted") return "Bid successful";
  if (bidStatus === "unsuccessful" || bidStatus === "rejected") return "Bid unsuccessful";
  if (expired || requestStatus === "expired") return "Expired";
  if (bidStatus === "submitted") return "Bid submitted — awaiting customer";
  return "Open";
}

export default function PartnerRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [timeLabel, setTimeLabel] = useState("—");
  const [expired, setExpired] = useState(false);
  const [partnerCurrency, setPartnerCurrency] = useState<Currency>("EUR");

  const [fleetId, setFleetId] = useState("");
  const [carHirePrice, setCarHirePrice] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [fullInsuranceIncluded, setFullInsuranceIncluded] = useState(true);
  const [fullTankIncluded, setFullTankIncluded] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  async function load() {
    if (!requestId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/partner/requests/${requestId}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load request.");
      const nextData = json as ApiResponse;
      setData(nextData);
      // Ensure currency is one of the three valid values, fallback to EUR
      const raw = nextData.partnerCurrency;
      const currency: Currency = (raw === "EUR" || raw === "GBP" || raw === "USD") ? raw : "EUR";
      setPartnerCurrency(currency);
      if (nextData.existingBid) {
        setFleetId(nextData.existingBid.fleet_id || "");
        setCarHirePrice(String(nextData.existingBid.car_hire_price ?? ""));
        setFuelPrice(String(nextData.existingBid.fuel_price ?? ""));
        setFullInsuranceIncluded(!!nextData.existingBid.full_insurance_included);
        setFullTankIncluded(!!nextData.existingBid.full_tank_included);
        setNotes(nextData.existingBid.notes || "");
      } else {
        setFleetId(nextData.fleetOptions?.[0]?.id || "");
        setCarHirePrice(""); setFuelPrice(""); setFullInsuranceIncluded(true); setFullTankIncluded(true); setNotes("");
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
      const carHire = Number(carHirePrice || 0);
      const fuel = Number(fuelPrice || 0);
      if (isNaN(carHire) || carHire < 0) throw new Error("Please enter a valid car hire price.");
      if (isNaN(fuel) || fuel < 0) throw new Error("Please enter a valid fuel price.");
      const res = await fetch("/api/partner/bids", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: data.request.id,
          fleet_id: selectedFleet.id,
          vehicle_category_slug: selectedFleet.category_slug,
          vehicle_category_name: selectedFleet.category_name,
          car_hire_price: carHire,
          fuel_price: fuel,
          total_price: carHire + fuel,
          full_insurance_included: fullInsuranceIncluded,
          full_tank_included: fullTankIncluded,
          notes,
          currency: partnerCurrency,
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
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading request…</p>
      </div>
    </div>
  );

  if (!data?.request) return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Request not found"}</div>
    </div>
  );

  const { request, existingBid, existingBooking } = data;
  const { symbol, label: currencyLabel } = CURRENCY_META[partnerCurrency];

  const partnerStatus = getPartnerHistoryStatus({
    requestStatus: request.status, expiresAt: request.expires_at,
    bidStatus: existingBid?.status, hasBooking: !!existingBooking,
  });

  const formDisabled = expired || !!existingBooking || request.status === "confirmed" ||
    request.status === "expired" || existingBid?.status === "accepted" ||
    existingBid?.status === "unsuccessful" || existingBid?.status === "rejected";

  const total = Number(carHirePrice || 0) + Number(fuelPrice || 0);

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Request Detail</h1>
          <p className="mt-2 text-slate-600">Review this request and its bidding outcome.</p>
        </div>
        <Link href="/partner/requests" className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
          Back to Requests
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <span className="font-semibold">Time remaining:</span> {timeLabel}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-semibold">Your status:</span> {partnerStatus}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-semibold">Request status:</span>{" "}
          <span className="capitalize">{String(request.status || "—").replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Request info */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>
          <div className="mt-6 space-y-4 text-slate-700">
            {[
              ["Job No.", request.job_number ?? "—"],
              ["Customer", request.customer_name || "—"],
              ["Email", request.customer_email || "—"],
              ["Phone", request.customer_phone || "—"],
              ["Pickup", request.pickup_address],
              ["Dropoff", request.dropoff_address || "—"],
              ["Pickup time", fmtDateTime(request.pickup_at)],
              ["Dropoff time", fmtDateTime(request.dropoff_at)],
              ["Duration", formatDuration(request.journey_duration_minutes)],
              ["Passengers", request.passengers],
              ["Suitcases", request.suitcases],
              ["Hand luggage", request.hand_luggage],
              ["Vehicle", request.vehicle_category_name || "—"],
              ["Notes", request.notes || "—"],
              ["Created", fmtDateTime(request.created_at)],
              ["Expires at", fmtDateTime(request.expires_at)],
              ["Matched status", request.matched_status || "—"],
            ].map(([lbl, val]) => (
              <p key={String(lbl)}><span className="font-semibold text-slate-900">{lbl}:</span> {String(val)}</p>
            ))}
          </div>
        </div>

        {/* Bid outcome */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Bid Outcome</h2>

          {(expired || request.status === "expired") && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700">This request has expired.</div>
          )}
          {existingBooking && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">Your bid was successful — this request is now in Bookings.</div>
          )}
          {!existingBooking && existingBid?.status === "accepted" && (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">Your bid was accepted.</div>
          )}
          {(existingBid?.status === "unsuccessful" || existingBid?.status === "rejected") && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">Your bid was unsuccessful.</div>
          )}
          {existingBid && existingBid.status === "submitted" && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-700">Your bid has been submitted and is awaiting customer decision.</div>
          )}

          {/* Existing bid summary — use the bid's own stored currency */}
          {existingBid && (
            <div className="mt-6 space-y-4 text-slate-700">
              <p><span className="font-semibold text-slate-900">Bid status:</span> <span className="capitalize">{existingBid.status.replaceAll("_", " ")}</span></p>
              <p><span className="font-semibold text-slate-900">Currency:</span> {CURRENCY_META[existingBid.currency ?? partnerCurrency]?.label ?? existingBid.currency}</p>
              <p><span className="font-semibold text-slate-900">Vehicle:</span> {existingBid.vehicle_category_name || "—"}</p>
              <p><span className="font-semibold text-slate-900">Car hire price:</span> {fmtCurrency(existingBid.car_hire_price, existingBid.currency ?? partnerCurrency)}</p>
              <p><span className="font-semibold text-slate-900">Fuel price:</span> {fmtCurrency(existingBid.fuel_price, existingBid.currency ?? partnerCurrency)}</p>
              <p><span className="font-semibold text-slate-900">Total price:</span> {fmtCurrency(existingBid.total_price, existingBid.currency ?? partnerCurrency)}</p>
              <p><span className="font-semibold text-slate-900">Full insurance included:</span> {existingBid.full_insurance_included ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Full tank included:</span> {existingBid.full_tank_included ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Notes:</span> {existingBid.notes || "—"}</p>
              <p><span className="font-semibold text-slate-900">Submitted:</span> {fmtDateTime(existingBid.created_at)}</p>
              {existingBooking && (
                <div className="pt-2">
                  <Link href="/partner/bookings" className="inline-flex rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">
                    Go to Booking
                  </Link>
                </div>
              )}
            </div>
          )}

          {!existingBid && data.fleetOptions.length === 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-700">No compatible vehicles found in your fleet for this request.</div>
          )}

          {!existingBid && data.fleetOptions.length > 0 && (
            <form onSubmit={submitBid} className="mt-6 space-y-5">
              {/* Currency badge — 100% driven by partnerCurrency */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#003768]/10 px-3 py-1.5 text-sm font-semibold text-[#003768]">
                <span>{symbol}</span>
                Bidding in {currencyLabel}
                <Link href="/partner/profile" className="ml-1 text-xs text-[#003768]/60 underline hover:text-[#003768]">Change in profile</Link>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Vehicle from your fleet</label>
                <select value={fleetId} onChange={e => setFleetId(e.target.value)} disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60" required>
                  {data.fleetOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Car hire price ({symbol})</label>
                <input type="number" min="0" step="0.01" value={carHirePrice}
                  onChange={e => setCarHirePrice(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60" required />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Full fuel price ({symbol})</label>
                <input type="number" min="0" step="0.01" value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60" required />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Current total:</span> {fmtCurrency(total, partnerCurrency)}
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={fullInsuranceIncluded}
                    onChange={e => setFullInsuranceIncluded(e.target.checked)} disabled={formDisabled} />
                  Full insurance included
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={fullTankIncluded}
                    onChange={e => setFullTankIncluded(e.target.checked)} disabled={formDisabled} />
                  Full tank included
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Notes</label>
                <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  placeholder="Optional notes for this bid" />
              </div>

              <button type="submit" disabled={saving || formDisabled}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
                {saving ? "Saving..." : "Submit Bid"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}