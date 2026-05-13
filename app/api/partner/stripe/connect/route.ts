import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function POST() {
  try {
    const supabase = await createRouteHandlerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    // Get existing profile
    const { data: profile } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id, legal_company_name, vat_number, base_country, default_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

    let accountId = profile.stripe_account_id;

    // Create Stripe Express account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: profile.base_country === "United Kingdom" ? "GB" : "ES",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" }, // Camel controls payouts
          },
        },
        metadata: {
          user_id: user.id,
          legal_company_name: profile.legal_company_name || "",
          vat_number: profile.vat_number || "",
        },
      });
      accountId = account.id;

      // Save account ID
      await supabase
        .from("partner_profiles")
        .update({ stripe_account_id: accountId })
        .eq("user_id", user.id);
    }

    // Generate onboarding link
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://portal.camel-global.com";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
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