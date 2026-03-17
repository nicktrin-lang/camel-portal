"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type FleetOption = {
  id: string;
  category_slug: string;
  category_name: string;
  max_passengers: number;
  max_suitcases: number;
  max_hand_luggage: number;
  service_level: string | null;
  label: string;
};

type ExistingBid = {
  id: string;
  fleet_id: string | null;
  vehicle_category_slug: string | null;
  vehicle_category_name: string | null;
  car_hire_price: number;
  fuel_price: number;
  total_price: number;
  full_insurance_included: boolean;
  full_tank_included: boolean;
  notes: string | null;
  status: string;
  created_at: string;
};

type ExistingBooking = {
  id: string;
  request_id: string;
  partner_user_id: string;
  booking_status: string;
};

type RequestRow = {
  id: string;
  job_number: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_address: string;
  dropoff_address: string | null;
  pickup_at: string;
  dropoff_at: string | null;
  journey_duration_minutes: number | null;
  passengers: number;
  suitcases: number;
  hand_luggage: number;
  vehicle_category_slug: string | null;
  vehicle_category_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  matched_status: string | null;
};

type ApiResponse = {
  request: RequestRow;
  existingBid: ExistingBid | null;
  existingBooking: ExistingBooking | null;
  fleetOptions: FleetOption[];
  adminMode: boolean;
  role: string | null;
};

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

function formatGBP(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default function PartnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [timeLabel, setTimeLabel] = useState<string>("—");
  const [expired, setExpired] = useState(false);

  const [fleetId, setFleetId] = useState("");
  const [carHirePrice, setCarHirePrice] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [fullInsuranceIncluded, setFullInsuranceIncluded] = useState(true);
  const [fullTankIncluded, setFullTankIncluded] = useState(true);
  const [notes, setNotes] = useState("");

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
      const res = await fetch(`/api/partner/requests/${requestId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load request.");
      }

      const nextData = json as ApiResponse;
      setData(nextData);

      if (nextData.existingBid) {
        setFleetId(nextData.existingBid.fleet_id || "");
        setCarHirePrice(String(nextData.existingBid.car_hire_price ?? ""));
        setFuelPrice(String(nextData.existingBid.fuel_price ?? ""));
        setFullInsuranceIncluded(!!nextData.existingBid.full_insurance_included);
        setFullTankIncluded(!!nextData.existingBid.full_tank_included);
        setNotes(nextData.existingBid.notes || "");
      } else {
        const firstFleet = nextData.fleetOptions?.[0];
        setFleetId(firstFleet?.id || "");
        setCarHirePrice("");
        setFuelPrice("");
        setFullInsuranceIncluded(true);
        setFullTankIncluded(true);
        setNotes("");
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
  }, [requestId, supabase]);

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

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();

    if (!data?.request) return;

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const selectedFleet = data.fleetOptions.find((item) => item.id === fleetId);
      if (!selectedFleet) {
        throw new Error("Please select a vehicle from your fleet.");
      }

      const carHire = Number(carHirePrice || 0);
      const fuel = Number(fuelPrice || 0);
      const total = carHire + fuel;

      if (Number.isNaN(carHire) || carHire < 0) {
        throw new Error("Please enter a valid car hire price.");
      }

      if (Number.isNaN(fuel) || fuel < 0) {
        throw new Error("Please enter a valid fuel price.");
      }

      const res = await fetch("/api/partner/bids", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: data.request.id,
          fleet_id: selectedFleet.id,
          vehicle_category_slug: selectedFleet.category_slug,
          vehicle_category_name: selectedFleet.category_name,
          car_hire_price: carHire,
          fuel_price: fuel,
          total_price: total,
          full_insurance_included: fullInsuranceIncluded,
          full_tank_included: fullTankIncluded,
          notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit bid.");
      }

      setOk("Bid submitted successfully.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to submit bid.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading request…</p>
        </div>
      </div>
    );
  }

  if (!data?.request) {
    return (
      <div className="space-y-6 px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Request not found"}
        </div>
      </div>
    );
  }

  const request = data.request;
  const existingBid = data.existingBid;
  const existingBooking = data.existingBooking;

  const formDisabled =
    expired ||
    !!existingBooking ||
    request.status === "confirmed" ||
    request.status === "expired" ||
    existingBid?.status === "accepted";

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
          <h1 className="text-3xl font-semibold text-[#003768]">Request Detail</h1>
          <p className="mt-2 text-slate-600">
            Review the request and submit your bid.
          </p>
        </div>

        <Link
          href="/partner/requests"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Requests
        </Link>
      </div>

      <div
        className={`rounded-2xl border p-4 text-sm ${
          expired
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
        }`}
      >
        <span className="font-semibold">Time remaining:</span> {timeLabel}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">
            Request Information
          </h2>

          <div className="mt-6 space-y-4 text-slate-700">
            <p><span className="font-semibold text-slate-900">Job No.:</span> {request.job_number ?? "—"}</p>
            <p><span className="font-semibold text-slate-900">Customer:</span> {request.customer_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Email:</span> {request.customer_email || "—"}</p>
            <p><span className="font-semibold text-slate-900">Phone:</span> {request.customer_phone || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup:</span> {request.pickup_address}</p>
            <p><span className="font-semibold text-slate-900">Dropoff:</span> {request.dropoff_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(request.pickup_at)}</p>
            <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(request.dropoff_at)}</p>
            <p><span className="font-semibold text-slate-900">Journey duration:</span> {formatDuration(request.journey_duration_minutes)}</p>
            <p><span className="font-semibold text-slate-900">Passengers:</span> {request.passengers}</p>
            <p><span className="font-semibold text-slate-900">Suitcases:</span> {request.suitcases}</p>
            <p><span className="font-semibold text-slate-900">Hand luggage:</span> {request.hand_luggage}</p>
            <p><span className="font-semibold text-slate-900">Requested vehicle:</span> {request.vehicle_category_name || "—"}</p>
            <p><span className="font-semibold text-slate-900">Notes:</span> {request.notes || "—"}</p>
            <p><span className="font-semibold text-slate-900">Request status:</span> <span className="capitalize">{request.status}</span></p>
            <p><span className="font-semibold text-slate-900">Expires at:</span> {fmtDateTime(request.expires_at)}</p>
            <p><span className="font-semibold text-slate-900">Matched status:</span> <span className="capitalize">{request.matched_status || "—"}</span></p>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold text-[#003768]">Submit Bid</h2>

          {expired || request.status === "expired" ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              This request has expired and can no longer receive bids.
            </div>
          ) : existingBooking ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
              This request has been accepted and is now a booking.
            </div>
          ) : existingBid?.status === "accepted" ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
              Your bid has been accepted.
            </div>
          ) : existingBid ? (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-700">
              You have already submitted a bid. You can update and resubmit it below.
            </div>
          ) : null}

          {data.fleetOptions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-700">
              No compatible active vehicles were found in your fleet for this request.
            </div>
          ) : (
            <form onSubmit={submitBid} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">
                  Vehicle from your fleet
                </label>
                <select
                  value={fleetId}
                  onChange={(e) => setFleetId(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  required
                >
                  {data.fleetOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">
                  Car hire price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={carHirePrice}
                  onChange={(e) => setCarHirePrice(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">
                  Full fuel price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  required
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Current total:</span>{" "}
                {formatGBP((Number(carHirePrice || 0) || 0) + (Number(fuelPrice || 0) || 0))}
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={fullInsuranceIncluded}
                    onChange={(e) => setFullInsuranceIncluded(e.target.checked)}
                    disabled={formDisabled}
                  />
                  Full insurance included
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={fullTankIncluded}
                    onChange={(e) => setFullTankIncluded(e.target.checked)}
                    disabled={formDisabled}
                  />
                  Full tank included
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Notes</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={formDisabled}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a] disabled:opacity-60"
                  placeholder="Optional notes for this bid"
                />
              </div>

              <button
                type="submit"
                disabled={saving || formDisabled}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : existingBid ? "Update Bid" : "Submit Bid"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}