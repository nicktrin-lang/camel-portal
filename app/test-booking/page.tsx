"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const VEHICLES = [
  { slug: "standard-saloon", name: "Standard Saloon" },
  { slug: "mpv-5", name: "MPV 5 Seater" },
  { slug: "executive", name: "Executive" },
];

export default function TestBookingPage() {
  const router = useRouter();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [dropoffAt, setDropoffAt] = useState("");
  const [journeyDurationMinutes, setJourneyDurationMinutes] = useState("45");
  const [passengers, setPassengers] = useState("2");
  const [suitcases, setSuitcases] = useState("2");
  const [handLuggage, setHandLuggage] = useState("1");
  const [vehicleSlug, setVehicleSlug] = useState(VEHICLES[0].slug);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const vehicle = VEHICLES.find((v) => v.slug === vehicleSlug);

      const res = await fetch("/api/test-booking/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          pickup_at: pickupAt,
          dropoff_at: dropoffAt,
          journey_duration_minutes: Number(journeyDurationMinutes || 0),
          passengers: Number(passengers || 0),
          suitcases: Number(suitcases || 0),
          hand_luggage: Number(handLuggage || 0),
          vehicle_category_slug: vehicle?.slug,
          vehicle_category_name: vehicle?.name,
          notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create request.");
      }

      router.push(`/test-booking/requests/${json.request_id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <h1 className="text-3xl font-semibold text-[#003768]">Test Booking Engine</h1>
        <p className="mt-2 text-slate-600">
          Internal test area for creating customer booking requests.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-[#003768]">Pickup</label>
            <input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Dropoff</label>
            <input
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">Pickup time</label>
              <input
                type="datetime-local"
                value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Dropoff time</label>
              <input
                type="datetime-local"
                value={dropoffAt}
                onChange={(e) => setDropoffAt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium text-[#003768]">Duration</label>
              <input
                type="number"
                value={journeyDurationMinutes}
                onChange={(e) => setJourneyDurationMinutes(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Passengers</label>
              <input
                type="number"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Suitcases</label>
              <input
                type="number"
                value={suitcases}
                onChange={(e) => setSuitcases(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Hand luggage</label>
              <input
                type="number"
                value={handLuggage}
                onChange={(e) => setHandLuggage(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Vehicle</label>
              <select
                value={vehicleSlug}
                onChange={(e) => setVehicleSlug(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
              >
                {VEHICLES.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Test Request"}
          </button>
        </form>
      </div>
    </div>
  );
}