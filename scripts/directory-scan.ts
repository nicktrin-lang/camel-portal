/**
 * Outreach directory scan: finds a contact email on each independent car hire company's
 * own website (lib/outreach/findEmails.ts) and stores it on outreach_directory.
 *
 * Run:  cd ~/camel-portal && npm run directory:scan -- [--countries ES,PT] [--limit 500] [--concurrency 8] [--retry-failed] [--dry]
 *
 *  - Only independents (is_chain = false) that haven't been scanned yet (scan_status = 'pending').
 *  - Branches sharing one website are scanned ONCE and the result is written to all of them.
 *  - No website → scan_status 'no_website' (call or visit those instead).
 *  - Resumable: stop it any time; the next run carries on with what's still pending.
 *  - --retry-failed also re-tries sites that didn't load last time.
 *  - --dry: scan and print, write nothing.
 *
 * Reads public pages only, with a timeout. Never submits a form or emails anyone: getting
 * into the send list is a separate, deliberate step on /admin/outreach/directory.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { findEmails, type EmailScan } from "../lib/outreach/findEmails";

(function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const argv = process.argv.slice(2);
const flag = (name: string) => { const i = argv.indexOf(`--${name}`); return i > -1 ? argv[i + 1] : undefined; };
const dry = argv.includes("--dry");
const retryFailed = argv.includes("--retry-failed");
const countries = (flag("countries") || "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
const limit = Number(flag("limit") || 0) || Infinity;
const concurrency = Math.max(1, Math.min(32, Number(flag("concurrency") || 8)));
const PAGE = 1000;

type Pending = { id: string; website: string | null; domain: string | null };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Everything still to do, paged (PostgREST returns at most 1000 rows per request).
  const statuses = retryFailed ? ["pending", "failed"] : ["pending"];
  const pending: Pending[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from("outreach_directory").select("id, website, domain")
      .eq("is_chain", false).in("scan_status", statuses).order("id").range(from, from + PAGE - 1);
    if (countries.length) q = q.in("country", countries);
    const { data, error } = await q;
    if (error) throw new Error(`Reading the directory failed: ${error.message}`);
    pending.push(...((data ?? []) as Pending[]));
    if (!data || data.length < PAGE) break;
  }

  const noWebsite = pending.filter((p) => !p.website || !p.domain).map((p) => p.id);
  const byDomain = new Map<string, Pending[]>();
  for (const p of pending) {
    if (!p.website || !p.domain) continue;
    const list = byDomain.get(p.domain) ?? [];
    list.push(p);
    byDomain.set(p.domain, list);
  }
  const sites = [...byDomain.entries()].slice(0, limit === Infinity ? undefined : limit);
  console.log(`${pending.length.toLocaleString("en-GB")} places to check: ${sites.length.toLocaleString("en-GB")} websites to scan, ${noWebsite.length.toLocaleString("en-GB")} with no website.`);

  const now = () => new Date().toISOString();
  if (!dry && noWebsite.length) {
    for (let i = 0; i < noWebsite.length; i += 200) {
      const { error } = await db.from("outreach_directory")
        .update({ scan_status: "no_website", scanned_at: now() }).in("id", noWebsite.slice(i, i + 200));
      if (error) throw new Error(`Marking no-website rows failed: ${error.message}`);
    }
  }

  let done = 0, found = 0, none = 0, failed = 0;
  const save = async (rows: Pending[], scan: EmailScan) => {
    if (scan.status === "found") found++; else if (scan.status === "none") none++; else failed++;
    if (dry) {
      console.log(`${rows[0].domain}: ${scan.status}${scan.email ? ` ${scan.email}` : ""}${scan.error ? ` (${scan.error})` : ""}`);
      return;
    }
    const { error } = await db.from("outreach_directory").update({
      scan_status: scan.status,
      email: scan.email,
      emails: scan.emails.length ? scan.emails : null,
      email_source: scan.source,
      scan_error: scan.error ?? null,
      scanned_at: now(),
    }).in("id", rows.map((r) => r.id));
    if (error) throw new Error(`Saving ${rows[0].domain} failed: ${error.message}`);
  };

  let next = 0;
  const worker = async () => {
    while (next < sites.length) {
      const [, rows] = sites[next++];
      let scan: EmailScan;
      try {
        scan = await findEmails(rows[0].website!);
      } catch (e) {
        scan = { status: "failed", email: null, emails: [], source: null, error: e instanceof Error ? e.message.slice(0, 200) : "Scan error" };
      }
      await save(rows, scan);
      done++;
      if (!dry) process.stdout.write(`\rScanned ${done.toLocaleString("en-GB")} / ${sites.length.toLocaleString("en-GB")}: ${found} with email, ${none} without, ${failed} didn't load`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`\nDone: ${found} websites with an email, ${none} without, ${failed} didn't load.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
