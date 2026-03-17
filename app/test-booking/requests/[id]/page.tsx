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
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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

export default function TestBookingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);
  const [timeLabel, setTimeLabel] = useState<string>("—");
  const [expired, setExpired] = useState(false);

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
          <p>
            <span className="font-semibold text-slate-900">Job No.:</span>{" "}
            {data.request.job_number ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Pickup:</span>{" "}
            {data.request.pickup_address}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Dropoff:</span>{" "}
            {data.request.dropoff_address || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Pickup time:</span>{" "}
            {fmtDateTime(data.request.pickup_at)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Dropoff time:</span>{" "}
            {fmtDateTime(data.request.dropoff_at)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Duration:</span>{" "}
            {fmtDuration(data.request.journey_duration_minutes)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Passengers:</span>{" "}
            {data.request.passengers}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Bags:</span>{" "}
            {data.request.suitcases} suitcases / {data.request.hand_luggage} hand luggage
          </p>
          <p>
            <span className="font-semibold text-slate-900">Vehicle:</span>{" "}
            {data.request.vehicle_category_name || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Notes:</span>{" "}
            {data.request.notes || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Status:</span>{" "}
            <span className="capitalize">{data.request.status}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-900">Expires at:</span>{" "}
            {fmtDateTime(data.request.expires_at)}
          </p>
        </div>
      </div>

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

                    <p>
                      <span className="font-semibold text-slate-900">Company:</span>{" "}
                      {bid.partner_company_name || "—"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Phone:</span>{" "}
                      {bid.partner_phone || "—"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Vehicle:</span>{" "}
                      {bid.vehicle_category_name}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Car hire:</span>{" "}
                      {formatGBP(bid.car_hire_price)}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Fuel:</span>{" "}
                      {formatGBP(bid.fuel_price)}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Total:</span>{" "}
                      {formatGBP(bid.total_price)}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Insurance included:</span>{" "}
                      {bid.full_insurance_included ? "Yes" : "No"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Full tank included:</span>{" "}
                      {bid.full_tank_included ? "Yes" : "No"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Notes:</span>{" "}
                      {bid.notes || "—"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-900">Status:</span>{" "}
                      <span className="capitalize">{bid.status}</span>
                    </p>
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