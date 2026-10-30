/**
 * Outreach directory loader: every car hire company Overture Maps knows about, worldwide.
 *
 * Run:  cd ~/camel-portal && npm run directory:load -- [--countries ES,PT] [--release 2026-10-21.0] [--dry]
 *
 *  1. Downloads the car-rental slice of the latest Overture Maps Places release (open data,
 *     CDLA-Permissive-2.0) with DuckDB, straight from Overture's public S3 bucket, into
 *     .overture/<release>/car-rental.parquet. A re-run with the same release reuses the file.
 *  2. Flags chains (lib/outreach/directoryChains.ts) and upserts every row into
 *     outreach_directory, keyed on Overture's stable id. Only directory columns are written,
 *     so a reload never wipes scan results or the "added to outreach" link.
 *  3. On a full (all-country) run, deletes places that are gone from Overture, unless they
 *     were already added to outreach.
 *
 * Needs OUTREACH_DIRECTORY_SCHEMA.sql applied, and NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY in .env.local. Overture publishes monthly: re-run monthly.
 * --dry: download and count only, write nothing.
 */
import { existsSync, mkdirSync, readFileSync, renameSync } from "fs";
import { join } from "path";
import { DuckDBInstance } from "@duckdb/node-api";
import { createClient } from "@supabase/supabase-js";
import { isChain } from "../lib/outreach/directoryChains";
import { hostOf } from "../lib/outreach/findEmails";

(function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

// Overture categories that are car hire. Vans, trucks, motorbikes and campers are not Camel's product.
export const CAR_HIRE_CATEGORIES = ["car_rental_service", "car_rental_agency"];

const argv = process.argv.slice(2);
const flag = (name: string) => { const i = argv.indexOf(`--${name}`); return i > -1 ? argv[i + 1] : undefined; };
const dry = argv.includes("--dry");
const onlyCountries = (flag("countries") || "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
const CHUNK = 1000;

type Row = {
  id: string; name: string; category: string; confidence: number | null; brand: string | null;
  website: string | null; phone: string | null; social: string | null; email: string | null;
  address: string | null; postcode: string | null; locality: string | null; region: string | null; country: string | null;
  lat: number | null; lng: number | null;
};

async function latestRelease(): Promise<string> {
  const res = await fetch("https://stac.overturemaps.org/catalog.json");
  const cat = (await res.json()) as { latest?: string };
  if (!cat.latest) throw new Error("Couldn't find the latest Overture release.");
  return cat.latest;
}

async function main() {
  const release = flag("release") || (await latestRelease());
  const dir = join(process.cwd(), ".overture", release);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "car-rental.parquet");

  const duck = await DuckDBInstance.create(":memory:");
  const conn = await duck.connect();

  if (!existsSync(file)) {
    console.log(`Downloading car hire places from Overture ${release} (all countries; usually 10-30 minutes)…`);
    const started = Date.now();
    await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
    await conn.run(`COPY (
      SELECT id, names.primary AS name, taxonomy.primary AS category, confidence, brand.names.primary AS brand,
             list_filter(websites, w -> w IS NOT NULL)[1] AS website, phones[1] AS phone, socials[1] AS social, emails[1] AS email,
             addresses[1].freeform AS address, addresses[1].postcode AS postcode, addresses[1].locality AS locality,
             addresses[1].region AS region, addresses[1].country AS country,
             (bbox.ymin + bbox.ymax) / 2 AS lat, (bbox.xmin + bbox.xmax) / 2 AS lng
        FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning = 1)
       WHERE taxonomy.primary IN (${CAR_HIRE_CATEGORIES.map((c) => `'${c}'`).join(", ")})
         AND (operating_status IS NULL OR operating_status = 'open') AND names.primary IS NOT NULL
    ) TO '${file}.part' (FORMAT parquet)`);
    renameSync(`${file}.part`, file);
    console.log(`Downloaded in ${Math.round((Date.now() - started) / 1000)}s.`);
  } else {
    console.log(`Using the copy of Overture ${release} already on this Mac.`);
  }

  const where = onlyCountries.length ? `WHERE country IN (${onlyCountries.map((c) => `'${c.replace(/'/g, "")}'`).join(", ")})` : "WHERE country IS NOT NULL";
  const result = await conn.runAndReadAll(`SELECT * FROM '${file}' ${where} ORDER BY id`);
  const rows = result.getRowObjects() as unknown as Row[];

  const now = new Date().toISOString();
  const records = rows.map((r) => {
    const domain = hostOf(r.website);
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      country: String(r.country).toUpperCase(),
      region: r.region,
      town: r.locality,
      postcode: r.postcode,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone,
      website: r.website,
      domain,
      social: r.social,
      confidence: r.confidence,
      brand: r.brand,
      is_chain: isChain(r.name, domain, r.brand),
      overture_release: release,
      last_seen_at: now,
      overture_email: r.email,
    };
  });

  const byCountry = new Map<string, { total: number; independent: number }>();
  for (const r of records) {
    const c = byCountry.get(r.country) ?? { total: 0, independent: 0 };
    c.total++;
    if (!r.is_chain) c.independent++;
    byCountry.set(r.country, c);
  }
  const independents = records.filter((r) => !r.is_chain).length;
  console.log(`${records.length.toLocaleString("en-GB")} car hire places in ${byCountry.size} countries; ${independents.toLocaleString("en-GB")} independent.`);
  console.log("Top countries (independent / all):");
  for (const [c, n] of [...byCountry.entries()].sort((a, b) => b[1].independent - a[1].independent).slice(0, 25)) {
    console.log(`  ${c}  ${n.independent.toLocaleString("en-GB")} / ${n.total.toLocaleString("en-GB")}`);
  }
  if (dry) { console.log("--dry: nothing written."); return; }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Overture sometimes publishes an email; record it without overwriting a scan result.
  const withOvertureEmail = records.filter((r) => r.overture_email).map((r) => r.id);

  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK).map(({ overture_email: _e, ...r }) => r);
    const { error } = await db.from("outreach_directory").upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`Upsert failed at row ${i}: ${error.message}`);
    process.stdout.write(`\rSaved ${Math.min(i + CHUNK, records.length).toLocaleString("en-GB")} / ${records.length.toLocaleString("en-GB")}`);
  }
  console.log("");

  if (withOvertureEmail.length) {
    const emailById = new Map(records.filter((r) => r.overture_email).map((r) => [r.id, String(r.overture_email).toLowerCase()]));
    for (let i = 0; i < withOvertureEmail.length; i += 200) {
      const ids = withOvertureEmail.slice(i, i + 200);
      const { data, error } = await db.from("outreach_directory").select("id").in("id", ids).is("email", null);
      if (error) throw new Error(`Reading rows for Overture emails failed: ${error.message}`);
      for (const { id } of data ?? []) {
        const email = emailById.get(id)!;
        const { error: upErr } = await db.from("outreach_directory")
          .update({ email, emails: [email], email_source: "overture", scan_status: "found", scanned_at: now })
          .eq("id", id);
        if (upErr) throw new Error(`Saving Overture email failed: ${upErr.message}`);
      }
    }
    console.log(`${withOvertureEmail.length.toLocaleString("en-GB")} places came with an email from Overture.`);
  }

  if (!onlyCountries.length) {
    const { error, count } = await db.from("outreach_directory")
      .delete({ count: "exact" })
      .neq("overture_release", release)
      .is("prospect_id", null);
    if (error) throw new Error(`Removing closed places failed: ${error.message}`);
    console.log(`Removed ${count ?? 0} places no longer in Overture.`);
  }
  console.log("Done. Next: npm run directory:scan");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
