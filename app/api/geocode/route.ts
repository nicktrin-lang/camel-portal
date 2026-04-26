// ── Geocode API ───────────────────────────────────────────────────────────────
// Search: uses Photon (komoot) — better POI names, cleaner results, bias support
// Reverse: stays on Nominatim — accurate for map-click lat/lng lookup

import { NextResponse } from "next/server";

// ── Nominatim reverse geocode normaliser ─────────────────────────────────────
function normalizeFromNominatim(address: any) {
  const house    = String(address?.house_number || "").trim();
  const road     = String(address?.road || address?.pedestrian || address?.footway || "").trim();
  const suburb   = String(address?.suburb || address?.neighbourhood || address?.city_district || address?.quarter || "").trim();
  const city     = String(address?.city || address?.town || address?.village || "").trim();
  const province = String(address?.state || address?.county || address?.region || "").trim();
  const postcode = String(address?.postcode || "").trim();
  const country  = String(address?.country || "").trim();
  const address_line1 = [house, road].filter(Boolean).join(" ").trim() || road;
  return { address_line1, address_line2: suburb, city, province, postcode, country };
}

// ── Photon OSM value → type string ───────────────────────────────────────────
function resolveType(props: any): string {
  const val = String(props?.osm_value || "").toLowerCase();
  const key = String(props?.osm_key   || "").toLowerCase();
  if (["aerodrome", "airport"].includes(val))                     return "airport";
  if (["hotel", "motel", "hostel", "guest_house"].includes(val))  return "hotel";
  if (["restaurant", "cafe", "bar", "fast_food"].includes(val))   return "food";
  if (["train_station", "station", "halt"].includes(val))         return "train";
  if (["bus_station", "bus_stop"].includes(val))                   return "bus";
  if (key === "highway" || val === "residential")                  return "street";
  return "place";
}

// ── Photon result formatter ───────────────────────────────────────────────────
function formatPhotonResult(f: any) {
  const props  = f?.properties || {};
  const coords = f?.geometry?.coordinates; // [lng, lat]
  if (!coords || coords.length < 2) return null;

  const name     = String(props?.name        || "").trim();
  const street   = String(props?.street      || "").trim();
  const housenr  = String(props?.housenumber || "").trim();
  const district = String(props?.district || props?.suburb || props?.quarter || "").trim();
  const city     = String(props?.city || props?.town || props?.village || "").trim();
  const country  = String(props?.country || "").trim();

  const streetAddr = [street, housenr].filter(Boolean).join(" ");

  // label = POI name if present, otherwise street address
  const label    = name || streetAddr || "";
  const subtitle = [district, city, country].filter(Boolean).join(", ");
  if (!label) return null;

  return {
    display_name:  subtitle ? `${label}, ${subtitle}` : label,
    label,          // POI name or street — line 1 in dropdown, used for address filling
    subtitle,       // district, city, country — line 2 in dropdown
    type:           resolveType(props),
    lat:            Number(coords[1]),
    lng:            Number(coords[0]),
    city,           // explicit city for form filling
    address_line1:  streetAddr,
    address_line2:  district,
    province:       String(props?.state || props?.county || ""),
    postcode:       String(props?.postcode || ""),
    country,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q   = (searchParams.get("q")   || "").trim();
    const lat = (searchParams.get("lat") || "").trim();
    const lng = (searchParams.get("lng") || "").trim();

    // ── Reverse geocode (Nominatim) ──────────────────────────────────────────
    if (lat && lng) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "CamelGlobal/1.0 (camel-global.com)" },
        cache: "no-store",
      });
      if (!res.ok) return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 500 });
      const data  = await res.json();
      const parts = normalizeFromNominatim(data?.address || {});
      return NextResponse.json({
        display_name: String(data?.display_name || "").trim(),
        lat: data?.lat ? Number(data.lat) : null,
        lng: data?.lon ? Number(data.lon) : null,
        ...parts,
      }, { status: 200 });
    }

    // ── Forward search (Photon) ──────────────────────────────────────────────
    if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    const biasLat = (searchParams.get("biasLat") || "").trim();
    const biasLng = (searchParams.get("biasLng") || "").trim();

    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
    if (biasLat && biasLng) url += `&lat=${encodeURIComponent(biasLat)}&lon=${encodeURIComponent(biasLng)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "CamelGlobal/1.0 (camel-global.com)" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Geocoding request failed" }, { status: 500 });

    const raw      = await res.json().catch(() => null);
    const features = Array.isArray(raw?.features) ? raw.features : [];
    const results  = features.map(formatPhotonResult).filter(Boolean);

    return NextResponse.json({ results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}