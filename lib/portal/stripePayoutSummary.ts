import Stripe from "stripe";
import { getRecipientReadiness } from "@/lib/portal/stripeGlobalPayouts";

// Read-only summary of where a partner is with payout setup, for the admin account page.
// Asks Stripe live (the stored flags only change when the partner revisits Settings or a
// webhook lands), and lists what Stripe is still waiting for, so admin can help a partner
// who is stuck. Never throws: a Stripe failure comes back as `error` with the stored flags.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export type PayoutState = "not_started" | "incomplete" | "under_review" | "ready" | "restricted";

export type StripePayoutSummary = {
  rail: "connect" | "global_payouts";
  accountId: string | null;
  state: PayoutState;
  detailsSubmitted: boolean;
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean;
  bankAccount: string | null;          // e.g. "ES•••• 1234 (EUR)"
  currentlyDue: string[];              // what Stripe needs from the partner now
  pastDue: string[];
  pendingVerification: string[];      // submitted, Stripe is checking
  disabledReason: string | null;
  storedPayoutsEnabled: boolean;      // what our DB says (the payout cron's gate)
  error: string | null;
};

type Profile = {
  stripe_account_id?: string | null;
  stripe_payouts_enabled?: boolean | null;
  stripe_recipient_id?: string | null;
  recipient_payouts_enabled?: boolean | null;
  payout_rail?: string | null;
};

export async function getStripePayoutSummary(profile: Profile | null): Promise<StripePayoutSummary> {
  const rail = profile?.payout_rail === "global_payouts" ? "global_payouts" : "connect";
  const accountId = (rail === "global_payouts" ? profile?.stripe_recipient_id : profile?.stripe_account_id) || null;
  const stored = !!(rail === "global_payouts" ? profile?.recipient_payouts_enabled : profile?.stripe_payouts_enabled);
  const base: StripePayoutSummary = {
    rail, accountId, state: "not_started", detailsSubmitted: false, chargesEnabled: null,
    payoutsEnabled: false, bankAccount: null, currentlyDue: [], pastDue: [], pendingVerification: [],
    disabledReason: null, storedPayoutsEnabled: stored, error: null,
  };
  if (!accountId) return base;

  try {
    if (rail === "global_payouts") {
      const r = await getRecipientReadiness(accountId);
      return {
        ...base,
        payoutsEnabled: r.payoutsEnabled,
        detailsSubmitted: r.capabilityActive,
        bankAccount: r.hasPayoutMethod ? "Payout method added" : null,
        currentlyDue: (r.outstanding ?? []).map((x: any) => typeof x === "string" ? x : JSON.stringify(x)),
        state: r.payoutsEnabled ? "ready" : "incomplete",
      };
    }

    const a = await stripe.accounts.retrieve(accountId);
    const bank = a.external_accounts?.data?.[0] as Stripe.BankAccount | Stripe.Card | undefined;
    const bankAccount = bank && bank.object === "bank_account"
      ? `${bank.bank_name ? `${bank.bank_name} ` : ""}••••${bank.last4} (${String(bank.currency).toUpperCase()})`
      : bank ? `Card ••••${bank.last4}` : null;
    const req = a.requirements;
    const currentlyDue = req?.currently_due ?? [];
    const pastDue = req?.past_due ?? [];
    const pendingVerification = req?.pending_verification ?? [];
    const disabledReason = req?.disabled_reason ?? null;

    let state: PayoutState;
    if (a.payouts_enabled && currentlyDue.length === 0) state = "ready";
    else if (!a.details_submitted || currentlyDue.length || pastDue.length) state = a.details_submitted && disabledReason ? "restricted" : "incomplete";
    else if (pendingVerification.length) state = "under_review";
    else state = a.payouts_enabled ? "ready" : "under_review";

    return {
      ...base, state,
      detailsSubmitted: !!a.details_submitted,
      chargesEnabled: !!a.charges_enabled,
      payoutsEnabled: !!a.payouts_enabled,
      bankAccount, currentlyDue, pastDue, pendingVerification, disabledReason,
    };
  } catch (e: any) {
    return { ...base, state: stored ? "ready" : "incomplete", payoutsEnabled: stored, error: e?.message || "Couldn't reach Stripe" };
  }
}
