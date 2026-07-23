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

// ─────────────────────────────────────────────────────────────────────────────
// OutboundPayment pipeline (Phase 3/4). Flow per Stripe docs:
//   1. GET  /v2/money_management/financial_accounts        → platform FA (fa_)
//   2. GET  /v2/money_management/payout_methods            → recipient local bank
//        (Stripe-Context header = recipient account id)
//   3. POST /v2/money_management/outbound_payment_quotes   → locks FX, returns fees
//   4. POST /v2/money_management/outbound_payments         → the actual payout (obp_)
// Same-currency payout (hold AUD, pay AUD) avoids the 2% FX leg.
// ─────────────────────────────────────────────────────────────────────────────

async function stripeV2Get<T = any>(path: string, contextId?: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      ...(contextId ? { "Stripe-Context": contextId } : {}),
    },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`Stripe v2 GET ${path} failed: ${msg}`);
  }
  return json as T;
}

/**
 * The platform's own financial account id (funds outbound payments). Returns the
 * account id plus its available balance in `currency` (smallest unit → major).
 * Camel has a single platform financial account holding a multi-currency balance.
 */
export async function getPlatformFinancialAccount(currency: string): Promise<{ id: string; availableMajor: number }> {
  const ccy = currency.toLowerCase();
  const json = await stripeV2Get<{ data: Array<{ id: string; balance?: { available?: Record<string, { value: number }> } }> }>(
    "/v2/money_management/financial_accounts",
  );
  const fa = json?.data?.[0];
  if (!fa?.id) throw new Error("No platform financial account found for Global Payouts");
  const cents = fa.balance?.available?.[ccy]?.value ?? 0;
  return { id: fa.id, availableMajor: cents / 100 };
}

/** The recipient's default local-bank payout method id (…ba_), or null if none yet. */
export async function getRecipientPayoutMethod(recipientId: string): Promise<string | null> {
  const json = await stripeV2Get<{ data: Array<{ id: string }> }>(
    "/v2/money_management/payout_methods",
    recipientId,
  );
  return json?.data?.[0]?.id ?? null;
}

export type QuoteFee = { type?: string; amount?: { value: number; currency: string } };

/** Create an OutboundPaymentQuote (locks FX, returns the fee breakdown). */
export async function createOutboundPaymentQuote(opts: {
  financialAccountId: string;
  recipientId: string;
  payoutMethodId: string | null;
  amountValue: number;   // smallest currency unit
  currency: string;      // same currency both sides (no-FX intent)
}): Promise<{ id: string; fees: QuoteFee[]; raw: any }> {
  const ccy = opts.currency.toLowerCase();
  const to: any = { recipient: opts.recipientId, currency: ccy };
  if (opts.payoutMethodId) to.payout_method = opts.payoutMethodId;
  const json = await stripeV2Post<any>("/v2/money_management/outbound_payment_quotes", {
    from:   { financial_account: opts.financialAccountId, currency: ccy },
    to,
    amount: { value: opts.amountValue, currency: ccy },
    delivery_options: { bank_account: "local" },
  });
  const fees: QuoteFee[] = json?.estimated_fees || json?.fees || [];
  return { id: json?.id, fees, raw: json };
}

/** Sum a quote's fees expressed in `currency` into a major-unit number. */
export function sumQuoteFees(fees: QuoteFee[], currency: string): number {
  const ccy = currency.toLowerCase();
  let cents = 0;
  for (const f of fees || []) {
    if ((f?.amount?.currency || "").toLowerCase() === ccy) cents += Number(f?.amount?.value || 0);
  }
  return cents / 100;
}

export type OutboundPaymentResult = { id: string; status: string; raw: any };

/** Create the OutboundPayment (the actual money movement). Idempotent per key. */
export async function createOutboundPayment(opts: {
  financialAccountId: string;
  recipientId: string;
  payoutMethodId: string | null;
  amountValue: number;
  currency: string;
  quoteId?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<OutboundPaymentResult> {
  const ccy = opts.currency.toLowerCase();
  const to: any = { recipient: opts.recipientId, currency: ccy };
  if (opts.payoutMethodId) to.payout_method = opts.payoutMethodId;
  const body: any = {
    from:   { financial_account: opts.financialAccountId, currency: ccy },
    to,
    amount: { value: opts.amountValue, currency: ccy },
    delivery_options: { bank_account: "local" },
  };
  if (opts.quoteId)     body.outbound_payment_quote = opts.quoteId;
  if (opts.description) body.description = opts.description;
  if (opts.metadata)    body.metadata = opts.metadata;
  const json = await stripeV2Post<any>("/v2/money_management/outbound_payments", body, opts.idempotencyKey);
  return { id: json?.id, status: json?.status, raw: json };
}
