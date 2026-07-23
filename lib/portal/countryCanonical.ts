// ─────────────────────────────────────────────────────────────────────────────
// Canonical country names for Stripe onboarding.
//
// Map click (reverse geocode) and some data sources return a country in the
// LOCAL language ("España", "Deutschland") or as an ISO code. Stripe's account
// country + our COUNTRY_MAP (app/api/partner/stripe/connect/route.ts) key on the
// canonical ENGLISH name ("Spain", "Germany"). A connected account's country is
// locked at creation, so a wrong/native name that isn't recognised blocks
// onboarding. Normalise every captured country through canonicalCountryName()
// BEFORE it is stored, so the DB always holds the English canonical name.
//
// Covers every currently-supported Stripe country. Unknown input is returned
// unchanged (trimmed) so we never lose data — stripeCountry() still throws
// loudly on a genuinely unsupported country.
// ─────────────────────────────────────────────────────────────────────────────

// Canonical English names — must match the COUNTRY_MAP keys in the connect route.
export const CANONICAL_COUNTRIES = [
  "United Kingdom", "Spain", "Australia", "United States", "Canada", "France",
  "Germany", "Italy", "Netherlands", "Portugal", "Ireland", "New Zealand",
  "Singapore", "United Arab Emirates",
] as const;

// alias (lowercased, accents stripped) → canonical English name
const ALIASES: Record<string, string> = {
  // United Kingdom
  "united kingdom": "United Kingdom", "uk": "United Kingdom", "u.k.": "United Kingdom",
  "great britain": "United Kingdom", "britain": "United Kingdom", "gb": "United Kingdom", "gbr": "United Kingdom",
  "england": "United Kingdom", "scotland": "United Kingdom", "wales": "United Kingdom", "northern ireland": "United Kingdom",
  "reino unido": "United Kingdom", "royaume-uni": "United Kingdom", "regno unito": "United Kingdom", "vereinigtes konigreich": "United Kingdom",
  // Spain
  "spain": "Spain", "espana": "Spain", "espagne": "Spain", "spanien": "Spain", "spagna": "Spain", "es": "Spain", "esp": "Spain",
  // Australia
  "australia": "Australia", "australie": "Australia", "australien": "Australia", "au": "Australia", "aus": "Australia",
  // United States
  "united states": "United States", "united states of america": "United States", "usa": "United States",
  "us": "United States", "u.s.": "United States", "u.s.a.": "United States", "america": "United States",
  "estados unidos": "United States", "etats-unis": "United States", "vereinigte staaten": "United States",
  // Canada
  "canada": "Canada", "kanada": "Canada", "ca": "Canada", "can": "Canada",
  // France
  "france": "France", "francia": "France", "frankreich": "France", "franca": "France", "fr": "France", "fra": "France",
  // Germany
  "germany": "Germany", "deutschland": "Germany", "allemagne": "Germany", "alemania": "Germany", "germania": "Germany",
  "de": "Germany", "deu": "Germany", "ger": "Germany",
  // Italy
  "italy": "Italy", "italia": "Italy", "italie": "Italy", "italien": "Italy", "it": "Italy", "ita": "Italy",
  // Netherlands
  "netherlands": "Netherlands", "the netherlands": "Netherlands", "nederland": "Netherlands", "holland": "Netherlands",
  "paises bajos": "Netherlands", "pays-bas": "Netherlands", "niederlande": "Netherlands", "paesi bassi": "Netherlands",
  "nl": "Netherlands", "nld": "Netherlands",
  // Portugal
  "portugal": "Portugal", "pt": "Portugal", "prt": "Portugal",
  // Ireland
  "ireland": "Ireland", "irlanda": "Ireland", "irlande": "Ireland", "irland": "Ireland",
  "eire": "Ireland", "ie": "Ireland", "irl": "Ireland",
  // New Zealand
  "new zealand": "New Zealand", "nueva zelanda": "New Zealand", "nouvelle-zelande": "New Zealand",
  "neuseeland": "New Zealand", "nz": "New Zealand", "nzl": "New Zealand",
  // Singapore
  "singapore": "Singapore", "singapur": "Singapore", "sg": "Singapore", "sgp": "Singapore",
  // United Arab Emirates
  "united arab emirates": "United Arab Emirates", "uae": "United Arab Emirates", "u.a.e.": "United Arab Emirates",
  "ae": "United Arab Emirates", "are": "United Arab Emirates",
  "emiratos arabes unidos": "United Arab Emirates", "emirats arabes unis": "United Arab Emirates",
  "vereinigte arabische emirate": "United Arab Emirates",
};

/**
 * Normalise any country name (English, native/localized, or ISO code) to its
 * canonical English name. Unknown countries are returned trimmed & unchanged.
 */
export function canonicalCountryName(input: string | null | undefined): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents: "espana" (accents removed)
  return ALIASES[key] ?? raw;
}
