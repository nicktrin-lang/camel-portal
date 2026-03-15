"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Bid = {
  id: string;
  partner_company_name: string | null;
  partner_contact_name: string | null;
  partner_phone: string | null;
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

type ResponseShape = {
  request: any;
  bids: Bid[];
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function TestBookingRequestDetailPage({
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
      const res = await fetch(`/api/test-booking/requests/${requestId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load request.");

      setData(json);
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
      const res = await fetch("/api/test-booking/bids/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bid_id: bidId }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to accept bid.");

      setOk("Bid accepted. Booking created.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to accept bid.");
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-slate-600">Loading…</div>;
  }

  if (!data?.request) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-red-600">{error || "Request not found."}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
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
          <h1 className="text-3xl font-semibold text-[#003768]">Test Request Detail</h1>
          <p className="mt-2 text-slate-600">Review partner bids and accept the best one.</p>
        </div>

        <Link
          href="/test-booking/requests"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768]"
        >
          Back
        </Link>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>

        <div className="mt-6 space-y-3 text-slate-700">
          <p><span className="font-semibold text-slate-900">Pickup:</span> {data.request.pickup_address}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {data.request.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(data.request.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(data.request.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Passengers:</span> {data.request.passengers}</p>
          <p><span className="font-semibold text-slate-900">Suitcases:</span> {data.request.suitcases}</p>
          <p><span className="font-semibold text-slate-900">Hand luggage:</span> {data.request.hand_luggage}</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {data.request.vehicle_category_name}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> {data.request.status}</p>
          <p><span className="font-semibold text-slate-900">Notes:</span> {data.request.notes || "—"}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>

        {data.bids.length === 0 ? (
          <p className="mt-4 text-slate-600">No bids yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map((bid) => (
              <div key={bid.id} className="rounded-2xl border border-black/10 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2 text-slate-700">
                    <h3 className="text-xl font-semibold text-[#003768]">
                      {bid.partner_company_name || "Partner"}
                    </h3>
                    <p><span className="font-semibold text-slate-900">Contact:</span> {bid.partner_contact_name || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Phone:</span> {bid.partner_phone || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Vehicle:</span> {bid.vehicle_category_name}</p>
                    <p><span className="font-semibold text-slate-900">Car hire:</span> {bid.car_hire_price}</p>
                    <p><span className="font-semibold text-slate-900">Fuel:</span> {bid.fuel_price}</p>
                    <p><span className="font-semibold text-slate-900">Total:</span> {bid.total_price}</p>
                    <p><span className="font-semibold text-slate-900">Insurance:</span> {bid.full_insurance_included ? "Included" : "Not included"}</p>
                    <p><span className="font-semibold text-slate-900">Fuel tank:</span> {bid.full_tank_included ? "Included" : "Not included"}</p>
                    <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes || "—"}</p>
                    <p><span className="font-semibold text-slate-900">Status:</span> {bid.status}</p>
                    <p><span className="font-semibold text-slate-900">Submitted:</span> {fmtDateTime(bid.created_at)}</p>
                  </div>

                  <div>
                    {data.request.status === "confirmed" || bid.status === "accepted" ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        Accepted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => acceptBid(bid.id)}
                        disabled={!!acceptingId}
                        className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
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