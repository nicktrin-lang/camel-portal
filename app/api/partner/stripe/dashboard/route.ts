import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.basil" });

export async function POST() {
  try {
    const supabase = await createRouteHandlerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { data: profile } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 });
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id);
    return NextResponse.json({ url: loginLink.url });
  } catch (e: any) {
    console.error("Stripe dashboard link error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}