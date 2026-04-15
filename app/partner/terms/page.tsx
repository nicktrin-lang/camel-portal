"use client";

import Image from "next/image";
import Link from "next/link";

const VERSION = "2026-04";
const EFFECTIVE_DATE = "1 April 2026";
const CAMEL_LEGAL_NAME = "Camel Global Ltd";
const CAMEL_GOVERNING_LAW = "England and Wales";

type Section = { title: string; clauses: string[] };

const TERMS: Section[] = [
  {
    title: "1. Definitions",
    clauses: [
      '"Agreement" means these Partner Terms and Conditions together with the Partner Operating Rules, which are incorporated by reference and form part of this Agreement.',
      '"Camel Global", "we", "us" or "our" means Camel Global Ltd, a company registered in England and Wales.',
      '"Partner", "you" or "your" means the independent car hire business that has registered on the Platform and accepted this Agreement.',
      '"Platform" means the Camel Global web-based marketplace, portals, APIs, and associated services available at camel-global.com.',
      '"Customer" means any end user who submits a car hire request via the Platform.',
      '"Booking" means a confirmed hire arrangement between a Customer and a Partner facilitated through the Platform.',
      '"Commission" means the fee charged by Camel Global to the Partner for use of the Platform, as set out in clause 7.',
      '"Hire Price" means the price bid and accepted for the car hire element of a Booking, excluding any fuel charge.',
      '"Fuel Charge" means the amount charged to a Customer for fuel consumed during a Booking, calculated in accordance with the Partner Operating Rules.',
      '"Partner Operating Rules" means the operational standards and conduct requirements published in the Partner account management section, as updated from time to time.',
      '"Services" means the marketplace facilitation, booking management, payment processing, and related services provided by Camel Global via the Platform.',
    ],
  },
  {
    title: "2. Nature of the Relationship — Camel as Intermediary",
    clauses: [
      "Camel Global operates as a marketplace intermediary and technology platform. Camel Global is not a car hire operator, does not own or operate any vehicles, and does not employ any drivers.",
      "The legal contract for the provision of car hire services is formed directly between the Partner and the Customer. Camel Global is not a party to that contract and accepts no liability for its performance.",
      "Camel Global does not act as agent for either party in the conclusion of a Booking. The Partner is the supplier of services and issues all relevant documentation, including VAT invoices, directly to Customers.",
      "The Partner acknowledges that Camel Global's role is limited to: (a) operating the Platform; (b) facilitating the introduction of Customers to Partners; (c) processing payments on behalf of Partners as a disclosed intermediary; and (d) providing the tools described in the Partner Operating Rules.",
      "Nothing in this Agreement creates an employment relationship, agency, partnership, joint venture, or franchise between Camel Global and the Partner or any of the Partner's drivers or employees.",
      "The Partner must not represent to any Customer or third party that Camel Global is the supplier of car hire services, or that drivers are employed by or agents of Camel Global.",
    ],
  },
  {
    title: "3. Registration and Account",
    clauses: [
      "To use the Platform, the Partner must complete the registration process, provide accurate and complete information, and receive approval from Camel Global.",
      "The Partner warrants that all information provided during registration and at any point thereafter is true, accurate, current, and complete.",
      "The Partner is responsible for maintaining the confidentiality of their account credentials and for all activity that occurs under their account.",
      "The Partner must notify Camel Global immediately of any unauthorised use of their account or any other breach of security.",
      "Camel Global reserves the right to refuse registration or to suspend or terminate an account at any time in accordance with clause 11.",
      "Each partner account is for a single legal entity. The Partner must not create multiple accounts or allow third parties to use their account.",
      "The Partner must keep their registered details, including legal company name, VAT/NIF number, and contact information, up to date at all times.",
    ],
  },
  {
    title: "4. Partner Obligations",
    clauses: [
      "The Partner must comply with the Partner Operating Rules at all times. The Operating Rules are incorporated into this Agreement and have the same legal force.",
      "The Partner must hold and maintain all licences, permits, registrations, and insurance policies required by applicable law to operate a car hire business in their jurisdiction.",
      "The Partner must ensure that all vehicles offered through the Platform are roadworthy, legally registered, fully insured, and meet the standards set out in the Operating Rules.",
      "The Partner is solely responsible for the conduct of all drivers registered under their account and for ensuring those drivers meet the standards set out in the Operating Rules.",
      "The Partner must fulfil every Booking they accept. Failure to fulfil a confirmed Booking without exceptional justification is a material breach of this Agreement.",
      "The Partner must not use the Platform to offer services they are unable to deliver, submit bids on requests they cannot fulfil, or engage in any practice that misleads Customers.",
      "The Partner must respond to Customer enquiries and complaints within the timeframes set out in the Operating Rules.",
      "The Partner must accurately record all fuel levels using the Camel Global driver app at every delivery and collection, in accordance with the fuel policy in the Operating Rules.",
    ],
  },
  {
    title: "5. Camel Global Obligations",
    clauses: [
      "Camel Global will use reasonable endeavours to make the Platform available 24 hours a day, 7 days a week, subject to planned maintenance and events outside our control.",
      "Camel Global will process Bookings, payments, and notifications in accordance with the functionality described in the Platform.",
      "Camel Global will notify Partners of new customer requests within their service radius in a timely manner.",
      "Camel Global will provide Partner support via support@camel-global.com and will use reasonable endeavours to respond to enquiries within 2 business days.",
      "Camel Global will give Partners at least 14 days' written notice of any material changes to these Terms or the Operating Rules, except where immediate changes are required by law or to protect the safety of the Platform.",
      "Camel Global does not guarantee any minimum volume of Bookings or revenue to any Partner.",
    ],
  },
  {
    title: "6. Bookings and Pricing",
    clauses: [
      "Partners may bid on any customer request that falls within their registered service radius.",
      "All prices submitted by Partners must be fully inclusive of all costs associated with delivering, insuring, and collecting the vehicle. No additional charges may be added to the Customer after a bid is accepted.",
      "The Partner is bound by the price they bid once a Booking is confirmed. Camel Global will not adjust or renegotiate bid prices after confirmation.",
      "Partners may submit only one bid per customer request. Bids submitted after the bid window has closed will not be accepted.",
      "The Partner acknowledges that Customers have no obligation to accept any bid, and that Camel Global has no obligation to present any bid to a Customer.",
      "Camel Global reserves the right to remove or decline to display bids that appear to be inaccurate, incomplete, or in breach of these Terms.",
    ],
  },
  {
    title: "7. Commission and Payments",
    clauses: [
      "Camel Global charges a commission on the Hire Price of each completed Booking. The default commission rate is 20% of the Hire Price, subject to a minimum commission of €10 (or currency equivalent) per Booking.",
      "Fuel Charges are passed through to the Partner in full. Camel Global does not charge commission on Fuel Charges.",
      "The Partner's payout for each Booking is calculated as: (Hire Price minus Commission) plus Fuel Charge.",
      "Commission rates may be adjusted for individual Partners by agreement with Camel Global. Any per-Partner rate override will be reflected in the Partner's account and in all reporting.",
      "Payments will be processed via Stripe Connect. The Partner must complete Stripe Express onboarding to receive payouts. Camel Global is not responsible for delays caused by Stripe or by the Partner's failure to complete onboarding.",
      "Camel Global will deduct commission automatically at the point of payment. Partners receive their net payout directly to their Stripe account.",
      "Camel Global will issue commission invoices to Partners on a monthly basis. Invoices will state the reverse charge treatment under Article 44/196 of the EU VAT Directive where applicable.",
      "The Partner is solely responsible for accounting for and paying all taxes on income received through the Platform, including VAT, income tax, and any other applicable taxes in their jurisdiction.",
      "In the event of a Customer refund dispute, Camel Global may mediate but the financial liability for any refund rests with the Partner. Camel Global reserves the right to withhold or claw back amounts from future payouts where a refund has been issued.",
      "All fuel refunds owed to Customers must be processed within 5 business days of Booking completion. Failure to do so may result in Camel Global processing the refund and recovering the amount from the Partner.",
    ],
  },
  {
    title: "8. VAT and Tax",
    clauses: [
      "The Partner is responsible for charging and accounting for VAT on the full Booking price paid by the Customer. The VAT treatment of car hire services is the Partner's responsibility.",
      "Camel Global will invoice the Partner for commission using the reverse charge mechanism under Article 44/196 of the EU VAT Directive. No UK or Spanish VAT will be added to Camel Global's commission invoices where reverse charge applies.",
      "Partners operating in Spain must provide a valid NIF (e.g. B12345678, represented as ESB12345678 for EU transactions). This is required for account activation and commission invoicing.",
      "It is the Partner's responsibility to seek independent tax advice regarding their obligations. Camel Global does not provide tax advice.",
    ],
  },
  {
    title: "9. Insurance",
    clauses: [
      "The Partner is solely responsible for ensuring that all vehicles operated through the Platform are comprehensively insured at all times.",
      "The Partner must maintain public liability insurance with a minimum coverage of €5,000,000.",
      "Where a bid states 'Full Insurance Included', this must represent genuine comprehensive insurance and not merely a damage waiver or excess reduction product.",
      "The Partner indemnifies Camel Global against all claims, losses, damages, costs, and expenses arising from: (a) any accident, incident, or liability involving the Partner's vehicles or drivers; (b) any breach of the Partner's insurance obligations; or (c) any claim by a Customer arising from the Partner's failure to perform a Booking.",
      "Camel Global is not liable for any loss, damage, injury, or death caused by a Partner's vehicle, driver, or operations.",
      "The Partner must report any accident, theft, or significant incident involving a Camel Global Booking to Camel Global within 24 hours.",
    ],
  },
  {
    title: "10. Intellectual Property",
    clauses: [
      "Camel Global retains all intellectual property rights in the Platform, including all software, designs, trademarks, and content.",
      "The Partner is granted a limited, non-exclusive, non-transferable licence to use the Platform solely for the purpose of fulfilling Bookings in accordance with this Agreement.",
      "The Partner must not copy, reverse engineer, modify, or create derivative works from any part of the Platform.",
      "The Partner grants Camel Global a non-exclusive licence to use the Partner's company name, logo, and profile information for the purpose of displaying the Partner's profile to Customers on the Platform.",
      "Camel Global may use anonymised and aggregated booking data for analytics, product development, and reporting purposes.",
    ],
  },
  {
    title: "11. Data Protection and GDPR",
    clauses: [
      "Each party shall comply with all applicable data protection legislation, including the UK GDPR, EU GDPR, and any applicable local data protection laws.",
      "Customer personal data shared via the Platform (including name, phone number, email address, and pickup/dropoff location) may only be processed by the Partner for the purpose of fulfilling the specific Booking for which it was shared.",
      "The Partner must not use Customer data for any secondary purpose including marketing, profiling, re-targeting, or sale to third parties.",
      "The Partner must implement appropriate technical and organisational measures to protect Customer data against unauthorised access, loss, or disclosure.",
      "Upon request from a Customer or from Camel Global, the Partner must delete all personal data relating to that Customer within 30 days.",
      "The Partner must notify Camel Global of any personal data breach involving Customer data within 72 hours of becoming aware of it.",
      "For the purposes of data protection law, Camel Global and the Partner are independent data controllers in respect of the personal data they each process.",
    ],
  },
  {
    title: "12. Liability",
    clauses: [
      "Nothing in this Agreement limits or excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.",
      "Subject to clause 12.1, Camel Global's total aggregate liability to the Partner under or in connection with this Agreement, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall not exceed the total commission paid by the Partner to Camel Global in the 3 months immediately preceding the event giving rise to the claim.",
      "Camel Global shall not be liable for any indirect, consequential, special, or punitive loss or damage, including loss of profit, loss of revenue, loss of business, or loss of data.",
      "Camel Global shall not be liable for any loss or damage arising from: (a) the Partner's failure to comply with these Terms or the Operating Rules; (b) the actions or omissions of the Partner's drivers or employees; (c) any failure or unavailability of third-party services including Stripe, Google Maps, or email providers; or (d) any event outside Camel Global's reasonable control.",
      "The Partner accepts that the Platform is provided 'as is' and that Camel Global makes no warranty that it will be uninterrupted, error-free, or free from viruses or other harmful components.",
    ],
  },
  {
    title: "13. Suspension and Termination",
    clauses: [
      "Camel Global may suspend a Partner account immediately and without notice in the event of: a serious customer complaint; breach of vehicle or driver standards; failure to fulfil a confirmed Booking; misrepresentation of pricing or services; or any act that Camel Global reasonably believes puts Customers at risk.",
      "Following suspension, the Partner will be notified by email and given the opportunity to respond within 5 business days.",
      "Camel Global may permanently terminate this Agreement for repeated breaches, a single serious violation, or where the Partner is subject to insolvency proceedings.",
      "The Partner may terminate this Agreement at any time by providing 30 days' written notice to support@camel-global.com, provided no active Bookings remain outstanding.",
      "On termination for any reason: (a) the Partner's access to the Platform will be revoked; (b) all outstanding amounts owed to Camel Global become immediately payable; (c) the Partner must delete all Customer personal data within 30 days; and (d) the Partner must cease using any Camel Global branding or trademarks.",
      "Termination does not affect any accrued rights or liabilities of either party.",
    ],
  },
  {
    title: "14. Amendments",
    clauses: [
      "Camel Global reserves the right to amend these Terms and the Partner Operating Rules at any time.",
      "Partners will be notified of any material changes by email with a minimum of 14 days' notice, except where immediate changes are required by law or to protect the safety of the Platform.",
      "Continued use of the Platform after the notice period constitutes acceptance of the updated Terms.",
      "The current version of these Terms is always available at camel-global.com/partner/terms. The version number and effective date are displayed at the top of this document.",
    ],
  },
  {
    title: "15. General",
    clauses: [
      "This Agreement constitutes the entire agreement between the parties in relation to its subject matter and supersedes all prior representations, agreements, and understandings.",
      "If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.",
      "A waiver of any right or remedy under this Agreement is only effective if given in writing and shall not be deemed a waiver of any subsequent breach or default.",
      "The Partner may not assign or transfer any rights or obligations under this Agreement without the prior written consent of Camel Global.",
      "Camel Global may assign this Agreement or any rights under it to any group company or in connection with a sale or restructuring of its business.",
      "Nothing in this Agreement is intended to confer any benefit on any third party under the Contracts (Rights of Third Parties) Act 1999.",
      `This Agreement is governed by the laws of ${CAMEL_GOVERNING_LAW}. Each party irrevocably submits to the exclusive jurisdiction of the courts of ${CAMEL_GOVERNING_LAW} in relation to any dispute arising under or in connection with this Agreement.`,
    ],
  },
];

function downloadTermsPDF(companyName?: string) {
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const sectionsHtml = TERMS.map(({ title, clauses }) => `
    <div style="margin-bottom:24px;">
      <h3 style="color:#003768;font-size:14px;font-weight:700;margin:0 0 8px 0;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${title}</h3>
      <ol style="margin:0;padding-left:20px;">
        ${clauses.map(c => `<li style="font-size:11px;color:#334155;margin-bottom:5px;line-height:1.6;">${c}</li>`).join("")}
      </ol>
    </div>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Camel Global — Partner Terms and Conditions</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; padding:40px; color:#1e293b; background:#fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #003768; padding-bottom:16px; margin-bottom:24px; }
    .logo { font-size:22px; font-weight:900; color:#003768; letter-spacing:-1px; }
    .logo span { color:#ff7a00; }
    .meta { text-align:right; font-size:11px; color:#64748b; }
    h1 { font-size:20px; color:#003768; font-weight:800; margin-bottom:4px; }
    h2 { font-size:12px; color:#64748b; font-weight:400; margin-bottom:16px; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:center; }
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="logo">🐪 Camel <span>Global</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Meet and greet car hire</div>
    </div>
    <div class="meta">
      <div><strong>Partner Terms and Conditions</strong></div>
      ${companyName ? `<div>Issued to: ${companyName}</div>` : ""}
      <div>Version: ${VERSION} — Effective: ${EFFECTIVE_DATE}</div>
      <div>Generated: ${dateStr}</div>
    </div>
  </div>
  <h1>Partner Terms and Conditions</h1>
  <h2>These Terms govern your use of the Camel Global platform as a partner. By registering and operating as a partner you agree to be bound by these Terms in full.</h2>
  ${sectionsHtml}
  <div class="footer">Camel Global Partner Terms and Conditions — Version ${VERSION} — Effective ${EFFECTIVE_DATE} — camelglobal.com</div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500);
    };
  }
}

export default function PartnerTermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 bg-[#0f4f8a] shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-6 md:px-12">
          <Link href="/partner/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={54} priority className="h-[48px] w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => downloadTermsPDF()}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            ⬇ Download PDF
          </button>
        </div>
      </header>

      <div className="pt-28 pb-16 px-6 md:px-12 lg:px-24 max-w-4xl mx-auto">
        {/* Header card */}
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003768]">Partner Terms and Conditions</h1>
              <p className="mt-2 text-slate-500 text-sm">
                Version {VERSION} — Effective {EFFECTIVE_DATE}
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">
                These Terms govern your use of the Camel Global platform as a partner. Please read them carefully.
                By registering as a partner and ticking the acceptance checkbox during signup, you agree to be bound
                by these Terms and the{" "}
                <a href="#operating-rules-note" className="font-semibold text-[#003768] underline">
                  Partner Operating Rules
                </a>
                , which are incorporated by reference.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadTermsPDF()}
              className="shrink-0 rounded-full bg-[#003768] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              ⬇ Download PDF
            </button>
          </div>

          {/* Key points summary */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: "🏪", title: "Camel is a marketplace", body: "We are an intermediary. The hire contract is always between you and the customer." },
              { icon: "💰", title: "20% commission", body: "On the hire price only. Fuel charges pass through to you at 100%. Minimum €10 per booking." },
              { icon: "⚖️", title: "England & Wales law", body: "This agreement is governed by English law. Disputes are subject to the courts of England and Wales." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[#003768]/10 bg-[#f3f8ff] p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-[#003768] text-sm">{title}</p>
                <p className="text-xs text-slate-600 mt-1">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Terms sections */}
        <div className="space-y-4">
          {TERMS.map(({ title, clauses }) => (
            <div key={title} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <h2 className="text-base font-bold text-[#003768] mb-4">{title}</h2>
              <ol className="space-y-3">
                {clauses.map((clause, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="shrink-0 font-semibold text-[#003768] w-6">{i + 1}.</span>
                    <span>{clause}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Operating rules note */}
        <div id="operating-rules-note" className="mt-6 rounded-3xl border border-[#003768]/10 bg-[#f3f8ff] p-6">
          <h2 className="text-base font-bold text-[#003768]">Partner Operating Rules</h2>
          <p className="mt-2 text-sm text-slate-600">
            The Partner Operating Rules are incorporated into this Agreement and have the same legal force as these Terms.
            They set out the day-to-day operational standards covering bidding, vehicle standards, fuel policy, driver conduct,
            customer service, and more. You can read and download the Operating Rules from your{" "}
            <a href="/partner/account" className="font-semibold text-[#003768] underline">partner account page</a>.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-400 text-center">
          Camel Global Partner Terms and Conditions — Version {VERSION} — Effective {EFFECTIVE_DATE} — Subject to change with 14 days' notice.
        </p>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link href="/partner/login" className="text-sm font-semibold text-[#003768] hover:underline">
            ← Back to partner login
          </Link>
        </div>
      </div>
    </div>
  );
}