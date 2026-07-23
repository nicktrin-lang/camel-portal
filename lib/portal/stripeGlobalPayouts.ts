// ─────────────────────────────────────────────────────────────────────────────
// Stripe Global Payouts (AU/NZ, out-of-corridor) — isolated raw v2 REST client.
//
// The pinned npm `stripe` SDK (22.1.1) predates the Global Payouts v2 preview
// endpoints (recipient accounts + OutboundPayment), so this module calls the
// /v2 REST API directly over HTTPS. It is the ONLY place that talks to /v2 —
// the existing SDK-based in-corridor charge/refund/transfer path is untouched,
// so there is zero regression risk to the working corridor.
//
// Docs (verified 2026-07):
//   POST /v2/core/accounts        — create recipient (configuration.recipient,
//                                    capabilities.bank_accounts.local)
//   POST /v2/core/account_links   — Stripe-hosted onboarding link
//   completion webhook            — v2.core.account_link.returned
// ─────────────────────────────────────────────────────────────────────────────

const STRIPE_API = "https://api.stripe.com";
// Global Payouts is a limited preview — pin the preview API version explicitly
// (independent of the SDK's apiVersion used by the corridor code).
export const STRIPE_V2_VERSION = "2026-06-24.preview";

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("Missing STRIPE_SECRET_KEY");
  return k;
}

async function stripeV2Post<T = any>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`Stripe v2 ${path} failed: ${msg}`);
  }
  return json as T;
}

/** AU/NZ are the out-of-corridor countries that require Global Payouts. */
export function isGlobalPayoutsCountry(iso2: string | null | undefined): boolean {
  const c = String(iso2 || "").toUpperCase();
  return c === "AU" || c === "NZ";
}

export type RecipientAccount = {
  id: string;
  object?: string;
  configuration?: any;
  requirements?: any;
};

/**
 * Create a Global Payouts recipient account (v2). Minimal identity is enough to
 * create it; the remaining KYC + bank details are collected via the hosted
 * onboarding link (createRecipientOnboardingLink). Idempotent per partner so a
 * retry never creates a duplicate recipient.
 */
export async function createGlobalPayoutRecipient(opts: {
  email: string | null;
  displayName: string;
  country: string;                       // ISO2, e.g. "AU" | "NZ"
  entityType?: "company" | "individual"; // partners are car-hire companies
  userId: string;
}): Promise<RecipientAccount> {
  return stripeV2Post<RecipientAccount>(
    "/v2/core/accounts",
    {
      contact_email: opts.email || undefined,
      display_name:  opts.displayName,
      identity: {
        country:     opts.country.toLowerCase(),
        entity_type: opts.entityType || "company",
      },
      configuration: {
        recipient: {
          capabilities: { bank_accounts: { local: { requested: true } } },
        },
      },
      metadata: { user_id: opts.userId },
      include: ["identity", "configuration.recipient", "requirements"],
    },
    `gp_recipient_${opts.userId}`,
  );
}

/**
 * Create a single-use Stripe-hosted onboarding link (expires ~10 min) for a
 * recipient to submit KYC + local bank details. Completion fires the
 * `v2.core.account_link.returned` webhook.
 */
export async function createRecipientOnboardingLink(opts: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string }> {
  const json = await stripeV2Post<{ url: string }>("/v2/core/account_links", {
    account: opts.accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        return_url:  opts.returnUrl,
        refresh_url: opts.refreshUrl,
      },
    },
  });
  return { url: json.url };
}

/** True once the recipient's local-bank capability is active (can receive payouts). */
export function recipientCanReceivePayouts(account: RecipientAccount): boolean {
  return account?.configuration?.recipient?.capabilities?.bank_accounts?.local?.status === "active";
}
