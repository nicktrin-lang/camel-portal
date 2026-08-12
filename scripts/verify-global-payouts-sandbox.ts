/**
 * Sandbox verification for the AU/NZ Global Payouts v2 flow.
 *
 * Confirms lib/portal/stripeGlobalPayouts.ts (written from docs, unverified)
 * matches Stripe's real v2 API, by running the recipient → onboarding-link →
 * financial-account → quote calls against the SANDBOX account
 * (acct_1TwWcWG5yRPYnAl6). It STOPS at the quote — it never creates an
 * OutboundPayment, so no money moves.
 *
 * Setup (you, once): put the sandbox secret key in .env.local as
 *   STRIPE_SANDBOX_SECRET_KEY=sk_test_...        (from Stripe → sandbox → API keys)
 *
 * Run:  cd ~/camel-portal && npx tsx scripts/verify-global-payouts-sandbox.ts
 *
 * SAFETY: refuses to run against a live key; sandbox only.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Minimal .env.local loader (so the sandbox key never has to be pasted inline).
(function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const sandboxKey = process.env.STRIPE_SANDBOX_SECRET_KEY;
if (!sandboxKey) {
  console.error("✗ Set STRIPE_SANDBOX_SECRET_KEY (the sandbox secret key) in .env.local and re-run.");
  process.exit(1);
}
if (sandboxKey.startsWith("sk_live_")) {
  console.error("✗ STRIPE_SANDBOX_SECRET_KEY looks LIVE. Refusing — sandbox key only.");
  process.exit(1);
}
// The module reads STRIPE_SECRET_KEY internally — point it at the sandbox key for this run only.
process.env.STRIPE_SECRET_KEY = sandboxKey;

async function main() {
  const gp = await import("../lib/portal/stripeGlobalPayouts");
  const out: Array<{ step: string; ok: boolean }> = [];
  const rec = (step: string, ok: boolean, detail: string) => {
    out.push({ step, ok });
    console.log(`${ok ? "✓" : "✗"} ${step} — ${detail}`);
  };

  // A. pure country gate
  rec(
    "isGlobalPayoutsCountry",
    gp.isGlobalPayoutsCountry("AU") && gp.isGlobalPayoutsCountry("NZ") && !gp.isGlobalPayoutsCountry("ES"),
    `AU=${gp.isGlobalPayoutsCountry("AU")} NZ=${gp.isGlobalPayoutsCountry("NZ")} ES=${gp.isGlobalPayoutsCountry("ES")}`,
  );

  // B. create recipient (AU)
  let recipientId = "";
  try {
    const r = await gp.createGlobalPayoutRecipient({
      email: "sandbox-partner@example.com",
      displayName: "Sandbox Test Car Hire Pty",
      country: "AU",
      entityType: "company",
      userId: `sandbox-verify-${Date.now()}`,
    });
    recipientId = r.id;
    rec("createGlobalPayoutRecipient", !!r.id, `recipient=${r.id}`);
  } catch (e) {
    rec("createGlobalPayoutRecipient", false, (e as Error)?.message ?? String(e));
  }

  // C. hosted onboarding link
  if (recipientId) {
    try {
      const link = await gp.createRecipientOnboardingLink({
        accountId: recipientId,
        returnUrl: "https://portal.camel-global.com/partner/stripe/return",
        refreshUrl: "https://portal.camel-global.com/partner/stripe/refresh",
      });
      rec("createRecipientOnboardingLink", !!link.url, link.url ? `url ok (${link.url.slice(0, 44)}…)` : "no url");
    } catch (e) {
      rec("createRecipientOnboardingLink", false, (e as Error)?.message ?? String(e));
    }
  }

  // D. platform financial account (AUD balance)
  let faId = "";
  try {
    const fa = await gp.getPlatformFinancialAccount("aud");
    faId = fa.id;
    rec("getPlatformFinancialAccount(aud)", !!fa.id, `fa=${fa.id} availableAUD=${fa.availableMajor}`);
  } catch (e) {
    rec("getPlatformFinancialAccount(aud)", false, (e as Error)?.message ?? String(e));
  }

  // E. recipient payout method (null until onboarding completes — expected)
  let payoutMethodId: string | null = null;
  if (recipientId) {
    try {
      payoutMethodId = await gp.getRecipientPayoutMethod(recipientId);
      rec("getRecipientPayoutMethod", true, payoutMethodId ? `method=${payoutMethodId}` : "null (not onboarded yet — expected)");
    } catch (e) {
      rec("getRecipientPayoutMethod", false, (e as Error)?.message ?? String(e));
    }
  }

  // F. OutboundPaymentQuote (locks FX; moves NO money). Needs FA + onboarded
  //    recipient, so it may error — the error shape still validates the request.
  if (faId && recipientId) {
    try {
      const q = await gp.createOutboundPaymentQuote({
        financialAccountId: faId,
        recipientId,
        payoutMethodId,
        amountValue: 1000, // A$10.00
        currency: "aud",
      });
      rec("createOutboundPaymentQuote", !!q.id, `quote=${q.id} feesAUD=${gp.sumQuoteFees(q.fees, "aud")}`);
    } catch (e) {
      rec("createOutboundPaymentQuote", false, `(expected until onboarding+funds) ${(e as Error)?.message ?? String(e)}`);
    }
  }

  console.log("\n─── SUMMARY ───");
  for (const r of out) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.step}`);
  console.log(
    "\nNote: the actual OutboundPayment is intentionally NOT called (it moves money). It needs the\n" +
      "recipient to finish hosted onboarding (a human step) + funds in the sandbox financial account.\n" +
      "This harness verifies the v2 call SHAPES — the 'written from docs' risk — against the real sandbox.",
  );
}

main().catch((e) => {
  console.error("harness error:", e);
  process.exit(1);
});
