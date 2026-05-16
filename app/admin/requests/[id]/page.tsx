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
  sport_equipment: string | null;
  driver_age: number | null;
  additional_drivers: number;
  additional_driver_ages: string | null;
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
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function fmtDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes >= 1440) return `${Math.ceil(minutes / 1440)} day${Math.ceil(minutes / 1440) === 1 ? "" : "s"}`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function sportEquipmentLabel(v: string | null): string {
  if (!v || v === "none") return "None";
  const map: Record<string, string> = {
    golf_single: "Golf clubs — 1 bag", golf_two: "Golf clubs — 2 bags",
    golf_three: "Golf clubs — 3 bags", golf_four: "Golf clubs — 4+ bags",
    skis_pair: "Skis / snowboard — 1 set", skis_two: "Skis / snowboard — 2 sets",
    skis_three: "Skis / snowboard — 3+ sets",
    bikes_one: "Bikes — 1", bikes_two: "Bikes — 2", bikes_three: "Bikes — 3+",
    other: "Other large equipment",
  };
  return map[v] || v;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-black">{value || "—"}</p>
    </div>
  );
}

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [requestId,   setRequestId]   = useState("");
  const [loading,     setLoading]     = useState(true);

  const [error,       setError]       = useState<string | null>(null);
  const [ok,          setOk]          = useState<string | null>(null);
  const [data,        setData]        = useState<ResponseShape | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const resolved = await params;
      if (!mounted) return;
      setRequestId(resolved.id);
    }
    init();
    return () => { mounted = false; };
  }, [params]);

  async function load() {
    if (!requestId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/admin/requests/${requestId}`, { method: "GET", cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load request.");
      setData(json as ResponseShape);
    } catch (e: any) {
      setError(e?.message || "Failed to load request.");
      setData(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [requestId]);



  if (loading) {
    return (
      <div className="border border-black/10 bg-white p-8">
        <p className="text-black/50">Loading request…</p>
      </div>
    );
  }

  if (!data?.request) {
    return (
      <div className="border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Request not found."}
      </div>
    );
  }

  const req = data.request;
  const accepted = (bid: BidRow) => bid.status === "accepted";

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok    && <div className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Admin Request Detail</h1>
          <p className="mt-1 text-sm text-black/50">Review all bids and choose the winning partner.</p>
        </div>
        <Link href="/admin/requests"
          className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">
          ← Back to Requests
        </Link>
      </div>

      {/* Request info */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">Request Information</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Customer"         value={req.customer_name} />
          <Field label="Email"            value={req.customer_email} />
          <Field label="Phone"            value={req.customer_phone} />
          <Field label="Pickup"           value={req.pickup_address} />
          <Field label="Dropoff"          value={req.dropoff_address} />
          <Field label="Pickup time"      value={fmtDateTime(req.pickup_at)} />
          <Field label="Dropoff time"     value={fmtDateTime(req.dropoff_at)} />
          <Field label="Journey duration" value={fmtDuration(req.journey_duration_minutes)} />
          <Field label="Passengers"       value={String(req.passengers)} />
          <Field label="Suitcases"        value={String(req.suitcases)} />
          <Field label="Hand luggage"     value={String(req.hand_luggage)} />
          <Field label="Sport equipment"  value={sportEquipmentLabel(req.sport_equipment)} />
          <Field label="Main driver age"  value={String(req.driver_age ?? "—")} />
          <Field label="Additional drivers" value={
            req.additional_drivers > 0
              ? `${req.additional_drivers} (ages: ${req.additional_driver_ages || "—"})`
              : "None"
          } />
          <Field label="Requested vehicle" value={req.vehicle_category_name || "Any suitable vehicle"} />
          <Field label="Notes"            value={req.notes} />
          <Field label="Status"           value={req.status} />
        </div>
      </div>

      {/* Bids */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">Partner Bids</h2>

        {data.bids.length === 0 ? (
          <p className="mt-4 text-black/50">No bids submitted yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {data.bids.map((bid) => (
              <div key={bid.id} className={`border p-6 ${accepted(bid) ? "border-[#1a1a1a] bg-[#1a1a1a]" : "border-black/10 bg-white"}`}>
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="sm:col-span-2 xl:col-span-3">
                      <p className={`text-xs font-black uppercase tracking-widest ${accepted(bid) ? "text-white/50" : "text-black/40"}`}>Company</p>
                      <p className={`mt-0.5 text-2xl font-black ${accepted(bid) ? "text-[#ff7a00]" : "text-black"}`}>
                        {bid.partner_company_name || "Partner"}
                      </p>
                    </div>
                    {([
                      ["Contact",        bid.partner_contact_name],
                      ["Phone",          bid.partner_phone],
                      ["Address",        bid.partner_address],
                      ["Vehicle",        bid.vehicle_category_name],
                      ["Car hire",       `${bid.currency ?? "EUR"} ${bid.car_hire_price?.toFixed(2)}`],
                      ["Fuel deposit",   `${bid.currency ?? "EUR"} ${bid.fuel_price?.toFixed(2)}`],
                      ["Total",          `${bid.currency ?? "EUR"} ${bid.total_price?.toFixed(2)}`],
                      ["Full insurance", bid.full_insurance_included ? "Yes" : "No"],
                      ["Full tank",      bid.full_tank_included ? "Yes" : "No"],
                      ["Notes",          bid.notes],
                      ["Status",         bid.status],
                      ["Submitted",      fmtDateTime(bid.created_at)],
                    ] as [string, string | null][]).map(([label, value]) => (
                      <div key={label}>
                        <p className={`text-xs font-black uppercase tracking-widest ${accepted(bid) ? "text-white/50" : "text-black/40"}`}>{label}</p>
                        <p className={`mt-0.5 text-sm font-black ${accepted(bid) ? "text-white" : "text-black"}`}>{value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {accepted(bid) && (
                    <div className="flex xl:flex-col xl:items-end xl:pt-1">
                      <span className="border border-[#ff7a00] px-4 py-2 text-sm font-black text-[#ff7a00]">
                        ✓ Accepted
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}