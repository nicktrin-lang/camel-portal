// The portal's public origin, from PORTAL_BASE_URL, cleaned up.
//
// Production's PORTAL_BASE_URL was malformed (Stripe rejected the onboarding return_url
// built from it with url_invalid, so no partner could open Stripe setup). Environment
// values pasted into Vercel easily pick up a trailing newline, spaces, quotes or a missing
// scheme, so this trims those, keeps only the origin, and falls back if it still isn't a
// URL. A warning is logged whenever the raw value needed fixing, so it can be corrected.
const DEFAULT = "https://portal.camel-global.com";
let warned = false;

export function portalBaseUrl(fallback: string = DEFAULT): string {
  const raw = process.env.PORTAL_BASE_URL;
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  let origin = fallback;
  try {
    origin = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`).origin;
  } catch {
    // Unparseable: use the fallback.
  }
  if (origin !== raw && !warned) {
    warned = true;
    console.warn(`PORTAL_BASE_URL is malformed (${JSON.stringify(raw)}); using ${origin}. Fix it in Vercel.`);
  }
  return origin;
}
