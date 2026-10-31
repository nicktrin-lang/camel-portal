/**
 * Outreach directory airports: stamps every place with its nearest airport.
 *
 * Run:  cd ~/camel-portal && npm run directory:airports [-- --dry]
 *
 *  1. Downloads OurAirports (public domain) and keeps airports with scheduled passenger
 *     service and an IATA code (~4,000 worldwide), upserted into outreach_airports.
 *  2. For every outreach_directory place, finds the nearest of those airports (straight-line
 *     km, any country) and stores nearest_airport + airport_km. Beyond 100 km both are null.
 *
 * Needs OUTREACH_AIRPORTS_SCHEMA.sql applied. Re-run after each `directory:load`, since new
 * places arrive without an airport. Safe to re-run: unchanged rows aren't rewritten.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

(function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const AIRPORTS_CSV = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const TYPES = new Set(["large_airport", "medium_airport", "small_airport"]);
const MAX_KM = 100;
const PAGE = 1000;
const dry = process.argv.includes("--dry");

type Airport = { iata: string; name: string; town: string | null; country: string; type: string; lat: number; lng: number };

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

async function loadAirports(): Promise<Airport[]> {
  const res = await fetch(AIRPORTS_CSV);
  if (!res.ok) throw new Error(`Downloading OurAirports failed: HTTP ${res.status}`);
  const [header, ...rows] = parseCsv(await res.text());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`OurAirports CSV has no "${name}" column`);
    return i;
  };
  const c = { type: col("type"), name: col("name"), lat: col("latitude_deg"), lng: col("longitude_deg"),
    country: col("iso_country"), town: col("municipality"), sched: col("scheduled_service"), iata: col("iata_code") };
  const byIata = new Map<string, Airport>();
  for (const r of rows) {
    const iata = (r[c.iata] || "").trim().toUpperCase();
    if (r[c.sched] !== "yes" || !/^[A-Z0-9]{3}$/.test(iata) || !TYPES.has(r[c.type])) continue;
    const lat = Number(r[c.lat]), lng = Number(r[c.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    byIata.set(iata, { iata, name: r[c.name], town: r[c.town] || null, country: r[c.country].toUpperCase(), type: r[c.type], lat, lng });
  }
  return [...byIata.values()];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const airports = await loadAirports();
  console.log(`${airports.length.toLocaleString("en-GB")} airports with scheduled passenger service.`);
  if (!dry) {
    const now = new Date().toISOString();
    for (let i = 0; i < airports.length; i += PAGE) {
      const { error } = await db.from("outreach_airports").upsert(airports.slice(i, i + PAGE).map((a) => ({ ...a, updated_at: now })), { onConflict: "iata" });
      if (error) throw new Error(`Saving airports failed: ${error.message}`);
    }
  }

  // 1° grid so each place only measures airports in its own and neighbouring cells.
  // 100 km is under 1° of latitude everywhere; longitude cells widen towards the poles,
  // so the search widens with them.
  const grid = new Map<string, Airport[]>();
  for (const a of airports) {
    const k = `${Math.floor(a.lat)},${Math.floor(a.lng)}`;
    grid.set(k, [...(grid.get(k) ?? []), a]);
  }
  const nearest = (lat: number, lng: number) => {
    const lngSpan = Math.min(180, Math.ceil(1 / Math.max(0.05, Math.cos((lat * Math.PI) / 180))));
    let best: Airport | null = null, bestKm = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -lngSpan; dx <= lngSpan; dx++) {
        const x = ((Math.floor(lng) + dx + 540) % 360) - 180;
        for (const a of grid.get(`${Math.floor(lat) + dy},${x}`) ?? []) {
          const d = km(lat, lng, a.lat, a.lng);
          if (d < bestKm) { best = a; bestKm = d; }
        }
      }
    }
    return best && bestKm <= MAX_KM ? { iata: best.iata, km: Math.round(bestKm * 10) / 10 } : { iata: null, km: null };
  };

  let done = 0, within30 = 0, changed = 0;
  let batch: { id: string; iata: string | null; km: number | null }[] = [];
  const flush = async () => {
    if (!batch.length || dry) { batch = []; return; }
    const { data, error } = await db.rpc("outreach_directory_set_airports", { payload: batch });
    if (error) throw new Error(`Saving nearest airports failed: ${error.message}`);
    changed += Number(data) || 0;
    batch = [];
  };

  // Keyset paging on id: stable while rows are being updated.
  let after = "";
  for (;;) {
    const { data, error } = await db.from("outreach_directory").select("id, lat, lng")
      .gt("id", after).order("id").limit(PAGE);
    if (error) throw new Error(`Reading the directory failed: ${error.message}`);
    for (const p of data ?? []) {
      const n = p.lat == null || p.lng == null ? { iata: null, km: null } : nearest(Number(p.lat), Number(p.lng));
      if (n.km != null && n.km <= 30) within30++;
      batch.push({ id: p.id, ...n });
    }
    if (batch.length >= 5000) await flush();
    done += data?.length ?? 0;
    process.stdout.write(`\rMeasured ${done.toLocaleString("en-GB")} places`);
    if (!data || data.length < PAGE) break;
    after = data[data.length - 1].id;
  }
  await flush();
  console.log(`\n${within30.toLocaleString("en-GB")} places are within 30 km of an airport. ${dry ? "--dry: nothing written." : `${changed.toLocaleString("en-GB")} rows updated.`}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
