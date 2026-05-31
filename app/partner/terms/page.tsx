"use client";

import Link from "next/link";
import { TERMS_VERSION, TERMS_EFFECTIVE, PARTNER_TERMS, downloadPartnerTermsPDF } from "@/lib/portal/partnerTerms";

export default function PartnerTermsPage() {
  return (
    <>
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Partner Terms and Conditions</h1>
          <p className="mt-3 text-base font-bold text-white/70">
            These Terms govern your use of the Camel Global platform as a partner. Please read them carefully.
            By registering as a partner and ticking the acceptance checkbox during signup, you agree to be bound
            by these Terms and the Partner Operating Rules, which are incorporated by reference.
          </p>
          <p className="mt-2 text-xs font-bold text-white/40">Version {TERMS_VERSION} — Effective {TERMS_EFFECTIVE}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-6">
          <div className="flex justify-end mb-6">
            <button type="button" onClick={() => downloadPartnerTermsPDF()}
              className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 transition-opacity">
              ⬇ Download PDF
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🏪", title: "Camel is a marketplace", body: "We are an intermediary. The hire contract is always between you and the customer." },
              { icon: "💰", title: "Commission from 20%", body: "Standard rate is 20% on the hire price only. Fuel charges pass through to you at 100%. Minimum €10 per booking. Reduced rates available by agreement." },
              { icon: "❌", title: "Cancellation policy", body: "Partner cancellations = full refund to customer. Customer cancels >48hrs = full refund, no payout. Customer cancels <48hrs = you keep hire fee minus commission. Fuel always refunded." },
              { icon: "✅", title: "No Stripe fees for you", body: "Camel Global absorbs all Stripe processing fees. Your payout is always the full hire price minus commission, plus fuel charge. No hidden deductions." },
              { icon: "💱", title: "Your billing currency", body: "Your payout currency is set when you connect Stripe and cannot be changed. Customers always pay in your bid currency — no currency conversion applies to your payout." },
              { icon: "📊", title: "Full fee transparency", body: "Every booking shows the Stripe fee (borne by Camel) and your exact net payout in your reports and CSV exports so your accounts always reconcile." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-[#f0f0f0] p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-xs font-black uppercase tracking-widest text-black mb-1">{title}</p>
                <p className="text-xs font-bold text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-green-200 bg-green-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-green-800 mb-2">Fee Summary — What you receive per booking</p>
          <div className="space-y-2 text-sm font-bold text-green-900">
            <div className="flex justify-between border-b border-green-200 pb-2">
              <span>Hire price (as bid)</span><span>e.g. €100.00</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Camel commission (20%, min €10)</span><span>− €20.00</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Stripe processing fee</span><span>absorbed by Camel ✓</span>
            </div>
            <div className="flex justify-between border-t border-green-300 pt-2 font-black text-green-900">
              <span>Your net payout (excl. fuel)</span><span>€80.00</span>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-green-700">
            Fuel charges pass through 100% — no fees or commission apply to fuel. Camel Global absorbs all Stripe processing fees so your payout is always predictable. The exact Stripe fee for every booking is visible in your portal reports for transparency.
          </p>
        </div>

        {PARTNER_TERMS.map(({ title, clauses }) => (
          <div key={title} className={`bg-white p-6 ${title === "7b. Stripe Processing Fees and Currency" ? "border-l-4 border-green-400" : ""}`}>
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">{title}</h2>
            <ol className="space-y-3">
              {clauses.map((clause, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-black/70 leading-relaxed">
                  <span className="shrink-0 font-black text-black w-5">{i + 1}.</span>
                  <span>{clause}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <div className="bg-[#f0f0f0] p-6">
          <p className="text-xs font-black uppercase tracking-widest text-black mb-2">Partner Operating Rules</p>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            The Partner Operating Rules are incorporated into this Agreement and have the same legal force as these Terms.
            They set out the day-to-day operational standards covering bidding, vehicle standards, fuel policy, driver conduct,
            customer service, cancellations, and more. You can read and download the Operating Rules from your{" "}
            <Link href="/partner/account" className="font-black text-black underline hover:opacity-70">partner account page</Link>.
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          Camel Global Partner Terms and Conditions — Version {TERMS_VERSION} — Effective {TERMS_EFFECTIVE} — Subject to change with 14 days&apos; notice.
        </p>
      </div>
    </>
  );
}