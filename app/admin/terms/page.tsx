"use client";

import { OPERATING_RULES } from "@/lib/portal/operatingRules";

// Re-exports the same partner terms content inside the admin layout.
// Imported inline to avoid a separate server component.

const EFFECTIVE_DATE = "1 April 2026";
const TERMS_VERSION = "2026-04";
const CONTACT_EMAIL = "contact@camel-global.com";

const PARTNER_TERMS = [
  {
    section: "1. Introduction",
    content: `These terms and conditions ("Partner Terms") govern your participation as a car hire partner ("Partner") on the Camel Global platform, operated by Camel Global Ltd ("Camel", "we", "us"). By completing the partner signup process and accepting these terms, you agree to be bound by them in full.`,
  },
  {
    section: "2. Platform Role",
    content: `Camel Global acts as an intermediary marketplace platform. The rental contract for each booking is formed directly between the Partner and the customer. Camel Global is not a party to that contract and is not responsible for the fulfilment of the hire. Partners issue VAT invoices to customers. Camel Global invoices Partners for commission on a reverse-charge basis.`,
  },
  {
    section: "3. Commission & Payments",
    content: `Camel Global charges a commission of 20% of the car hire price per completed booking, subject to a minimum of €10 (or currency equivalent) per booking. Fuel charges are passed through to the Partner in full with no commission applied. Commission is deducted automatically via Stripe Connect at the point of payment. The Partner receives the net amount (hire price minus commission, plus fuel charge) directly to their Stripe account.`,
  },
  {
    section: "4. Partner Obligations",
    content: `Partners must maintain all legally required licences, permits, and insurance to operate a car hire business in their jurisdiction. Partners must comply with the Partner Operating Rules at all times. Partners are fully responsible for the conduct of all drivers registered under their account. Partners must ensure all vehicle and driver information on the platform is accurate and up to date.`,
  },
  {
    section: "5. Data & Privacy",
    content: `Customer personal data shared via the platform may only be used for the purpose of fulfilling the relevant booking. Partners must not use customer data for marketing or any other purpose. Partners must comply with GDPR and applicable local data protection laws.`,
  },
  {
    section: "6. Termination",
    content: `Either party may terminate this agreement with 30 days written notice, provided no active bookings remain outstanding. Camel Global may suspend or terminate a Partner account immediately for serious breach of these terms or the Operating Rules. On termination, all customer data held by the Partner must be deleted within 30 days.`,
  },
  {
    section: "7. Liability",
    content: `Partners indemnify Camel Global against any claims arising from the Partner's vehicles, drivers, or operations. Camel Global's liability to Partners is limited to the commission amounts received in the 3 months prior to any claim. Nothing in these terms limits liability for fraud or death/personal injury caused by negligence.`,
  },
  {
    section: "8. Governing Law",
    content: `These terms are governed by the laws of England and Wales. Any disputes are subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
];

export default function AdminPartnerTermsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a00]">Legal</p>
        <h1 className="text-2xl font-bold text-[#003768]">Partner Terms &amp; Conditions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Version {TERMS_VERSION} · Effective {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="space-y-4">
        {PARTNER_TERMS.map(({ section, content }) => (
          <div key={section} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="mb-3 text-base font-bold text-[#003768]">{section}</h2>
            <p className="text-sm leading-relaxed text-slate-700">{content}</p>
          </div>
        ))}
      </div>

      <p className="pb-4 text-center text-xs text-slate-400">
        Camel Global Partner Terms — Version {TERMS_VERSION} — Questions:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}