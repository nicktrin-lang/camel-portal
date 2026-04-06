import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = String(searchParams.get("lat") || "").trim();
    const lng = String(searchParams.get("lng") || "").trim();

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Camel Global Portal" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ display_name: `${lat}, ${lng}` }, { status: 200 });
    }

    const data = await res.json().catch(() => null);
    const a = data?.address || {};

    const house    = String(a.house_number || "").trim();
    const road     = String(a.road || a.pedestrian || a.footway || "").trim();
    const addr1    = [house, road].filter(Boolean).join(" ") || String(data?.display_name || "").split(",")[0].trim();
    const addr2    = String(a.suburb || a.neighbourhood || a.quarter || "").trim();
    const town     = String(a.town || a.village || a.hamlet || "").trim();
    const city     = String(a.city || a.municipality || "").trim();
    const province = String(a.state || a.region || a.county || "").trim();
    const postcode = String(a.postcode || "").trim();
    const country  = String(a.country || "").trim();

    return NextResponse.json({
      display_name: String(data?.display_name || "").trim(),
      address_line1: addr1,
      address_line2: addr2,
      town,
      city,
      province,
      postcode,
      country,
    }, { status: 200 });

  } catch {
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 500 });
  }
}
