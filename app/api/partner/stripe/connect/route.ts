import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { canonicalCountryName } from "@/lib/portal/countryCanonical";
import { isGlobalPayoutsCountry, createGlobalPayoutRecipient, createRecipientOnboardingLink } from "@/lib/portal/stripeGlobalPayouts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const COUNTRY_MAP: Record<string, string> = {
  "United Kingdom":       "GB",
  "Spain":                "ES",
  "Australia":            "AU",
  "United States":        "US",
  "Canada":               "CA",
  "France":               "FR",
  "Germany":              "DE",
  "Italy":                "IT",
  "Netherlands":          "NL",
  "Portugal":             "PT",
  "Ireland":              "IE",
  "New Zealand":          "NZ",
  "Singapore":            "SG",
  "United Arab Emirates": "AE",
};

// Settlement currency for the connected account, derived from its COUNTRY.
// This is the partner's SINGLE currency — bid = charge = payout = this value.
// Written back to partner_profiles.default_currency so Stripe is the source of truth.
const COUNTRY_CURRENCY: Record<string, string> = {
  GB: "gbp", ES: "eur", AU: "aud", US: "usd", CA: "cad",
  FR: "eur", DE: "eur", IT: "eur", NL: "eur", PT: "eur",
  IE: "eur", NZ: "nzd", SG: "sgd", AE: "aed",
};

// Localized country names the map picker's reverse-geocoding can return in the
// local language (e.g. "España" for Spain). Mapped so a partner who picks their
// address on the map — and doesn't retype the country in English — can still
// connect Stripe. Keyed lowercased.
const COUNTRY_ALIASES: Record<string, string> = {
  "españa": "ES", "espagne": "ES", "spanien": "ES", "spagna": "ES",
  "deutschland": "DE", "allemagne": "DE", "alemania": "DE", "germania": "DE",
  "italia": "IT", "italie": "IT", "italien": "IT",
  "francia": "FR", "frankreich": "FR", "frança": "FR",
  "reino unido": "GB", "royaume-uni": "GB", "regno unito": "GB", "vereinigtes königreich": "GB",
  "irlanda": "IE", "irlande": "IE", "irland": "IE",
  "países bajos": "NL", "pays-bas": "NL", "niederlande": "NL", "paesi bassi": "NL",
  "nueva zelanda": "NZ", "nouvelle-zélande": "NZ", "neuseeland": "NZ",
  "canadá": "CA", "kanada": "CA",
  "estados unidos": "US", "états-unis": "US", "vereinigte staaten": "US",
};

function stripeCountry(baseCountry: string | null): string {
  const key = (baseCountry || "").trim();
  // Canonicalise first (handles local-language names + ISO codes for every
  // supported country), then map to the Stripe 2-letter code. COUNTRY_ALIASES
  // stays as a belt-and-braces fallback for any stored legacy value.
  const code = COUNTRY_MAP[canonicalCountryName(key)] || COUNTRY_MAP[key] || COUNTRY_ALIASES[key.toLowerCase()];
  if (!code) {
    // Fail LOUDLY instead of silently defaulting to ES. A connected account's
    // country is locked at creation and can never be changed, so a wrong default
    // permanently traps the partner (they can't add a local bank). Better to
    // block onboarding until the country is added to the maps above.
    throw new Error(
      `Unsupported partner country for Stripe onboarding: "${key || "(empty)"}". ` +
      `Add it to COUNTRY_MAP/COUNTRY_CURRENCY before this partner can connect.`
    );
  }
  return code;
}

export async function POST() {
  try {
    const supabase = await createRouteHandlerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { data: profile } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id, stripe_recipient_id, company_name, legal_company_name, vat_number, base_country, default_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

    const origin = process.env.PORTAL_BASE_URL || "https://portal.camel-global.com";
    const countryCode = stripeCountry(profile.base_country);

    // ── AU/NZ: OUT of corridor → Global Payouts recipient (separate rail) ──────
    // Express Connect accounts cannot receive cross-border transfers to AU/NZ, so
    // these partners get a v2 recipient object + Stripe-hosted onboarding instead.
    // The in-corridor Express path below is byte-unchanged.
    if (isGlobalPayoutsCountry(countryCode)) {
      let recipientId = profile.stripe_recipient_id;
      if (!recipientId) {
        const recipient = await createGlobalPayoutRecipient({
          email:       user.email ?? null,
          displayName: profile.legal_company_name || profile.company_name || user.email || "Camel Global partner",
          country:     countryCode,
          userId:      user.id,
        });
        recipientId = recipient.id;
        const settlementCcy = COUNTRY_CURRENCY[countryCode] ?? "aud";
        await supabase
          .from("partner_profiles")
          .update({
            stripe_recipient_id: recipientId,
            payout_rail:         "global_payouts",
            default_currency:    settlementCcy.toUpperCase(),
          })
          .eq("user_id", user.id);
      }
      const link = await createRecipientOnboardingLink({
        accountId:  recipientId,
        returnUrl:  `${origin}/partner/onboarding?stripe=complete`,
        refreshUrl: `${origin}/partner/onboarding?stripe=refresh`,
      });
      return NextResponse.json({ url: link.url });
    }

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const settlementCcy    = COUNTRY_CURRENCY[countryCode] ?? "eur";
      const account = await stripe.accounts.create({
        type: "express",
        country:          countryCode,
        email:            user.email,
        default_currency: settlementCcy,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" },
          },
        },
        metadata: {
          user_id:            user.id,
          legal_company_name: profile.legal_company_name || "",
          vat_number:         profile.vat_number || "",
        },
      });
      accountId = account.id;

      // Stripe account currency is the single source of truth: mirror it into
      // default_currency (uppercased, as stored elsewhere) so bids/reporting can
      // never drift from what Stripe actually settles in.
      await supabase
        .from("partner_profiles")
        .update({
          stripe_account_id: accountId,
          default_currency:  settlementCcy.toUpperCase(),
        })
        .eq("user_id", user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${origin}/partner/onboarding?stripe=refresh`,
      return_url:  `${origin}/partner/onboarding?stripe=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (e: any) {
    console.error("Stripe connect error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
