"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RequestData = {
  id: string;
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
  vehicle_category_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type BidRow = {
  id: string;
  request_id: string;
  partner_user_id: string;
  vehicle_category_name: string;
  car_hire_price: number;
  fuel_price: number;
  total_price: number;
  full_insurance_included: boolean;
  full_tank_included: boolean;
  notes: string | null;
  status: string;
  created_at: string;
  partner_company_name: string | null;
  currency: string | null;
  partner_contact_name: string | null;
  partner_phone: string | null;
  partner_address: string | null;
};

type ResponseShape = {
  request: RequestData;
  bids: BidRow[];
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
  if (minutes >= 1440) return `${Math.ceil(minutes / 1440)} day${Math.ceil(minutes / 1440) === 1 ? "" : "s"}`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);

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
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load request.");
      }

      setData(json as ResponseShape);
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

  async function acceptBid(bidId: string) {
    setAcceptingId(bidId);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/admin/bids/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bid_id: bidId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to accept bid.");
      }

      setOk("Bid accepted and booking created.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to accept bid.");
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading request…</p>
      </div>
    );
  }

  if (!data?.request) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Request not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Admin Request Detail</h1>
          <p className="mt-2 text-slate-600">
            Review all bids and choose the winning partner.
          </p>
        </div>

        <Link
          href="/admin/requests"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Requests
        </Link>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>

        <div className="mt-6 space-y-4 text-slate-700">
          <p><span className="font-semibold text-slate-900">Customer:</span> {data.request.customer_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Email:</span> {data.request.customer_email || "—"}</p>
          <p><span className="font-semibold text-slate-900">Phone:</span> {data.request.customer_phone || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup:</span> {data.request.pickup_address}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {data.request.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(data.request.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(data.request.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Journey duration:</span> {fmtDuration(data.request.journey_duration_minutes)}</p>
          <p><span className="font-semibold text-slate-900">Passengers:</span> {data.request.passengers}</p>
          <p><span className="font-semibold text-slate-900">Suitcases:</span> {data.request.suitcases}</p>
          <p><span className="font-semibold text-slate-900">Hand luggage:</span> {data.request.hand_luggage}</p>
          <p><span className="font-semibold text-slate-900">Requested vehicle:</span> {data.request.vehicle_category_name || "Any suitable vehicle"}</p>
          <p><span className="font-semibold text-slate-900">Notes:</span> {data.request.notes || "—"}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> {data.request.status}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>

        {data.bids.length === 0 ? (
          <p className="mt-4 text-slate-600">No bids submitted yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map((bid) => (
              <div
                key={bid.id}
                className="rounded-2xl border border-black/10 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2 text-slate-700">
                    <h3 className="text-xl font-semibold text-[#003768]">
                      {bid.partner_company_name || "Partner"}
                    </h3>
                    <p><span className="font-semibold text-slate-900">Contact:</span> {bid.partner_contact_name || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Phone:</span> {bid.partner_phone || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Address:</span> {bid.partner_address || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Vehicle:</span> {bid.vehicle_category_name}</p>
                    <p><span className="font-semibold text-slate-900">Car hire:</span> {bid.currency} {bid.car_hire_price?.toFixed(2)}</p>
                    <p><span className="font-semibold text-slate-900">Fuel:</span> {bid.currency} {bid.fuel_price?.toFixed(2)}</p>
                    <p><span className="font-semibold text-slate-900">Total:</span> {bid.currency} {bid.total_price?.toFixed(2)}</p>
                    <p><span className="font-semibold text-slate-900">Full insurance:</span> {bid.full_insurance_included ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-slate-900">Full tank:</span> {bid.full_tank_included ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Status:</span> {bid.status}</p>
                    <p><span className="font-semibold text-slate-900">Submitted:</span> {fmtDateTime(bid.created_at)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {bid.status === "accepted" ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        Accepted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => acceptBid(bid.id)}
                        disabled={!!acceptingId || data.request.status === "booked"}
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
