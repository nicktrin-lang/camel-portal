"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; notes: string | null;
  created_at: string; job_number: number | null; assigned_driver_id?: string | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  fuel_price: number | null; car_hire_price: number | null;
  fuel_used_quarters: number | null; fuel_charge: number | null; fuel_refund: number | null;
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
};

type RequestRow = {
  id: string; job_number: number | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  vehicle_category_name: string | null; notes: string | null; status: string | null;
};

type ApiResponse = { booking: BookingRow; request: RequestRow | null; role: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function FuelBar({ level }: { level: unknown }) {
  const n = normalizeFuel(level);
  const filled = n ? (FUEL_BARS[n] ?? 0) : 0;
  return (
    <div className="flex gap-1 mt-1">
      {[0,1,2,3].map(i => (
        <div key={i} className={[
          "h-2.5 flex-1 rounded-full",
          i < filled ? filled >= 3 ? "bg-green-500" : filled === 2 ? "bg-yellow-400" : "bg-red-400" : "bg-slate-200"
        ].join(" ")} />
      ))}
    </div>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function fmtGBP(v?: number | null) {
  if (v == null || isNaN(v)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
}

function fmtEUR(v?: number | null) {
  if (v == null || isNaN(v)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function fmtDuration(m?: number | null) {
  if (!m) return "—";
  if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)===1?"":"s"}`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), mins = m%60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

function statusLabel(s?: string | null) {
  switch (String(s||"").toLowerCase()) {
    case "confirmed": case "driver_assigned": case "en_route": case "arrived": return "Awaiting delivery";
    case "collected": case "returned": return "On Hire";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return String(s||"—").replaceAll("_"," ");
  }
}

const QUARTER_LABELS: Record<number, string> = { 0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank" };

function ConfirmRow({ label, confirmed, fuel, confirmedAt, notes }: {
  label: string; confirmed: boolean | null | undefined;
  fuel: string | null | undefined; confirmedAt: string | null | undefined;
  notes?: string | null;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${confirmed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className={`text-sm font-semibold ${confirmed ? "text-green-700" : "text-slate-400"}`}>
          {confirmed ? "✓ Confirmed" : "Pending"}
        </span>
        {confirmed && fuel && (
          <span className="text-sm text-slate-700">{fuelLabel(fuel)}</span>
        )}
      </div>
      {confirmed && fuel && <FuelBar level={fuel} />}
      {confirmed && confirmedAt && <p className="mt-1 text-xs text-slate-400">{fmt(confirmedAt)}</p>}
      {notes && <p className="mt-1 text-xs text-slate-600">Note: {notes}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/partner/bookings/${bookingId}`, { cache: "no-store", credentials: "include" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to load booking.");
        setData(json);
      } catch (e: any) {
        setError(e?.message || "Failed to load booking.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

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

  const bk = data.booking;
  const req = data.request;

  const collEffective = normalizeFuel(bk.collection_fuel_level_partner) || normalizeFuel(bk.collection_fuel_level_driver);
  const retEffective = normalizeFuel(bk.return_fuel_level_partner) || normalizeFuel(bk.return_fuel_level_driver);

  const collectionLocked = !!collEffective && !!bk.collection_confirmed_by_customer &&
    normalizeFuel(bk.collection_fuel_level_customer) === collEffective;
  const returnLocked = !!retEffective && !!bk.return_confirmed_by_customer &&
    normalizeFuel(bk.return_fuel_level_customer) === retEffective;

  const fullTankPrice = Number(bk.fuel_price || 0);
  const pricePerQuarter = fullTankPrice / 4;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking Detail</h1>
          <p className="mt-1 text-slate-500">Admin view — read only</p>
        </div>
        <Link href="/admin/bookings"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5">
          Back to Bookings
        </Link>
      </div>

      {/* Booking + Journey */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Booking Information</h2>
          <div className="mt-6 space-y-3 text-slate-700">
            <p><span className="font-semibold text-slate-900">Job No.:</span> {bk.job_number ?? req?.job_number ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Status:</span> {statusLabel(bk.booking_status)}</p>
            <p><span className="font-semibold text-slate-900">Amount:</span> {fmtGBP(bk.amount)}</p>
            <p><span className="font-semibold text-slate-900">Car hire:</span> {fmtGBP(bk.car_hire_price)}</p>
            <p><span className="font-semibold text-slate-900">Fuel deposit:</span> {fmtGBP(bk.fuel_price)}</p>
            <p><span className="font-semibold text-slate-900">Created:</span> {fmt(bk.created_at)}</p>
            <p><span className="font-semibold text-slate-900">Driver:</span> {bk.driver_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Driver phone:</span> {bk.driver_phone || "—"}</p>
            <p><span className="font-semibold text-slate-900">Driver vehicle:</span> {bk.driver_vehicle || "—"}</p>
            <p><span className="font-semibold text-slate-900">Driver assigned:</span> {fmt(bk.driver_assigned_at)}</p>
            <p><span className="font-semibold text-slate-900">Notes:</span> {bk.notes || "—"}</p>
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
            <p><span className="font-semibold text-slate-900">Suitcases:</span> {req?.suitcases ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Hand luggage:</span> {req?.hand_luggage ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Vehicle:</span> {req?.vehicle_category_name || "—"}</p>
          </div>
        </div>
      </div>

      {/* Fuel tracking */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Fuel Tracking</h2>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {/* Collection */}
          <div className={`rounded-2xl border p-5 ${collectionLocked ? "border-green-200 bg-green-50" : "border-black/10"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#003768]">Collection</h3>
              {collectionLocked && <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">✓ Locked</span>}
            </div>
            <div className="space-y-3">
              <ConfirmRow label="Driver" confirmed={!!bk.collection_confirmed_by_driver}
                fuel={bk.collection_fuel_level_driver} confirmedAt={bk.collection_confirmed_by_driver_at} />
              <ConfirmRow label="Partner office" confirmed={!!bk.collection_confirmed_by_partner}
                fuel={bk.collection_fuel_level_partner} confirmedAt={bk.collection_confirmed_by_partner_at}
                notes={bk.collection_partner_notes} />
              <ConfirmRow label="Customer" confirmed={!!bk.collection_confirmed_by_customer}
                fuel={bk.collection_fuel_level_customer} confirmedAt={bk.collection_confirmed_by_customer_at}
                notes={bk.collection_customer_notes} />
            </div>
          </div>

          {/* Return */}
          <div className={`rounded-2xl border p-5 ${returnLocked ? "border-green-200 bg-green-50" : "border-black/10"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#003768]">Return</h3>
              {returnLocked && <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">✓ Locked</span>}
            </div>
            <div className="space-y-3">
              <ConfirmRow label="Driver" confirmed={!!bk.return_confirmed_by_driver}
                fuel={bk.return_fuel_level_driver} confirmedAt={bk.return_confirmed_by_driver_at} />
              <ConfirmRow label="Partner office" confirmed={!!bk.return_confirmed_by_partner}
                fuel={bk.return_fuel_level_partner} confirmedAt={bk.return_confirmed_by_partner_at}
                notes={bk.return_partner_notes} />
              <ConfirmRow label="Customer" confirmed={!!bk.return_confirmed_by_customer}
                fuel={bk.return_fuel_level_customer} confirmedAt={bk.return_confirmed_by_customer_at}
                notes={bk.return_customer_notes} />
            </div>
          </div>
        </div>
      </div>

      {/* Fuel cost summary */}
      {collectionLocked && returnLocked && (
        <div className="rounded-3xl border border-[#003768]/20 bg-[#003768] p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Fuel Cost Summary</h2>
            <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-bold text-green-900">Finalised</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Collection fuel</p>
              <p className="mt-1 text-xl font-bold">{fuelLabel(collEffective)}</p>
              <FuelBar level={collEffective} />
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Return fuel</p>
              <p className="mt-1 text-xl font-bold">{fuelLabel(retEffective)}</p>
              <FuelBar level={retEffective} />
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Fuel used</p>
              <p className="mt-1 text-xl font-bold">
                {bk.fuel_used_quarters !== null ? QUARTER_LABELS[bk.fuel_used_quarters] ?? `${bk.fuel_used_quarters}/4` : "—"}
              </p>
              <p className="mt-1 text-xs text-white/60">{bk.fuel_used_quarters ?? "—"} of 4 quarters</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Price per quarter</p>
              <p className="mt-1 text-xl font-bold">{fmtEUR(pricePerQuarter)}</p>
              <p className="mt-1 text-xs text-white/60">Full tank: {fmtEUR(fullTankPrice)}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#ff7a00]/20 border border-[#ff7a00]/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Fuel charge</p>
              <p className="mt-2 text-4xl font-black">{fmtEUR(bk.fuel_charge)}</p>
              <p className="mt-1 text-sm text-white/60">Customer pays for fuel used</p>
            </div>
            <div className="rounded-2xl bg-green-500/20 border border-green-400/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Fuel refund</p>
              <p className="mt-2 text-4xl font-black">{fmtEUR(bk.fuel_refund)}</p>
              <p className="mt-1 text-sm text-white/60">Unused fuel returned to customer</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Car hire: {fmtGBP(bk.car_hire_price)} · Full tank deposit: {fmtGBP(bk.fuel_price)} · Total: {fmtGBP(bk.amount)}
          </p>
        </div>
      )}
    </div>
  );
}