import { NextResponse } from "next/server";

let cachedRate: number | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();
  if (cachedRate && now < cacheExpiry) {
    return NextResponse.json({ rate: cachedRate, live: true, source: "cache" });
  }
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=GBP", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Frankfurter unavailable");
    const data = await res.json();
    const rate = Number(data?.rates?.GBP);
    if (!rate || isNaN(rate)) throw new Error("Invalid rate");
    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;
    return NextResponse.json({ rate, live: true, source: "frankfurter.app" });
  } catch (e) {
    return NextResponse.json({ rate: cachedRate ?? 0.85, live: false, source: "fallback" });
  }
}