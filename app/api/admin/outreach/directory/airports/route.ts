import { NextResponse } from "next/server";
import { requireDirectoryAdmin } from "@/lib/outreach/requireDirectoryAdmin";

// Airport grouping for the Car Hire Directory: one country's places grouped by their
// nearest airport (stamped by `npm run directory:airports`), within RADIUS_KM, plus
// everyone further away. Lets outreach start with the airport trade Camel serves.

const PAGE = 1000;
const ISO = /^[A-Z]{2}$/;
const RADIUS_KM = 30;

const COLUMNS = "id, name, town, phone, website, domain, email, scan_status, is_chain, prospect_id, nearest_airport, airport_km";

export async function GET(req: Request) {
  try {
    const auth = await requireDirectoryAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;

    const url = new URL(req.url);
    const country = (url.searchParams.get("country") || "").toUpperCase();
    const chains = url.searchParams.get("chains") === "1";
    if (!ISO.test(country)) return NextResponse.json({ error: "Choose a country" }, { status: 400 });

    const rows: any[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = db.from("outreach_directory").select(COLUMNS)
        .eq("country", country).order("id").range(from, from + PAGE - 1);
      if (!chains) q = q.eq("is_chain", false);
      const { data, error } = await q;
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    const near = new Map<string, any[]>();
    const other: any[] = [];
    let unmeasured = 0;
    for (const r of rows) {
      if (r.airport_km == null && r.nearest_airport == null) unmeasured++;
      if (r.nearest_airport && r.airport_km != null && r.airport_km <= RADIUS_KM) {
        near.set(r.nearest_airport, [...(near.get(r.nearest_airport) ?? []), r]);
      } else {
        other.push(r);
      }
    }

    const iatas = [...near.keys()];
    const info = new Map<string, any>();
    for (let i = 0; i < iatas.length; i += 200) {
      const { data, error } = await db.from("outreach_airports")
        .select("iata, name, town, country, type").in("iata", iatas.slice(i, i + 200));
      if (error) throw error;
      for (const a of data ?? []) info.set(a.iata, a);
    }

    const byKm = (a: any, b: any) => (a.airport_km ?? 1e9) - (b.airport_km ?? 1e9) || String(a.name).localeCompare(String(b.name));
    const ready = (list: any[]) => list.filter((r) => r.email && !r.prospect_id && !r.is_chain).length;
    const airports = iatas.map((iata) => {
      const companies = near.get(iata)!.sort(byKm);
      const a = info.get(iata) ?? { iata, name: iata, town: null, country, type: "unknown" };
      return { ...a, companies, ready: ready(companies) };
    }).sort((a, b) => b.ready - a.ready || b.companies.length - a.companies.length);

    return NextResponse.json({
      radiusKm: RADIUS_KM,
      airports,
      other: other.sort(byKm),
      otherReady: ready(other),
      // Every row unmeasured = the airports script hasn't been run since this country loaded.
      measured: rows.length > 0 && unmeasured < rows.length,
    });
  } catch (e: any) {
    const msg = e?.message || "Server error";
    return NextResponse.json({ error: /airport/i.test(msg) ? `${msg} (has OUTREACH_AIRPORTS_SCHEMA.sql been run in Supabase?)` : msg }, { status: 500 });
  }
}
