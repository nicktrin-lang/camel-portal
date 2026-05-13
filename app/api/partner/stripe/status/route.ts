import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function GET() {
  try {
    const supabase = await createRouteHandlerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { data: profile } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ connected: false, onboarding_complete: false, payouts_enabled: false });
    }

    // Fetch live status from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const onboardingComplete = account.details_submitted && !account.requirements?.currently_due?.length;
    const payoutsEnabled = account.payouts_enabled ?? false;

    // Sync to DB if changed
    if (onboardingComplete !== profile.stripe_onboarding_complete || payoutsEnabled !== profile.stripe_payouts_enabled) {
      await supabase
        .from("partner_profiles")
        .update({
          stripe_onboarding_complete: onboardingComplete,
          stripe_payouts_enabled: payoutsEnabled,
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: onboardingComplete,
      payouts_enabled: payoutsEnabled,
      requirements: account.requirements?.currently_due || [],
    });
  } catch (e: any) {
    console.error("Stripe status error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}