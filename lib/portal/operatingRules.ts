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
    section: "3b. Mileage Limits & Security Deposits",
    rules: [
      "Where a partner applies a mileage limit to a booking, this must be clearly stated on the bid at the time of submission. The mileage terms must include the limit and the excess charge per kilometre so the customer can make an informed decision before accepting.",
      "Where a partner requires a security deposit, this must be clearly stated on the bid at the time of submission, including the deposit amount and the conditions under which it will be held and released.",
      "Mileage limits and security deposits are entirely outside of the Camel Global payment system. Camel Global does not collect, process, or hold these amounts on behalf of partners under any circumstances.",
      "The partner is solely responsible for collecting any mileage excess charge or security deposit directly from the customer at the point of vehicle handover or return. It is the partner's responsibility to ensure they have the means to take this payment at that location.",
      "Partners must not use cash as the only means of collecting a security deposit. A credit card terminal or equivalent electronic payment method must be available at the point of handover where a deposit is required.",
      "Any dispute between a partner and customer relating to a mileage charge or security deposit is a matter between those two parties directly. Camel Global is not liable for, and will not mediate, disputes arising from amounts collected outside the platform.",
      "Failure to disclose a mileage limit or security deposit on the bid — where one is subsequently demanded from the customer at collection — is a breach of these rules and may result in immediate account suspension.",
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
      "Camel Global charges a commission on the car hire price for each completed booking, with a minimum commission of €10 per booking. The standard commission rate is 20%, though this may be reduced for individual partners by agreement with Camel Global.",
      "Your current commission rate is displayed in your partner account and on the bid submission page. If you have a reduced rate, it will be reflected there.",
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

// ---------------------------------------------------------------------------
// SPANISH — ⚠️ Requires legal review before publishing
// ---------------------------------------------------------------------------
export const OPERATING_RULES_ES = [
  {
    section: "1. Descripción General de la Plataforma",
    rules: [
      "Camel Global es una plataforma de alquiler de vehículos con entrega y recogida que conecta a clientes con socios independientes de alquiler de vehículos en España e internacionalmente.",
      "Los socios son empresas independientes que acuerdan operar dentro del mercado de Camel Global de conformidad con estas reglas.",
      "Camel Global actúa como facilitador del mercado y no posee ni opera vehículos directamente.",
      "Al registrarse y operar como socio, usted acepta quedar vinculado por estas reglas operativas en su totalidad.",
    ],
  },
  {
    section: "2. Elegibilidad y Aprobación de Socios",
    rules: [
      "Todas las solicitudes de socios están sujetas a revisión y aprobación por parte de Camel Global antes de que se puedan enviar ofertas.",
      "Los socios deben contar con todas las licencias, permisos y seguros legalmente requeridos para operar un negocio de alquiler de vehículos en su jurisdicción.",
      "Los socios deben mantener una póliza de seguro de responsabilidad civil válida con una cobertura mínima de 5.000.000 €.",
      "Los socios deben tener una ubicación base física dentro del área de servicio desde la que se puedan enviar los vehículos.",
      "Cualquier cambio en la propiedad de la empresa, el estado legal o las licencias de operación debe comunicarse a Camel Global en un plazo de 7 días.",
      "Camel Global se reserva el derecho de suspender o cancelar cuentas de socios en cualquier momento por incumplimiento de estas reglas.",
    ],
  },
  {
    section: "3. Ofertas y Precios",
    rules: [
      "Los socios pueden hacer ofertas sobre cualquier solicitud de cliente que se encuentre dentro de su radio de servicio.",
      "Todos los precios de las ofertas deben enviarse en la divisa de facturación designada del socio (EUR, GBP o USD).",
      "Los precios ofertados deben ser totalmente inclusivos — no se pueden añadir cargos adicionales al cliente después de que se acepte una oferta.",
      "Los precios del alquiler de vehículos deben cubrir todos los costes estándar, incluida la entrega, recogida y devolución del vehículo.",
      "El depósito de combustible ofertado debe reflejar el coste real del depósito lleno del vehículo ofrecido.",
      "Los socios no deben enviar ofertas que no puedan cumplir. Las reservas incumplidas pueden dar lugar a la suspensión de la cuenta.",
      "Los socios solo pueden enviar una oferta por solicitud de cliente.",
      "Las ventanas de oferta son establecidas por el cliente en el momento de la solicitud. Las ofertas enviadas tras su vencimiento no serán aceptadas.",
    ],
  },
  {
    section: "3b. Límites de Kilometraje y Depósitos de Seguridad",
    rules: [
      "Cuando un socio aplique un límite de kilometraje a una reserva, esto debe indicarse claramente en la oferta en el momento de su envío. Los términos del kilometraje deben incluir el límite y el cargo por exceso por kilómetro para que el cliente pueda tomar una decisión informada antes de aceptar.",
      "Cuando un socio requiera un depósito de seguridad, esto debe indicarse claramente en la oferta en el momento de su envío, incluyendo el importe del depósito y las condiciones bajo las cuales se retendrá y liberará.",
      "Los límites de kilometraje y los depósitos de seguridad están completamente fuera del sistema de pagos de Camel Global. Camel Global no cobra, procesa ni retiene estos importes en nombre de los socios bajo ninguna circunstancia.",
      "El socio es el único responsable de cobrar cualquier cargo por exceso de kilometraje o depósito de seguridad directamente al cliente en el momento de la entrega o devolución del vehículo. Es responsabilidad del socio asegurarse de contar con los medios para realizar este cobro en dicha ubicación.",
      "Los socios no deben utilizar el efectivo como único medio de cobro de un depósito de seguridad. Un terminal de tarjeta de crédito u otro método de pago electrónico equivalente debe estar disponible en el punto de entrega cuando se requiera un depósito.",
      "Cualquier disputa entre un socio y un cliente relacionada con un cargo por kilometraje o depósito de seguridad es un asunto entre esas dos partes directamente. Camel Global no es responsable de las disputas derivadas de importes cobrados fuera de la plataforma, ni actuará como mediador en las mismas.",
      "La falta de comunicación de un límite de kilometraje o depósito de seguridad en la oferta — cuando posteriormente se exija al cliente en la recogida — constituye un incumplimiento de estas reglas y puede resultar en la suspensión inmediata de la cuenta.",
    ],
  },
  {
    section: "4. Estándares de Vehículos",
    rules: [
      "Todos los vehículos ofrecidos deben estar en condiciones de circulación, legalmente registrados y completamente asegurados en el momento del alquiler.",
      "Los vehículos deben estar limpios, bien mantenidos y presentados al cliente en condiciones profesionales.",
      "El vehículo entregado debe corresponder a la categoría ofertada (p. ej., Turismo Estándar, SUV, Minivan).",
      "La sustitución por un vehículo de categoría inferior sin el acuerdo del cliente no está permitida y puede dar lugar a una disputa.",
      "Los socios deben garantizar que todos los vehículos tengan al menos el depósito lleno de combustible en el momento de la recogida.",
      "Los vehículos deben cumplir con toda la normativa local sobre emisiones y medio ambiente.",
      "El aire acondicionado debe estar completamente operativo en todos los vehículos ofrecidos durante los meses de verano (abril–octubre en España).",
    ],
  },
  {
    section: "5. Política de Combustible y Cargos",
    rules: [
      "Camel Global aplica una política de combustible justa: los clientes solo pagan el combustible que utilizan, redondeado al cuarto de depósito más cercano.",
      "El conductor debe registrar el nivel de combustible en la recogida y en la devolución utilizando la aplicación de conductores de Camel Global.",
      "El cliente debe confirmar y estar de acuerdo con la lectura del combustible tanto en la recogida como en la devolución.",
      "En caso de disputa sobre los niveles de combustible, la oficina del socio puede anular la lectura del conductor con evidencia fotográfica.",
      "Los cargos por combustible se calculan automáticamente: cargo_combustible = (cuartos_usados / 4) × precio_depósito_lleno.",
      "Cualquier combustible no utilizado se reembolsa al cliente. Los socios no deben retener importes de reembolso de combustible.",
      "El registro inexacto de los niveles de combustible que resulte en un cobro excesivo al cliente dará lugar al reembolso del importe disputado en su totalidad y a la emisión de un aviso formal.",
    ],
  },
  {
    section: "6. Estándares de Conductores",
    rules: [
      "Todos los conductores enviados a través de la plataforma de Camel Global deben estar registrados en el portal de conductores del socio.",
      "Los conductores deben poseer un permiso de conducción válido apropiado para la categoría de vehículo que se entrega.",
      "Los conductores deben comportarse de manera profesional y cortés en todo momento al interactuar con los clientes.",
      "Los conductores deben llevar una copia de la confirmación de reserva al entregar o recoger un vehículo.",
      "Los conductores no deben usar su teléfono móvil mientras conducen durante cualquier reserva de Camel Global.",
      "Cualquier conductor que reciba dos o más reclamaciones de clientes podrá ser retirado de la plataforma a discreción de Camel Global.",
      "Los socios son totalmente responsables de la conducta de todos los conductores registrados bajo su cuenta.",
    ],
  },
  {
    section: "7. Servicio al Cliente",
    rules: [
      "Los socios deben responder a las consultas de los clientes relacionadas con reservas activas en un plazo de 2 horas durante el horario de atención.",
      "El horario de atención se define como de 08:00 a 20:00 hora local, 7 días a la semana.",
      "Se debe proporcionar un contacto de emergencia fuera del horario de atención para todas las reservas activas.",
      "Los socios deben cumplir con cualquier reserva aceptada a través de la plataforma. Las cancelaciones iniciadas por el socio sin justificación excepcional constituyen un incumplimiento de estas reglas.",
      "Si no se puede proporcionar un vehículo debido a una avería o emergencia, se debe ofrecer un sustituto adecuado en un plazo de 2 horas.",
      "Las reclamaciones de los clientes deben ser reconocidas en un plazo de 24 horas y resueltas o escaladas en un plazo de 5 días hábiles.",
    ],
  },
  {
    section: "8. Seguro y Responsabilidad",
    rules: [
      "Los socios son totalmente responsables del seguro de todos los vehículos en la plataforma en todo momento.",
      "Debe existir un seguro a todo riesgo completo para cada vehículo alquilado a través de la plataforma.",
      "Cuando la oferta incluya 'Seguro Completo Incluido', este debe ser un seguro a todo riesgo genuino y no una renuncia a daños con franquicia.",
      "Los socios indemnizan a Camel Global frente a cualquier reclamación derivada de los vehículos, conductores u operaciones del socio.",
      "Camel Global no es responsable de ninguna pérdida, daño o lesión causada por el vehículo o conductor de un socio.",
      "Los socios deben informar de cualquier accidente, robo o incidente significativo relacionado con una reserva de Camel Global en un plazo de 24 horas.",
    ],
  },
  {
    section: "9. Ingresos y Pagos",
    rules: [
      "Camel Global cobra una comisión sobre el precio del alquiler por cada reserva completada, con una comisión mínima de 10 € por reserva. La tasa de comisión estándar es del 20%, aunque puede reducirse para socios individuales mediante acuerdo con Camel Global.",
      "Su tasa de comisión actual se muestra en su cuenta de socio y en la página de envío de ofertas. Si tiene una tasa reducida, se reflejará allí.",
      "Los cargos por combustible se transfieren al socio en su totalidad — Camel Global no cobra comisión sobre el combustible.",
      "La comisión se deduce automáticamente en el momento del pago a través de Stripe Connect — los socios reciben su importe neto directamente.",
      "Los socios son responsables de todos los impuestos aplicables sobre los ingresos recibidos a través de la plataforma.",
      "En caso de disputa de reembolso de un cliente, Camel Global puede mediar, pero la responsabilidad financiera recae en el socio.",
      "Todos los reembolsos de combustible adeudados a los clientes deben procesarse en un plazo de 5 días hábiles desde la finalización de la reserva.",
    ],
  },
  {
    section: "10. Datos y Privacidad",
    rules: [
      "Los datos del cliente compartidos a través de la plataforma (nombre, teléfono, correo electrónico, dirección de recogida/entrega) solo pueden utilizarse con el fin de cumplir la reserva.",
      "Los socios no deben utilizar los datos del cliente para marketing, retargeting ni ningún otro fin comercial.",
      "Los datos del cliente deben almacenarse de forma segura y no compartirse con terceros.",
      "Los socios deben cumplir con el RGPD (Reglamento General de Protección de Datos) y cualquier ley local de protección de datos aplicable.",
      "A petición, los datos del cliente deben eliminarse de los sistemas del socio en un plazo de 30 días.",
    ],
  },
  {
    section: "11. Suspensión y Resolución",
    rules: [
      "Camel Global puede suspender una cuenta de socio de inmediato en caso de: una reclamación grave de un cliente, incumplimiento de los estándares de vehículos o conductores, falta de cumplimiento de una reserva confirmada o tergiversación de precios o servicios.",
      "Las cuentas suspendidas serán notificadas por correo electrónico y tendrán la oportunidad de responder en un plazo de 5 días hábiles.",
      "Camel Global se reserva el derecho de cancelar permanentemente las cuentas por incumplimientos reiterados o una sola infracción grave.",
      "Los socios pueden cancelar su cuenta en cualquier momento proporcionando un aviso por escrito de 30 días, siempre que no queden reservas activas pendientes.",
      "Al cancelar la cuenta, se revocará todo el acceso a la plataforma y los datos del cliente deben eliminarse en un plazo de 30 días.",
    ],
  },
  {
    section: "12. Modificaciones",
    rules: [
      "Camel Global se reserva el derecho de modificar estas reglas operativas en cualquier momento.",
      "Los socios serán notificados de cualquier cambio material por correo electrónico con un mínimo de 14 días de antelación.",
      "El uso continuado de la plataforma tras el período de notificación constituye la aceptación de las reglas actualizadas.",
      "La versión actual de estas reglas siempre está disponible en la sección de gestión de cuentas de socios.",
    ],
  },
];

// ---------------------------------------------------------------------------
// PDF generator — bilingual when locale === "es"
// ---------------------------------------------------------------------------
export async function downloadOperatingRulesPDF(companyName: string, locale: "en" | "es" = "en") {
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

  function renderRulesSection(sections: typeof OPERATING_RULES, lang: "en" | "es") {
    for (const { section, rules } of sections) {
      checkPage(12);
      doc.setFillColor(lang === "es" ? 230 : 240, lang === "es" ? 240 : 240, lang === "es" ? 255 : 240);
      doc.rect(margin, y - 4, usableW, 9, "F");
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      doc.text(section, margin + 3, y + 2); y += 9;
      rules.forEach((rule, i) => {
        checkPage(8);
        const lines = doc.splitTextToSize(`${i + 1}.  ${rule}`, usableW - 6);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 51, 51);
        doc.text(lines, margin + 4, y);
        y += lines.length * 4.5 + 1.5;
      });
      y += 4;
    }
  }

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("CAMEL GLOBAL", margin, 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Meet and greet car hire", margin, 12);
  doc.text("Partner Operating Rules", pageW - margin, 7, { align: "right" });
  doc.text(`Issued to: ${companyName || "Partner"}`, pageW - margin, 11, { align: "right" });
  doc.text(`Generated: ${dateStr}`, pageW - margin, 15, { align: "right" });
  y = 26;

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Operating Rules", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const subtitleEN = doc.splitTextToSize(
    "These rules govern the conduct of all partners operating on the Camel Global platform. By operating as a partner you agree to comply with all sections below.",
    usableW
  );
  doc.text(subtitleEN, margin, y); y += subtitleEN.length * 4 + 4;

  if (locale === "es") {
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 160);
    const subtitleES = doc.splitTextToSize(
      "Estas reglas rigen la conducta de todos los socios que operan en la plataforma de Camel Global. Al operar como socio, usted acepta cumplir con todas las secciones a continuación.",
      usableW
    );
    doc.text(subtitleES, margin, y); y += subtitleES.length * 4 + 4;
  }

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 6;

  // English rules
  renderRulesSection(OPERATING_RULES, "en");

  if (locale === "es") {
    // Divider
    checkPage(16);
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, y, usableW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("VERSIÓN EN ESPAÑOL / SPANISH VERSION", margin + 3, y + 7);
    y += 16;
    doc.setTextColor(80, 80, 160);
    doc.setFontSize(7); doc.setFont("helvetica", "italic");
    const legalNote = doc.splitTextToSize(
      "⚠️  La versión en inglés prevalece en caso de conflicto. Esta traducción se proporciona únicamente como referencia. The English version prevails in the event of any conflict.",
      usableW
    );
    doc.text(legalNote, margin, y); y += legalNote.length * 4 + 6;
    doc.setTextColor(0, 0, 0);
    renderRulesSection(OPERATING_RULES_ES, "es");
  }

  // Footer on every page
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global — Partner Operating Rules — Generated ${dateStr} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Global-Partner-Operating-Rules-${dateStr.replace(/ /g, "-")}${locale === "es" ? "-ES" : ""}.pdf`);
}