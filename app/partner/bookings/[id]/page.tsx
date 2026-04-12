"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Currency = "EUR" | "GBP" | "USD";

const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};

type Rates = { GBP: number; USD: number };

type DriverRow = {
  id: string; partner_user_id: string; auth_user_id: string | null;
  full_name: string; email: string; phone: string | null;
  is_active: boolean; created_at: string;
};

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
  currency: Currency;
  collection_confirmed_by_driver?: boolean | null;
  collection_confirmed_by_driver_at?: string | null;
  collection_fuel_level_driver?: string | null;
  return_confirmed_by_driver?: boolean | null;
  return_confirmed_by_driver_at?: string | null;
  return_fuel_level_driver?: string | null;
  collection_confirmed_by_partner?: boolean | null;
  collection_confirmed_by_partner_at?: string | null;
  collection_fuel_level_partner?: string | null;
  collection_partner_notes?: string | null;
  return_confirmed_by_partner?: boolean | null;
  return_confirmed_by_partner_at?: string | null;
  return_fuel_level_partner?: string | null;
  return_partner_notes?: string | null;
  collection_confirmed_by_customer?: boolean | null;
  collection_confirmed_by_customer_at?: string | null;
  collection_fuel_level_customer?: string | null;
  collection_customer_notes?: string | null;
  return_confirmed_by_customer?: boolean | null;
  return_confirmed_by_customer_at?: string | null;
  return_fuel_level_customer?: string | null;
  return_customer_notes?: string | null;
  insurance_docs_confirmed_by_driver?: boolean | null;
  insurance_docs_confirmed_by_driver_at?: string | null;
  insurance_docs_confirmed_by_customer?: boolean | null;
  insurance_docs_confirmed_by_customer_at?: string | null;
};

type RequestRow = {
  id: string; job_number: number | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  vehicle_category_name: string | null; notes: string | null;
  status: string | null; created_at: string | null;
};

type BookingApiResponse = { booking: BookingRow; request: RequestRow | null; role: string | null };
type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

// ── Currency helpers ──────────────────────────────────────────────────────────

function fmtCurr(amount: number, curr: Currency): string {
  return new Intl.NumberFormat(CURRENCY_META[curr].locale, { style: "currency", currency: curr }).format(amount);
}

function toEur(amount: number, stored: Currency, rates: Rates): number {
  if (stored === "EUR") return amount;
  if (stored === "GBP") return Math.round((amount / rates.GBP) * 100) / 100;
  return Math.round((amount / rates.USD) * 100) / 100;
}

function fromEur(amountEur: number, target: Currency, rates: Rates): number {
  if (target === "EUR") return amountEur;
  if (target === "GBP") return Math.round(amountEur * rates.GBP * 100) / 100;
  return Math.round(amountEur * rates.USD * 100) / 100;
}

function Amt({ amount, stored, rates }: { amount: number | null | undefined; stored: Currency; rates: Rates }) {
  if (amount == null || isNaN(amount)) return <span>—</span>;
  const sec1: Currency = stored === "USD" ? "EUR" : stored === "GBP" ? "EUR" : "GBP";
  const sec2: Currency = stored === "EUR" ? "USD" : stored === "GBP" ? "USD" : "GBP";
  const inEur = toEur(amount, stored, rates);
  return (
    <span>
      {fmtCurr(amount, stored)}{" "}
      <span className="opacity-60 text-[0.85em] font-normal">
        ({fmtCurr(fromEur(inEur, sec1, rates), sec1)} · {fmtCurr(fromEur(inEur, sec2, rates), sec2)})
      </span>
    </span>
  );
}

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
    case "empty":   return "Empty";
    case "quarter": return "¼ Tank";
    case "half":    return "½ Tank";
    case "3/4":     return "¾ Tank";
    case "full":    return "Full Tank";
    default:        return "—";
  }
}

const FUEL_BARS: Record<string, number> = { empty: 0, quarter: 1, half: 2, "3/4": 3, full: 4 };

function FuelBar({ level }: { level: unknown }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-1">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={[
          "h-2.5 flex-1 rounded-full",
          i < filled
            ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400"
            : "bg-slate-200",
        ].join(" ")} />
      ))}
    </div>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function fmtDuration(m?: number | null) {
  if (!m) return "—";
  if (m >= 1440) return `${Math.ceil(m / 1440)} day${Math.ceil(m / 1440) === 1 ? "" : "s"}`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function statusLabel(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed":  return "Completed";
    case "cancelled":  return "Cancelled";
    default: return String(s || "—").replaceAll("_", " ");
  }
}

function effectiveFuel(driverFuel: unknown, partnerFuel: unknown): string | null {
  return normalizeFuel(partnerFuel) || normalizeFuel(driverFuel);
}

function isLocked(opts: {
  driverOrPartnerFuel: string | null;
  customerConfirmed: boolean | null | undefined;
  customerFuel: string | null | undefined;
}): boolean {
  return (
    !!opts.driverOrPartnerFuel &&
    !!opts.customerConfirmed &&
    normalizeFuel(opts.customerFuel) === opts.driverOrPartnerFuel
  );
}

const QUARTER_LABELS: Record<number, string> = {
  0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank",
};

// ── Insurance Status Card (read-only for partner) ─────────────────────────────

function InsuranceStatusCard({ booking }: { booking: BookingRow }) {
  const driverConfirmed   = !!booking.insurance_docs_confirmed_by_driver;
  const customerConfirmed = !!booking.insurance_docs_confirmed_by_customer;
  const bothConfirmed     = driverConfirmed && customerConfirmed;

  return (
    <div className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] ${
      bothConfirmed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <h3 className="text-xl font-bold text-[#003768]">Insurance Documents</h3>
        </div>
        {bothConfirmed && (
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">✓ Confirmed</span>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Driver confirms handover at delivery. Customer confirms receipt. Both must agree.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${driverConfirmed ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Driver</p>
          {driverConfirmed ? (
            <>
              <p className="mt-1 text-base font-bold text-blue-700">✓ Handed over</p>
              <p className="mt-0.5 text-xs text-slate-400">{fmt(booking.insurance_docs_confirmed_by_driver_at)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm italic text-slate-400">Not yet confirmed</p>
          )}
        </div>
        <div className={`rounded-2xl border p-4 ${customerConfirmed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
          {customerConfirmed ? (
            <>
              <p className="mt-1 text-base font-bold text-green-700">✓ Received</p>
              <p className="mt-0.5 text-xs text-slate-400">{fmt(booking.insurance_docs_confirmed_by_customer_at)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm italic text-slate-400">Not yet confirmed</p>
          )}
        </div>
      </div>
      <div className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${
        bothConfirmed
          ? "border-green-200 bg-green-100 text-green-800"
          : "border-amber-200 bg-amber-100 text-amber-700"
      }`}>
        {bothConfirmed
          ? "✓ Both driver and customer confirm insurance documents were handed over at delivery."
          : !driverConfirmed && !customerConfirmed
          ? "Awaiting confirmation from driver and customer."
          : !driverConfirmed
          ? "Awaiting driver confirmation."
          : "Awaiting customer confirmation."}
      </div>
    </div>
  );
}

// ── Booking Summary Card ──────────────────────────────────────────────────────

function BookingSummaryCard({ booking, rates, isLive }: { booking: BookingRow; rates: Rates; isLive: boolean }) {
  const stored: Currency   = booking.currency ?? "EUR";
  const secondary: Currency = stored === "USD" ? "EUR" : stored === "GBP" ? "EUR" : "GBP";
  const tertiary: Currency  = stored === "EUR" ? "USD" : stored === "GBP" ? "USD" : "GBP";

  const carHireAmt   = Number(booking.car_hire_price || 0);
  const fullTankAmt  = Number(booking.fuel_price || 0);
  const totalAmt     = Number(booking.amount || 0);
  const fuelCharge   = booking.fuel_charge ?? null;
  const fuelRefund   = booking.fuel_refund ?? null;
  const perQtrAmt    = fullTankAmt / 4;
  const usedQuarters = booking.fuel_used_quarters ?? null;

  const collFuel = normalizeFuel(booking.collection_fuel_level_partner) ||
    normalizeFuel(booking.collection_fuel_level_driver) ||
    normalizeFuel(booking.collection_fuel_level_customer);
  const retFuel = normalizeFuel(booking.return_fuel_level_partner) ||
    normalizeFuel(booking.return_fuel_level_driver) ||
    normalizeFuel(booking.return_fuel_level_customer);

  const primary = (v: number) => fmtCurr(v, stored);
  const sec = (v: number) => {
    const inEur = toEur(v, stored, rates);
    return `(${fmtCurr(fromEur(inEur, secondary, rates), secondary)} · ${fmtCurr(fromEur(inEur, tertiary, rates), tertiary)})`;
  };
  const rateBadge = `1€ = ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(rates.GBP)} · 1€ = ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rates.USD)}`;

  return (
    <div className="rounded-3xl border border-[#003768]/20 bg-[#003768] p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Summary</h2>
        <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-bold text-green-900">Finalised</span>
      </div>
      <div className="mt-4 rounded-2xl bg-white/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Total booking value</p>
        <p className="mt-1 text-4xl font-black">
          {primary(totalAmt)}{" "}
          <span className="text-2xl font-normal opacity-60">{sec(totalAmt)}</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Car hire</p>
            <p className="mt-0.5 font-bold">{primary(carHireAmt)}</p>
            <p className="text-xs text-white/50">{sec(carHireAmt)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Full tank deposit</p>
            <p className="mt-0.5 font-bold">{primary(fullTankAmt)}</p>
            <p className="text-xs text-white/50">{sec(fullTankAmt)}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Delivery fuel",    value: fuelLabel(collFuel), bar: collFuel },
          { label: "Collection fuel",  value: fuelLabel(retFuel),  bar: retFuel },
          { label: "Fuel used",        value: usedQuarters !== null ? QUARTER_LABELS[usedQuarters] ?? `${usedQuarters}/4` : "—", bar: null },
          { label: "Per quarter",      value: primary(perQtrAmt),  bar: null },
        ].map(({ label, value, bar }) => (
          <div key={label} className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
            {bar && <FuelBar level={bar} />}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#ff7a00]/20 p-5 border border-[#ff7a00]/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Fuel charge to customer</p>
          <p className="mt-2 text-4xl font-black">
            {fuelCharge != null ? primary(fuelCharge) : "—"}{" "}
            {fuelCharge != null && <span className="text-2xl font-normal opacity-60">{sec(fuelCharge)}</span>}
          </p>
        </div>
        <div className="rounded-2xl bg-green-500/20 p-5 border border-green-400/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Refund to customer</p>
          <p className="mt-2 text-4xl font-black">
            {fuelRefund != null ? primary(fuelRefund) : "—"}{" "}
            {fuelRefund != null && <span className="text-2xl font-normal opacity-60">{sec(fuelRefund)}</span>}
          </p>
        </div>
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isLive ? "bg-green-400/20 text-green-200" : "bg-white/10 text-white/70"}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${isLive ? "bg-green-400" : "bg-white/40"}`} />
        {rateBadge}{isLive ? " · Live rate (frankfurter.app)" : ""}
      </div>
    </div>
  );
}

// ── Fuel Stage Card ───────────────────────────────────────────────────────────

function FuelStageCard({
  title, booking, stage, fuelValue, onFuelChange,
  confirmed, onConfirmedChange, notes, onNotesChange,
  onSave, saving, locked,
}: {
  title: string; booking: BookingRow; stage: "collection" | "return";
  fuelValue: FuelLevel; onFuelChange: (v: FuelLevel) => void;
  confirmed: boolean; onConfirmedChange: (v: boolean) => void;
  notes: string; onNotesChange: (v: string) => void;
  onSave: () => void; saving: boolean; locked: boolean;
}) {
  const isC              = stage === "collection";
  const driverConfirmed  = isC ? !!booking.collection_confirmed_by_driver  : !!booking.return_confirmed_by_driver;
  const driverFuel       = isC ? booking.collection_fuel_level_driver       : booking.return_fuel_level_driver;
  const driverAt         = isC ? booking.collection_confirmed_by_driver_at  : booking.return_confirmed_by_driver_at;
  const customerConfirmed = isC ? !!booking.collection_confirmed_by_customer : !!booking.return_confirmed_by_customer;
  const customerFuel     = isC ? booking.collection_fuel_level_customer     : booking.return_fuel_level_customer;
  const customerAt       = isC ? booking.collection_confirmed_by_customer_at : booking.return_confirmed_by_customer_at;
  const customerNotes    = isC ? booking.collection_customer_notes          : booking.return_customer_notes;
  const savedPartnerFuel = isC ? booking.collection_fuel_level_partner      : booking.return_fuel_level_partner;
  const savedPartnerAt   = isC ? booking.collection_confirmed_by_partner_at : booking.return_confirmed_by_partner_at;
  const hasOverride      = !!savedPartnerFuel && savedPartnerFuel !== driverFuel;

  return (
    <div className={`rounded-3xl border p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] ${locked ? "border-green-200 bg-green-50" : "border-black/5 bg-white"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#003768]">{title}</h3>
        {locked && <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">✓ Locked</span>}
      </div>

      <div className={`mt-4 rounded-2xl border p-4 ${driverConfirmed ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Driver recorded</p>
        {driverConfirmed && driverFuel ? (
          <>
            <p className="mt-1 text-xl font-bold text-[#003768]">{fuelLabel(driverFuel)}</p>
            <FuelBar level={driverFuel} />
            <p className="mt-1 text-xs text-slate-400">{fmt(driverAt)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm italic text-slate-400">Driver has not yet recorded fuel level</p>
        )}
      </div>

      <div className={`mt-3 rounded-2xl border p-4 ${customerConfirmed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer confirmed</p>
        {customerConfirmed ? (
          <>
            <p className="mt-1 text-xl font-bold text-green-700">{fuelLabel(customerFuel)} ✓</p>
            <p className="mt-1 text-xs text-slate-400">{fmt(customerAt)}</p>
            {customerNotes && <p className="mt-1 text-xs text-slate-600">Note: {customerNotes}</p>}
          </>
        ) : (
          <p className="mt-1 text-sm italic text-slate-400">Waiting for customer to confirm</p>
        )}
      </div>

      {locked ? (
        <div className="mt-4 rounded-2xl border border-green-300 bg-green-100 p-3 text-sm font-semibold text-green-800">
          ✓ Both driver and customer agree on {fuelLabel(effectiveFuel(driverFuel, savedPartnerFuel))}
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Office override{hasOverride ? ` — currently set to ${fuelLabel(savedPartnerFuel)}` : ""}
            </p>
            <p className="mt-1 text-xs text-amber-600">Use this if the driver is unavailable or you need to correct their reading.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#003768]">Fuel level</label>
                <select value={fuelValue} onChange={e => onFuelChange(e.target.value as FuelLevel)}
                  disabled={locked}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f4f8a] disabled:opacity-60">
                  <option value="full">Full</option>
                  <option value="3/4">¾ Tank</option>
                  <option value="half">½ Tank</option>
                  <option value="quarter">¼ Tank</option>
                  <option value="empty">Empty</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#003768]">
                  <input type="checkbox" checked={confirmed} onChange={e => onConfirmedChange(e.target.checked)}
                    disabled={locked} className="h-4 w-4" />
                  Office confirms
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-[#003768]">Notes</label>
              <textarea rows={2} value={notes} onChange={e => onNotesChange(e.target.value)}
                disabled={locked}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                placeholder="Reason for override, depot drop-off, out of hours, etc." />
            </div>
            {savedPartnerAt && (
              <p className="mt-2 text-xs text-amber-600">Last saved: {fuelLabel(savedPartnerFuel)} at {fmt(savedPartnerAt)}</p>
            )}
          </div>
          <button type="button" onClick={onSave} disabled={saving || locked}
            className="mt-4 w-full rounded-full bg-[#003768] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Saving…" : `Save ${title} Update`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PartnerBookingDetailPage() {
  const params    = useParams<{ id: string }>();
  const bookingId = String(params?.id || "");

  const [loading,        setLoading]        = useState(true);
  const [savingSection,  setSavingSection]  = useState<"details" | "collection" | "return" | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [ok,             setOk]             = useState<string | null>(null);
  const [data,           setData]           = useState<BookingApiResponse | null>(null);
  const [drivers,        setDrivers]        = useState<DriverRow[]>([]);
  const [rates,          setRates]          = useState<Rates>({ GBP: 0.85, USD: 1.08 });
  const [rateIsLive,     setRateIsLive]     = useState(false);

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName,       setDriverName]       = useState("");
  const [driverPhone,      setDriverPhone]      = useState("");
  const [driverVehicle,    setDriverVehicle]    = useState("");
  const [driverNotes,      setDriverNotes]      = useState("");

  const [collectionFuel,      setCollectionFuel]      = useState<FuelLevel>("full");
  const [collectionConfirmed, setCollectionConfirmed] = useState(false);
  const [collectionNotes,     setCollectionNotes]     = useState("");
  const [returnFuel,          setReturnFuel]          = useState<FuelLevel>("full");
  const [returnConfirmed,     setReturnConfirmed]     = useState(false);
  const [returnNotes,         setReturnNotes]         = useState("");

  function hydrateForm(d: BookingApiResponse) {
    const b = d.booking;
    setDriverName(b.driver_name || "");
    setDriverPhone(b.driver_phone || "");
    setDriverVehicle(b.driver_vehicle || "");
    setDriverNotes(b.driver_notes || "");
    setSelectedDriverId(b.assigned_driver_id || "");
    setCollectionFuel((normalizeFuel(b.collection_fuel_level_partner) || normalizeFuel(b.collection_fuel_level_driver) || "full") as FuelLevel);
    setCollectionConfirmed(!!b.collection_confirmed_by_partner);
    setCollectionNotes(b.collection_partner_notes || "");
    setReturnFuel((normalizeFuel(b.return_fuel_level_partner) || normalizeFuel(b.return_fuel_level_driver) || "full") as FuelLevel);
    setReturnConfirmed(!!b.return_confirmed_by_partner);
    setReturnNotes(b.return_partner_notes || "");
  }

  async function loadBooking(showSpinner = false, hydrate = false) {
    if (!bookingId) { setLoading(false); setError("Missing booking ID."); return; }
    if (showSpinner) setLoading(true);
    try {
      const res  = await fetch(`/api/partner/bookings/${bookingId}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load booking.");
      setData(json);
      if (hydrate) hydrateForm(json);
    } catch (e: any) { setError(e?.message || "Failed to load booking."); }
    finally { if (showSpinner) setLoading(false); }
  }

  async function loadDrivers() {
    setLoadingDrivers(true);
    try {
      const res  = await fetch("/api/partner/drivers", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (res.ok) setDrivers((json?.data || []).filter((d: DriverRow) => d.is_active));
    } catch { setDrivers([]); }
    finally { setLoadingDrivers(false); }
  }

  async function loadRates() {
    try {
      const res  = await fetch("/api/currency/rate", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.rates) {
        setRates({ GBP: Number(json.rates.GBP) || 0.85, USD: Number(json.rates.USD) || 1.08 });
        setRateIsLive(!!json.live);
      }
    } catch { /* use fallback */ }
  }

  useEffect(() => { loadBooking(true, true); loadDrivers(); loadRates(); }, [bookingId]);
  useEffect(() => {
    if (!bookingId) return;
    const t = setInterval(() => loadBooking(false, false), 10000);
    return () => clearInterval(t);
  }, [bookingId]);

  function handleDriverSelect(id: string) {
    setSelectedDriverId(id);
    if (!id) return;
    const d = drivers.find(d => d.id === id);
    if (d) { setDriverName(d.full_name || ""); setDriverPhone(d.phone || ""); }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingSection("details"); setError(null); setOk(null);
    try {
      const res  = await fetch(`/api/partner/bookings/${bookingId}/update`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_status: data?.booking.booking_status,
          assigned_driver_id: selectedDriverId || null,
          driver_name: driverName, driver_phone: driverPhone,
          driver_vehicle: driverVehicle, driver_notes: driverNotes,
          collection_fuel_level_partner: data?.booking.collection_fuel_level_partner,
          collection_confirmed_by_partner: data?.booking.collection_confirmed_by_partner,
          collection_partner_notes: data?.booking.collection_partner_notes,
          return_fuel_level_partner: data?.booking.return_fuel_level_partner,
          return_confirmed_by_partner: data?.booking.return_confirmed_by_partner,
          return_partner_notes: data?.booking.return_partner_notes,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update.");
      setOk("Driver details saved.");
      await loadBooking(false, false);
    } catch (e: any) { setError(e?.message || "Failed to update."); }
    finally { setSavingSection(null); }
  }

  async function saveFuelSection(section: "collection" | "return") {
    setSavingSection(section); setError(null); setOk(null);
    try {
      const isC  = section === "collection";
      const res  = await fetch(`/api/partner/bookings/${bookingId}/update`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_status: data?.booking.booking_status,
          assigned_driver_id: data?.booking.assigned_driver_id,
          driver_name: data?.booking.driver_name,
          driver_phone: data?.booking.driver_phone,
          driver_vehicle: data?.booking.driver_vehicle,
          driver_notes: data?.booking.driver_notes,
          collection_fuel_level_partner:    isC ? collectionFuel      : data?.booking.collection_fuel_level_partner,
          collection_confirmed_by_partner:  isC ? collectionConfirmed : data?.booking.collection_confirmed_by_partner,
          collection_partner_notes:         isC ? collectionNotes     : data?.booking.collection_partner_notes,
          return_fuel_level_partner:        !isC ? returnFuel         : data?.booking.return_fuel_level_partner,
          return_confirmed_by_partner:      !isC ? returnConfirmed    : data?.booking.return_confirmed_by_partner,
          return_partner_notes:             !isC ? returnNotes        : data?.booking.return_partner_notes,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update.");
      setOk(`${section === "collection" ? "Delivery" : "Collection"} fuel saved.`);
      await loadBooking(false, false);
    } catch (e: any) { setError(e?.message || "Failed to update."); }
    finally { setSavingSection(null); }
  }

  if (loading) return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading booking…</p>
      </div>
    </div>
  );

  if (!data?.booking) return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Booking not found"}</div>
    </div>
  );

  const bk  = data.booking;
  const req = data.request;
  const stored: Currency   = (bk.currency === "EUR" || bk.currency === "GBP" || bk.currency === "USD") ? bk.currency : "EUR";
  const { symbol, label: currLabel } = CURRENCY_META[stored];

  const collEffective    = effectiveFuel(bk.collection_fuel_level_driver, bk.collection_fuel_level_partner);
  const retEffective     = effectiveFuel(bk.return_fuel_level_driver, bk.return_fuel_level_partner);
  const collectionLocked = isLocked({ driverOrPartnerFuel: collEffective, customerConfirmed: bk.collection_confirmed_by_customer, customerFuel: bk.collection_fuel_level_customer });
  const returnLocked     = isLocked({ driverOrPartnerFuel: retEffective,  customerConfirmed: bk.return_confirmed_by_customer,     customerFuel: bk.return_fuel_level_customer });

  const rateBadgeText = `1€ = ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(rates.GBP)} · 1€ = ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rates.USD)}`;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {ok    && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{ok}</div>}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking Detail</h1>
          <p className="mt-1 text-slate-600">View and manage this booking.</p>
        </div>
        <Link href="/partner/bookings" className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
          Back to Bookings
        </Link>
      </div>

      {/* Booking + Journey info */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Booking Information</h2>
          <div className="mt-6 space-y-3 text-slate-700">
            <p><span className="font-semibold text-slate-900">Job No.:</span> {bk.job_number ?? req?.job_number ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Status:</span> {statusLabel(bk.booking_status)}</p>
            <p><span className="font-semibold text-slate-900">Total:</span> <Amt amount={bk.amount} stored={stored} rates={rates} /></p>
            <p><span className="font-semibold text-slate-900">Created:</span> {fmt(bk.created_at)}</p>
            <p><span className="font-semibold text-slate-900">Driver:</span> {drivers.find(d => d.id === bk.assigned_driver_id)?.full_name || bk.driver_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Driver assigned:</span> {fmt(bk.driver_assigned_at)}</p>
            <p><span className="font-semibold text-slate-900">Notes:</span> {bk.notes || "—"}</p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${rateIsLive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${rateIsLive ? "bg-green-500" : "bg-slate-400"}`} />
              {rateBadgeText}{rateIsLive ? " · Live rate (frankfurter.app)" : ""}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#003768]/20 bg-[#003768]/5 px-3 py-1 text-sm font-semibold text-[#003768]">
              {symbol} Booking currency: {currLabel}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Journey Information</h2>
          <div className="mt-6 space-y-3 text-slate-700">
            <p><span className="font-semibold text-slate-900">Customer:</span> {req?.customer_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Email:</span> {req?.customer_email || "—"}</p>
            <p><span className="font-semibold text-slate-900">Phone:</span> {req?.customer_phone || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup:</span> {req?.pickup_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Dropoff:</span> {req?.dropoff_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmt(req?.pickup_at)}</p>
            <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmt(req?.dropoff_at)}</p>
            <p><span className="font-semibold text-slate-900">Duration:</span> {fmtDuration(req?.journey_duration_minutes)}</p>
            <p><span className="font-semibold text-slate-900">Passengers:</span> {req?.passengers ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Vehicle:</span> {req?.vehicle_category_name || "—"}</p>
          </div>
        </div>
      </div>

      {/* Driver assignment */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Driver Assignment</h2>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          <span className="font-semibold">Current status:</span>
          <span className="font-bold text-[#003768]">{statusLabel(bk.booking_status)}</span>
        </div>
        <form onSubmit={saveDetails} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Assign driver</label>
            <select value={selectedDriverId} onChange={e => handleDriverSelect(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]">
              <option value="">No driver selected</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}{d.phone ? ` (${d.phone})` : ""}</option>
              ))}
            </select>
            {loadingDrivers && <p className="mt-1 text-xs text-slate-400">Loading drivers…</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[#003768]">Driver name</label>
              <input value={driverName} onChange={e => setDriverName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]" placeholder="John Smith" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Driver phone</label>
              <input value={driverPhone} onChange={e => setDriverPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]" placeholder="+34 600 000 000" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#003768]">Vehicle</label>
              <input value={driverVehicle} onChange={e => setDriverVehicle(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]" placeholder="Mercedes E-Class / AB12 CDE" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#003768]">Driver notes</label>
            <textarea rows={3} value={driverNotes} onChange={e => setDriverNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#0f4f8a]"
              placeholder="Optional notes about this assignment" />
          </div>
          <button type="submit" disabled={savingSection === "details"}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60">
            {savingSection === "details" ? "Saving…" : "Save Driver Details"}
          </button>
        </form>
      </div>

      {/* Booking summary — only when both fuel stages locked */}
      {collectionLocked && returnLocked && (
        <BookingSummaryCard booking={bk} rates={rates} isLive={rateIsLive} />
      )}

      {/* Insurance documents — always visible once booking exists */}
      <div>
        <h2 className="mb-1 text-2xl font-semibold text-[#003768]">Insurance Documents</h2>
        <p className="mb-4 text-sm text-slate-500">
          Driver confirms handover at delivery via their app. Customer confirms receipt on their portal.
          <span className="ml-1 text-xs text-slate-400">(Refreshes every 10s)</span>
        </p>
        <InsuranceStatusCard booking={bk} />
      </div>

      {/* Fuel tracking — always visible */}
      <div>
        <h2 className="mb-1 text-2xl font-semibold text-[#003768]">Fuel Tracking</h2>
        <p className="mb-4 text-sm text-slate-500">
          Driver records fuel level via their app. Use the office override if the driver is unavailable or you need to correct their reading.
          Customer confirms the reading to lock each stage.
          <span className="ml-1 text-xs text-slate-400">(Refreshes every 10s)</span>
        </p>
        <div className="grid gap-6 xl:grid-cols-2">
          <FuelStageCard title="Delivery" booking={bk} stage="collection"
            fuelValue={collectionFuel} onFuelChange={setCollectionFuel}
            confirmed={collectionConfirmed} onConfirmedChange={setCollectionConfirmed}
            notes={collectionNotes} onNotesChange={setCollectionNotes}
            onSave={() => saveFuelSection("collection")}
            saving={savingSection === "collection"} locked={collectionLocked} />
          <FuelStageCard title="Collection" booking={bk} stage="return"
            fuelValue={returnFuel} onFuelChange={setReturnFuel}
            confirmed={returnConfirmed} onConfirmedChange={setReturnConfirmed}
            notes={returnNotes} onNotesChange={setReturnNotes}
            onSave={() => saveFuelSection("return")}
            saving={savingSection === "return"} locked={returnLocked} />
        </div>
      </div>
    </div>
  );
}