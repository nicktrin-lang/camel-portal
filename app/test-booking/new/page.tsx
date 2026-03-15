"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";

export default function TestBookingNewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [dropoffAt, setDropoffAt] = useState("");
  const [journeyDurationMinutes, setJourneyDurationMinutes] = useState("45");
  const [passengers, setPassengers] = useState("4");
  const [suitcases, setSuitcases] = useState("2");
  const [handLuggage, setHandLuggage] = useState("2");
  const [vehicleCategorySlug, setVehicleCategorySlug] = useState(
    FLEET_CATEGORIES[0]?.slug || ""
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("You must be logged in to create a test request.");
      }

      const selectedCategory = FLEET_CATEGORIES.find(
        (item) => item.slug === vehicleCategorySlug
      );

      if (!selectedCategory) {
        throw new Error("Please select a vehicle category.");
      }

      const res = await fetch("/api/test-booking/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          pickup_at: pickupAt,
          dropoff_at: dropoffAt || null,
          journey_duration_minutes: Number(journeyDurationMinutes || 0),
          passengers: Number(passengers || 0),
          suitcases: Number(suitcases || 0),
          hand_luggage: Number(handLuggage || 0),
          vehicle_category_slug: selectedCategory.slug,
          vehicle_category_name: selectedCategory.name,
          notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create request.");
      }

      const requestId = json?.data?.id;
      if (!requestId) {
        throw new Error("Request created but no request ID was returned.");
      }

      router.push(`/test-booking/requests/${requestId}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-3xl font-semibold text-[#003768]">
          Create Test Booking Request
        </h1>
        <p className="mt-3 text-slate-600">
          Use this form to create a customer request that appears in the partner
          portal.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div>
            <label className="text-sm font-medium text-[#003768]">
              Pickup address
            </label>
            <input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. Alicante Airport"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Dropoff address
            </label>
            <input
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="e.g. Benidorm"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Pickup time
              </label>
              <input
                type="datetime-local"
                value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Dropoff time
              </label>
              <input
                type="datetime-local"
                value={dropoffAt}
                onChange={(e) => setDropoffAt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-[#003768]">
                Duration (mins)
              </label>
              <input
                type="number"
                min="0"
                value={journeyDurationMinutes}
                onChange={(e) => setJourneyDurationMinutes(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Passengers
              </label>
              <input
                type="number"
                min="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Suitcases
              </label>
              <input
                type="number"
                min="0"
                value={suitcases}
                onChange={(e) => setSuitcases(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">
                Hand luggage
              </label>
              <input
                type="number"
                min="0"
                value={handLuggage}
                onChange={(e) => setHandLuggage(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Vehicle category
            </label>
            <select
              value={vehicleCategorySlug}
              onChange={(e) => setVehicleCategorySlug(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
              required
            >
              {FLEET_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="Optional notes for this test booking"
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