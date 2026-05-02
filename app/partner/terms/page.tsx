"use client";

import Link from "next/link";

const VERSION = "2026-05";
const EFFECTIVE_DATE = "1 May 2026";

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
      "Camel Global reserves the right to refuse registration or to suspend or terminate an account at any time in accordance with clause 14.",
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
      "Camel Global will provide Partner support via the contact form and will use reasonable endeavours to respond to enquiries within 2 business days.",
      "Camel Global will give Partners at least 14 days' written notice of any material changes to these Terms or the Operating Rules.",
      "Camel Global does not guarantee any minimum volume of Bookings or revenue to any Partner.",
    ],
  },
  {
    title: "6. Bookings and Pricing",
    clauses: [
      "Partners may bid on any customer request that falls within their registered service radius.",
      "All prices submitted by Partners must be fully inclusive of all costs. No additional charges may be added to the Customer after a bid is accepted.",
      "The Partner is bound by the price they bid once a Booking is confirmed.",
      "Partners may submit only one bid per customer request. Bids submitted after the bid window has closed will not be accepted.",
      "The Partner acknowledges that Customers have no obligation to accept any bid.",
      "Camel Global reserves the right to remove bids that appear inaccurate, incomplete, or in breach of these Terms.",
    ],
  },
  {
    title: "7. Commission and Payments",
    clauses: [
      "Camel Global charges a commission on the Hire Price of each completed Booking. The standard commission rate is 20% of the Hire Price, subject to a minimum commission of €10 (or currency equivalent) per Booking. Commission rates may be reduced for individual Partners by agreement with Camel Global — the rate applicable to your account is shown on your bid submission page and in your account.",
      "Fuel Charges are passed through to the Partner in full. Camel Global does not charge commission on Fuel Charges.",
      "The Partner's payout for each Booking is calculated as: (Hire Price minus Commission) plus Fuel Charge.",
      "Payments will be processed via Stripe Connect. The Partner must complete Stripe Express onboarding to receive payouts.",
      "Camel Global will deduct commission automatically at the point of payment. Partners receive their net payout directly to their Stripe account.",
      "Camel Global will issue commission invoices to Partners on a monthly basis with reverse charge treatment under Article 44/196 of the EU VAT Directive where applicable.",
      "The Partner is solely responsible for accounting for and paying all taxes on income received through the Platform.",
      "In the event of a Customer refund dispute, the financial liability rests with the Partner.",
      "All fuel refunds owed to Customers are processed automatically by the Platform.",
    ],
  },
  {
    title: "8. Cancellations and Refunds",
    clauses: [
      "The following cancellation policy applies to all Bookings made through the Platform. The cancellation timestamp is recorded automatically by the Platform at the moment a cancellation is confirmed.",
      "If the Partner cancels a confirmed Booking for any reason, the Customer will receive a full refund of everything paid, including the Hire Price and the fuel deposit. Partner cancellations are a breach of clause 4 and may result in account suspension.",
      "If the Customer cancels a Booking more than 48 hours before the scheduled pickup time, the Customer receives a full refund of everything paid. The Partner receives no payout for that Booking.",
      "If the Customer cancels a Booking within 48 hours of the scheduled pickup time, the Hire Price is non-refundable and the Partner retains their net payout (Hire Price minus Commission). The fuel deposit is always refunded to the Customer in full as the fuel has not been used.",
      "Once a vehicle has been collected and the hire is underway, no cancellation is possible and no refund of the Hire Price is available. Fuel is settled based on actual usage at the end of the hire.",
      "Camel Global admin may cancel any Booking at any time and will issue a full refund to the Customer. The Partner will be notified by email.",
      "All refunds are processed automatically by the Platform and will appear in the Customer's account within 5–10 working days.",
      "The 48-hour threshold is measured from the scheduled pickup time recorded on the Booking at the time of confirmation. Any changes to the pickup time agreed between the parties do not retrospectively alter the threshold.",
    ],
  },
  {
    title: "9. VAT and Tax",
    clauses: [
      "The Partner is responsible for charging and accounting for VAT on the full Booking price paid by the Customer.",
      "Camel Global will invoice the Partner for commission using the reverse charge mechanism under Article 44/196 of the EU VAT Directive.",
      "Partners operating in Spain must provide a valid NIF. This is required for account activation and commission invoicing.",
      "It is the Partner's responsibility to seek independent tax advice. Camel Global does not provide tax advice.",
    ],
  },
  {
    title: "10. Insurance",
    clauses: [
      "The Partner is solely responsible for ensuring all vehicles are comprehensively insured at all times.",
      "The Partner must maintain public liability insurance with a minimum coverage of €5,000,000.",
      "Where a bid states 'Full Insurance Included', this must represent genuine comprehensive insurance.",
      "The Partner indemnifies Camel Global against all claims arising from any accident or liability involving the Partner's vehicles or drivers.",
      "Camel Global is not liable for any loss, damage, injury, or death caused by a Partner's vehicle, driver, or operations.",
      "The Partner must report any accident, theft, or significant incident involving a Camel Global Booking within 24 hours.",
    ],
  },
  {
    title: "11. Intellectual Property",
    clauses: [
      "Camel Global retains all intellectual property rights in the Platform.",
      "The Partner is granted a limited, non-exclusive, non-transferable licence to use the Platform solely for fulfilling Bookings.",
      "The Partner must not copy, reverse engineer, modify, or create derivative works from any part of the Platform.",
      "The Partner grants Camel Global a licence to display the Partner's company name and profile to Customers on the Platform.",
    ],
  },
  {
    title: "12. Data Protection and GDPR",
    clauses: [
      "Each party shall comply with all applicable data protection legislation, including the UK GDPR and EU GDPR.",
      "Customer personal data may only be processed by the Partner for the purpose of fulfilling the specific Booking for which it was shared.",
      "The Partner must not use Customer data for marketing, profiling, re-targeting, or sale to third parties.",
      "The Partner must implement appropriate measures to protect Customer data against unauthorised access, loss, or disclosure.",
      "Upon request, the Partner must delete all personal data relating to a Customer within 30 days.",
      "The Partner must notify Camel Global of any personal data breach within 72 hours of becoming aware of it.",
    ],
  },
  {
    title: "13. Liability",
    clauses: [
      "Nothing in this Agreement limits liability for death or personal injury caused by negligence or fraud.",
      "Camel Global's total aggregate liability shall not exceed the total commission paid by the Partner in the 3 months preceding the claim.",
      "Camel Global shall not be liable for any indirect, consequential, special, or punitive loss including loss of profit or revenue.",
      "Camel Global shall not be liable for loss arising from the Partner's failure to comply with these Terms or the actions of the Partner's drivers.",
    ],
  },
  {
    title: "14. Suspension and Termination",
    clauses: [
      "Camel Global may suspend a Partner account immediately for a serious customer complaint, breach of standards, failure to fulfil a Booking, or misrepresentation.",
      "Following suspension, the Partner will be notified by email and given 5 business days to respond.",
      "Camel Global may permanently terminate this Agreement for repeated breaches or a single serious violation.",
      "The Partner may terminate by providing 30 days' written notice via the contact form, provided no active Bookings remain.",
      "On termination, Platform access is revoked, outstanding amounts become immediately payable, and Customer data must be deleted within 30 days.",
    ],
  },
  {
    title: "15. Amendments",
    clauses: [
      "Camel Global reserves the right to amend these Terms at any time.",
      "Partners will be notified of material changes by email with at least 14 days' notice.",
      "Continued use of the Platform after the notice period constitutes acceptance of the updated Terms.",
      "The current version is always available at camel-global.com/partner/terms.",
    ],
  },
  {
    title: "16. General",
    clauses: [
      "This Agreement constitutes the entire agreement between the parties in relation to its subject matter.",
      "If any provision is found invalid or unenforceable, the remaining provisions continue in full force.",
      "The Partner may not assign rights or obligations without the prior written consent of Camel Global.",
      "This Agreement is governed by the laws of England and Wales. Each party submits to the exclusive jurisdiction of the courts of England and Wales.",
    ],
  },
];

async function downloadTermsPDF() {
  const { jsPDF } = await import("jspdf");
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableW = pageW - margin * 2;
  let y = margin;
  function checkPage(needed = 8) {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  }
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("CAMEL GLOBAL", margin, 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Meet and greet car hire", margin, 12);
  doc.text("Partner Terms and Conditions", pageW - margin, 7, { align: "right" });
  doc.text(`Version: ${VERSION} — Effective: ${EFFECTIVE_DATE}`, pageW - margin, 11, { align: "right" });
  doc.text(`Generated: ${dateStr}`, pageW - margin, 15, { align: "right" });
  y = 26;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Terms and Conditions", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const subtitle = doc.splitTextToSize("These Terms govern your use of the Camel Global platform as a partner. By registering as a partner you agree to be bound by these Terms in full.", usableW);
  doc.text(subtitle, margin, y); y += subtitle.length * 4 + 6;
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 6;
  for (const { title, clauses } of TERMS) {
    checkPage(12);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, usableW, 9, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(title, margin + 3, y + 2); y += 9;
    clauses.forEach((clause, i) => {
      checkPage(8);
      const lines = doc.splitTextToSize(`${i + 1}.  ${clause}`, usableW - 6);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 51, 51);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.5 + 1.5;
    });
    y += 4;
  }
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global Partner Terms and Conditions — Version ${VERSION} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }
  doc.save(`Camel-Global-Partner-Terms-${VERSION}.pdf`);
}

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
          <p className="mt-2 text-xs font-bold text-white/40">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-6">
          <div className="flex justify-end mb-6">
            <button type="button" onClick={() => downloadTermsPDF()}
              className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 transition-opacity">
              ⬇ Download PDF
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: "🏪", title: "Camel is a marketplace", body: "We are an intermediary. The hire contract is always between you and the customer." },
              { icon: "💰", title: "Commission from 20%", body: "Standard rate is 20% on the hire price only. Fuel charges pass through to you at 100%. Minimum €10 per booking. Reduced rates available by agreement." },
              { icon: "❌", title: "Cancellation policy", body: "Partner cancellations = full refund to customer. Customer cancels >48hrs = full refund, no payout. Customer cancels <48hrs = you keep hire fee minus commission. Fuel always refunded." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-[#f0f0f0] p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-xs font-black uppercase tracking-widest text-black mb-1">{title}</p>
                <p className="text-xs font-bold text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {TERMS.map(({ title, clauses }) => (
          <div key={title} className="bg-white p-6">
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
            <Link href="/partner/account" className="font-black text-black underline hover:opacity-70">
              partner account page
            </Link>.
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          Camel Global Partner Terms and Conditions — Version {VERSION} — Effective {EFFECTIVE_DATE} — Subject to change with 14 days&apos; notice.
        </p>
      </div>
    </>
  );
}