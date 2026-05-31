import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

function stripeCountry(baseCountry: string | null): string {
  if (baseCountry === "United Kingdom") return "GB";
  return "ES";
}

function stripeCurrency(defaultCurrency: string | null): string {
  const c = String(defaultCurrency || "").toUpperCase().trim();
  if (c === "GBP" || c === "USD") return c.toLowerCase();
  return "eur";
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
      const account = await stripe.accounts.create({
        type: "express",
        country:          stripeCountry(profile.base_country),
        email:            user.email,
        default_currency: stripeCurrency(profile.default_currency),
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

      await supabase
        .from("partner_profiles")
        .update({ stripe_account_id: accountId })
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