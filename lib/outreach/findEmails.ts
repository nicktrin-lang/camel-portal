// Finds a business's contact email on its own public website.
//
// Used by scripts/directory-scan.ts for the outreach directory. Reads the home page and up
// to MAX_EXTRA_PAGES likely contact/legal pages on the same site (contact, contacto, kontakt,
// impressum, aviso legal…), collecting addresses from mailto: links, Cloudflare-protected
// addresses and the visible text. Only public pages, one request at a time per site, with a
// timeout — never a form submission, never a login.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/130.0 Safari/537.36 CamelGlobalPartnerDirectory (+https://portal.camel-global.com)";
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;
const MAX_EXTRA_PAGES = 4;

// Link text/paths that usually lead to an address, in the languages of our markets.
const CONTACT_HINT =
  /contact|contacto|contato|contatti|kontakt|nous-contacter|impressum|imprint|aviso-legal|legal|mentions-legales|note-legali|about|quienes-somos|sobre-nosotros|chi-siamo|qui-sommes|ueber-uns|uber-uns|empresa/i;

const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)*\.[a-z]{2,24}/gi;
const IS_EMAIL = new RegExp(`^${EMAIL_RE.source}$`, "i");

// Addresses that are never a business's inbox.
const JUNK_EMAIL =
  /(example\.|sentry|wixpress|@sentry|noreply|no-reply|donotreply|do-not-reply|@domain\.|@email\.com$|@yourdomain|@test\.|\.(png|jpe?g|gif|webp|svg|css|js)$|@2x|u00|cloudflare|godaddy|@[0-9.]+$|placeholder|privacy@|gdpr@|dpo@|abuse@|postmaster@|webmaster@)/i;

// Free-mail domains: acceptable (many small firms use them) but ranked below the site's own domain.
const FREE_MAIL = /@(gmail|googlemail|hotmail|outlook|live|yahoo|ymail|icloud|me|aol|gmx|web|t-online|libero|virgilio|alice|tiscali|orange|wanadoo|free|laposte|sapo|telefonica|movistar)\./i;

// Mailboxes most likely to reach someone who decides about new booking channels.
const PREFERRED_LOCAL = /^(info|contact|contacto|contato|contatti|kontakt|hello|hola|ola|bonjour|ciao|reservas|reservations|reservation|reservierung|prenotazioni|booking|bookings|office|oficina|admin|gerencia|direccion|management|sales|ventas)@/i;

export type EmailScan = {
  status: "found" | "none" | "failed";
  email: string | null;
  emails: string[];
  source: string | null;
  error?: string;
};

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

type Page = { html: string; finalUrl: string };

/** Why a page didn't load, in words an admin can act on. */
function failReason(e: unknown): string {
  const err = e as { name?: string; cause?: { code?: string } };
  const code = err?.cause?.code || "";
  if (err?.name === "AbortError") return "Timed out";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Website address no longer works";
  if (/CERT|SSL|TLS/i.test(code)) return "Website's security certificate is invalid";
  if (code === "ECONNREFUSED" || code === "ECONNRESET") return "Website refused the connection";
  return code ? `Didn't load (${code})` : "Didn't load";
}

async function fetchPage(url: string): Promise<Page | { error: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    });
    if (!res.ok) return { error: `Website answered HTTP ${res.status}` };
    const type = res.headers.get("content-type") || "";
    if (type && !/html|text\/plain/i.test(type)) return { error: `Not a web page (${type.split(";")[0]})` };
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, MAX_BYTES));
    return { html, finalUrl: res.url || url };
  } catch (e) {
    return { error: failReason(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Cloudflare "email protection" hides addresses as a hex string XOR-ed with its first byte. */
function decodeCfEmail(hex: string): string | null {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&commat;|&#64;/gi, "@")
    .replace(/&period;/gi, ".")
    .replace(/&amp;/gi, "&");
}

function emailsIn(html: string): string[] {
  const found: string[] = [];
  const text = decodeEntities(html);
  for (const m of text.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    try { found.push(decodeURIComponent(m[1])); } catch { found.push(m[1]); }
  }
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) {
    const e = decodeCfEmail(m[1]);
    if (e) found.push(e);
  }
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) {
    const e = decodeCfEmail(m[1]);
    if (e) found.push(e);
  }
  // Visible text, plus the common "info [at] domain [dot] com" disguise.
  const plain = text
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*[\[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@")
    .replace(/\s*[\[(]\s*(?:dot|punto|point)\s*[\])]\s*/gi, ".");
  for (const m of plain.matchAll(EMAIL_RE)) found.push(m[0]);
  return found
    .map((e) => e.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((e) => IS_EMAIL.test(e) && !JUNK_EMAIL.test(e));
}

function contactLinks(html: string, base: string, host: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    const label = m[2].replace(/<[^>]+>/g, " ");
    if (!CONTACT_HINT.test(href) && !CONTACT_HINT.test(label)) continue;
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (u.hostname.toLowerCase().replace(/^www\./, "") !== host) continue;
      u.hash = "";
      if (!out.includes(u.toString())) out.push(u.toString());
    } catch { /* bad href */ }
  }
  return out.slice(0, MAX_EXTRA_PAGES);
}

/** Best address: the site's own domain beats free mail beats anything else; then a known role mailbox. */
export function pickBest(emails: string[], siteHost: string | null): string | null {
  if (!emails.length) return null;
  const score = (e: string) => {
    const domain = e.split("@")[1] || "";
    let s = 0;
    if (siteHost && (domain === siteHost || siteHost.endsWith(`.${domain}`) || domain.endsWith(`.${siteHost}`))) s += 100;
    else if (FREE_MAIL.test(e)) s += 40;
    if (PREFERRED_LOCAL.test(e)) s += 10;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export async function findEmails(website: string): Promise<EmailScan> {
  const start = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let first = await fetchPage(start);
  // Some small sites only answer on plain http, or only on https.
  if ("error" in first && first.error !== "Website address no longer works") {
    const other = start.startsWith("https://") ? start.replace(/^https:/, "http:") : start.replace(/^http:/, "https:");
    const retry = await fetchPage(other);
    if (!("error" in retry)) first = retry;
  }
  if ("error" in first) return { status: "failed", email: null, emails: [], source: null, error: first.error };
  const home = first;

  const host = hostOf(home.finalUrl) ?? hostOf(start);
  const bySource = new Map<string, string>(); // email -> first page it appeared on
  const take = (html: string, page: string) => { for (const e of emailsIn(html)) if (!bySource.has(e)) bySource.set(e, page); };

  take(home.html, home.finalUrl);
  // Contact/legal pages: always visited when the home page has no same-domain address,
  // because the home page often only shows a free-mail or booking-engine address.
  const hasOwn = [...bySource.keys()].some((e) => host && e.endsWith(`@${host}`));
  if (!hasOwn && host) {
    for (const link of contactLinks(home.html, home.finalUrl, host)) {
      const page = await fetchPage(link);
      if (!("error" in page)) take(page.html, link);
      if ([...bySource.keys()].some((e) => e.endsWith(`@${host}`))) break;
    }
  }

  const emails = [...bySource.keys()].slice(0, 20);
  const best = pickBest(emails, host);
  return best
    ? { status: "found", email: best, emails, source: bySource.get(best) ?? home.finalUrl }
    : { status: "none", email: null, emails: [], source: null };
}
