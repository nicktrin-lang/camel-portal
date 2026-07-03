import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

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

function stripeCountry(baseCountry: string | null): string {
  const key = (baseCountry || "").trim();
  const code = COUNTRY_MAP[key];
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
      .select("stripe_account_id, legal_company_name, vat_number, base_country, default_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const countryCode      = stripeCountry(profile.base_country);
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

    const origin = process.env.PORTAL_BASE_URL || "https://portal.camel-global.com";
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
