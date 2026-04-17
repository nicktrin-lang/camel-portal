// Shared operating rules data + PDF generator.
// Used by: app/partner/account/page.tsx and app/components/Footer.tsx (partner footer).

export const OPERATING_RULES = [
  {
    section: "1. Platform Overview",
    rules: [
      "Camel Global is a meet-and-greet car hire platform connecting customers with independent car hire partners across Spain and internationally.",
      "Partners are independent businesses that agree to operate within the Camel Global marketplace in accordance with these rules.",
      "Camel Global acts as a marketplace facilitator and does not own or operate any vehicles directly.",
      "By registering and operating as a partner, you agree to be bound by these operating rules in full.",
    ],
  },
  {
    section: "2. Partner Eligibility & Approval",
    rules: [
      "All partner applications are subject to review and approval by Camel Global before any bids can be submitted.",
      "Partners must hold all legally required licences, permits, and insurance required to operate a car hire business in their jurisdiction.",
      "Partners must maintain a valid public liability insurance policy for a minimum of €5,000,000 coverage.",
      "Partners must have a physical base location within the service area from which vehicles can be dispatched.",
      "Any change in company ownership, legal status, or operating licences must be reported to Camel Global within 7 days.",
      "Camel Global reserves the right to suspend or terminate partner accounts at any time for breach of these rules.",
    ],
  },
  {
    section: "3. Bidding & Pricing",
    rules: [
      "Partners may bid on any customer request that falls within their service radius.",
      "All bid prices must be submitted in the partner's designated billing currency (EUR, GBP, or USD).",
      "Prices quoted must be fully inclusive — no additional charges may be added to the customer after a bid is accepted.",
      "Car hire prices must cover all standard costs including vehicle delivery, collection, and return.",
      "The fuel deposit quoted must reflect the actual full tank cost of the vehicle being offered.",
      "Partners must not submit bids they are unable to fulfil. Unfulfilled bookings may result in account suspension.",
      "Partners may only submit one bid per customer request.",
      "Bid windows are set by the customer at time of request. Bids submitted after expiry will not be accepted.",
    ],
  },
  {
    section: "4. Vehicle Standards",
    rules: [
      "All vehicles offered must be roadworthy, legally registered, and fully insured at the time of hire.",
      "Vehicles must be clean, well-maintained, and presented to the customer in a professional condition.",
      "The vehicle delivered must match the category bid upon (e.g. Standard Saloon, SUV, Minivan).",
      "Substituting a lower-category vehicle without customer agreement is not permitted and may result in a dispute.",
      "Partners must ensure all vehicles have at least a full tank of fuel at the point of collection.",
      "Vehicles must comply with all local emissions and environmental regulations.",
      "Air conditioning must be fully functional on all vehicles offered during summer months (April–October in Spain).",
    ],
  },
  {
    section: "5. Fuel Policy & Charging",
    rules: [
      "Camel Global operates a fair fuel policy: customers pay only for the fuel they use, rounded to the nearest quarter tank.",
      "The driver must record the fuel level at collection and at return using the Camel Global driver app.",
      "The customer must confirm and agree with the fuel reading at both collection and return stages.",
      "In the event of a dispute over fuel levels, the partner's office may override the driver reading with photographic evidence.",
      "Fuel charges are calculated automatically: fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Any unused fuel is refunded to the customer. Partners must not retain fuel refund amounts.",
      "Failure to accurately record fuel levels that results in overcharging a customer will result in the full disputed amount being refunded and a formal warning issued.",
    ],
  },
  {
    section: "6. Driver Standards",
    rules: [
      "All drivers dispatched via the Camel Global platform must be registered in the partner's driver portal.",
      "Drivers must hold a valid driving licence appropriate for the vehicle category being delivered.",
      "Drivers must behave professionally and courteously at all times when interacting with customers.",
      "Drivers must carry a copy of the booking confirmation when delivering or collecting a vehicle.",
      "Drivers must not use their mobile phone while driving during any Camel Global booking.",
      "Any driver receiving two or more customer complaints may be removed from the platform at Camel Global's discretion.",
      "Partners are fully responsible for the conduct of all drivers registered under their account.",
    ],
  },
  {
    section: "7. Customer Service",
    rules: [
      "Partners must respond to customer enquiries related to active bookings within 2 hours during business hours.",
      "Business hours are defined as 08:00–20:00 local time, 7 days a week.",
      "Out-of-hours emergency contact must be provided for all active bookings.",
      "Partners must honour any booking accepted through the platform. Cancellations initiated by the partner without exceptional justification are a breach of these rules.",
      "If a vehicle cannot be provided due to a breakdown or emergency, a suitable replacement must be offered within 2 hours.",
      "Customer complaints must be acknowledged within 24 hours and resolved or escalated within 5 business days.",
    ],
  },
  {
    section: "8. Insurance & Liability",
    rules: [
      "Partners are fully responsible for the insurance of all vehicles on the platform at all times.",
      "Full comprehensive insurance must be in place for each vehicle hired through the platform.",
      "Where the bid includes 'Full Insurance Included', this must be genuinely comprehensive insurance and not a damage waiver with excess.",
      "Partners indemnify Camel Global against any claims arising from the partner's vehicles, drivers, or operations.",
      "Camel Global is not liable for any loss, damage, or injury caused by a partner's vehicle or driver.",
      "Partners must report any accident, theft, or significant incident involving a Camel Global booking within 24 hours.",
    ],
  },
  {
    section: "9. Revenue & Payments",
    rules: [
      "Camel Global charges a 20% commission on the car hire price for each completed booking, with a minimum commission of €10 per booking.",
      "Fuel charges are passed through to the partner in full — Camel Global takes no commission on fuel.",
      "Commission is deducted automatically at the point of payment via Stripe Connect — partners receive their net amount directly.",
      "Partners are responsible for all applicable taxes on income received through the platform.",
      "In the event of a customer refund dispute, Camel Global may mediate but the financial liability rests with the partner.",
      "All fuel refunds owed to customers must be processed within 5 business days of the booking completion.",
    ],
  },
  {
    section: "10. Data & Privacy",
    rules: [
      "Customer data shared via the platform (name, phone, email, pickup/dropoff address) may only be used for the purpose of fulfilling the booking.",
      "Partners must not use customer data for marketing, re-targeting, or any other commercial purpose.",
      "Customer data must be stored securely and not shared with third parties.",
      "Partners must comply with GDPR (General Data Protection Regulation) and any applicable local data protection laws.",
      "On request, customer data must be deleted from partner systems within 30 days.",
    ],
  },
  {
    section: "11. Suspension & Termination",
    rules: [
      "Camel Global may suspend a partner account immediately in the event of: a serious customer complaint, breach of vehicle or driver standards, failure to fulfil a confirmed booking, or misrepresentation of pricing or services.",
      "Suspended accounts will be notified by email and given the opportunity to respond within 5 business days.",
      "Camel Global reserves the right to permanently terminate accounts for repeated breaches or a single serious violation.",
      "Partners may terminate their account at any time by providing 30 days written notice, provided no active bookings remain outstanding.",
      "On termination, all access to the platform will be revoked and customer data must be deleted within 30 days.",
    ],
  },
  {
    section: "12. Amendments",
    rules: [
      "Camel Global reserves the right to amend these operating rules at any time.",
      "Partners will be notified of any material changes by email with a minimum of 14 days' notice.",
      "Continued use of the platform after the notice period constitutes acceptance of the updated rules.",
      "The current version of these rules is always available in the partner account management section.",
    ],
  },
];

export async function downloadOperatingRulesPDF(companyName: string) {
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

  doc.setFillColor(15, 79, 138);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("CAMEL GLOBAL", margin, 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Meet and greet car hire", margin, 12);
  doc.text(`Partner Operating Rules`, pageW - margin, 7, { align: "right" });
  doc.text(`Issued to: ${companyName || "Partner"}`, pageW - margin, 11, { align: "right" });
  doc.text(`Generated: ${dateStr}`, pageW - margin, 15, { align: "right" });
  y = 26;

  doc.setTextColor(0, 55, 104);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Operating Rules", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
  const subtitle = doc.splitTextToSize(
    "These rules govern the conduct of all partners operating on the Camel Global platform. By operating as a partner you agree to comply with all sections below.",
    usableW
  );
  doc.text(subtitle, margin, y); y += subtitle.length * 4 + 6;

  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 6;

  for (const { section, rules } of OPERATING_RULES) {
    checkPage(12);
    doc.setFillColor(243, 248, 255);
    doc.roundedRect(margin, y - 4, usableW, 9, 2, 2, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 55, 104);
    doc.text(section, margin + 3, y + 2); y += 9;

    rules.forEach((rule, i) => {
      checkPage(8);
      const lines = doc.splitTextToSize(`${i + 1}.  ${rule}`, usableW - 6);
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.5 + 1.5;
    });
    y += 4;
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global — Partner Operating Rules — Generated ${dateStr} — camelglobal.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Global-Partner-Operating-Rules-${dateStr.replace(/ /g, "-")}.pdf`);
}