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
      "Customer disputes & chargebacks: If a customer raises a payment dispute or chargeback with their bank or card issuer, Camel Global will place the partner's payout for that booking on hold pending resolution. The partner will be notified by email. The payout will remain on hold until the dispute is fully resolved. If resolved in the customer's favour, the payout will be forfeited. If resolved in the partner's favour, the payout will be released in the next monthly run.",
      "All fuel refunds owed to customers must be processed within 5 business days of the booking completion.",
    ],
  },
  {
    section: "9b. Invoicing Obligations",
    rules: [
      "Partners are the supplier of car hire services to customers. The contract for the provision of those services is directly between the partner and the customer. Camel Global is a marketplace intermediary only and is not a party to that contract.",
      "The booking confirmation receipt issued by Camel Global to customers is a platform payment receipt issued by NTUK Ltd. It is not a VAT invoice for car hire services and does not fulfil the partner's invoicing obligations to customers.",
      "Partners are solely responsible for issuing VAT invoices to customers in accordance with all applicable tax legislation in their jurisdiction. Where a customer requests a VAT invoice for a booking, the partner must issue one directly to the customer within a reasonable time.",
      "Camel Global does not issue VAT invoices for car hire services on behalf of partners and is not responsible for the partner's compliance with invoicing obligations.",
      "Partners must not direct customers to Camel Global to obtain a VAT invoice for car hire services. Such requests must be handled by the partner directly.",
      "It is the partner's responsibility to ensure they have the internal accounting and invoicing processes in place to meet their obligations to customers and to tax authorities. Camel Global does not provide accounting or tax advice.",
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
      "Disputas y contracargos de clientes: Si un cliente presenta una disputa de pago o contracargo ante su banco o entidad emisora de tarjeta, Camel Global retendrá el pago del socio correspondiente a esa reserva hasta que se resuelva la disputa. El socio será notificado por correo electrónico. El pago permanecerá retenido hasta la resolución completa de la disputa. Si se resuelve a favor del cliente, el pago será anulado. Si se resuelve a favor del socio, el pago se liberará en el siguiente ciclo mensual.",
      "Todos los reembolsos de combustible adeudados a los clientes deben procesarse en un plazo de 5 días hábiles desde la finalización de la reserva.",
    ],
  },
  {
    section: "9b. Obligaciones de Facturación",
    rules: [
      "Los socios son el proveedor de servicios de alquiler de vehículos a los clientes. El contrato para la prestación de dichos servicios se celebra directamente entre el socio y el cliente. Camel Global actúa únicamente como intermediario de la plataforma y no es parte de dicho contrato.",
      "El recibo de confirmación de reserva emitido por Camel Global a los clientes es un recibo de pago de la plataforma emitido por NTUK Ltd. No constituye una factura de IVA por servicios de alquiler de vehículos y no cumple las obligaciones de facturación del socio frente a los clientes.",
      "Los socios son los únicos responsables de emitir facturas de IVA a los clientes de conformidad con toda la legislación fiscal aplicable en su jurisdicción. Cuando un cliente solicite una factura de IVA por una reserva, el socio debe emitirla directamente al cliente en un plazo razonable.",
      "Camel Global no emite facturas de IVA por servicios de alquiler de vehículos en nombre de los socios y no es responsable del cumplimiento por parte del socio de sus obligaciones de facturación.",
      "Los socios no deben dirigir a los clientes a Camel Global para obtener una factura de IVA por servicios de alquiler de vehículos. Dichas solicitudes deben ser gestionadas directamente por el socio.",
      "Es responsabilidad del socio asegurarse de contar con los procesos internos de contabilidad y facturación necesarios para cumplir sus obligaciones frente a los clientes y a las autoridades fiscales. Camel Global no proporciona asesoramiento contable ni fiscal.",
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
// FR / IT / PT / DE — Generated via Claude API (Chat 53)
// FR / IT / PT / DE legal text (Chat 53)
// ---------------------------------------------------------------------------
export const OPERATING_RULES_FR: typeof OPERATING_RULES = [
  {
    section: "1. Aperçu de la plateforme",
    rules: [
      "Camel Global est une plateforme de location de voitures avec service d'accueil mettant en relation des clients avec des partenaires indépendants de location de voitures en Espagne et à l'international.",
      "Les partenaires sont des entreprises indépendantes qui acceptent d'opérer au sein de la place de marché Camel Global conformément à ces règles.",
      "Camel Global agit en tant que facilitateur de place de marché et ne possède ni n'exploite directement aucun véhicule.",
      "En vous inscrivant et en opérant en tant que partenaire, vous acceptez d'être lié dans leur intégralité par ces règles d'exploitation.",
    ],
  },
  {
    section: "2. Éligibilité et approbation des partenaires",
    rules: [
      "Toutes les candidatures de partenaires sont soumises à l'examen et à l'approbation de Camel Global avant que toute offre puisse être soumise.",
      "Les partenaires doivent détenir toutes les licences, autorisations et assurances légalement requises pour exploiter une activité de location de véhicules dans leur juridiction.",
      "Les partenaires doivent maintenir une police d'assurance responsabilité civile valide offrant une couverture minimale de €5,000,000.",
      "Les partenaires doivent disposer d'un site de base physique dans la zone de service à partir duquel les véhicules peuvent être déployés.",
      "Tout changement dans la propriété de l'entreprise, le statut juridique ou les licences d'exploitation doit être signalé à Camel Global dans un délai de 7 jours.",
      "Camel Global se réserve le droit de suspendre ou de résilier les comptes partenaires à tout moment en cas de manquement à ces règles.",
    ],
  },
  {
    section: "3. Appels d'offres et tarification",
    rules: [
      "Les partenaires peuvent soumettre une offre pour toute demande client entrant dans leur rayon de service.",
      "Tous les prix des offres doivent être soumis dans la devise de facturation désignée du partenaire (EUR, GBP ou USD).",
      "Les prix indiqués doivent être entièrement inclusifs — aucun frais supplémentaire ne peut être ajouté au client après l'acceptation d'une offre.",
      "Les prix de location de voiture doivent couvrir tous les coûts standard, y compris la livraison, la collecte et le retour du véhicule.",
      "Le dépôt de carburant indiqué doit refléter le coût réel d'un plein pour le véhicule proposé.",
      "Les partenaires ne doivent pas soumettre des offres qu'ils sont dans l'impossibilité d'honorer. Les réservations non honorées peuvent entraîner la suspension du compte.",
      "Les partenaires ne peuvent soumettre qu'une seule offre par demande client.",
      "Les fenêtres de dépôt des offres sont définies par le client au moment de la demande. Les offres soumises après expiration ne seront pas acceptées.",
    ],
  },
  {
    section: "3b. Limites de kilométrage et dépôts de garantie",
    rules: [
      "Lorsqu'un partenaire applique une limite de kilométrage à une réservation, celle-ci doit être clairement indiquée dans l'offre au moment de la soumission. Les conditions de kilométrage doivent inclure la limite ainsi que le supplément par kilomètre dépassé, afin que le client puisse prendre une décision éclairée avant d'accepter.",
      "Lorsqu'un partenaire exige un dépôt de garantie, celui-ci doit être clairement indiqué dans l'offre au moment de la soumission, en précisant le montant du dépôt ainsi que les conditions dans lesquelles il sera retenu et restitué.",
      "Les limites de kilométrage et les dépôts de garantie sont entièrement en dehors du système de paiement de Camel Global. Camel Global ne collecte, ne traite ni ne détient ces montants pour le compte des partenaires, en aucune circonstance.",
      "Le partenaire est seul responsable de la collecte de tout supplément kilométrique ou dépôt de garantie directement auprès du client au moment de la remise ou de la restitution du véhicule. Il incombe au partenaire de s'assurer qu'il dispose des moyens nécessaires pour encaisser ce paiement sur place.",
      "Les partenaires ne doivent pas utiliser les espèces comme seul moyen de collecte d'un dépôt de garantie. Un terminal de carte de crédit ou un moyen de paiement électronique équivalent doit être disponible au point de remise lorsqu'un dépôt est requis.",
      "Tout litige entre un partenaire et un client relatif à un supplément kilométrique ou à un dépôt de garantie est une affaire relevant directement de ces deux parties. Camel Global n'est pas responsable des litiges découlant de montants collectés en dehors de la plateforme et n'en assurera pas la médiation.",
      "Le fait de ne pas mentionner une limite de kilométrage ou un dépôt de garantie dans l'offre — lorsque ceux-ci sont par la suite exigés du client au moment de la prise en charge — constitue une violation des présentes règles et peut entraîner la suspension immédiate du compte.",
    ],
  },
  {
    section: "4. Normes relatives aux véhicules",
    rules: [
      "Tous les véhicules proposés doivent être en état de marche, légalement immatriculés et entièrement assurés au moment de la location.",
      "Les véhicules doivent être propres, bien entretenus et présentés au client dans un état professionnel.",
      "Le véhicule livré doit correspondre à la catégorie sur laquelle l'offre a été soumise (ex. : Berline Standard, SUV, Minivan).",
      "La substitution d'un véhicule de catégorie inférieure sans accord du client n'est pas autorisée et peut faire l'objet d'un litige.",
      "Les partenaires doivent s'assurer que tous les véhicules disposent d'au moins un plein de carburant au moment de la prise en charge.",
      "Les véhicules doivent être conformes à toutes les réglementations locales en matière d'émissions et d'environnement.",
      "La climatisation doit être entièrement fonctionnelle sur tous les véhicules proposés durant les mois d'été (avril–octobre en Espagne).",
    ],
  },
  {
    section: "5. Politique de carburant et recharge",
    rules: [
      "Camel Global applique une politique de carburant équitable : les clients ne paient que le carburant qu'ils ont utilisé, arrondi au quart de réservoir le plus proche.",
      "Le chauffeur doit enregistrer le niveau de carburant lors de la prise en charge et lors du retour du véhicule en utilisant l'application chauffeur Camel Global.",
      "Le client doit confirmer et approuver la lecture du niveau de carburant aussi bien lors de la prise en charge que lors du retour.",
      "En cas de litige concernant les niveaux de carburant, le bureau du partenaire peut annuler la lecture du chauffeur sur présentation de preuves photographiques.",
      "Les frais de carburant sont calculés automatiquement : fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Tout carburant non utilisé est remboursé au client. Les partenaires ne doivent pas conserver les montants des remboursements de carburant.",
      "Tout manquement à l'enregistrement précis des niveaux de carburant entraînant une surfacturation d'un client donnera lieu au remboursement intégral du montant contesté ainsi qu'à l'émission d'un avertissement formel.",
    ],
  },
  {
    section: "6. Normes applicables aux conducteurs",
    rules: [
      "Tous les chauffeurs envoyés via la plateforme Camel Global doivent être enregistrés dans le portail chauffeurs du partenaire.",
      "Les chauffeurs doivent être titulaires d'un permis de conduire valide adapté à la catégorie de véhicule livré.",
      "Les chauffeurs doivent se comporter de manière professionnelle et courtoise en toutes circonstances lors de leurs interactions avec les clients.",
      "Les chauffeurs doivent porter une copie de la confirmation de réservation lors de la livraison ou de la collecte d'un véhicule.",
      "Les chauffeurs ne doivent pas utiliser leur téléphone portable pendant la conduite dans le cadre d'une réservation Camel Global.",
      "Tout chauffeur ayant reçu deux réclamations clients ou plus pourra être retiré de la plateforme à la discrétion de Camel Global.",
      "Les partenaires sont entièrement responsables de la conduite de tous les chauffeurs enregistrés sous leur compte.",
    ],
  },
  {
    section: "7. Service client",
    rules: [
      "Les partenaires doivent répondre aux demandes des clients concernant les réservations actives dans un délai de 2 heures pendant les heures ouvrables.",
      "Les heures ouvrables sont définies comme étant de 08:00 à 20:00, heure locale, 7 jours sur 7.",
      "Un contact d'urgence en dehors des heures ouvrables doit être fourni pour toutes les réservations actives.",
      "Les partenaires doivent honorer toute réservation acceptée via la plateforme. Les annulations initiées par le partenaire sans justification exceptionnelle constituent une violation du présent règlement.",
      "Si un véhicule ne peut pas être fourni en raison d'une panne ou d'une urgence, un remplacement approprié doit être proposé dans un délai de 2 heures.",
      "Les réclamations des clients doivent être accusées de réception dans un délai de 24 heures et résolues ou escaladées dans un délai de 5 jours ouvrables.",
    ],
  },
  {
    section: "8. Assurance et responsabilité",
    rules: [
      "Les partenaires sont entièrement responsables de l'assurance de tous les véhicules sur la plateforme à tout moment.",
      "Une assurance tous risques complète doit être en place pour chaque véhicule loué via la plateforme.",
      "Lorsque l'offre inclut « Full Insurance Included », il doit s'agir d'une assurance véritablement tous risques et non d'une franchise de dommages avec excédent.",
      "Les partenaires indemnisent Camel Global contre toute réclamation découlant des véhicules, conducteurs ou opérations du partenaire.",
      "Camel Global n'est pas responsable de toute perte, dommage ou préjudice causé par le véhicule ou le conducteur d'un partenaire.",
      "Les partenaires doivent signaler tout accident, vol ou incident significatif impliquant une réservation Camel Global dans les 24 heures.",
    ],
  },
  {
    section: "9. Revenus et paiements",
    rules: [
      "Camel Global prélève une commission sur le prix de la location de voiture pour chaque réservation complétée, avec une commission minimale de €10 par réservation. Le taux de commission standard est de 20 %, bien que celui-ci puisse être réduit pour des partenaires individuels par accord avec Camel Global.",
      "Votre taux de commission actuel est affiché dans votre compte partenaire et sur la page de soumission d'offre. Si vous bénéficiez d'un taux réduit, celui-ci y sera reflété.",
      "Les frais de carburant sont répercutés intégralement au partenaire — Camel Global ne prélève aucune commission sur le carburant.",
      "La commission est déduite automatiquement au moment du paiement via Stripe Connect — les partenaires reçoivent directement leur montant net.",
      "Les partenaires sont responsables de l'ensemble des taxes applicables sur les revenus perçus via la plateforme.",
      "En cas de litige de remboursement client, Camel Global peut servir de médiateur, mais la responsabilité financière incombe au partenaire.",
      "Litiges clients et rétrofacturations : Si un client soulève un litige de paiement ou une rétrofacturation auprès de sa banque ou de l'émetteur de sa carte, Camel Global mettra en suspens le versement du partenaire pour cette réservation dans l'attente d'une résolution. Le partenaire sera notifié par e-mail. Le versement restera en suspens jusqu'à la résolution complète du litige. S'il est résolu en faveur du client, le versement sera perdu. S'il est résolu en faveur du partenaire, le versement sera effectué lors du prochain cycle mensuel.",
      "Tous les remboursements de carburant dus aux clients doivent être traités dans un délai de 5 jours ouvrés suivant la fin de la réservation.",
    ],
  },
  {
    section: "9b. Obligations de facturation",
    rules: [
      "Les partenaires sont le fournisseur de services de location de voitures aux clients. Le contrat pour la fourniture de ces services est directement conclu entre le partenaire et le client. Camel Global est uniquement un intermédiaire de place de marché et n'est pas partie à ce contrat.",
      "Le reçu de confirmation de réservation émis par Camel Global aux clients est un reçu de paiement de plateforme émis par NTUK Ltd. Il ne constitue pas une facture de TVA pour les services de location de voitures et ne remplit pas les obligations de facturation du partenaire envers les clients.",
      "Les partenaires sont seuls responsables de l'émission des factures de TVA aux clients conformément à l'ensemble de la législation fiscale applicable dans leur juridiction. Lorsqu'un client demande une facture de TVA pour une réservation, le partenaire doit en émettre une directement au client dans un délai raisonnable.",
      "Camel Global n'émet pas de factures de TVA pour les services de location de voitures au nom des partenaires et n'est pas responsable du respect par le partenaire de ses obligations de facturation.",
      "Les partenaires ne doivent pas diriger les clients vers Camel Global pour obtenir une facture de TVA pour les services de location de voitures. Ces demandes doivent être traitées directement par le partenaire.",
      "Il incombe au partenaire de veiller à disposer des processus comptables et de facturation internes nécessaires pour satisfaire à ses obligations envers les clients et envers les autorités fiscales. Camel Global ne fournit pas de conseils comptables ou fiscaux.",
    ],
  },
  {
    section: "10. Données et confidentialité",
    rules: [
      "Les données clients partagées via la plateforme (nom, téléphone, adresse électronique, adresse de prise en charge/dépose) ne peuvent être utilisées qu'aux fins de l'exécution de la réservation.",
      "Les Partenaires ne doivent pas utiliser les données clients à des fins de marketing, de reciblage publicitaire ou à toute autre fin commerciale.",
      "Les données clients doivent être stockées de manière sécurisée et ne doivent pas être communiquées à des tiers.",
      "Les Partenaires doivent se conformer au RGPD (Règlement Général sur la Protection des Données) ainsi qu'à toute législation locale applicable en matière de protection des données.",
      "Sur demande, les données clients doivent être supprimées des systèmes des Partenaires dans un délai de 30 jours.",
    ],
  },
  {
    section: "11. Suspension et résiliation",
    rules: [
      "Camel Global peut suspendre immédiatement un compte partenaire dans les cas suivants : une plainte grave d'un client, une violation des normes relatives aux véhicules ou aux conducteurs, le non-respect d'une réservation confirmée, ou une présentation inexacte des tarifs ou des services.",
      "Les comptes suspendus seront notifiés par e-mail et auront la possibilité de répondre dans un délai de 5 jours ouvrables.",
      "Camel Global se réserve le droit de résilier définitivement les comptes en cas de violations répétées ou d'une seule violation grave.",
      "Les partenaires peuvent résilier leur compte à tout moment en fournissant un préavis écrit de 30 jours, à condition qu'aucune réservation active ne soit en cours.",
      "À la résiliation, tout accès à la plateforme sera révoqué et les données des clients devront être supprimées dans un délai de 30 jours.",
    ],
  },
  {
    section: "12. Modifications",
    rules: [
      "Camel Global se réserve le droit de modifier ces règles de fonctionnement à tout moment.",
      "Les partenaires seront informés de toute modification substantielle par e-mail avec un préavis minimum de 14 jours.",
      "L'utilisation continue de la plateforme après la période de préavis constitue une acceptation des règles mises à jour.",
      "La version actuelle de ces règles est toujours disponible dans la section de gestion des comptes partenaires.",
    ],
  },
];

export const OPERATING_RULES_IT: typeof OPERATING_RULES = [
  {
    section: "1. Panoramica della Piattaforma",
    rules: [
      "Camel Global è una piattaforma di autonoleggio con servizio di accoglienza che mette in contatto i clienti con partner indipendenti di autonoleggio in Spagna e a livello internazionale.",
      "I partner sono imprese indipendenti che accettano di operare all'interno del marketplace di Camel Global in conformità con le presenti regole.",
      "Camel Global agisce come facilitatore del marketplace e non possiede né gestisce direttamente alcun veicolo.",
      "Registrandosi e operando come partner, si accetta di essere vincolati integralmente dalle presenti regole operative.",
    ],
  },
  {
    section: "2. Idoneità e Approvazione dei Partner",
    rules: [
      "Tutte le domande di partnership sono soggette a revisione e approvazione da parte di Camel Global prima che possano essere presentate offerte.",
      "I partner devono essere in possesso di tutte le licenze, i permessi e le assicurazioni richiesti dalla legge per esercitare un'attività di noleggio auto nella propria giurisdizione.",
      "I partner devono mantenere una polizza assicurativa di responsabilità civile valida per una copertura minima di €5.000.000.",
      "I partner devono disporre di una sede fisica all'interno dell'area di servizio dalla quale i veicoli possono essere inviati.",
      "Qualsiasi modifica alla proprietà aziendale, allo stato giuridico o alle licenze operative deve essere comunicata a Camel Global entro 7 giorni.",
      "Camel Global si riserva il diritto di sospendere o risolvere gli account dei partner in qualsiasi momento in caso di violazione del presente regolamento.",
    ],
  },
  {
    section: "3. Offerte e Prezzi",
    rules: [
      "I Partner possono fare offerte su qualsiasi richiesta del cliente che rientri nel loro raggio di servizio.",
      "Tutti i prezzi delle offerte devono essere inviati nella valuta di fatturazione designata del Partner (EUR, GBP o USD).",
      "I prezzi indicati devono essere comprensivi di tutto — nessun costo aggiuntivo può essere addebitato al cliente dopo l'accettazione di un'offerta.",
      "I prezzi per il noleggio auto devono coprire tutti i costi standard, inclusi la consegna, il ritiro e la restituzione del veicolo.",
      "Il deposito carburante indicato deve riflettere il costo effettivo del pieno del veicolo offerto.",
      "I Partner non devono inviare offerte che non sono in grado di soddisfare. Le prenotazioni non evase possono comportare la sospensione dell'account.",
      "I Partner possono inviare una sola offerta per richiesta del cliente.",
      "Le finestre temporali per le offerte sono stabilite dal cliente al momento della richiesta. Le offerte inviate dopo la scadenza non verranno accettate.",
    ],
  },
  {
    section: "3b. Limiti di Chilometraggio e Depositi Cauzionali",
    rules: [
      "Qualora un partner applichi un limite di chilometraggio a una prenotazione, questo deve essere chiaramente indicato nell'offerta al momento della presentazione. Le condizioni relative al chilometraggio devono includere il limite e il costo aggiuntivo per chilometro eccedente, affinché il cliente possa prendere una decisione informata prima di accettare.",
      "Qualora un partner richieda un deposito cauzionale, questo deve essere chiaramente indicato nell'offerta al momento della presentazione, compresi l'importo del deposito e le condizioni in base alle quali sarà trattenuto e svincolato.",
      "I limiti di chilometraggio e i depositi cauzionali esulano completamente dal sistema di pagamento di Camel Global. Camel Global non raccoglie, non elabora e non trattiene tali importi per conto dei partner in nessuna circostanza.",
      "Il partner è l'unico responsabile della riscossione di eventuali costi per chilometraggio eccedente o depositi cauzionali direttamente dal cliente al momento della consegna o della restituzione del veicolo. È responsabilità del partner assicurarsi di disporre dei mezzi necessari per ricevere tale pagamento in quella sede.",
      "I partner non devono utilizzare il contante come unico mezzo per la riscossione di un deposito cauzionale. Deve essere disponibile un terminale per carte di credito o un metodo di pagamento elettronico equivalente al momento della consegna, qualora sia richiesto un deposito.",
      "Qualsiasi controversia tra un partner e un cliente relativa a un costo per chilometraggio o a un deposito cauzionale è una questione che riguarda direttamente le due parti. Camel Global non è responsabile e non sarà parte in causa nelle controversie derivanti da importi riscossi al di fuori della piattaforma.",
      "La mancata indicazione di un limite di chilometraggio o di un deposito cauzionale nell'offerta — qualora questi vengano successivamente richiesti al cliente al momento del ritiro — costituisce una violazione del presente regolamento e può comportare la sospensione immediata dell'account.",
    ],
  },
  {
    section: "4. Standard dei Veicoli",
    rules: [
      "Tutti i veicoli offerti devono essere idonei alla circolazione, regolarmente immatricolati e completamente assicurati al momento del noleggio.",
      "I veicoli devono essere puliti, ben mantenuti e presentati al cliente in condizioni professionali.",
      "Il veicolo consegnato deve corrispondere alla categoria per cui è stata presentata l'offerta (ad esempio Berlina Standard, SUV, Minivan).",
      "La sostituzione con un veicolo di categoria inferiore senza il consenso del cliente non è consentita e può dare luogo a una contestazione.",
      "I partner devono garantire che tutti i veicoli abbiano almeno il serbatoio pieno al momento del ritiro.",
      "I veicoli devono essere conformi a tutte le normative locali in materia di emissioni e tutela ambientale.",
      "L'aria condizionata deve essere perfettamente funzionante su tutti i veicoli offerti durante i mesi estivi (aprile–ottobre in Spagna).",
    ],
  },
  {
    section: "5. Politica del Carburante e Ricarica",
    rules: [
      "Camel Global applica una politica equa sul carburante: i clienti pagano solo per il carburante effettivamente utilizzato, arrotondato al quarto di serbatoio più vicino.",
      "Il conducente deve registrare il livello del carburante al momento del ritiro e della restituzione tramite l'app per conducenti di Camel Global.",
      "Il cliente deve confermare e concordare con la lettura del carburante sia nella fase di ritiro che in quella di restituzione.",
      "In caso di contestazione sui livelli di carburante, l'ufficio del partner può sovrascrivere la lettura del conducente fornendo prove fotografiche.",
      "I costi del carburante vengono calcolati automaticamente: fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Il carburante non utilizzato viene rimborsato al cliente. I partner non devono trattenere gli importi dei rimborsi sul carburante.",
      "La mancata registrazione accurata dei livelli di carburante che comporti un addebito eccessivo al cliente comporterà il rimborso integrale dell'importo contestato e l'emissione di un avvertimento formale.",
    ],
  },
  {
    section: "6. Standard dei Conducenti",
    rules: [
      "Tutti i conducenti inviati tramite la piattaforma Camel Global devono essere registrati nel portale conducenti del partner.",
      "I conducenti devono essere in possesso di una patente di guida valida e appropriata per la categoria del veicolo da consegnare.",
      "I conducenti devono comportarsi in modo professionale e cortese in ogni momento durante le interazioni con i clienti.",
      "I conducenti devono portare con sé una copia della conferma di prenotazione durante la consegna o il ritiro di un veicolo.",
      "I conducenti non devono utilizzare il telefono cellulare mentre guidano nel corso di qualsiasi prenotazione Camel Global.",
      "Qualsiasi conducente che riceva due o più reclami da parte dei clienti potrà essere rimosso dalla piattaforma a discrezione di Camel Global.",
      "I partner sono pienamente responsabili della condotta di tutti i conducenti registrati sotto il loro account.",
    ],
  },
  {
    section: "7. Servizio Clienti",
    rules: [
      "I Partner devono rispondere alle richieste dei clienti relative alle prenotazioni attive entro 2 ore durante l'orario lavorativo.",
      "L'orario lavorativo è definito come 08:00–20:00 ora locale, 7 giorni su 7.",
      "Per tutte le prenotazioni attive deve essere fornito un contatto di emergenza fuori orario.",
      "I Partner devono onorare qualsiasi prenotazione accettata tramite la piattaforma. Le cancellazioni avviate dal Partner senza giustificazione eccezionale costituiscono una violazione del presente regolamento.",
      "Se un veicolo non può essere fornito a causa di un guasto o di un'emergenza, una sostituzione idonea deve essere offerta entro 2 ore.",
      "I reclami dei clienti devono essere confermati entro 24 ore e risolti o escalati entro 5 giorni lavorativi.",
    ],
  },
  {
    section: "8. Assicurazione e Responsabilità",
    rules: [
      "I Partner sono pienamente responsabili dell'assicurazione di tutti i veicoli sulla piattaforma in qualsiasi momento.",
      "Per ogni veicolo noleggiato tramite la piattaforma deve essere in vigore una polizza assicurativa completamente a copertura totale.",
      "Qualora l'offerta includa \"Assicurazione Completa Inclusa\", questa deve essere una polizza assicurativa genuinamente a copertura totale e non una rinuncia ai danni con franchigia.",
      "I Partner tengono indenne Camel Global da qualsiasi rivendicazione derivante dai veicoli, dai conducenti o dalle operazioni del Partner.",
      "Camel Global non è responsabile per alcuna perdita, danno o lesione causata da un veicolo o da un conducente del Partner.",
      "I Partner devono segnalare qualsiasi incidente, furto o evento significativo riguardante una prenotazione Camel Global entro 24 ore.",
    ],
  },
  {
    section: "9. Ricavi e Pagamenti",
    rules: [
      "Camel Global applica una commissione sul prezzo del noleggio auto per ogni prenotazione completata, con una commissione minima di €10 per prenotazione. Il tasso di commissione standard è del 20%, sebbene questo possa essere ridotto per i singoli partner previo accordo con Camel Global.",
      "Il tasso di commissione attuale è visualizzato nel tuo account partner e nella pagina di invio dell'offerta. Se disponi di un tasso ridotto, sarà indicato in tale sede.",
      "I costi del carburante vengono trasferiti integralmente al partner — Camel Global non applica alcuna commissione sul carburante.",
      "La commissione viene dedotta automaticamente al momento del pagamento tramite Stripe Connect — i partner ricevono direttamente il proprio importo netto.",
      "I partner sono responsabili di tutte le imposte applicabili sui proventi ricevuti tramite la piattaforma.",
      "In caso di contestazione di rimborso da parte del cliente, Camel Global può fungere da mediatore, ma la responsabilità finanziaria ricade sul partner.",
      "Contestazioni dei clienti e storni di addebito: qualora un cliente presenti una contestazione di pagamento o uno storno di addebito presso la propria banca o l'emittente della carta, Camel Global sospenderà il pagamento al partner per quella prenotazione in attesa della risoluzione. Il partner sarà informato via e-mail. Il pagamento rimarrà sospeso fino alla piena risoluzione della contestazione. Se la contestazione viene risolta a favore del cliente, il pagamento sarà perso. Se risolta a favore del partner, il pagamento sarà erogato nella successiva elaborazione mensile.",
      "Tutti i rimborsi del carburante dovuti ai clienti devono essere elaborati entro 5 giorni lavorativi dal completamento della prenotazione.",
    ],
  },
  {
    section: "9b. Obblighi di Fatturazione",
    rules: [
      "I partner sono i fornitori dei servizi di noleggio auto ai clienti. Il contratto per la fornitura di tali servizi è direttamente tra il partner e il cliente. Camel Global è esclusivamente un intermediario di marketplace e non è parte di tale contratto.",
      "La ricevuta di conferma della prenotazione emessa da Camel Global ai clienti è una ricevuta di pagamento della piattaforma emessa da NTUK Ltd. Non costituisce una fattura IVA per i servizi di noleggio auto e non adempie agli obblighi di fatturazione del partner nei confronti dei clienti.",
      "I partner sono gli unici responsabili dell'emissione di fatture IVA ai clienti in conformità con tutta la normativa fiscale applicabile nella loro giurisdizione. Qualora un cliente richieda una fattura IVA per una prenotazione, il partner deve emetterla direttamente al cliente entro un tempo ragionevole.",
      "Camel Global non emette fatture IVA per i servizi di noleggio auto per conto dei partner e non è responsabile della conformità del partner agli obblighi di fatturazione.",
      "I partner non devono indirizzare i clienti a Camel Global per ottenere una fattura IVA per i servizi di noleggio auto. Tali richieste devono essere gestite direttamente dal partner.",
      "È responsabilità del partner assicurarsi di disporre di processi contabili e di fatturazione interni adeguati per adempiere ai propri obblighi nei confronti dei clienti e delle autorità fiscali. Camel Global non fornisce consulenza contabile o fiscale.",
    ],
  },
  {
    section: "10. Dati e Privacy",
    rules: [
      "I dati dei clienti condivisi tramite la piattaforma (nome, telefono, email, indirizzo di partenza/destinazione) possono essere utilizzati esclusivamente ai fini dell'evasione della prenotazione.",
      "I Partner non devono utilizzare i dati dei clienti per attività di marketing, re-targeting o qualsiasi altro scopo commerciale.",
      "I dati dei clienti devono essere archiviati in modo sicuro e non condivisi con terze parti.",
      "I Partner devono conformarsi al GDPR (Regolamento Generale sulla Protezione dei Dati) e a qualsiasi legge locale applicabile in materia di protezione dei dati.",
      "Su richiesta, i dati dei clienti devono essere eliminati dai sistemi dei Partner entro 30 giorni.",
    ],
  },
  {
    section: "11. Sospensione e Risoluzione",
    rules: [
      "Camel Global può sospendere immediatamente un account partner nei seguenti casi: un grave reclamo da parte di un cliente, violazione degli standard relativi ai veicoli o ai conducenti, mancato adempimento di una prenotazione confermata, o dichiarazione falsa di prezzi o servizi.",
      "Gli account sospesi saranno notificati via e-mail e avranno la possibilità di rispondere entro 5 giorni lavorativi.",
      "Camel Global si riserva il diritto di terminare definitivamente gli account in caso di violazioni ripetute o di una singola grave infrazione.",
      "I partner possono terminare il proprio account in qualsiasi momento fornendo un preavviso scritto di 30 giorni, a condizione che non vi siano prenotazioni attive in sospeso.",
      "Al momento della cessazione, tutti gli accessi alla piattaforma saranno revocati e i dati dei clienti dovranno essere eliminati entro 30 giorni.",
    ],
  },
  {
    section: "12. Modifiche",
    rules: [
      "Camel Global si riserva il diritto di modificare le presenti norme operative in qualsiasi momento.",
      "I partner saranno informati di qualsiasi modifica sostanziale tramite e-mail con un preavviso minimo di 14 giorni.",
      "Il continuo utilizzo della piattaforma dopo il periodo di preavviso costituisce accettazione delle norme aggiornate.",
      "La versione corrente delle presenti norme è sempre disponibile nella sezione di gestione dell'account partner.",
    ],
  },
];

export const OPERATING_RULES_PT: typeof OPERATING_RULES = [
  {
    section: "1. Visão Geral da Plataforma",
    rules: [
      "Camel Global é uma plataforma de aluguer de automóveis com serviço de receção e entrega que conecta clientes com parceiros independentes de aluguer de automóveis em Espanha e a nível internacional.",
      "Os parceiros são empresas independentes que concordam em operar dentro do mercado Camel Global em conformidade com estas regras.",
      "Camel Global atua como facilitador do mercado e não possui nem opera quaisquer veículos diretamente.",
      "Ao registar-se e operar como parceiro, concorda em ficar vinculado a estas regras operacionais na íntegra.",
    ],
  },
  {
    section: "2. Elegibilidade e Aprovação de Parceiros",
    rules: [
      "Todas as candidaturas de parceiros estão sujeitas a revisão e aprovação por parte da Camel Global antes de qualquer proposta poder ser submetida.",
      "Os parceiros devem deter todas as licenças, autorizações e seguros legalmente exigidos para operar um negócio de aluguer de automóveis na sua jurisdição.",
      "Os parceiros devem manter uma apólice de seguro de responsabilidade civil válida com uma cobertura mínima de €5,000,000.",
      "Os parceiros devem dispor de uma instalação física dentro da área de serviço a partir da qual os veículos possam ser despachados.",
      "Qualquer alteração na titularidade da empresa, no estatuto jurídico ou nas licenças de operação deve ser comunicada à Camel Global no prazo de 7 dias.",
      "A Camel Global reserva-se o direito de suspender ou encerrar contas de parceiros a qualquer momento em caso de incumprimento das presentes regras.",
    ],
  },
  {
    section: "3. Licitação e Preços",
    rules: [
      "Os parceiros podem fazer licitações em qualquer solicitação de cliente que esteja dentro do seu raio de atendimento.",
      "Todos os preços das licitações devem ser submetidos na moeda de faturação designada do parceiro (EUR, GBP ou USD).",
      "Os preços cotados devem ser totalmente inclusivos — nenhuma cobrança adicional pode ser adicionada ao cliente após a aceitação de uma licitação.",
      "Os preços de aluguer de automóveis devem cobrir todos os custos padrão, incluindo entrega, recolha e devolução do veículo.",
      "O depósito de combustível cotado deve refletir o custo real do depósito completo do veículo oferecido.",
      "Os parceiros não devem submeter licitações que não sejam capazes de cumprir. Reservas não cumpridas podem resultar na suspensão da conta.",
      "Os parceiros só podem submeter uma licitação por solicitação de cliente.",
      "Os períodos de licitação são definidos pelo cliente no momento do pedido. As licitações submetidas após o prazo de expiração não serão aceites.",
    ],
  },
  {
    section: "3b. Limites de Quilometragem e Depósitos de Segurança",
    rules: [
      "Quando um parceiro aplica um limite de quilometragem a uma reserva, este deve ser claramente indicado na proposta no momento da submissão. Os termos de quilometragem devem incluir o limite e o custo adicional por quilómetro excedido, de modo a que o cliente possa tomar uma decisão informada antes de aceitar.",
      "Quando um parceiro exige um depósito de segurança, este deve ser claramente indicado na proposta no momento da submissão, incluindo o valor do depósito e as condições em que será retido e devolvido.",
      "Os limites de quilometragem e os depósitos de segurança estão inteiramente fora do sistema de pagamento da Camel Global. A Camel Global não cobra, processa nem retém estes montantes em nome dos parceiros em nenhuma circunstância.",
      "O parceiro é o único responsável pela cobrança de qualquer encargo por excesso de quilometragem ou depósito de segurança diretamente ao cliente no momento da entrega ou devolução do veículo. É da responsabilidade do parceiro garantir que dispõe dos meios necessários para receber esse pagamento no local.",
      "Os parceiros não podem utilizar dinheiro como único meio de cobrança de um depósito de segurança. Deve estar disponível um terminal de cartão de crédito ou método de pagamento eletrónico equivalente no local de entrega sempre que seja exigido um depósito.",
      "Qualquer litígio entre um parceiro e um cliente relacionado com um encargo de quilometragem ou depósito de segurança é uma questão a ser resolvida diretamente entre essas duas partes. A Camel Global não é responsável por, e não mediará, litígios decorrentes de montantes cobrados fora da plataforma.",
      "A não divulgação de um limite de quilometragem ou depósito de segurança na proposta — quando este seja posteriormente exigido ao cliente no momento da recolha — constitui uma violação destas regras e pode resultar na suspensão imediata da conta.",
    ],
  },
  {
    section: "4. Padrões de Veículos",
    rules: [
      "Todos os veículos oferecidos devem estar em condições de circulação, legalmente registados e totalmente segurados no momento da contratação.",
      "Os veículos devem estar limpos, bem conservados e apresentados ao cliente em condições profissionais.",
      "O veículo entregue deve corresponder à categoria para a qual foi feita a proposta (por exemplo, Berlina Standard, SUV, Minivan).",
      "A substituição por um veículo de categoria inferior sem acordo do cliente não é permitida e pode resultar numa disputa.",
      "Os parceiros devem garantir que todos os veículos têm pelo menos o depósito cheio no momento da recolha.",
      "Os veículos devem cumprir todas as regulamentações locais em matéria de emissões e ambiente.",
      "O ar condicionado deve estar em pleno funcionamento em todos os veículos oferecidos durante os meses de verão (abril–outubro em Espanha).",
    ],
  },
  {
    section: "5. Política de Combustível e Carregamento",
    rules: [
      "A Camel Global opera uma política de combustível justa: os clientes pagam apenas pelo combustível que utilizam, arredondado ao quarto de tanque mais próximo.",
      "O motorista deve registar o nível de combustível na recolha e na devolução através da aplicação de motorista da Camel Global.",
      "O cliente deve confirmar e concordar com a leitura de combustível tanto na fase de recolha como na de devolução.",
      "Em caso de disputa sobre os níveis de combustível, o escritório do parceiro pode substituir a leitura do motorista com prova fotográfica.",
      "As cobranças de combustível são calculadas automaticamente: fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Qualquer combustível não utilizado é reembolsado ao cliente. Os parceiros não podem reter valores de reembolso de combustível.",
      "A falha no registo preciso dos níveis de combustível que resulte em cobrança excessiva ao cliente implicará o reembolso total do montante disputado e a emissão de um aviso formal.",
    ],
  },
  {
    section: "6. Padrões de Condutores",
    rules: [
      "Todos os motoristas despachados através da plataforma Camel Global devem estar registados no portal de motoristas do parceiro.",
      "Os motoristas devem possuir uma carta de condução válida e adequada à categoria de veículo que está a ser entregue.",
      "Os motoristas devem comportar-se de forma profissional e cortês em todos os momentos ao interagir com os clientes.",
      "Os motoristas devem transportar uma cópia da confirmação da reserva ao entregar ou recolher um veículo.",
      "Os motoristas não devem utilizar o telemóvel enquanto conduzem durante qualquer reserva da Camel Global.",
      "Qualquer motorista que receba duas ou mais reclamações de clientes poderá ser removido da plataforma a critério da Camel Global.",
      "Os parceiros são totalmente responsáveis pela conduta de todos os motoristas registados na sua conta.",
    ],
  },
  {
    section: "7. Atendimento ao Cliente",
    rules: [
      "Os Parceiros devem responder a consultas de clientes relacionadas com reservas ativas no prazo de 2 horas durante o horário de expediente.",
      "O horário de expediente é definido como 08:00–20:00, horário local, 7 dias por semana.",
      "Deve ser fornecido um contacto de emergência fora do horário de expediente para todas as reservas ativas.",
      "Os Parceiros devem honrar qualquer reserva aceite através da plataforma. Cancelamentos iniciados pelo Parceiro sem justificação excecional constituem uma violação destas regras.",
      "Se um veículo não puder ser disponibilizado devido a avaria ou emergência, deverá ser oferecida uma substituição adequada no prazo de 2 horas.",
      "As reclamações de clientes devem ser reconhecidas no prazo de 24 horas e resolvidas ou escaladas no prazo de 5 dias úteis.",
    ],
  },
  {
    section: "8. Seguro e Responsabilidade",
    rules: [
      "Os Parceiros são totalmente responsáveis pelo seguro de todos os veículos na plataforma em todos os momentos.",
      "Um seguro totalmente compreensivo deve estar em vigor para cada veículo alugado através da plataforma.",
      "Quando a proposta inclui 'Full Insurance Included', este deve ser um seguro genuinamente compreensivo e não uma isenção de danos com franquia.",
      "Os Parceiros indemnizam a Camel Global contra quaisquer reclamações decorrentes dos veículos, condutores ou operações do parceiro.",
      "A Camel Global não é responsável por qualquer perda, dano ou lesão causados pelo veículo ou condutor de um parceiro.",
      "Os Parceiros devem comunicar qualquer acidente, roubo ou incidente significativo envolvendo uma reserva da Camel Global no prazo de 24 horas.",
    ],
  },
  {
    section: "9. Receitas e Pagamentos",
    rules: [
      "A Camel Global cobra uma comissão sobre o preço do aluguer de automóvel por cada reserva concluída, com uma comissão mínima de €10 por reserva. A taxa de comissão padrão é de 20%, podendo ser reduzida para parceiros individuais mediante acordo com a Camel Global.",
      "A sua taxa de comissão atual é apresentada na sua conta de parceiro e na página de submissão de propostas. Caso disponha de uma taxa reduzida, esta será refletida nesses locais.",
      "Os encargos de combustível são repercutidos integralmente ao parceiro — a Camel Global não cobra qualquer comissão sobre o combustível.",
      "A comissão é deduzida automaticamente no momento do pagamento através do Stripe Connect — os parceiros recebem o valor líquido diretamente.",
      "Os parceiros são responsáveis por todos os impostos aplicáveis sobre os rendimentos recebidos através da plataforma.",
      "Em caso de disputa de reembolso por parte do cliente, a Camel Global poderá atuar como mediadora, sendo a responsabilidade financeira do parceiro.",
      "Disputas de clientes e estornos: Caso um cliente inicie uma disputa de pagamento ou um estorno junto do seu banco ou emissor de cartão, a Camel Global suspenderá o pagamento ao parceiro referente a essa reserva até à resolução do processo. O parceiro será notificado por correio eletrónico. O pagamento permanecerá suspenso até que a disputa seja totalmente resolvida. Se a disputa for resolvida a favor do cliente, o pagamento será perdido. Se for resolvida a favor do parceiro, o pagamento será libertado no próximo processamento mensal.",
      "Todos os reembolsos de combustível devidos aos clientes devem ser processados no prazo de 5 dias úteis após a conclusão da reserva.",
    ],
  },
  {
    section: "9b. Obrigações de Faturação",
    rules: [
      "Os parceiros são os fornecedores de serviços de aluguer de automóveis aos clientes. O contrato para a prestação desses serviços é estabelecido diretamente entre o parceiro e o cliente. A Camel Global é apenas um intermediário de marketplace e não é parte desse contrato.",
      "O recibo de confirmação de reserva emitido pela Camel Global aos clientes é um recibo de pagamento da plataforma emitido pela NTUK Ltd. Não constitui uma fatura de IVA pelos serviços de aluguer de automóveis e não cumpre as obrigações de faturação do parceiro perante os clientes.",
      "Os parceiros são os únicos responsáveis pela emissão de faturas de IVA aos clientes, em conformidade com toda a legislação fiscal aplicável na sua jurisdição. Quando um cliente solicita uma fatura de IVA relativa a uma reserva, o parceiro deve emiti-la diretamente ao cliente num prazo razoável.",
      "A Camel Global não emite faturas de IVA pelos serviços de aluguer de automóveis em nome dos parceiros e não é responsável pelo cumprimento das obrigações de faturação por parte do parceiro.",
      "Os parceiros não devem encaminhar os clientes para a Camel Global com o objetivo de obter uma fatura de IVA pelos serviços de aluguer de automóveis. Esses pedidos devem ser tratados diretamente pelo parceiro.",
      "É da responsabilidade do parceiro garantir que dispõe dos processos internos de contabilidade e faturação necessários para cumprir as suas obrigações perante os clientes e as autoridades fiscais. A Camel Global não presta aconselhamento contabilístico ou fiscal.",
    ],
  },
  {
    section: "10. Dados e Privacidade",
    rules: [
      "Os dados dos clientes partilhados através da plataforma (nome, telefone, email, endereço de recolha/entrega) só podem ser utilizados para fins de cumprimento da reserva.",
      "Os Parceiros não podem utilizar os dados dos clientes para fins de marketing, retargeting ou qualquer outro propósito comercial.",
      "Os dados dos clientes devem ser armazenados de forma segura e não podem ser partilhados com terceiros.",
      "Os Parceiros devem cumprir o RGPD (Regulamento Geral sobre a Proteção de Dados) e quaisquer leis locais de proteção de dados aplicáveis.",
      "Mediante solicitação, os dados dos clientes devem ser eliminados dos sistemas dos parceiros no prazo de 30 dias.",
    ],
  },
  {
    section: "11. Suspensão e Rescisão",
    rules: [
      "A Camel Global pode suspender uma conta de parceiro imediatamente nos seguintes casos: uma reclamação grave de cliente, violação dos padrões de veículo ou condutor, incumprimento de uma reserva confirmada, ou deturpação de preços ou serviços.",
      "As contas suspensas serão notificadas por e-mail e terão a oportunidade de responder no prazo de 5 dias úteis.",
      "A Camel Global reserva-se o direito de encerrar permanentemente contas por violações repetidas ou por uma única infração grave.",
      "Os parceiros podem encerrar a sua conta a qualquer momento mediante aviso prévio por escrito de 30 dias, desde que não existam reservas ativas pendentes.",
      "Após o encerramento, todo o acesso à plataforma será revogado e os dados dos clientes deverão ser eliminados no prazo de 30 dias.",
    ],
  },
  {
    section: "12. Alterações",
    rules: [
      "Camel Global reserva o direito de alterar estas regras operacionais a qualquer momento.",
      "Os parceiros serão notificados de quaisquer alterações materiais por e-mail com um aviso mínimo de 14 dias.",
      "A utilização continuada da plataforma após o período de aviso constitui aceitação das regras atualizadas.",
      "A versão atual destas regras está sempre disponível na secção de gestão de conta do parceiro.",
    ],
  },
];

export const OPERATING_RULES_DE: typeof OPERATING_RULES = [
  {
    section: "1. Plattformübersicht",
    rules: [
      "Camel Global ist eine Meet-and-Greet-Mietwagenplattform, die Kunden mit unabhängigen Mietwagenpartnern in Spanien und international zusammenbringt.",
      "Partner sind eigenständige Unternehmen, die sich bereit erklären, im Rahmen dieser Regeln innerhalb des Camel Global Marktplatzes tätig zu sein.",
      "Camel Global fungiert als Marktplatzvermittler und besitzt oder betreibt keine Fahrzeuge direkt.",
      "Mit der Registrierung und dem Betrieb als Partner erklären Sie sich vollumfänglich mit diesen Betriebsregeln einverstanden.",
    ],
  },
  {
    section: "2. Partner-Berechtigung & Genehmigung",
    rules: [
      "Alle Partnerbewerbungen unterliegen der Prüfung und Genehmigung durch Camel Global, bevor Angebote eingereicht werden können.",
      "Partner müssen alle gesetzlich vorgeschriebenen Lizenzen, Genehmigungen und Versicherungen besitzen, die für den Betrieb eines Mietwagenunternehmens in ihrer Rechtsordnung erforderlich sind.",
      "Partner müssen eine gültige Betriebshaftpflichtversicherung mit einer Mindestdeckungssumme von €5.000.000 vorhalten.",
      "Partner müssen über einen festen Betriebsstandort innerhalb des Servicegebiets verfügen, von dem aus Fahrzeuge eingesetzt werden können.",
      "Jede Änderung der Gesellschafterstruktur, des Rechtsstatus oder der Betriebslizenzen muss Camel Global innerhalb von 7 Tagen gemeldet werden.",
      "Camel Global behält sich das Recht vor, Partnerkonten jederzeit bei Verstoß gegen diese Regelungen zu sperren oder zu kündigen.",
    ],
  },
  {
    section: "3. Gebote & Preisgestaltung",
    rules: [
      "Partner können auf jede Kundenanfrage bieten, die in ihren Serviceradius fällt.",
      "Alle Angebotspreise müssen in der vom Partner festgelegten Abrechnungswährung (EUR, GBP oder USD) eingereicht werden.",
      "Die angegebenen Preise müssen vollständig inklusiv sein – nach Annahme eines Angebots dürfen dem Kunden keine zusätzlichen Gebühren berechnet werden.",
      "Mietwagenpreise müssen alle Standardkosten einschließlich Fahrzeuglieferung, Abholung und Rückgabe abdecken.",
      "Die angegebene Kraftstoffkaution muss den tatsächlichen Kosten für einen vollen Tank des angebotenen Fahrzeugs entsprechen.",
      "Partner dürfen keine Angebote einreichen, die sie nicht erfüllen können. Nicht erfüllte Buchungen können zur Kontosperrung führen.",
      "Partner dürfen pro Kundenanfrage nur ein einziges Angebot einreichen.",
      "Angebotszeiträume werden vom Kunden zum Zeitpunkt der Anfrage festgelegt. Nach Ablauf eingereichte Angebote werden nicht akzeptiert.",
    ],
  },
  {
    section: "3b. Kilometerbegrenzungen & Sicherheitseinlagen",
    rules: [
      "Wenn ein Partner für eine Buchung ein Kilometerlimit festlegt, muss dies zum Zeitpunkt der Angebotsabgabe klar im Angebot angegeben werden. Die Kilometerbedingungen müssen das Limit sowie den Aufpreis pro Kilometer bei Überschreitung enthalten, damit der Kunde vor der Annahme eine informierte Entscheidung treffen kann.",
      "Wenn ein Partner eine Kaution verlangt, muss dies zum Zeitpunkt der Angebotsabgabe klar im Angebot angegeben werden, einschließlich des Kautionsbetrags sowie der Bedingungen, unter denen diese einbehalten und freigegeben wird.",
      "Kilometerlimits und Kautionen liegen vollständig außerhalb des Zahlungssystems von Camel Global. Camel Global erhebt, verarbeitet oder verwahrt diese Beträge unter keinen Umständen im Auftrag von Partnern.",
      "Der Partner trägt die alleinige Verantwortung dafür, etwaige Kilometerüberschreitungsgebühren oder Kautionen direkt vom Kunden bei der Fahrzeugübergabe oder -rückgabe einzuziehen. Es liegt in der Verantwortung des Partners sicherzustellen, dass er über die Mittel verfügt, diese Zahlung an dem jeweiligen Ort entgegenzunehmen.",
      "Partner dürfen Barzahlung nicht als einzige Methode zur Einziehung einer Kaution verwenden. An der Übergabestelle muss ein Kreditkartenterminal oder eine gleichwertige elektronische Zahlungsmethode verfügbar sein, sofern eine Kaution erforderlich ist.",
      "Jede Streitigkeit zwischen einem Partner und einem Kunden in Bezug auf eine Kilometergebühr oder Kaution ist eine Angelegenheit zwischen diesen beiden Parteien direkt. Camel Global haftet nicht für Streitigkeiten, die aus außerhalb der Plattform eingezogenen Beträgen entstehen, und wird in solchen Streitigkeiten auch nicht vermitteln.",
      "Das Unterlassen der Angabe eines Kilometerlimits oder einer Kaution im Angebot — sofern diese beim Kunden bei der Abholung nachträglich gefordert werden — stellt einen Verstoß gegen diese Regeln dar und kann zur sofortigen Kontosperrung führen.",
    ],
  },
  {
    section: "4. Fahrzeugstandards",
    rules: [
      "Alle angebotenen Fahrzeuge müssen zum Zeitpunkt der Anmietung verkehrssicher, ordnungsgemäß zugelassen und vollständig versichert sein.",
      "Die Fahrzeuge müssen sauber, gut gepflegt und dem Kunden in einem professionellen Zustand übergeben werden.",
      "Das gelieferte Fahrzeug muss der ausgeschriebenen Kategorie entsprechen (z. B. Standard-Limousine, SUV, Minivan).",
      "Das Ersetzen eines Fahrzeugs durch eine niedrigere Kategorie ohne Zustimmung des Kunden ist nicht gestattet und kann zu einer Streitigkeit führen.",
      "Partner müssen sicherstellen, dass alle Fahrzeuge zum Zeitpunkt der Abholung mindestens einen vollen Tank haben.",
      "Fahrzeuge müssen alle lokalen Emissions- und Umweltvorschriften einhalten.",
      "Die Klimaanlage muss in allen angebotenen Fahrzeugen während der Sommermonate (April–Oktober in Spanien) voll funktionsfähig sein.",
    ],
  },
  {
    section: "5. Kraftstoffrichtlinie & Abrechnung",
    rules: [
      "Camel Global betreibt eine faire Kraftstoffrichtlinie: Kunden zahlen nur für den verbrauchten Kraftstoff, gerundet auf das nächste Vierteltank.",
      "Der Fahrer muss den Kraftstoffstand bei der Abholung und bei der Rückgabe über die Camel Global Fahrer-App erfassen.",
      "Der Kunde muss die Kraftstoffablesung sowohl bei der Abholung als auch bei der Rückgabe bestätigen und akzeptieren.",
      "Im Falle einer Streitigkeit über den Kraftstoffstand kann das Büro des Partners die Fahrerablesung durch fotografische Nachweise überschreiben.",
      "Kraftstoffkosten werden automatisch berechnet: fuel_charge = (quarters_used / 4) × full_tank_price.",
      "Nicht verbrauchter Kraftstoff wird dem Kunden erstattet. Partner dürfen Kraftstofferstattungsbeträge nicht einbehalten.",
      "Wird der Kraftstoffstand ungenau erfasst und führt dies zu einer Überlastung des Kunden, wird der vollständige streitige Betrag erstattet und eine formelle Verwarnung ausgesprochen.",
    ],
  },
  {
    section: "6. Fahrerstandards",
    rules: [
      "Alle über die Camel Global Plattform eingesetzten Fahrer müssen im Fahrerportal des Partners registriert sein.",
      "Fahrer müssen einen gültigen Führerschein besitzen, der der jeweiligen Fahrzeugkategorie entspricht.",
      "Fahrer müssen im Umgang mit Kunden stets professionell und höflich auftreten.",
      "Fahrer müssen bei der Lieferung oder Abholung eines Fahrzeugs eine Kopie der Buchungsbestätigung mitführen.",
      "Fahrer dürfen während der Fahrt im Rahmen einer Camel Global Buchung ihr Mobiltelefon nicht benutzen.",
      "Jeder Fahrer, der zwei oder mehr Kundenbeschwerden erhält, kann nach eigenem Ermessen von Camel Global von der Plattform ausgeschlossen werden.",
      "Partner tragen die volle Verantwortung für das Verhalten aller unter ihrem Konto registrierten Fahrer.",
    ],
  },
  {
    section: "7. Kundendienst",
    rules: [
      "Partner müssen auf Kundenanfragen zu aktiven Buchungen innerhalb von 2 Stunden während der Geschäftszeiten antworten.",
      "Die Geschäftszeiten sind definiert als 08:00–20:00 Uhr Ortszeit, 7 Tage die Woche.",
      "Für alle aktiven Buchungen muss ein Notfallkontakt außerhalb der Geschäftszeiten bereitgestellt werden.",
      "Partner müssen jede über die Plattform angenommene Buchung einhalten. Stornierungen, die vom Partner ohne außergewöhnliche Begründung eingeleitet werden, stellen einen Verstoß gegen diese Regeln dar.",
      "Falls ein Fahrzeug aufgrund einer Panne oder eines Notfalls nicht bereitgestellt werden kann, muss innerhalb von 2 Stunden ein geeigneter Ersatz angeboten werden.",
      "Kundenbeschwerden müssen innerhalb von 24 Stunden bestätigt und innerhalb von 5 Werktagen gelöst oder eskaliert werden.",
    ],
  },
  {
    section: "8. Versicherung & Haftung",
    rules: [
      "Partner sind zu jeder Zeit vollständig für die Versicherung aller Fahrzeuge auf der Plattform verantwortlich.",
      "Für jedes über die Plattform vermietete Fahrzeug muss eine vollständige Vollkaskoversicherung bestehen.",
      "Sofern das Angebot 'Full Insurance Included' enthält, muss es sich um eine echte Vollkaskoversicherung handeln und nicht um einen Schadensfreistellungsvertrag mit Selbstbeteiligung.",
      "Partner stellen Camel Global von allen Ansprüchen frei, die aus den Fahrzeugen, Fahrern oder dem Betrieb des Partners entstehen.",
      "Camel Global haftet nicht für Verluste, Schäden oder Verletzungen, die durch ein Fahrzeug oder einen Fahrer eines Partners verursacht werden.",
      "Partner müssen jeden Unfall, Diebstahl oder wesentlichen Vorfall im Zusammenhang mit einer Buchung über Camel Global innerhalb von 24 Stunden melden.",
    ],
  },
  {
    section: "9. Einnahmen & Zahlungen",
    rules: [
      "Camel Global erhebt eine Provision auf den Mietwagenpreis für jede abgeschlossene Buchung, mit einer Mindestprovision von €10 pro Buchung. Der Standardprovisionssatz beträgt 20 %, kann jedoch für einzelne Partner in Absprache mit Camel Global reduziert werden.",
      "Ihr aktueller Provisionssatz wird in Ihrem Partnerkonto und auf der Seite zur Angebotsabgabe angezeigt. Sollten Sie einen reduzierten Satz haben, wird dieser dort entsprechend ausgewiesen.",
      "Kraftstoffkosten werden vollständig an den Partner weitergegeben — Camel Global erhebt keine Provision auf Kraftstoff.",
      "Die Provision wird automatisch zum Zeitpunkt der Zahlung über Stripe Connect abgezogen — Partner erhalten ihren Nettobetrag direkt.",
      "Partner sind für alle anfallenden Steuern auf die über die Plattform erhaltenen Einnahmen verantwortlich.",
      "Im Falle eines Streitfalls bezüglich einer Kundenerstattung kann Camel Global vermitteln, die finanzielle Haftung verbleibt jedoch beim Partner.",
      "Kundenbeschwerden & Rückbuchungen: Wenn ein Kunde eine Zahlungsbeschwerde oder Rückbuchung bei seiner Bank oder seinem Kartenaussteller einleitet, wird Camel Global die Auszahlung des Partners für diese Buchung bis zur Klärung einbehalten. Der Partner wird per E-Mail benachrichtigt. Die Auszahlung bleibt so lange einbehalten, bis der Streitfall vollständig gelöst ist. Wird der Streitfall zugunsten des Kunden entschieden, verfällt die Auszahlung. Wird er zugunsten des Partners entschieden, wird die Auszahlung im nächsten monatlichen Lauf freigegeben.",
      "Alle Kraftstoffrückerstattungen, die Kunden zustehen, müssen innerhalb von 5 Werktagen nach Abschluss der Buchung bearbeitet werden.",
    ],
  },
  {
    section: "9b. Rechnungsstellungspflichten",
    rules: [
      "Partner sind der Anbieter von Mietwagenleistungen gegenüber Kunden. Der Vertrag über die Erbringung dieser Leistungen besteht direkt zwischen dem Partner und dem Kunden. Camel Global ist ausschließlich ein Marktplatzvermittler und nicht Vertragspartei dieses Vertrags.",
      "Die von Camel Global an Kunden ausgestellte Buchungsbestätigungsquittung ist eine Plattformzahlungsquittung, die von NTUK Ltd ausgestellt wird. Sie stellt keine Umsatzsteuerrechnung für Mietwagenleistungen dar und erfüllt nicht die Rechnungsstellungspflichten des Partners gegenüber Kunden.",
      "Partner sind allein verantwortlich für die Ausstellung von Umsatzsteuerrechnungen an Kunden gemäß allen anwendbaren steuerrechtlichen Vorschriften in ihrer jeweiligen Rechtsordnung. Sofern ein Kunde eine Umsatzsteuerrechnung für eine Buchung anfordert, muss der Partner diese innerhalb einer angemessenen Frist direkt an den Kunden ausstellen.",
      "Camel Global stellt keine Umsatzsteuerrechnungen für Mietwagenleistungen im Namen von Partnern aus und ist nicht verantwortlich für die Einhaltung der Rechnungsstellungspflichten durch den Partner.",
      "Partner dürfen Kunden nicht an Camel Global verweisen, um eine Umsatzsteuerrechnung für Mietwagenleistungen zu erhalten. Solche Anfragen müssen direkt durch den Partner bearbeitet werden.",
      "Es liegt in der Verantwortung des Partners sicherzustellen, dass die erforderlichen internen Buchhaltungs- und Rechnungsstellungsprozesse vorhanden sind, um ihren Pflichten gegenüber Kunden und Steuerbehörden nachzukommen. Camel Global bietet keine Buchhaltungs- oder Steuerberatung an.",
    ],
  },
  {
    section: "10. Daten & Datenschutz",
    rules: [
      "Kundendaten, die über die Plattform geteilt werden (Name, Telefon, E-Mail, Abholadresse/Zieladresse), dürfen ausschließlich zum Zweck der Buchungsabwicklung verwendet werden.",
      "Partner dürfen Kundendaten nicht für Marketingzwecke, Retargeting oder sonstige kommerzielle Zwecke nutzen.",
      "Kundendaten müssen sicher gespeichert und dürfen nicht an Dritte weitergegeben werden.",
      "Partner müssen die DSGVO (Datenschutz-Grundverordnung) sowie alle anwendbaren lokalen Datenschutzgesetze einhalten.",
      "Auf Anfrage müssen Kundendaten innerhalb von 30 Tagen aus den Systemen des Partners gelöscht werden.",
    ],
  },
  {
    section: "11. Sperrung & Kündigung",
    rules: [
      "Camel Global kann ein Partnerkonto bei Folgendem sofort sperren: einer schwerwiegenden Kundenbeschwerde, einem Verstoß gegen Fahrzeug- oder Fahrerstandards, der Nichterfüllung einer bestätigten Buchung oder der falschen Darstellung von Preisen oder Dienstleistungen.",
      "Gesperrte Konten werden per E-Mail benachrichtigt und erhalten die Möglichkeit, innerhalb von 5 Werktagen zu antworten.",
      "Camel Global behält sich das Recht vor, Konten bei wiederholten Verstößen oder einem einzigen schwerwiegenden Verstoß dauerhaft zu kündigen.",
      "Partner können ihr Konto jederzeit durch eine schriftliche Kündigung mit einer Frist von 30 Tagen kündigen, sofern keine aktiven Buchungen noch ausstehen.",
      "Bei Kündigung wird der gesamte Zugang zur Plattform widerrufen und Kundendaten müssen innerhalb von 30 Tagen gelöscht werden.",
    ],
  },
  {
    section: "12. Änderungen",
    rules: [
      "Camel Global behält sich das Recht vor, diese Betriebsregeln jederzeit zu ändern.",
      "Partner werden über wesentliche Änderungen per E-Mail mit einer Mindestfrist von 14 Tagen informiert.",
      "Die weitere Nutzung der Plattform nach Ablauf der Benachrichtigungsfrist gilt als Zustimmung zu den aktualisierten Regeln.",
      "Die aktuelle Version dieser Regeln ist stets im Bereich der Partner-Kontoverwaltung verfügbar.",
    ],
  },
];

// ---------------------------------------------------------------------------
// PDF generator — bilingual (English + selected locale)
// ---------------------------------------------------------------------------
type PdfLocale = "en" | "es" | "fr" | "it" | "pt" | "de";

const RULES_TRANSLATIONS: Record<Exclude<PdfLocale, "en">, { sections: typeof OPERATING_RULES; label: string; subtitle: string; legalNote: string }> = {
  es: { sections: OPERATING_RULES_ES, label: "VERSIÓN EN ESPAÑOL / SPANISH VERSION", subtitle: "Estas reglas rigen la conducta de todos los socios que operan en la plataforma de Camel Global. Al operar como socio, usted acepta cumplir con todas las secciones a continuación.", legalNote: "⚠️  La versión en inglés prevalece en caso de conflicto. The English version prevails in the event of any conflict." },
  fr: { sections: OPERATING_RULES_FR, label: "VERSION FRANÇAISE / FRENCH VERSION", subtitle: "Les présentes règles régissent la conduite de l'ensemble des partenaires opérant sur la plateforme Camel Global. En opérant en qualité de partenaire, vous vous engagez à respecter toutes les sections ci-dessous.", legalNote: "⚠️  La version anglaise prévaut en cas de conflit. The English version prevails in the event of any conflict." },
  it: { sections: OPERATING_RULES_IT, label: "VERSIONE ITALIANA / ITALIAN VERSION", subtitle: "Le presenti regole disciplinano la condotta di tutti i partner operanti sulla piattaforma Camel Global. Operando in qualità di partner, l'utente si impegna a rispettare tutte le sezioni di seguito riportate.", legalNote: "⚠️  La versione inglese prevale in caso di conflitto. The English version prevails in the event of any conflict." },
  pt: { sections: OPERATING_RULES_PT, label: "VERSÃO PORTUGUESA / PORTUGUESE VERSION", subtitle: "As presentes regras regem a conduta de todos os parceiros que operam na plataforma Camel Global. Ao operar como parceiro, o utilizador declara comprometer-se a cumprir todas as secções abaixo indicadas.", legalNote: "⚠️  A versão inglesa prevalece em caso de conflito. The English version prevails in the event of any conflict." },
  de: { sections: OPERATING_RULES_DE, label: "DEUTSCHE VERSION / GERMAN VERSION", subtitle: "Diese Regeln regeln das Verhalten aller auf der Camel Global-Plattform tätigen Partner. Mit dem Betrieb als Partner verpflichten Sie sich, alle nachstehenden Abschnitte einzuhalten.", legalNote: "⚠️  Bei Widersprüchen ist die englische Fassung maßgeblich. The English version prevails in the event of any conflict." },
};

export async function downloadOperatingRulesPDF(companyName: string, locale: PdfLocale = "en") {
  const { jsPDF } = await import("jspdf");
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableW = pageW - margin * 2;
  let y = margin;

  const translation = locale !== "en" ? RULES_TRANSLATIONS[locale] : undefined;

  function checkPage(needed = 8) {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  }

  function renderRulesSection(sections: typeof OPERATING_RULES, translated: boolean) {
    for (const { section, rules } of sections) {
      checkPage(12);
      doc.setFillColor(translated ? 230 : 240, 240, translated ? 255 : 240);
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

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Operating Rules", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const subtitleEN = doc.splitTextToSize(
    "These rules govern the conduct of all partners operating on the Camel Global platform. By operating as a partner you agree to comply with all sections below.",
    usableW
  );
  doc.text(subtitleEN, margin, y); y += subtitleEN.length * 4 + 4;

  if (translation) {
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 160);
    const subtitleTr = doc.splitTextToSize(translation.subtitle, usableW);
    doc.text(subtitleTr, margin, y); y += subtitleTr.length * 4 + 4;
  }

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 6;

  renderRulesSection(OPERATING_RULES, false);

  if (translation) {
    checkPage(16);
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, y, usableW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(translation.label, margin + 3, y + 7);
    y += 16;
    doc.setTextColor(80, 80, 160);
    doc.setFontSize(7); doc.setFont("helvetica", "italic");
    const legalNote = doc.splitTextToSize(translation.legalNote, usableW);
    doc.text(legalNote, margin, y); y += legalNote.length * 4 + 6;
    doc.setTextColor(0, 0, 0);
    renderRulesSection(translation.sections, true);
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global — Partner Operating Rules — Generated ${dateStr} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Global-Partner-Operating-Rules-${dateStr.replace(/ /g, "-")}${locale !== "en" ? "-" + locale.toUpperCase() : ""}.pdf`);
}
