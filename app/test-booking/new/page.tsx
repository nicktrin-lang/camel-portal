"use client";

import "leaflet/dist/leaflet.css";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import L from "leaflet";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";

const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(
  async () => (await import("react-leaflet")).TileLayer,
  { ssr: false }
);
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, {
  ssr: false,
});
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, {
  ssr: false,
});
const useMapEventsDynamic = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    return function ClickHandler(props: {
      mode: "pickup" | "dropoff";
      onPick: (lat: number, lng: number) => void;
    }) {
      mod.useMapEvents({
        click(e) {
          props.onPick(e.latlng.lat, e.latlng.lng);
        },
      });
      return null;
    };
  },
  { ssr: false }
);

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const DEFAULT_CENTER: [number, number] = [38.3452, -0.481];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

async function reverseLookup(lat: number, lng: number) {
  const res = await fetch(
    `/api/maps/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
      String(lng)
    )}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.error || "Reverse lookup failed.");
  }

  return String(json?.data?.display_name || "").trim();
}

export default function TestBookingNewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);

  const [pickupResults, setPickupResults] = useState<SearchResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<SearchResult[]>([]);

  const [pickupSearching, setPickupSearching] = useState(false);
  const [dropoffSearching, setDropoffSearching] = useState(false);

  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");

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
  const [mapPicking, setMapPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchAddress(query: string, kind: "pickup" | "dropoff") {
    const clean = query.trim();

    if (kind === "pickup") {
      setPickupAddress(query);
      setPickupLat(null);
      setPickupLng(null);
      setPickupResults([]);
    } else {
      setDropoffAddress(query);
      setDropoffLat(null);
      setDropoffLng(null);
      setDropoffResults([]);
    }

    if (clean.length < 3) return;

    try {
      if (kind === "pickup") setPickupSearching(true);
      else setDropoffSearching(true);

      const res = await fetch(`/api/maps/search?q=${encodeURIComponent(clean)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Address search failed.");
      }

      const results = (json?.data || []) as SearchResult[];

      if (kind === "pickup") {
        setPickupResults(results);
      } else {
        setDropoffResults(results);
      }
    } catch (e: any) {
      setError(e?.message || "Address search failed.");
    } finally {
      if (kind === "pickup") setPickupSearching(false);
      else setDropoffSearching(false);
    }
  }

  function selectPickup(result: SearchResult) {
    setPickupAddress(result.display_name);
    setPickupLat(Number(result.lat));
    setPickupLng(Number(result.lon));
    setPickupResults([]);
  }

  function selectDropoff(result: SearchResult) {
    setDropoffAddress(result.display_name);
    setDropoffLat(Number(result.lat));
    setDropoffLng(Number(result.lon));
    setDropoffResults([]);
  }

  async function handleMapPick(lat: number, lng: number) {
    try {
      setMapPicking(true);
      setError(null);

      const address = await reverseLookup(lat, lng);

      if (mapMode === "pickup") {
        setPickupLat(lat);
        setPickupLng(lng);
        setPickupAddress(address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setPickupResults([]);
      } else {
        setDropoffLat(lat);
        setDropoffLng(lng);
        setDropoffAddress(address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setDropoffResults([]);
      }
    } catch (e: any) {
      setError(e?.message || "Map selection failed.");
    } finally {
      setMapPicking(false);
    }
  }

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

      if (pickupLat === null || pickupLng === null) {
        throw new Error("Please choose a pickup address from the search results or map.");
      }

      if (dropoffLat === null || dropoffLng === null) {
        throw new Error("Please choose a dropoff address from the search results or map.");
      }

      const res = await fetch("/api/test-booking/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          pickup_address: pickupAddress,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dropoff_address: dropoffAddress,
          dropoff_lat: dropoffLat,
          dropoff_lng: dropoffLng,
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

  const mapCenter: [number, number] =
    pickupLat !== null && pickupLng !== null
      ? [pickupLat, pickupLng]
      : dropoffLat !== null && dropoffLng !== null
        ? [dropoffLat, dropoffLng]
        : DEFAULT_CENTER;

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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMapMode("pickup")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mapMode === "pickup"
                ? "bg-[#003768] text-white"
                : "border border-black/10 bg-white text-[#003768]"
            }`}
          >
            Map click sets pickup
          </button>

          <button
            type="button"
            onClick={() => setMapMode("dropoff")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mapMode === "dropoff"
                ? "bg-[#003768] text-white"
                : "border border-black/10 bg-white text-[#003768]"
            }`}
          >
            Map click sets dropoff
          </button>

          {mapPicking ? (
            <span className="self-center text-sm text-slate-500">
              Looking up map address…
            </span>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="relative">
            <label className="text-sm font-medium text-[#003768]">
              Pickup address
            </label>
            <input
              value={pickupAddress}
              onChange={(e) => searchAddress(e.target.value, "pickup")}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="Search pickup address"
              required
            />

            {pickupSearching ? (
              <p className="mt-2 text-sm text-slate-500">Searching pickup…</p>
            ) : null}

            {pickupResults.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
                {pickupResults.map((result, index) => (
                  <button
                    key={`${result.lat}-${result.lon}-${index}`}
                    type="button"
                    onClick={() => selectPickup(result)}
                    className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-[#003768]">
              Dropoff address
            </label>
            <input
              value={dropoffAddress}
              onChange={(e) => searchAddress(e.target.value, "dropoff")}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
              placeholder="Search dropoff address"
              required
            />

            {dropoffSearching ? (
              <p className="mt-2 text-sm text-slate-500">Searching dropoff…</p>
            ) : null}

            {dropoffResults.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
                {dropoffResults.map((result, index) => (
                  <button
                    key={`${result.lat}-${result.lon}-${index}`}
                    type="button"
                    onClick={() => selectDropoff(result)}
                    className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-3xl border border-black/10">
            <div style={{ height: 320, width: "100%" }}>
              <MapContainer
                center={mapCenter}
                zoom={10}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <useMapEventsDynamic mode={mapMode} onPick={handleMapPick} />

                {pickupLat !== null && pickupLng !== null ? (
                  <Marker position={[pickupLat, pickupLng]} icon={markerIcon}>
                    <Popup>Pickup</Popup>
                  </Marker>
                ) : null}

                {dropoffLat !== null && dropoffLng !== null ? (
                  <Marker position={[dropoffLat, dropoffLng]} icon={markerIcon}>
                    <Popup>Dropoff</Popup>
                  </Marker>
                ) : null}
              </MapContainer>
            </div>
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
            disabled={loading || mapPicking}
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Test Request"}
          </button>
        </form>
      </div>
    </div>
  );
}