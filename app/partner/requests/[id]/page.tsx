"use client";

import Link from "next/link";
import { currencyLocale } from "@/lib/currency";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Currency = "EUR" | "GBP" | "USD" | "AUD" | "NZD" | "CAD";

const CURRENCY_META: Record<Currency, { symbol: string; label: string; locale: string }> = {
  EUR: { symbol: "€", label: "Euros (€)",          locale: "es-ES" },
  AUD: { symbol: "A$", label: "AUD (A$)",           locale: "en-AU" },
  NZD: { symbol: "NZ$", label: "NZD (NZ$)",         locale: "en-NZ" },
  CAD: { symbol: "C$", label: "CAD (C$)",           locale: "en-CA" },
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
  mileage_limit: string | null; security_deposit_notes: string | null;
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
  const { t } = useTranslation();
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
  const [securityDepositNotes,  setSecurityDepositNotes]  = useState("");

  useEffect(() => { params.then(r => setRequestId(r.id)); }, [params]);

  async function load() {
    if (!requestId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/partner/requests/${requestId}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("requests.error.load"));
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
        setSecurityDepositNotes(nextData.existingBid.security_deposit_notes || "");
      } else {
        setFleetId(nextData.fleetOptions?.[0]?.id || "");
        setCarHirePrice(""); setFuelPrice(""); setFullInsuranceIncluded(true); setFullTankIncluded(true);
        setNotes(""); setMileageLimit(""); setSecurityDepositNotes("");
      }
    } catch (e: any) { setError(e?.message || t("requests.error.load")); setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [requestId]);

  useEffect(() => {
    const exp = data?.request?.expires_at || null;
    if (!exp) { setTimeLabel("—"); setExpired(false); return; }
    const tick = () => { const r = getTimeRemaining(exp); setTimeLabel(r?.label || "—"); setExpired(!!r?.expired); };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data?.request?.expires_at]);

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.request) return;
    setSaving(true); setError(null); setOk(null);
    try {
      const selectedFleet = data.fleetOptions.find(f => f.id === fleetId);
      if (!selectedFleet) throw new Error(t("requests.error.bid.noFleet"));
      const carHire = Number(carHirePrice || 0);
      const fuel    = Number(fuelPrice || 0);
      if (isNaN(carHire) || carHire < 0) throw new Error(t("requests.error.bid.carHire"));
      if (isNaN(fuel)    || fuel    < 0) throw new Error(t("requests.error.bid.fuel"));
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
          security_deposit_notes: securityDepositNotes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("requests.error.bid.failed"));
      setOk(t("requests.detail.form.ok"));
      await load();
    } catch (e: any) { setError(e?.message || t("requests.error.bid.failed")); }
    finally { setSaving(false); }
  }

  function getPartnerHistoryStatus() {
    const requestStatus = String(data?.request?.status || "").trim();
    const bidStatus     = String(data?.existingBid?.status || "").trim();
    const exp           = !!data?.request?.expires_at && new Date(data.request.expires_at).getTime() <= Date.now();
    if (data?.existingBooking || bidStatus === "accepted") return t("requests.partnerStatus.successful");
    if (bidStatus === "unsuccessful" || bidStatus === "rejected") return t("requests.partnerStatus.unsuccessful");
    if (exp || requestStatus === "expired") return t("requests.partnerStatus.expired");
    if (bidStatus === "submitted") return t("requests.partnerStatus.submitted");
    return t("requests.partnerStatus.open");
  }

  function sportEquipmentLabel(v: string | null): string {
    if (!v || v === "none") return t("bookings.sport.none");
    const key = `bookings.sport.${v}` as any;
    const result = t(key);
    return result !== key ? result : v;
  }

  if (loading) return (
    <div className="border border-black/5 bg-white p-8">
      <p className="text-sm font-bold text-black/50">{t("requests.detail.loading")}</p>
    </div>
  );

  if (!data?.request) return (
    <div className="border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{error || t("requests.error.notFound")}</div>
  );

  const { request, existingBid, existingBooking } = data;
  const { symbol, label: currencyLabel } = CURRENCY_META[partnerCurrency];
  const commissionRate    = data.commissionRate ?? 20;
  const minimumCommission = data.minimumCommission ?? 10;

  const mainAge = request.driver_age;
  const isYoungMain = mainAge != null && mainAge >= 21 && mainAge <= 24;
  const addAges = (request.additional_driver_ages || "").split(",").map(a => Number(a.trim())).filter(n => !isNaN(n) && n > 0);
  const hasYoungAdditional = addAges.some(n => n >= 21 && n <= 24);
  const showYoungDriverAlert = isYoungMain || hasYoungAdditional;

  const partnerStatus = getPartnerHistoryStatus();

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

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">{t("requests.detail.title")}</h1>
          <p className="mt-1 text-sm font-bold text-black/50">{t("requests.detail.subtitle")}</p>
        </div>
        <Link href="/partner/requests" className="border border-black/20 px-5 py-2 text-sm font-black text-black hover:bg-black/5 transition-colors">
          {t("requests.detail.backBtn")}
        </Link>
      </div>

      {/* Status strips */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`border px-4 py-3 text-sm font-black ${expired ? "border-red-200 bg-red-50 text-red-700" : "border-[#ff7a00]/30 bg-[#ff7a00]/5 text-[#ff7a00]"}`}>
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">{t("requests.detail.strip.timeRemaining")}</span>
          {timeLabel}
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">{t("requests.detail.strip.yourStatus")}</span>
          {partnerStatus}
        </div>
        <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
          <span className="text-black/40 font-black uppercase tracking-widest text-xs block mb-0.5">{t("requests.detail.strip.requestStatus")}</span>
          <span className="capitalize">{String(request.status || "—").replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        {/* Request info */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">{t("requests.detail.info.title")}</h2>
          <div className="space-y-3">
            <Field label={t("requests.detail.info.jobNo")}>{request.job_number ?? "—"}</Field>
            <Field label={t("requests.detail.info.customer")}>{request.customer_name || "—"}</Field>
            <Field label={t("requests.detail.info.email")}>{request.customer_email || "—"}</Field>
            <Field label={t("requests.detail.info.phone")}>{request.customer_phone || "—"}</Field>
            <Field label={t("requests.detail.info.pickup")}>{request.pickup_address}</Field>
            <Field label={t("requests.detail.info.dropoff")}>{request.dropoff_address || "—"}</Field>
            <Field label={t("requests.detail.info.pickupTime")}>{fmtDateTime(request.pickup_at)}</Field>
            <Field label={t("requests.detail.info.dropoffTime")}>{fmtDateTime(request.dropoff_at)}</Field>
            <Field label={t("requests.detail.info.duration")}>{formatDuration(request.journey_duration_minutes)}</Field>
            <Field label={t("requests.detail.info.passengers")}>{request.passengers}</Field>
            <Field label={t("requests.detail.info.suitcases")}>{request.suitcases}</Field>
            <Field label={t("requests.detail.info.handLuggage")}>{request.hand_luggage}</Field>
            <Field label={t("requests.detail.info.sport")}>{sportEquipmentLabel(request.sport_equipment)}</Field>
            <Field label={t("requests.detail.info.driverAge")}>{request.driver_age ?? "—"}</Field>
            <Field label={t("requests.detail.info.additionalDrivers")}>
              {request.additional_drivers > 0
                ? t("requests.detail.info.additionalDriversValue", { count: String(request.additional_drivers), ages: request.additional_driver_ages || "—" })
                : t("requests.detail.info.additionalDriversNone")}
            </Field>
            <Field label={t("requests.detail.info.vehicle")}>{request.vehicle_category_name || "—"}</Field>
            <Field label={t("requests.detail.info.notes")}>{request.notes || "—"}</Field>
            <Field label={t("requests.detail.info.created")}>{fmtDateTime(request.created_at)}</Field>
            <Field label={t("requests.detail.info.expiresAt")}>{fmtDateTime(request.expires_at)}</Field>
          </div>

          {showYoungDriverAlert && (
            <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800 mb-1">{t("requests.detail.youngDriver.title")}</p>
              <p className="text-sm font-semibold text-amber-700">
                {isYoungMain && t("requests.detail.youngDriver.main", { age: String(mainAge) })}
                {hasYoungAdditional && t("requests.detail.youngDriver.additional")}
                {t("requests.detail.youngDriver.body")}
              </p>
            </div>
          )}
        </div>

        {/* Bid section */}
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black mb-4">{t("requests.detail.bid.title")}</h2>

          {(expired || request.status === "expired") && (
            <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black/60 mb-4">{t("requests.detail.bid.expired")}</div>
          )}
          {existingBooking && (
            <div className="border border-black/20 bg-black p-4 text-sm font-black text-white mb-4">{t("requests.detail.bid.successful")}</div>
          )}
          {!existingBooking && existingBid?.status === "accepted" && (
            <div className="border border-black/20 bg-black p-4 text-sm font-black text-white mb-4">{t("requests.detail.bid.accepted")}</div>
          )}
          {(existingBid?.status === "unsuccessful" || existingBid?.status === "rejected") && (
            <div className="border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700 mb-4">{t("requests.detail.bid.unsuccessful")}</div>
          )}
          {existingBid?.status === "submitted" && (
            <div className="border border-[#ff7a00]/30 bg-[#ff7a00]/5 p-4 text-sm font-black text-[#ff7a00] mb-4">{t("requests.detail.bid.submitted")}</div>
          )}

          {existingBid && (
            <div className="space-y-3 mb-4">
              <Field label={t("requests.detail.bid.field.status")}><span className="capitalize">{existingBid.status.replaceAll("_", " ")}</span></Field>
              <Field label={t("requests.detail.bid.field.currency")}>{CURRENCY_META[existingBid.currency ?? partnerCurrency]?.label ?? existingBid.currency}</Field>
              <Field label={t("requests.detail.bid.field.vehicle")}>{existingBid.vehicle_category_name || "—"}</Field>
              <Field label={t("requests.detail.bid.field.carHire")}>{fmtCurrency(existingBid.car_hire_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label={t("requests.detail.bid.field.fuelPrice")}>{fmtCurrency(existingBid.fuel_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label={t("requests.detail.bid.field.totalPrice")}>{fmtCurrency(existingBid.total_price, existingBid.currency ?? partnerCurrency)}</Field>
              <Field label={t("requests.detail.bid.field.insurance")}>{existingBid.full_insurance_included ? t("requests.detail.bid.yes") : t("requests.detail.bid.no")}</Field>
              <Field label={t("requests.detail.bid.field.fullTank")}>{existingBid.full_tank_included ? t("requests.detail.bid.yes") : t("requests.detail.bid.no")}</Field>
              <Field label={t("requests.detail.bid.field.mileage")}>{existingBid.mileage_limit || t("requests.detail.bid.field.mileageUnlimited")}</Field>
              <Field label={t("requests.detail.bid.field.deposit")}>{existingBid.security_deposit_notes || t("requests.detail.bid.field.depositNone")}</Field>
              <Field label={t("requests.detail.bid.field.notes")}>{existingBid.notes || "—"}</Field>
              <Field label={t("requests.detail.bid.field.submitted")}>{fmtDateTime(existingBid.created_at)}</Field>
              {existingBooking && (
                <div className="pt-2">
                  <Link href="/partner/bookings" className="inline-block bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity">
                    {t("requests.detail.bid.goToBooking")}
                  </Link>
                </div>
              )}
            </div>
          )}

          {!existingBid && data.fleetOptions.length === 0 && (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">{t("requests.detail.bid.noFleet")}</div>
          )}

          {!existingBid && data.fleetOptions.length > 0 && (
            <form onSubmit={submitBid} className="space-y-5">
              <div className="inline-flex items-center gap-2 border border-black/20 bg-[#f0f0f0] px-3 py-1.5 text-sm font-black text-black">
                <span>{symbol}</span>
                {t("requests.detail.form.biddingIn", { label: currencyLabel })}
                <Link href="/partner/profile" className="ml-1 text-xs font-black text-black/40 underline hover:text-black">
                  {t("requests.detail.form.changeInProfile")}
                </Link>
              </div>

              <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm">
                <p className="font-black text-black mb-1">{t("requests.detail.form.commission.title")}</p>
                <p className="font-bold text-black/60">
                  {t("requests.detail.form.commission.body")}{" "}
                  <strong className="text-black">{t("requests.detail.form.commission.rate", { rate: String(commissionRate) })}</strong>{" "}
                  {t("requests.detail.form.commission.mid")}{" "}
                  <strong className="text-black">{t("requests.detail.form.commission.min", { amount: fmtCurrency(minimumCommission, partnerCurrency) })}</strong>
                  {t("requests.detail.form.commission.end")}
                </p>
                {showCommissionPreview && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-black/10 bg-white px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-black/40">{t("requests.detail.form.commission.carHire")}</p>
                      <p className="font-black text-black">{fmtCurrency(hireNum, partnerCurrency)}</p>
                    </div>
                    <div className="border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-black/40">{t("requests.detail.form.commission.commission")}</p>
                      <p className="font-black text-amber-700">− {fmtCurrency(commission, partnerCurrency)}</p>
                    </div>
                    <div className="border border-black/20 bg-black px-3 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-white/40">{t("requests.detail.form.commission.payout")}</p>
                      <p className="font-black text-white">{fmtCurrency(payout, partnerCurrency)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>{t("requests.detail.form.vehicleLabel")}</label>
                <select value={fleetId} onChange={e => setFleetId(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls} bg-white`} required>
                  {data.fleetOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>{t("requests.detail.form.carHireLabel", { symbol })}</label>
                <input type="number" min="0" step="0.01" value={carHirePrice}
                  onChange={e => setCarHirePrice(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls}`} required />
              </div>

              <div>
                <label className={labelCls}>{t("requests.detail.form.fuelLabel", { symbol })}</label>
                <input type="number" min="0" step="0.01" value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)} disabled={formDisabled}
                  className={`mt-2 ${inputCls}`} required />
              </div>

              <div className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-black text-black">
                <span className="text-black/40">{t("requests.detail.form.currentTotal")}</span> {fmtCurrency(total, partnerCurrency)}
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm font-black text-black cursor-pointer">
                  <input type="checkbox" checked={fullInsuranceIncluded}
                    onChange={e => { setFullInsuranceIncluded(e.target.checked); if (e.target.checked) setSecurityDepositNotes(""); }}
                    disabled={formDisabled} className="h-4 w-4 accent-[#ff7a00]" />
                  {t("requests.detail.form.insuranceCheck")}
                </label>
                <label className="flex items-center gap-3 text-sm font-black text-black cursor-pointer">
                  <input type="checkbox" checked={fullTankIncluded}
                    onChange={e => setFullTankIncluded(e.target.checked)}
                    disabled={formDisabled} className="h-4 w-4 accent-[#ff7a00]" />
                  {t("requests.detail.form.fullTankCheck")}
                </label>
              </div>

              <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-1">
                    {t("requests.detail.form.terms.title")}{" "}
                    <span className="font-semibold normal-case tracking-normal text-black/40">{t("requests.detail.form.terms.optional")}</span>
                  </p>
                  <p className="text-xs font-semibold text-black/50">
                    {t("requests.detail.form.terms.body")}{" "}
                    <strong className="text-black">{t("requests.detail.form.terms.depositWarning")}</strong>
                  </p>
                </div>
                <div>
                  <label className={labelCls}>
                    {t("requests.detail.form.mileageLabel")}{" "}
                    <span className="font-semibold normal-case tracking-normal text-black/40">{t("requests.detail.form.mileageOptional")}</span>
                  </label>
                  <input type="text" value={mileageLimit} onChange={e => setMileageLimit(e.target.value)}
                    disabled={formDisabled} placeholder={t("requests.detail.form.mileagePlaceholder")}
                    className={`mt-2 ${inputCls} bg-white`} />
                </div>
                <div>
                  <label className={labelCls}>
                    {t("requests.detail.form.depositLabel")}{" "}
                    <span className="font-semibold normal-case tracking-normal text-black/40">{t("requests.detail.form.depositOptional")}</span>
                  </label>
                  <input type="text" value={securityDepositNotes} onChange={e => setSecurityDepositNotes(e.target.value)}
                    disabled={formDisabled} placeholder={t("requests.detail.form.depositPlaceholder")}
                    className={`mt-2 ${inputCls} bg-white`} />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t("requests.detail.form.notesLabel")}</label>
                <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
                  disabled={formDisabled} className={`mt-2 ${inputCls} resize-none`}
                  placeholder={t("requests.detail.form.notesPlaceholder")} />
              </div>

              <button type="submit" disabled={saving || formDisabled}
                className="bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? t("requests.detail.form.saving") : t("requests.detail.form.submitBtn")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}