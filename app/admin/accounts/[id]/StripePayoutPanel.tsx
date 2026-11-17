import type { StripePayoutSummary } from "@/lib/portal/stripePayoutSummary";
import { requirementKey, type StripeRequirementKey } from "@/lib/portal/stripeRequirements";

// "Payouts (Stripe)" on /admin/accounts/[id]: whether the partner can be paid at month
// end, and if not, what Stripe is still waiting for from them.

const STATE: Record<StripePayoutSummary["state"], { label: string; cls: string; body: string }> = {
  not_started:  { label: "Not started",    cls: "bg-[#f0f0f0] text-black/60",  body: "The partner hasn't started Stripe setup (Settings → Payouts)." },
  incomplete:   { label: "Incomplete",     cls: "bg-amber-100 text-amber-800", body: "Started but not finished. They go back via Settings → Payouts → Set up payouts with Stripe." },
  under_review: { label: "Under review",   cls: "bg-blue-100 text-blue-800",   body: "Everything is submitted; Stripe is verifying it. Nothing for the partner to do." },
  ready:        { label: "Ready",          cls: "bg-green-100 text-green-800", body: "Stripe will accept payouts. Completed bookings are paid in the monthly run." },
  restricted:   { label: "Restricted",     cls: "bg-red-100 text-red-700",     body: "Stripe has paused this account until the items below are fixed." },
};

// Stripe requirement codes → plain English, via the shared key list the partner pages
// also use. Unknown codes show as-is (admin wants the raw code).
const REQUIREMENT: Record<StripeRequirementKey, string> = {
  bank: "Bank account (IBAN)",
  tos: "Accept Stripe's terms",
  businessType: "Business type (company or individual)",
  website: "Business website or description",
  mcc: "Business category",
  supportPhone: "Support phone",
  taxId: "Company tax ID (CIF)",
  companyName: "Company name / legal structure",
  companyAddress: "Company address",
  companyPhone: "Company phone",
  owners: "Confirm owners / directors",
  companyDocument: "Company registration document",
  repId: "Representative's ID document",
  repDetails: "Representative's personal details",
  ownerId: "An owner's or director's ID document",
  ownerDetails: "Owner / director details",
  idDocument: "ID document",
  personal: "Personal details",
  other: "",
};
function describe(code: string) {
  return REQUIREMENT[requirementKey(code)] || code;
}
const unique = (codes: string[]) => [...new Set(codes.map(describe))];

export default function StripePayoutPanel({ summary }: { summary: StripePayoutSummary | null }) {
  if (!summary) return <p className="text-sm font-semibold text-black/50">No partner profile yet.</p>;
  const s = STATE[summary.state];
  const due = unique([...summary.pastDue, ...summary.currentlyDue]);
  const checking = unique(summary.pendingVerification);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="font-bold text-black/60">{label}</span>
      <span className="text-right font-semibold text-black">{value}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${s.cls}`}>{s.label}</span>
        {summary.accountId && (
          <a href={`https://dashboard.stripe.com/connect/accounts/${summary.accountId}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-black text-[#ff7a00] hover:underline">Open in Stripe ↗</a>
        )}
      </div>
      <p className="text-xs font-semibold text-black/60">{s.body}</p>

      {summary.accountId && (
        <div className="space-y-2 border-t border-black/5 pt-3">
          {row("Rail", summary.rail === "global_payouts" ? "AU/NZ Global Payouts" : "Stripe Connect")}
          {row("Details submitted", summary.detailsSubmitted ? "Yes" : "No")}
          {row("Payouts enabled", summary.payoutsEnabled ? "Yes" : "No")}
          {row("Bank account", summary.bankAccount ?? "None added")}
          {row("Account", <code className="text-xs">{summary.accountId}</code>)}
        </div>
      )}

      {due.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-wider text-amber-800">Stripe still needs</p>
          <ul className="mt-1 list-disc pl-4 text-xs font-semibold text-amber-900">{due.map(d => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
      {checking.length > 0 && (
        <div className="border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-wider text-blue-800">Stripe is verifying</p>
          <ul className="mt-1 list-disc pl-4 text-xs font-semibold text-blue-900">{checking.map(d => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
      {summary.payoutsEnabled !== summary.storedPayoutsEnabled && !summary.error && (
        <p className="text-xs font-semibold text-black/50">
          Our records still say payouts are {summary.storedPayoutsEnabled ? "on" : "off"}; they update the next time the partner opens Settings.
        </p>
      )}
      {summary.error && (
        <p className="text-xs font-semibold text-red-700">Couldn&apos;t reach Stripe ({summary.error}). Showing our stored status.</p>
      )}
    </div>
  );
}
