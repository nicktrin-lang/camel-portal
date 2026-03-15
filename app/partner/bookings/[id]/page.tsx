"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BookingDetail = {
  id: string;
  booking_status: string;
  amount: number;
  notes: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  created_at: string;
  request_id: string;
  winning_bid_id: string | null;
  customer_requests: {
    pickup_address: string;
    dropoff_address: string | null;
    pickup_at: string;
    dropoff_at: string | null;
    journey_duration_minutes: number | null;
    passengers: number;
    suitcases: number;
    hand_luggage: number;
    vehicle_category_name: string | null;
    notes: string | null;
  } | null;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function statusClasses(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (s === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (s === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (s === "confirmed") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (s === "driver_assigned") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function PartnerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingDriver, setSavingDriver] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      const resolved = await params;
      if (!mounted) return;
      setBookingId(resolved.id);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [params]);

  async function load() {
    if (!bookingId) return;

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

      const data = (json?.data || null) as BookingDetail | null;
      setBooking(data);

      setDriverName(data?.driver_name || "");
      setDriverPhone(data?.driver_phone || "");
      setVehiclePlate(data?.vehicle_plate || "");
      setVehicleModel(data?.vehicle_model || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load booking.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  async function saveDriverDetails() {
    if (!bookingId) return;

    setSavingDriver(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch(`/api/partner/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          driver_name: driverName,
          driver_phone: driverPhone,
          vehicle_plate: vehiclePlate,
          vehicle_model: vehicleModel,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save driver details.");
      }

      setOk("Driver details saved.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save driver details.");
    } finally {
      setSavingDriver(false);
    }
  }

  async function updateStatus(status: string) {
    if (!bookingId) return;

    setUpdatingStatus(status);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/partner/bookings/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          booking_id: bookingId,
          status,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update booking status.");
      }

      setOk(`Booking marked as ${status}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update booking status.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading booking…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Booking not found."}
      </div>
    );
  }

  const req = booking.customer_requests;

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking Detail</h1>
          <p className="mt-2 text-slate-600">
            Manage this confirmed booking, assign a driver, and update trip status.
          </p>
        </div>

        <Link
          href="/partner/bookings"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Bookings
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
          <h2 className="text-2xl font-semibold text-[#003768]">Trip Information</h2>

          <div className="mt-6 space-y-4 text-slate-700">
            <p><span className="font-semibold text-slate-900">Pickup:</span> {req?.pickup_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Dropoff:</span> {req?.dropoff_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(req?.pickup_at)}</p>
            <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(req?.dropoff_at)}</p>
            <p><span className="font-semibold text-slate-900">Journey duration:</span> {fmtDuration(req?.journey_duration_minutes)}</p>
            <p><span className="font-semibold text-slate-900">Passengers:</span> {req?.passengers ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Bags:</span> {req ? `${req.suitcases} suitcases / ${req.hand_luggage} hand luggage` : "—"}</p>
            <p><span className="font-semibold text-slate-900">Vehicle category:</span> {req?.vehicle_category_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Customer notes:</span> {req?.notes || "—"}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
            <h2 className="text-2xl font-semibold text-[#003768]">Booking Summary</h2>

            <div className="mt-6 space-y-4 text-slate-700">
              <p><span className="font-semibold text-slate-900">Amount:</span> {booking.amount}</p>
              <p><span className="font-semibold text-slate-900">Bid notes:</span> {booking.notes || "—"}</p>
              <p>
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                <span
                  className={[
                    "ml-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                    statusClasses(booking.booking_status),
                  ].join(" ")}
                >
                  {booking.booking_status}
                </span>
              </p>
              <p><span className="font-semibold text-slate-900">Created:</span> {fmtDateTime(booking.created_at)}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateStatus("confirmed")}
                disabled={!!updatingStatus}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {updatingStatus === "confirmed" ? "Updating..." : "Confirm Booking"}
              </button>

              <button
                type="button"
                onClick={() => updateStatus("completed")}
                disabled={!!updatingStatus}
                className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {updatingStatus === "completed" ? "Updating..." : "Mark Completed"}
              </button>

              <button
                type="button"
                onClick={() => updateStatus("cancelled")}
                disabled={!!updatingStatus}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {updatingStatus === "cancelled" ? "Updating..." : "Cancel Booking"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
            <h2 className="text-2xl font-semibold text-[#003768]">Assign Driver</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#003768]">Driver name</label>
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Driver phone</label>
                <input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Vehicle plate</label>
                <input
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Vehicle model</label>
                <input
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <button
                type="button"
                onClick={saveDriverDetails}
                disabled={savingDriver}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {savingDriver ? "Saving..." : "Save Driver"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}