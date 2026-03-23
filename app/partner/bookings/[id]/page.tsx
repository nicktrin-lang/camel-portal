"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DriverRow = {
  id: string;
  partner_user_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

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
  assigned_driver_id?: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_notes: string | null;
  driver_assigned_at: string | null;

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

type BookingApiResponse = {
  booking: BookingRow;
  request: RequestRow | null;
  role: string | null;
};

type DriversApiResponse = {
  data: DriverRow[];
};

type FuelLevel = "full" | "3/4" | "half" | "quarter" | "empty";

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

function fuelLabel(value?: string | null) {
  switch (String(value || "").toLowerCase()) {
    case "full":
      return "Full";
    case "3/4":
      return "3/4";
    case "half":
      return "Half";
    case "quarter":
      return "Quarter";
    case "empty":
      return "Empty";
    default:
      return "—";
  }
}

function sameFuel(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function bookingStatusLabel(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "confirmed":
      return "Awaiting delivery";
    case "driver_assigned":
      return "Awaiting delivery";
    case "en_route":
      return "Awaiting delivery";
    case "arrived":
      return "Awaiting delivery";
    case "collected":
      return "On Hire";
    case "returned":
      return "On Hire";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status || "—").replaceAll("_", " ");
  }
}

export default function PartnerBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<BookingApiResponse | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [selectedSavedDriverId, setSelectedSavedDriverId] = useState("");

  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicle, setDriverVehicle] = useState("");
  const [driverNotes, setDriverNotes] = useState("");

  const [collectionFuelLevel, setCollectionFuelLevel] = useState<FuelLevel>("full");
  const [collectionConfirmedByPartner, setCollectionConfirmedByPartner] = useState(false);
  const [collectionPartnerNotes, setCollectionPartnerNotes] = useState("");

  const [returnFuelLevel, setReturnFuelLevel] = useState<FuelLevel>("full");
  const [returnConfirmedByPartner, setReturnConfirmedByPartner] = useState(false);
  const [returnPartnerNotes, setReturnPartnerNotes] = useState("");

  async function loadBooking(showSpinner = false) {
    if (!bookingId) {
      setLoading(false);
      setError("Missing booking ID.");
      return;
    }

    if (showSpinner) setLoading(true);

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

      const nextData = json as BookingApiResponse;
      setData(nextData);

      setBookingStatus(nextData.booking.booking_status || "confirmed");
      setDriverName(nextData.booking.driver_name || "");
      setDriverPhone(nextData.booking.driver_phone || "");
      setDriverVehicle(nextData.booking.driver_vehicle || "");
      setDriverNotes(nextData.booking.driver_notes || "");

      setCollectionFuelLevel(
        (nextData.booking.collection_fuel_level_partner as FuelLevel) || "full"
      );
      setCollectionConfirmedByPartner(!!nextData.booking.collection_confirmed_by_partner);
      setCollectionPartnerNotes(nextData.booking.collection_partner_notes || "");

      setReturnFuelLevel(
        (nextData.booking.return_fuel_level_partner as FuelLevel) || "full"
      );
      setReturnConfirmedByPartner(!!nextData.booking.return_confirmed_by_partner);
      setReturnPartnerNotes(nextData.booking.return_partner_notes || "");

      setSelectedSavedDriverId(nextData.booking.assigned_driver_id || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load booking.");
      setData(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function loadDrivers() {
    setLoadingDrivers(true);

    try {
      const res = await fetch("/api/partner/drivers", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load drivers.");
      }

      const next = json as DriversApiResponse;
      setDrivers((next.data || []).filter((driver) => driver.is_active));
    } catch {
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }

  useEffect(() => {
    loadBooking(true);
  }, [bookingId]);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    const interval = setInterval(() => {
      loadBooking(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  function handleSavedDriverChange(driverId: string) {
    setSelectedSavedDriverId(driverId);

    if (!driverId) return;

    const selectedDriver = drivers.find((driver) => driver.id === driverId);
    if (!selectedDriver) return;

    setDriverName(selectedDriver.full_name || "");
    setDriverPhone(selectedDriver.phone || "");
  }

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
          assigned_driver_id: selectedSavedDriverId || null,
          driver_name: driverName,
          driver_phone: driverPhone,
          driver_vehicle: driverVehicle,
          driver_notes: driverNotes,

          collection_fuel_level_partner: collectionFuelLevel,
          collection_confirmed_by_partner: collectionConfirmedByPartner,
          collection_partner_notes: collectionPartnerNotes,

          return_fuel_level_partner: returnFuelLevel,
          return_confirmed_by_partner: returnConfirmedByPartner,
          return_partner_notes: returnPartnerNotes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update booking.");
      }

      setOk("Booking details updated.");
      await loadBooking(false);
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
  const role = data.role || "partner";
  const adminMode = role === "admin" || role === "super_admin";

  const collectionMatched =
    !!booking.collection_confirmed_by_partner &&
    !!booking.collection_confirmed_by_customer &&
    sameFuel(booking.collection_fuel_level_partner, booking.collection_fuel_level_customer);

  const returnMatched =
    !!booking.return_confirmed_by_partner &&
    !!booking.return_confirmed_by_customer &&
    sameFuel(booking.return_fuel_level_partner, booking.return_fuel_level_customer);

  const collectionLocked = collectionMatched;
  const returnLocked = returnMatched;

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
            {adminMode
              ? "Inspect and manage any booking across the network."
              : "View and manage accepted booking information."}
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
            <p><span className="font-semibold text-slate-900">Job No.:</span> {booking.job_number ?? request?.job_number ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Booking created:</span> {formatDateTime(booking.created_at)}</p>
            <p><span className="font-semibold text-slate-900">Booking status:</span> {bookingStatusLabel(booking.booking_status)}</p>
            <p><span className="font-semibold text-slate-900">Amount:</span> {formatGBP(booking.amount)}</p>
            <p><span className="font-semibold text-slate-900">Booking notes:</span> {booking.notes || "—"}</p>
            <p>
              <span className="font-semibold text-slate-900">Assigned saved driver:</span>{" "}
              {drivers.find((d) => d.id === booking.assigned_driver_id)?.full_name ||
                booking.driver_name ||
                "—"}
            </p>
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
            <p>
              <span className="font-semibold text-slate-900">Request status:</span>{" "}
              <span className="capitalize">
                {String(request?.status || "—").replaceAll("_", " ")}
              </span>
            </p>
            <p><span className="font-semibold text-slate-900">Request notes:</span> {request?.notes || "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Driver Live Updates</h2>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-black/10 p-5">
            <h3 className="text-2xl font-semibold text-[#003768]">Driver Collection</h3>

            <div className="mt-6 space-y-4 text-slate-700">
              <p><span className="font-semibold text-slate-900">Driver confirmed:</span> {booking.collection_confirmed_by_driver ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Driver fuel:</span> {fuelLabel(booking.collection_fuel_level_driver)}</p>
              <p><span className="font-semibold text-slate-900">Driver confirmed at:</span> {formatDateTime(booking.collection_confirmed_by_driver_at)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 p-5">
            <h3 className="text-2xl font-semibold text-[#003768]">Driver Return</h3>

            <div className="mt-6 space-y-4 text-slate-700">
              <p><span className="font-semibold text-slate-900">Driver confirmed:</span> {booking.return_confirmed_by_driver ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Driver fuel:</span> {fuelLabel(booking.return_fuel_level_driver)}</p>
              <p><span className="font-semibold text-slate-900">Driver confirmed at:</span> {formatDateTime(booking.return_confirmed_by_driver_at)}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          This page refreshes automatically every 10 seconds while open.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">
          Driver Assignment & Booking Progress
        </h2>

        <form onSubmit={saveBookingOps} className="mt-6 space-y-8">
          <div>
            <label className="text-sm font-medium text-[#003768]">
              Booking status
            </label>
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
            >
              <option value="confirmed">Awaiting delivery</option>
              <option value="driver_assigned">Awaiting delivery</option>
              <option value="en_route">Awaiting delivery</option>
              <option value="arrived">Awaiting delivery</option>
              <option value="collected">On Hire</option>
              <option value="returned">On Hire</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Assign saved driver
            </label>
            <select
              value={selectedSavedDriverId}
              onChange={(e) => handleSavedDriverChange(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
            >
              <option value="">No saved driver selected</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} {driver.phone ? `(${driver.phone})` : ""}
                </option>
              ))}
            </select>
            {loadingDrivers ? (
              <p className="mt-2 text-sm text-slate-500">Loading drivers…</p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Driver name
              </label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Driver phone
              </label>
              <input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                placeholder="e.g. +44 7700 900123"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Driver vehicle
            </label>
            <input
              value={driverVehicle}
              onChange={(e) => setDriverVehicle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. Mercedes E-Class / AB12 CDE"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Driver notes
            </label>
            <textarea
              rows={4}
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="Optional notes about the assigned driver or collection"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-black/10 p-5">
              <h3 className="text-2xl font-semibold text-[#003768]">Collection</h3>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Customer confirmed:</span> {booking.collection_confirmed_by_customer ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Customer fuel:</span> {fuelLabel(booking.collection_fuel_level_customer)}</p>
                  <p><span className="font-semibold text-slate-900">Customer notes:</span> {booking.collection_customer_notes || "—"}</p>
                  <p><span className="font-semibold text-slate-900">Customer confirmed at:</span> {formatDateTime(booking.collection_confirmed_by_customer_at)}</p>
                </div>

                {collectionLocked ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    Collection is locked because both sides agreed and confirmed the same fuel level.
                  </div>
                ) : booking.collection_confirmed_by_partner && booking.collection_confirmed_by_customer ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Collection is not locked because the customer and partner values do not yet match.
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Fuel level at collection
                  </label>
                  <select
                    value={collectionFuelLevel}
                    disabled={collectionLocked}
                    onChange={(e) => setCollectionFuelLevel(e.target.value as FuelLevel)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  >
                    <option value="full">full</option>
                    <option value="3/4">3/4</option>
                    <option value="half">half</option>
                    <option value="quarter">quarter</option>
                    <option value="empty">empty</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={collectionConfirmedByPartner}
                    disabled={collectionLocked}
                    onChange={(e) => setCollectionConfirmedByPartner(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Partner confirms collection completed
                </label>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Collection notes
                  </label>
                  <textarea
                    rows={4}
                    value={collectionPartnerNotes}
                    disabled={collectionLocked}
                    onChange={(e) => setCollectionPartnerNotes(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                    placeholder="Collection notes, issues, condition notes, etc."
                  />
                </div>

                <p className="text-sm text-slate-500">Saved fuel level: <strong>{fuelLabel(booking.collection_fuel_level_partner)}</strong></p>
                <p className="text-sm text-slate-500">Saved notes: <strong>{booking.collection_partner_notes || "—"}</strong></p>
                <p className="text-sm text-slate-500">Saved confirmed at: <strong>{formatDateTime(booking.collection_confirmed_by_partner_at)}</strong></p>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 p-5">
              <h3 className="text-2xl font-semibold text-[#003768]">Return</h3>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Customer confirmed:</span> {booking.return_confirmed_by_customer ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Customer fuel:</span> {fuelLabel(booking.return_fuel_level_customer)}</p>
                  <p><span className="font-semibold text-slate-900">Customer notes:</span> {booking.return_customer_notes || "—"}</p>
                  <p><span className="font-semibold text-slate-900">Customer confirmed at:</span> {formatDateTime(booking.return_confirmed_by_customer_at)}</p>
                </div>

                {returnLocked ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    Return is locked because both sides agreed and confirmed the same fuel level.
                  </div>
                ) : booking.return_confirmed_by_partner && booking.return_confirmed_by_customer ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Return is not locked because the customer and partner values do not yet match.
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Fuel level at return
                  </label>
                  <select
                    value={returnFuelLevel}
                    disabled={returnLocked}
                    onChange={(e) => setReturnFuelLevel(e.target.value as FuelLevel)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  >
                    <option value="full">full</option>
                    <option value="3/4">3/4</option>
                    <option value="half">half</option>
                    <option value="quarter">quarter</option>
                    <option value="empty">empty</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={returnConfirmedByPartner}
                    disabled={returnLocked}
                    onChange={(e) => setReturnConfirmedByPartner(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Partner confirms return completed
                </label>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Return notes
                  </label>
                  <textarea
                    rows={4}
                    value={returnPartnerNotes}
                    disabled={returnLocked}
                    onChange={(e) => setReturnPartnerNotes(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                    placeholder="Return notes, damage notes, fuel comments, etc."
                  />
                </div>

                <p className="text-sm text-slate-500">Saved fuel level: <strong>{fuelLabel(booking.return_fuel_level_partner)}</strong></p>
                <p className="text-sm text-slate-500">Saved notes: <strong>{booking.return_partner_notes || "—"}</strong></p>
                <p className="text-sm text-slate-500">Saved confirmed at: <strong>{formatDateTime(booking.return_confirmed_by_partner_at)}</strong></p>
              </div>
            </div>
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