import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = String(searchParams.get("lat") || "").trim();
    const lng = String(searchParams.get("lng") || "").trim();

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Missing lat/lng" },
        { status: 400 }
      );
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Camel Global Portal",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Reverse lookup failed." },
        { status: 400 }
      );
    }

    const data = await res.json();

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Reverse lookup failed" },
      { status: 500 }
    );
  }
}