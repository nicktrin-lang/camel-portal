"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

type RequestData = {
  id: string;
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
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function TestBookingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createCustomerBrowserClient(), []);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
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

    load();
  }, [requestId, supabase]);

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

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Request Information</h2>

        <div className="mt-6 space-y-4 text-slate-700">
          <p><span className="font-semibold text-slate-900">Pickup:</span> {data.request.pickup_address}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {data.request.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(data.request.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(data.request.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Duration:</span> {fmtDuration(data.request.journey_duration_minutes)}</p>
          <p><span className="font-semibold text-slate-900">Passengers:</span> {data.request.passengers}</p>
          <p><span className="font-semibold text-slate-900">Bags:</span> {data.request.suitcases} suitcases / {data.request.hand_luggage} hand luggage</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {data.request.vehicle_category_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Notes:</span> {data.request.notes || "—"}</p>
          <p><span className="font-semibold text-slate-900">Status:</span> <span className="capitalize">{data.request.status}</span></p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Partner Bids</h2>

        {data.bids.length === 0 ? (
          <p className="mt-4 text-slate-600">No bids submitted yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map((bid) => (
              <div key={bid.id} className="rounded-2xl border border-black/10 p-5">
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
                  <p><span className="font-semibold text-slate-900">Insurance included:</span> {bid.full_insurance_included ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Full tank included:</span> {bid.full_tank_included ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-slate-900">Notes:</span> {bid.notes || "—"}</p>
                  <p><span className="font-semibold text-slate-900">Status:</span> <span className="capitalize">{bid.status}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}