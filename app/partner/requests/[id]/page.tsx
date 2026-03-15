"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FleetRow = {
  id: string;
  category_slug: string;
  category_name: string;
  max_passengers: number;
  max_suitcases: number;
  max_hand_luggage: number;
  service_level: string;
  is_active: boolean;
};

type RequestDetailResponse = {
  match: {
    id: string;
    match_status: string;
    matched_fleet_id: string | null;
    created_at: string;
    customer_requests: {
      id: string;
      customer_name: string | null;
      customer_email: string | null;
      customer_phone: string | null;
      pickup_address: string;
      pickup_lat: number | null;
      pickup_lng: number | null;
      dropoff_address: string | null;
      dropoff_lat: number | null;
      dropoff_lng: number | null;
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
    } | null;
  };
  fleet: FleetRow[];
  bid: {
    id: string;
    vehicle_category_name: string;
    car_hire_price: number;
    fuel_price: number;
    total_price: number;
    full_insurance_included: boolean;
    full_tank_included: boolean;
    notes: string | null;
    status: string;
    created_at: string;
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
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function PartnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<RequestDetailResponse | null>(null);

  const [fleetId, setFleetId] = useState("");
  const [vehicleCategorySlug, setVehicleCategorySlug] = useState("");
  const [vehicleCategoryName, setVehicleCategoryName] = useState("");
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

      const nextData = json as RequestDetailResponse;
      setData(nextData);

      if (!nextData.bid && nextData.fleet?.length) {
        const firstFleet = nextData.fleet[0];
        setFleetId(firstFleet.id);
        setVehicleCategorySlug(firstFleet.category_slug);
        setVehicleCategoryName(firstFleet.category_name);
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

  function handleFleetChange(nextId: string) {
    setFleetId(nextId);
    const selected = data?.fleet.find((item) => item.id === nextId);
    if (!selected) return;
    setVehicleCategorySlug(selected.category_slug);
    setVehicleCategoryName(selected.category_name);
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId) return;

    setSubmitting(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/partner/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          request_id: requestId,
          fleet_id: fleetId || null,
          vehicle_category_slug: vehicleCategorySlug,
          vehicle_category_name: vehicleCategoryName,
          car_hire_price: Number(carHirePrice || 0),
          fuel_price: Number(fuelPrice || 0),
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
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading request…</p>
      </div>
    );
  }

  const req = data?.match?.customer_requests;
  if (!req) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Request not found."}
      </div>
    );
  }

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
          <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>

          <div className="mt-6 space-y-4 text-slate-700">
            <p><span className="font-semibold text-slate-900">Pickup:</span> {req.pickup_address}</p>
            <p><span className="font-semibold text-slate-900">Dropoff:</span> {req.dropoff_address || "—"}</p>
            <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(req.pickup_at)}</p>
            <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(req.dropoff_at)}</p>
            <p><span className="font-semibold text-slate-900">Journey duration:</span> {fmtDuration(req.journey_duration_minutes)}</p>
            <p><span className="font-semibold text-slate-900">Passengers:</span> {req.passengers}</p>
            <p><span className="font-semibold text-slate-900">Suitcases:</span> {req.suitcases}</p>
            <p><span className="font-semibold text-slate-900">Hand luggage:</span> {req.hand_luggage}</p>
            <p><span className="font-semibold text-slate-900">Requested vehicle:</span> {req.vehicle_category_name || "Any suitable vehicle"}</p>
            <p><span className="font-semibold text-slate-900">Notes:</span> {req.notes || "—"}</p>
            <p><span className="font-semibold text-slate-900">Request status:</span> {req.status}</p>
            <p><span className="font-semibold text-slate-900">Matched status:</span> {data?.match?.match_status || "—"}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
          <h2 className="text-2xl font-semibold text-[#003768]">Submit Bid</h2>

          {data?.bid ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
              <p className="font-semibold">You have already submitted a bid.</p>
              <p className="mt-2">Vehicle: {data.bid.vehicle_category_name}</p>
              <p>Car hire: {data.bid.car_hire_price}</p>
              <p>Fuel: {data.bid.fuel_price}</p>
              <p>Total: {data.bid.total_price}</p>
              <p>Status: {data.bid.status}</p>
              <p className="mt-2 text-sm">Submitted: {fmtDateTime(data.bid.created_at)}</p>
            </div>
          ) : (
            <form onSubmit={submitBid} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-[#003768]">Vehicle from your fleet</label>
                <select
                  value={fleetId}
                  onChange={(e) => handleFleetChange(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
                >
                  {data?.fleet.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.category_name} · {item.max_passengers} pax · {item.max_suitcases} suitcases
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Car hire price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={carHirePrice}
                  onChange={(e) => setCarHirePrice(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#003768]">Full fuel price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <div className="space-y-3">
                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={fullInsuranceIncluded}
                    onChange={(e) => setFullInsuranceIncluded(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Full insurance included
                </label>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
                  <input
                    type="checkbox"
                    checked={fullTankIncluded}
                    onChange={(e) => setFullTankIncluded(e.target.checked)}
                    className="h-4 w-4"
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
                  placeholder="Optional notes for this bid"
                  className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Bid"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}