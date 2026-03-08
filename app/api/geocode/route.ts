import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Camel Global Portal",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding request failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    const results = Array.isArray(data)
      ? data.map((item: any) => ({
          display_name: item.display_name || "",
          lat: item.lat ? Number(item.lat) : null,
          lng: item.lon ? Number(item.lon) : null,
        }))
      : [];

    return NextResponse.json({ results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}