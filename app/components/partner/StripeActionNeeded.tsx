"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requirementKeys } from "@/lib/portal/stripeRequirements";

// Shown to a partner whose Stripe account exists but Stripe is still waiting on
// something (e.g. a company document it rejected). Lists what Stripe needs in the
// partner's language and sends them straight back into Stripe to provide it.
// Used on Settings → Payouts, the dashboard banner and the onboarding payouts step.

export type PartnerStripeStatus = { connected?: boolean; onboarding_complete?: boolean; payouts_enabled?: boolean; requirements?: unknown[] };

export function stripeNeedsAction(status: PartnerStripeStatus | null | undefined): status is PartnerStripeStatus & { requirements: unknown[] } {
  return !!status?.connected && !status.onboarding_complete && (status.requirements?.length ?? 0) > 0;
}

export default function StripeActionNeeded({ requirements }: { requirements: unknown[] }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const items = requirementKeys(requirements);

  async function continueInStripe() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/partner/stripe/connect", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || t("common.error"));
      window.location.href = json.url;
    } catch (e) { setError(e instanceof Error ? e.message : t("common.error")); setLoading(false); }
  }

  return (
    <div className="border border-amber-300 bg-amber-50 p-5 space-y-3">
      <div>
        <p className="font-black text-amber-900">{t("stripe.action.title")}</p>
        <p className="mt-1 text-sm font-bold text-amber-800">{t("stripe.action.body")}</p>
      </div>
      <ul className="list-disc pl-5 text-sm font-bold text-amber-900 space-y-0.5">
        {items.map(k => <li key={k}>{t(`stripe.req.${k}`)}</li>)}
      </ul>
      <p className="text-xs font-bold text-amber-800/80">{t("stripe.action.hint")}</p>
      {error && <p className="text-sm font-bold text-red-700">{error}</p>}
      <button type="button" onClick={continueInStripe} disabled={loading}
        className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
        {loading ? t("stripe.action.redirecting") : t("stripe.action.cta")}
      </button>
    </div>
  );
}
