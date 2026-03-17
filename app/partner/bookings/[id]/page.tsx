"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type BookingRow = {
  id: string;
  request_id: string;
  partner_user_id: string;
  winning_bid_id: string;
  booking_status: string;
  amount: number | null;
  notes: string | null;
  created_at: string;
  job_number: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_notes: string | null;
  driver_assigned_at: string | null;
};

type RequestRow = {
  id: string;
  job_number: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number | null;
  suitcases: number | null;
  hand_luggage: number | null;
  vehicle_category_name: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type ApiResponse = {
  booking: BookingRow;
  request: RequestRow | null;
  role: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }

  const minutesPerDay = 24 * 60;

  if (minutes >= minutesPerDay) {
    const days = Math.ceil(minutes / minutesPerDay);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatGBP(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default function PartnerBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicle, setDriverVehicle] = useState("");
  const [driverNotes, setDriverNotes] = useState("");

  async function load() {
    if (!bookingId) {
      setLoading(false);
      setError("Missing booking ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/partner/bookings/${bookingId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load booking.");
      }

      const nextData = json as ApiResponse;
      setData(nextData);

      setBookingStatus(nextData.booking.booking_status || "confirmed");
      setDriverName(nextData.booking.driver_name || "");
      setDriverPhone(nextData.booking.driver_phone || "");
      setDriverVehicle(nextData.booking.driver_vehicle || "");
      setDriverNotes(nextData.booking.driver_notes || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load booking.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  async function saveBookingOps(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) return;

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch(`/api/partner/bookings/${bookingId}/update`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_status: bookingStatus,
          driver_name: driverName,
          driver_phone: driverPhone,
          driver_vehicle: driverVehicle,
          driver_notes: driverNotes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update booking.");
      }

      setOk("Booking details updated.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update booking.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading booking…</p>
        </div>
      </div>
    );
  }

  if (!data?.booking) {
    return (
      <div className="space-y-6 px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Booking not found"}
        </div>
      </div>
    );
  }

  const booking = data.booking;
  const request = data.request;

  return (
    <div className="space-y-6 px-4 py-8 md:px-8">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking Detail</h1>
          <p className="mt-2 text-slate-600">
            View and manage accepted booking information.
          </p>
        </div>

        <Link
          href="/partner/bookings"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Bookings
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">
            Booking Information
          </h2>

          <div className="mt-6 space-y-4 text-slate-700">
            <p><span className="font-semibold text-slate-900">Job No.:</span> {booking.job_number ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Booking created:</span> {formatDateTime(booking.created_at)}</p>
            <p><span className="font-semibold text-slate-900">Booking status:</span> <span className="capitalize">{String(booking.booking_status || "—").replaceAll("_", " ")}</span></p>
            <p><span className="font-semibold text-slate-900">Amount:</span> {formatGBP(booking.amount)}</p>
            <p><span className="font-semibold text-slate-900">Booking notes:</span> {booking.notes || "—"}</p>
            <p><span className="font-semibold text-slate-900">Driver assigned at:</span> {formatDateTime(booking.driver_assigned_at)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">
            Journey Information
          </h2>

          <div className="mt-6 space-y-4 text-slate-700">
            <p><span className="font-semibold text-slate-900">Customer:</span> {request?.customer_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Email:</span> {request?.customer_email || "—"}</p>
            <p><span className="font-semibold text-slate-900">Phone:</span> {request?.customer_phone || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup:</span> {request?.pickup_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Dropoff:</span> {request?.dropoff_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup time:</span> {formatDateTime(request?.pickup_at)}</p>
            <p><span className="font-semibold text-slate-900">Dropoff time:</span> {formatDateTime(request?.dropoff_at)}</p>
            <p><span className="font-semibold text-slate-900">Duration:</span> {formatDuration(request?.journey_duration_minutes)}</p>
            <p><span className="font-semibold text-slate-900">Passengers:</span> {request?.passengers ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Suitcases:</span> {request?.suitcases ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Hand luggage:</span> {request?.hand_luggage ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Vehicle:</span> {request?.vehicle_category_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Request notes:</span> {request?.notes || "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">
          Driver Assignment & Booking Progress
        </h2>

        <form onSubmit={saveBookingOps} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Booking status</label>
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
            >
              <option value="confirmed">confirmed</option>
              <option value="driver_assigned">driver_assigned</option>
              <option value="en_route">en_route</option>
              <option value="arrived">arrived</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">Driver name</label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Driver phone</label>
              <input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. +44 7700 900123"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Driver vehicle</label>
            <input
              value={driverVehicle}
              onChange={(e) => setDriverVehicle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. Mercedes E-Class / AB12 CDE"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Driver notes</label>
            <textarea
              rows={4}
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="Optional notes about the assigned driver or collection"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Booking Update"}
          </button>
        </form>
      </div>
    </div>
  );
}