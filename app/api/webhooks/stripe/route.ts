import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// Use service role for webhook — no auth context available
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete = account.details_submitted && !account.requirements?.currently_due?.length;
        const payoutsEnabled = account.payouts_enabled ?? false;

        await supabase
          .from("partner_profiles")
          .update({
            stripe_onboarding_complete: onboardingComplete,
            stripe_payouts_enabled: payoutsEnabled,
          })
          .eq("stripe_account_id", account.id);

        console.log(`account.updated: ${account.id} — complete: ${onboardingComplete}, payouts: ${payoutsEnabled}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Stripe requires raw body — disable Next.js body parsing
export const config = { api: { bodyParser: false } };