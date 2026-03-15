"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BookingData = {
  id: string;
  request_id: string;
  partner_user_id: string;
  winning_bid_id: string | null;
  booking_status: string;
  amount: number | null;
  notes: string | null;
  created_at: string | null;
  job_number: number | null;
};

type RequestData = {
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

type ResponseShape = {
  booking: BookingData;
  request: RequestData | null;
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

export default function PartnerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);

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

  useEffect(() => {
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

        setData(json as ResponseShape);
      } catch (e: any) {
        setError(e?.message || "Failed to load booking.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading booking…</p>
        </div>
      </div>
    );
  }

  if (!data?.booking) {
    return (
      <div className="px-4 py-8 md:px-8">
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#003768]">Booking Detail</h1>
          <p className="mt-2 text-slate-600">
            View full accepted booking information.
          </p>
        </div>

        <Link
          href="/partner/bookings"
          className="rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[#003768] hover:bg-black/5"
        >
          Back to Bookings
        </Link>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Booking Information</h2>

        <div className="mt-6 space-y-4 text-slate-700">
          <p><span className="font-semibold text-slate-900">Job No.:</span> {booking.job_number ?? request?.job_number ?? "—"}</p>
          <p><span className="font-semibold text-slate-900">Booking created:</span> {fmtDateTime(booking.created_at)}</p>
          <p><span className="font-semibold text-slate-900">Booking status:</span> <span className="capitalize">{booking.booking_status}</span></p>
          <p><span className="font-semibold text-slate-900">Amount:</span> {booking.amount ?? "—"}</p>
          <p><span className="font-semibold text-slate-900">Booking notes:</span> {booking.notes || "—"}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-2xl font-semibold text-[#003768]">Journey Information</h2>

        <div className="mt-6 space-y-4 text-slate-700">
          <p><span className="font-semibold text-slate-900">Customer:</span> {request?.customer_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Email:</span> {request?.customer_email || "—"}</p>
          <p><span className="font-semibold text-slate-900">Phone:</span> {request?.customer_phone || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup:</span> {request?.pickup_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Dropoff:</span> {request?.dropoff_address || "—"}</p>
          <p><span className="font-semibold text-slate-900">Pickup time:</span> {fmtDateTime(request?.pickup_at)}</p>
          <p><span className="font-semibold text-slate-900">Dropoff time:</span> {fmtDateTime(request?.dropoff_at)}</p>
          <p><span className="font-semibold text-slate-900">Duration:</span> {fmtDuration(request?.journey_duration_minutes)}</p>
          <p><span className="font-semibold text-slate-900">Passengers:</span> {request?.passengers ?? "—"}</p>
          <p><span className="font-semibold text-slate-900">Bags:</span> {request?.suitcases ?? "—"} suitcases / {request?.hand_luggage ?? "—"} hand luggage</p>
          <p><span className="font-semibold text-slate-900">Vehicle:</span> {request?.vehicle_category_name || "—"}</p>
          <p><span className="font-semibold text-slate-900">Request notes:</span> {request?.notes || "—"}</p>
        </div>
      </div>
    </div>
  );
}