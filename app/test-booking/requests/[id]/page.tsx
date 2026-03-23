"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

type RequestData = {
  id: string;
  job_number: number | null;
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
  status: string;
  created_at: string;
  expires_at: string | null;
};

type BidRow = {
  id: string;
  partner_user_id: string;
  partner_company_name: string | null;
  partner_contact_name: string | null;
  partner_phone: string | null;
  partner_address: string | null;
  vehicle_category_name: string;
  car_hire_price: number;
  fuel_price: number;
  total_price: number;
  full_insurance_included: boolean;
  full_tank_included: boolean;
  notes: string | null;
  status: string;
  created_at: string;
};

type BookingData = {
  id: string;
  request_id: string;
  partner_user_id: string;
  winning_bid_id: string;
  booking_status: string;
  amount: number | null;
  notes: string | null;
  created_at: string;
  job_number: number | null;
  company_name: string | null;
  company_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_notes: string | null;
  driver_assigned_at: string | null;

  collection_confirmed_by_partner: boolean;
  collection_confirmed_by_partner_at: string | null;
  collection_fuel_level_partner: string | null;
  collection_partner_notes: string | null;

  return_confirmed_by_partner: boolean;
  return_confirmed_by_partner_at: string | null;
  return_fuel_level_partner: string | null;
  return_partner_notes: string | null;

  collection_confirmed_by_customer: boolean;
  collection_confirmed_by_customer_at: string | null;
  collection_fuel_level_customer: string | null;
  collection_customer_notes: string | null;

  return_confirmed_by_customer: boolean;
  return_confirmed_by_customer_at: string | null;
  return_fuel_level_customer: string | null;
  return_customer_notes: string | null;
};

type ResponseShape = {
  request: RequestData;
  bids: BidRow[];
  booking: BookingData | null;
};

type ConfirmSection = "collection" | "return";
type FuelLevel = "empty" | "quarter" | "half" | "three_quarter" | "full";

function fmtDateTime(value?: string | null) {
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

function getTimeRemaining(expiresAt?: string | null) {
  if (!expiresAt) return null;

  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return {
      expired: true,
      label: "Expired",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let label = "";
  if (days > 0) {
    label = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    label = `${minutes}m ${seconds}s`;
  }

  return {
    expired: false,
    label,
  };
}

function fuelLabel(value?: string | null) {
  switch (String(value || "")) {
    case "empty":
      return "Empty";
    case "quarter":
      return "Quarter";
    case "half":
      return "Half";
    case "three_quarter":
      return "Three quarter";
    case "full":
      return "Full";
    case "3/4":
      return "3/4";
    default:
      return "—";
  }
}

function normalizeFuel(value?: string | null) {
  const clean = String(value || "").trim().toLowerCase();
  if (
    clean === "empty" ||
    clean === "quarter" ||
    clean === "half" ||
    clean === "three_quarter" ||
    clean === "full" ||
    clean === "3/4"
  ) {
    return clean === "3/4" ? "three_quarter" : clean;
  }
  return "";
}

function normalizeNotes(value?: string | null) {
  return String(value || "").trim();
}

function isMatchedAndLocked(opts: {
  partnerConfirmed: boolean;
  customerConfirmed: boolean;
  partnerFuel?: string | null;
  customerFuel?: string | null;
  partnerNotes?: string | null;
  customerNotes?: string | null;
}) {
  if (!opts.partnerConfirmed || !opts.customerConfirmed) {
    return false;
  }

  return (
    normalizeFuel(opts.partnerFuel) === normalizeFuel(opts.customerFuel) &&
    normalizeNotes(opts.partnerNotes) === normalizeNotes(opts.customerNotes)
  );
}

export default function TestBookingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [savingConfirm, setSavingConfirm] = useState<ConfirmSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);
  const [timeLabel, setTimeLabel] = useState<string>("—");
  const [expired, setExpired] = useState(false);

  const [collectionFuel, setCollectionFuel] = useState<FuelLevel>("full");
  const [collectionConfirmed, setCollectionConfirmed] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");

  const [returnFuel, setReturnFuel] = useState<FuelLevel>("full");
  const [returnConfirmed, setReturnConfirmed] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      const resolved = await params;
      if (!mounted) return;
      setRequestId(resolved.id);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [params]);

  async function load() {
    if (!requestId) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Not signed in");
      }

      const res = await fetch(`/api/test-booking/requests/${requestId}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load request.");
      }

      const nextData = json as ResponseShape;
      setData(nextData);

      if (nextData.booking) {
        setCollectionFuel(
          (normalizeFuel(nextData.booking.collection_fuel_level_customer) as FuelLevel) ||
            "full"
        );
        setCollectionConfirmed(!!nextData.booking.collection_confirmed_by_customer);
        setCollectionNotes(nextData.booking.collection_customer_notes || "");

        setReturnFuel(
          (normalizeFuel(nextData.booking.return_fuel_level_customer) as FuelLevel) ||
            "full"
        );
        setReturnConfirmed(!!nextData.booking.return_confirmed_by_customer);
        setReturnNotes(nextData.booking.return_customer_notes || "");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load request.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [requestId]);

  useEffect(() => {
    const expiresAt = data?.request?.expires_at || null;

    if (!expiresAt) {
      setTimeLabel("—");
      setExpired(false);
      return;
    }

    function refreshTimer() {
      const next = getTimeRemaining(expiresAt);
      setTimeLabel(next?.label || "—");
      setExpired(!!next?.expired);
    }

    refreshTimer();
    const interval = setInterval(refreshTimer, 1000);

    return () => clearInterval(interval);
  }, [data?.request?.expires_at]);

  async function acceptBid(bidId: string) {
    setAcceptingId(bidId);
    setError(null);
    setOk(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Not signed in");
      }

      const res = await fetch("/api/test-booking/bids/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ bid_id: bidId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to accept bid.");
      }

      setOk("Bid accepted. Booking confirmed.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to accept bid.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function saveCustomerConfirmation(section: ConfirmSection) {
    if (!data?.booking?.id) return;

    setSavingConfirm(section);
    setError(null);
    setOk(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Not signed in");
      }

      const payload =
        section === "collection"
          ? {
              section: "collection",
              confirmed: collectionConfirmed,
              fuel_level: collectionFuel,
              notes: collectionNotes,
            }
          : {
              section: "return",
              confirmed: returnConfirmed,
              fuel_level: returnFuel,
              notes: returnNotes,
            };

      const res = await fetch(
        `/api/test-booking/bookings/${data.booking.id}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save confirmation.");
      }

      setOk(
        section === "collection"
          ? "Collection confirmation saved."
          : "Return confirmation saved."
      );

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save confirmation.");
    } finally {
      setSavingConfirm(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading request…</p>
        </div>
      </div>
    );
  }

  if (!data?.request) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Request not found"}
        </div>
      </div>
    );
  }

  const acceptedBooking = data.booking;

  const collectionLocked = acceptedBooking
    ? isMatchedAndLocked({
        partnerConfirmed: !!acceptedBooking.collection_confirmed_by_partner,
        customerConfirmed: !!acceptedBooking.collection_confirmed_by_customer,
        partnerFuel: acceptedBooking.collection_fuel_level_partner,
        customerFuel: acceptedBooking.collection_fuel_level_customer,
        partnerNotes: acceptedBooking.collection_partner_notes,
        customerNotes: acceptedBooking.collection_customer_notes,
      })
    : false;

  const returnLocked = acceptedBooking
    ? isMatchedAndLocked({
        partnerConfirmed: !!acceptedBooking.return_confirmed_by_partner,
        customerConfirmed: !!acceptedBooking.return_confirmed_by_customer,
        partnerFuel: acceptedBooking.return_fuel_level_partner,
        customerFuel: acceptedBooking.return_fuel_level_customer,
        partnerNotes: acceptedBooking.return_partner_notes,
        customerNotes: acceptedBooking.return_customer_notes,
      })
    : false;

  const collectionMismatch = acceptedBooking
    ? !!acceptedBooking.collection_confirmed_by_partner &&
      !!acceptedBooking.collection_confirmed_by_customer &&
      !collectionLocked
    : false;

  const returnMismatch = acceptedBooking
    ? !!acceptedBooking.return_confirmed_by_partner &&
      !!acceptedBooking.return_confirmed_by_customer &&
      !returnLocked
    : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
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
          <h1 className="text-3xl font-semibold text-[#003768]">Request Detail</h1>
          <p className="mt-2 text-slate-600">
            Review your request and any partner bids received.
          </p>
        </div>

        <Link
          href="/test-booking/requests"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Requests
        </Link>
      </div>

      <div
        className={`rounded-2xl border p-4 text-sm ${
          expired
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        <span className="font-semibold">Bid window:</span> {timeLabel}
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>

        <div className="mt-6 space-y-4 text-slate-700">
          <p><span className="font-semibold text-slate-900">Job No.:</span> {data.request.job_number ?? "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup:</span> {data.request.pickup_address}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {data.request.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(data.request.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(data.request.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Duration:</span> {formatDuration(data.request.journey_duration_minutes)}</p>
          <p><span className="font-semibold text-slate-900">Passengers:</span> {data.request.passengers}</p>
          <p><span className="font-semibold text-slate-900">Bags:</span> {data.request.suitcases} suitcases / {data.request.hand_luggage} hand luggage</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {data.request.vehicle_category_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Notes:</span> {data.request.notes || "—"}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> <span className="capitalize">{data.request.status}</span></p>
          <p><span className="font-semibold text-slate-900">Expires at:</span> {fmtDateTime(data.request.expires_at)}</p>
        </div>
      </div>

      {acceptedBooking ? (
        <>
          <div className="rounded-3xl border border-green-200 bg-green-50 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold text-[#003768]">
              Accepted Booking
            </h2>

            <div className="mt-6 space-y-4 text-slate-700">
              <p><span className="font-semibold text-slate-900">Booking status:</span> <span className="capitalize">{String(acceptedBooking.booking_status || "—").replaceAll("_", " ")}</span></p>
              <p><span className="font-semibold text-slate-900">Car hire company:</span> {acceptedBooking.company_name || "—"}</p>
              <p><span className="font-semibold text-slate-900">Company phone:</span> {acceptedBooking.company_phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Accepted price:</span> {formatGBP(acceptedBooking.amount)}</p>
              <p><span className="font-semibold text-slate-900">Booking notes:</span> {acceptedBooking.notes || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver name:</span> {acceptedBooking.driver_name || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver phone:</span> {acceptedBooking.driver_phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver vehicle:</span> {acceptedBooking.driver_vehicle || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver notes:</span> {acceptedBooking.driver_notes || "—"}</p>
              <p><span className="font-semibold text-slate-900">Driver assigned at:</span> {fmtDateTime(acceptedBooking.driver_assigned_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h2 className="text-2xl font-semibold text-[#003768]">Collection</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Partner confirmed:</span> {acceptedBooking.collection_confirmed_by_partner ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Partner fuel:</span> {fuelLabel(acceptedBooking.collection_fuel_level_partner)}</p>
                  <p><span className="font-semibold text-slate-900">Partner notes:</span> {acceptedBooking.collection_partner_notes || "—"}</p>
                  <p><span className="font-semibold text-slate-900">Confirmed at:</span> {fmtDateTime(acceptedBooking.collection_confirmed_by_partner_at)}</p>
                </div>

                {collectionLocked ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    Collection is locked because both customer and partner values match.
                  </div>
                ) : null}

                {collectionMismatch ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Collection is not locked because the customer and partner values do not yet match.
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Fuel level at collection
                  </label>
                  <select
                    value={collectionFuel}
                    onChange={(e) => setCollectionFuel(e.target.value as FuelLevel)}
                    disabled={collectionLocked}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 disabled:opacity-60"
                  >
                    <option value="empty">empty</option>
                    <option value="quarter">quarter</option>
                    <option value="half">half</option>
                    <option value="three_quarter">three_quarter</option>
                    <option value="full">full</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={collectionConfirmed}
                    onChange={(e) => setCollectionConfirmed(e.target.checked)}
                    disabled={collectionLocked}
                    className="h-4 w-4"
                  />
                  Customer confirms collection completed
                </label>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Collection notes
                  </label>
                  <textarea
                    rows={4}
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    disabled={collectionLocked}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 disabled:opacity-60"
                    placeholder="Collection notes, issues, condition notes, etc."
                  />
                </div>

                <p className="text-sm text-slate-500">
                  Saved fuel level: <strong>{fuelLabel(acceptedBooking.collection_fuel_level_customer)}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Saved notes: <strong>{acceptedBooking.collection_customer_notes || "—"}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Saved confirmed at: <strong>{fmtDateTime(acceptedBooking.collection_confirmed_by_customer_at)}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => saveCustomerConfirmation("collection")}
                  disabled={savingConfirm === "collection" || collectionLocked}
                  className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingConfirm === "collection" ? "Saving..." : "Save Collection Update"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h2 className="text-2xl font-semibold text-[#003768]">Return</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Partner confirmed:</span> {acceptedBooking.return_confirmed_by_partner ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Partner fuel:</span> {fuelLabel(acceptedBooking.return_fuel_level_partner)}</p>
                  <p><span className="font-semibold text-slate-900">Partner notes:</span> {acceptedBooking.return_partner_notes || "—"}</p>
                  <p><span className="font-semibold text-slate-900">Confirmed at:</span> {fmtDateTime(acceptedBooking.return_confirmed_by_partner_at)}</p>
                </div>

                {returnLocked ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    Return is locked because both customer and partner values match.
                  </div>
                ) : null}

                {returnMismatch ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Return is not locked because the customer and partner values do not yet match.
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Fuel level at return
                  </label>
                  <select
                    value={returnFuel}
                    onChange={(e) => setReturnFuel(e.target.value as FuelLevel)}
                    disabled={returnLocked}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 disabled:opacity-60"
                  >
                    <option value="empty">empty</option>
                    <option value="quarter">quarter</option>
                    <option value="half">half</option>
                    <option value="three_quarter">three_quarter</option>
                    <option value="full">full</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={returnConfirmed}
                    onChange={(e) => setReturnConfirmed(e.target.checked)}
                    disabled={returnLocked}
                    className="h-4 w-4"
                  />
                  Customer confirms return completed
                </label>

                <div>
                  <label className="text-sm font-medium text-[#003768]">
                    Return notes
                  </label>
                  <textarea
                    rows={4}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    disabled={returnLocked}
                    className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 disabled:opacity-60"
                    placeholder="Return notes, damage notes, fuel comments, etc."
                  />
                </div>

                <p className="text-sm text-slate-500">
                  Saved fuel level: <strong>{fuelLabel(acceptedBooking.return_fuel_level_customer)}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Saved notes: <strong>{acceptedBooking.return_customer_notes || "—"}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Saved confirmed at: <strong>{fmtDateTime(acceptedBooking.return_confirmed_by_customer_at)}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => saveCustomerConfirmation("return")}
                  disabled={savingConfirm === "return" || returnLocked}
                  className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                >
                  {savingConfirm === "return" ? "Saving..." : "Save Return Update"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>

        {expired || data.request.status === "expired" ? (
          <p className="mt-4 text-red-700">
            This request has expired and can no longer be accepted.
          </p>
        ) : data.bids.length === 0 ? (
          <p className="mt-4 text-slate-600">No bids submitted yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map((bid) => (
              <div key={bid.id} className="rounded-2xl border border-black/10 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2 text-slate-700">
                    <h3 className="text-xl font-semibold text-[#003768]">
                      {bid.partner_company_name || "Car Hire Company"}
                    </h3>

                    <p><span className="font-semibold text-slate-900">Company:</span> {bid.partner_company_name || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Phone:</span> {bid.partner_phone || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Vehicle:</span> {bid.vehicle_category_name}</p>
                    <p><span className="font-semibold text-slate-900">Car hire:</span> {formatGBP(bid.car_hire_price)}</p>
                    <p><span className="font-semibold text-slate-900">Fuel:</span> {formatGBP(bid.fuel_price)}</p>
                    <p><span className="font-semibold text-slate-900">Total:</span> {formatGBP(bid.total_price)}</p>
                    <p><span className="font-semibold text-slate-900">Insurance included:</span> {bid.full_insurance_included ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-slate-900">Full tank included:</span> {bid.full_tank_included ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Status:</span> <span className="capitalize">{bid.status}</span></p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {bid.status === "accepted" ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        Accepted
                      </span>
                    ) : data.request.status === "confirmed" ? (
                      <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-500">
                        Closed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => acceptBid(bid.id)}
                        disabled={!!acceptingId || expired}
                        className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
                      >
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