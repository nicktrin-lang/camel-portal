/**
 * Currency utilities for Camel Global
 *
 * - All partner prices are stored and displayed in EUR
 * - Customers can pay in EUR, GBP, or USD
 * - Live exchange rates from frankfurter.app (no API key required)
 * - Rates are cached for 1 hour to avoid hammering the API
 */
export type Currency = "EUR" | "GBP" | "USD";

// ── Rate cache ────────────────────────────────────────────────────────────────
let cachedRate: number | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getEurToGbpRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now < cacheExpiry) return cachedRate;
  try {
    const res = await fetch("/api/currency/rate", { cache: "no-store" });
    if (!res.ok) throw new Error("Rate API unavailable");
    const data = await res.json();
    const rate = Number(data?.rate);
    if (!rate || isNaN(rate)) throw new Error("Invalid rate");
    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;
    return rate;
  } catch (e) {
    console.warn("Currency rate fetch failed, using fallback:", e);
    return cachedRate ?? 0.85;
  }
}

export async function getEurToGbpRateWithSource(): Promise<{ rate: number; live: boolean; source: string }> {
  const now = Date.now();
  if (cachedRate && now < cacheExpiry) return { rate: cachedRate, live: true, source: "cache" };
  try {
    const res = await fetch("/api/currency/rate", { cache: "no-store" });
    if (!res.ok) throw new Error("Rate API unavailable");
    const data = await res.json();
    const rate = Number(data?.rate);
    if (!rate || isNaN(rate)) throw new Error("Invalid rate");
    cachedRate = rate;
    cacheExpiry = now + CACHE_TTL;
    return { rate, live: data.live ?? true, source: data.source ?? "frankfurter.app" };
  } catch (e) {
    console.warn("Currency rate fetch failed, using fallback:", e);
    return { rate: cachedRate ?? 0.85, live: false, source: "fallback" };
  }
}

export async function eurToGbp(amountEur: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round(amountEur * rate * 100) / 100;
}

export async function gbpToEur(amountGbp: number): Promise<number> {
  const rate = await getEurToGbpRate();
  return Math.round((amountGbp / rate) * 100) / 100;
}

export function formatEUR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  }).format(amount);
}

export function formatGBP(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", minimumFractionDigits: 2,
  }).format(amount);
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number | null | undefined, currency: Currency): string {
  if (currency === "GBP") return formatGBP(amount);
  if (currency === "USD") return formatUSD(amount);
  return formatEUR(amount);
}

export async function convertFromEur(amountEur: number, targetCurrency: Currency): Promise<number> {
  if (targetCurrency === "EUR") return amountEur;
  return eurToGbp(amountEur);
}

export async function formatInCurrency(
  amountEur: number | null | undefined,
  targetCurrency: Currency
): Promise<string> {
  if (amountEur == null || isNaN(amountEur)) return "—";
  if (targetCurrency === "EUR") return formatEUR(amountEur);
  const gbp = await eurToGbp(amountEur);
  return formatGBP(gbp);
}

// ── Dual currency display ─────────────────────────────────────────────────────

/**
 * Given an EUR amount and a live rate, returns both formatted strings.
 *
 * partnerView:  "80,00 € (£68.00)"   — EUR primary, GBP secondary
 * customerView: "£68.00 (80,00 €)"   — GBP primary, EUR secondary
 */
export function formatDual(
  amountEur: number | null | undefined,
  rate: number,
  view: "partner" | "customer"
): string {
  if (amountEur == null || isNaN(amountEur)) return "—";
  const gbpAmt = Math.round(amountEur * rate * 100) / 100;
  const eur = formatEUR(amountEur);
  const gbp = formatGBP(gbpAmt);
  return view === "partner"
    ? `${eur} (${gbp})`
    : `${gbp} (${eur})`;
}

/**
 * Convenience: format a GBP amount (stored as GBP) with EUR secondary.
 * Used on pages where `amount` is stored in GBP (e.g. partner_bookings.amount).
 * Pass the live EUR→GBP rate.
 */
export function formatDualFromGbp(
  amountGbp: number | null | undefined,
  rate: number,
  view: "partner" | "customer"
): string {
  if (amountGbp == null || isNaN(amountGbp)) return "—";
  const eurAmt = Math.round((amountGbp / rate) * 100) / 100;
  const gbp = formatGBP(amountGbp);
  const eur = formatEUR(eurAmt);
  return view === "partner"
    ? `${eur} (${gbp})`
    : `${gbp} (${eur})`;
}