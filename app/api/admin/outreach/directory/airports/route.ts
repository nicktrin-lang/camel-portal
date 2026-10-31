import { NextResponse } from "next/server";
import { requireDirectoryAdmin } from "@/lib/outreach/requireDirectoryAdmin";
import { groupByAirport } from "@/lib/outreach/groupByAirport";

// Airport grouping for the Car Hire Directory (lib/outreach/groupByAirport.ts).

const ISO = /^[A-Z]{2}$/;

export async function GET(req: Request) {
  try {
    const auth = await requireDirectoryAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;

    const url = new URL(req.url);
    const country = (url.searchParams.get("country") || "").toUpperCase();
    const chains = url.searchParams.get("chains") === "1";
    if (!ISO.test(country)) return NextResponse.json({ error: "Choose a country" }, { status: 400 });

    return NextResponse.json(await groupByAirport(db, country, chains));
  } catch (e: any) {
    const msg = e?.message || "Server error";
    return NextResponse.json({ error: /airport/i.test(msg) ? `${msg} (has OUTREACH_AIRPORTS_SCHEMA.sql been run in Supabase?)` : msg }, { status: 500 });
  }
}
