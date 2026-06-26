export const TERMS_VERSION   = "2026-06d";
export const TERMS_EFFECTIVE = "12 June 2026";

export type TermsSection = { title: string; clauses: string[] };

// ---------------------------------------------------------------------------
// ENGLISH
// ---------------------------------------------------------------------------
export const PARTNER_TERMS: TermsSection[] = [
  {
    title: "1. Definitions",
    clauses: [
      '"Agreement" means these Partner Terms and Conditions together with the Partner Operating Rules, which are incorporated by reference and form part of this Agreement.',
      '"Camel Global", "we", "us" or "our" means NTUK Ltd, a company registered in England and Wales (company number 08765474), trading as Camel Global. Our registered address is Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN.',
      '"Partner", "you" or "your" means the independent car hire business that has registered on the Platform and accepted this Agreement.',
      '"Platform" means the Camel Global web-based marketplace, portals, APIs, and associated services available at camel-global.com.',
      '"Customer" means any end user who submits a car hire request via the Platform.',
      '"Booking" means a confirmed hire arrangement between a Customer and a Partner facilitated through the Platform.',
      '"Commission" means the fee charged by Camel Global to the Partner for use of the Platform, as set out in clause 7.',
      '"Hire Price" means the price bid and accepted for the car hire element of a Booking, excluding any fuel charge.',
      '"Fuel Charge" means the amount charged to a Customer for fuel consumed during a Booking, calculated in accordance with the Partner Operating Rules.',
      '"Partner Operating Rules" means the operational standards and conduct requirements published in the Partner account management section, as updated from time to time.',
      '"Services" means the marketplace facilitation, booking management, payment processing, and related services provided by Camel Global via the Platform.',
      '"Stripe Processing Fee" means the payment processing fee charged by Stripe on each transaction. The rate varies depending on the payment method, the Customer\'s card type and issuing country. The exact fee applied to each Booking is visible on your booking detail page and in your reports. The Stripe Processing Fee is absorbed by Camel Global and is not deducted from the Partner\'s payout.',
      '"Bid Currency" means the currency in which the Partner submits their bid, which is the Partner\'s registered billing currency set during Stripe onboarding.',
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
      "Where the Partner applies a mileage limit or requires a security deposit, these must be clearly stated on the bid before the Customer accepts. The Partner is solely responsible for collecting any such amounts directly from the Customer at the point of vehicle handover. These payments are entirely outside the Camel Global payment system — Camel Global does not collect, hold, or process mileage charges or security deposits on behalf of Partners.",
      "The Partner acknowledges that it is their sole responsibility to make their own arrangements for collecting any security deposit or mileage excess charge at the point of pickup or return. Camel Global accepts no liability for any failure by the Partner to collect such amounts, and no dispute arising from a security deposit or mileage charge is subject to Camel Global's dispute resolution process.",
    ],
  },
  {
    title: "7. Commission and Payments",
    clauses: [
      "Camel Global charges a commission on the Hire Price of each completed Booking. The standard commission rate is 20% of the Hire Price, subject to a minimum commission of €10 (or currency equivalent) per Booking. Commission rates may be reduced for individual Partners by agreement with Camel Global — the rate applicable to your account is shown on your bid submission page and in your account.",
      "Fuel Charges are passed through to the Partner in full. Camel Global does not charge commission on Fuel Charges.",
      "The Partner's payout for each Booking is calculated as: Hire Price minus Commission, plus Fuel Charge. Camel Global absorbs all Stripe Processing Fees — these are not deducted from the Partner's payout.",
      "Payments will be processed via Stripe Connect. The Partner must complete Stripe Express onboarding to receive payouts. The Partner's billing currency is set at the time of Stripe onboarding and determines the currency in which payouts are received.",
      "Camel Global retains its commission in full from each Booking. The Stripe Processing Fee is borne entirely by Camel Global and is never deducted from the Partner's payout.",
      "Camel Global will issue commission invoices to Partners on a monthly basis with reverse charge treatment under Article 44/196 of the EU VAT Directive where applicable.",
      "The Partner is solely responsible for accounting for and paying all taxes on income received through the Platform.",
      "In the event of a Customer refund dispute, the financial liability rests with the Partner.",
      "Customer Disputes & Chargebacks: If a Customer raises a payment dispute or chargeback with their bank or card issuer in relation to a Booking, Camel Global will place the Partner's payout for that Booking on hold pending resolution. The Partner will be notified by email. The payout will remain on hold until the dispute is resolved. If the dispute is resolved in the Customer's favour, the relevant amounts will be refunded to the Customer and the Partner's payout for that Booking will be forfeited. If the dispute is resolved in the Partner's favour, the payout will be released and processed in the next monthly payout run.",
      "All fuel refunds owed to Customers are processed automatically by the Platform from the Partner's connected account balance.",
    ],
  },
  {
    title: "7b. Stripe Processing Fees and Currency",
    clauses: [
      "All payments made by Customers through the Platform are processed by Stripe. Stripe charges a processing fee on each transaction. Camel Global absorbs this fee in full — the Stripe Processing Fee is never deducted from the Partner's payout.",
      "The Partner's net payout is the Hire Price minus Camel Commission, plus Fuel Charge. No Stripe fee is deducted from this amount.",
      "The Partner's billing currency is set permanently at the time of Stripe Express onboarding. Payouts are always made in the Partner's registered billing currency. This currency cannot be changed after onboarding — Partners who need to change their billing currency must contact Camel Global support.",
      "Customers always pay in the Partner's bid currency. No currency conversion is applied between the Customer payment and the Partner's Stripe balance.",
      "The exact Stripe Processing Fee applied to each Booking is visible on your booking detail page and in your reports and CSV exports. This fee is shown for transparency and informational purposes — it represents the cost borne by Camel Global, not a deduction from your payout.",
      "The Partner acknowledges that Camel Global has no control over the fees set or charged by Stripe. Camel Global reserves the right to review its fee absorption policy in the future with at least 14 days' written notice to Partners.",
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
    title: "9. VAT, Tax and Invoicing",
    clauses: [
      "The Partner is the supplier of car hire services to the Customer. The legal contract for the provision of those services is between the Partner and the Customer. Camel Global is a marketplace intermediary only.",
      "The booking confirmation receipt issued by Camel Global to Customers confirms payment received by NTUK Ltd as a platform intermediary. It is not a VAT invoice for car hire services and does not fulfil the Partner's invoicing obligations to Customers.",
      "The Partner is solely responsible for issuing VAT invoices to Customers in accordance with all applicable tax legislation. Where a Customer requests a VAT invoice for a Booking, the Partner must issue one directly to the Customer within a reasonable time. Camel Global does not issue VAT invoices for car hire services and is not responsible for the Partner's compliance with invoicing obligations.",
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

// ---------------------------------------------------------------------------
// SPANISH — ⚠️ Requires legal review before publishing
// ---------------------------------------------------------------------------
export const PARTNER_TERMS_ES: TermsSection[] = [
  {
    title: "1. Definiciones",
    clauses: [
      '"Acuerdo" significa estos Términos y Condiciones para Socios junto con las Reglas Operativas para Socios, que se incorporan por referencia y forman parte de este Acuerdo.',
      '"Camel Global", "nosotros", "nos" o "nuestro" significa NTUK Ltd, empresa registrada en Inglaterra y Gales (número de empresa 08765474), que opera bajo el nombre comercial Camel Global. Nuestra dirección registrada es Office 7, 35-37 Ludgate Hill, Londres, Inglaterra, EC4M 7JN.',
      '"Socio", "usted" o "su" significa la empresa independiente de alquiler de vehículos que se ha registrado en la Plataforma y ha aceptado este Acuerdo.',
      '"Plataforma" significa el mercado digital de Camel Global, portales, APIs y servicios asociados disponibles en camel-global.com.',
      '"Cliente" significa cualquier usuario final que envía una solicitud de alquiler de vehículo a través de la Plataforma.',
      '"Reserva" significa un acuerdo de alquiler confirmado entre un Cliente y un Socio facilitado a través de la Plataforma.',
      '"Comisión" significa la tarifa cobrada por Camel Global al Socio por el uso de la Plataforma, según se establece en la cláusula 7.',
      '"Precio de Alquiler" significa el precio ofertado y aceptado por el elemento de alquiler del vehículo de una Reserva, excluyendo cualquier cargo por combustible.',
      '"Cargo por Combustible" significa el importe cobrado al Cliente por el combustible consumido durante una Reserva, calculado de conformidad con las Reglas Operativas para Socios.',
      '"Reglas Operativas para Socios" significa los estándares operativos y requisitos de conducta publicados en la sección de gestión de cuentas de socios, actualizados periódicamente.',
      '"Servicios" significa la facilitación del mercado, gestión de reservas, procesamiento de pagos y servicios relacionados prestados por Camel Global a través de la Plataforma.',
      '"Tarifa de Procesamiento de Stripe" significa la tarifa de procesamiento de pagos cobrada por Stripe en cada transacción. La tarifa varía según el método de pago, el tipo de tarjeta del Cliente y el país emisor. La tarifa exacta aplicada a cada Reserva es visible en la página de detalle de su reserva y en sus informes. La Tarifa de Procesamiento de Stripe es absorbida por Camel Global y no se deduce del pago al Socio.',
      '"Divisa de Oferta" significa la divisa en la que el Socio envía su oferta, que es la divisa de facturación registrada del Socio establecida durante la incorporación a Stripe.',
    ],
  },
  {
    title: "2. Naturaleza de la Relación — Camel como Intermediario",
    clauses: [
      "Camel Global opera como intermediario de mercado y plataforma tecnológica. Camel Global no es un operador de alquiler de vehículos, no posee ni opera vehículos propios y no emplea conductores.",
      "El contrato legal para la prestación de servicios de alquiler de vehículos se celebra directamente entre el Socio y el Cliente. Camel Global no es parte de dicho contrato y no acepta ninguna responsabilidad por su cumplimiento.",
      "Camel Global no actúa como agente de ninguna de las partes en la conclusión de una Reserva. El Socio es el proveedor de servicios y emite toda la documentación pertinente, incluidas las facturas de IVA, directamente a los Clientes.",
      "El Socio reconoce que el papel de Camel Global se limita a: (a) operar la Plataforma; (b) facilitar la presentación de Clientes a Socios; (c) procesar pagos en nombre de los Socios como intermediario declarado; y (d) proporcionar las herramientas descritas en las Reglas Operativas para Socios.",
      "Nada en este Acuerdo crea una relación laboral, agencia, asociación, empresa conjunta o franquicia entre Camel Global y el Socio o cualquiera de los conductores o empleados del Socio.",
      "El Socio no debe representar ante ningún Cliente o tercero que Camel Global es el proveedor de servicios de alquiler de vehículos, ni que los conductores son empleados o agentes de Camel Global.",
    ],
  },
  {
    title: "3. Registro y Cuenta",
    clauses: [
      "Para utilizar la Plataforma, el Socio debe completar el proceso de registro, proporcionar información precisa y completa, y recibir la aprobación de Camel Global.",
      "El Socio garantiza que toda la información proporcionada durante el registro y en cualquier momento posterior es verdadera, precisa, actual y completa.",
      "El Socio es responsable de mantener la confidencialidad de las credenciales de su cuenta y de toda la actividad que se produzca en ella.",
      "El Socio debe notificar a Camel Global de inmediato cualquier uso no autorizado de su cuenta o cualquier otra violación de seguridad.",
      "Camel Global se reserva el derecho de rechazar el registro o suspender o cancelar una cuenta en cualquier momento de conformidad con la cláusula 14.",
      "Cada cuenta de socio es para una única entidad legal. El Socio no debe crear varias cuentas ni permitir que terceros utilicen su cuenta.",
      "El Socio debe mantener sus datos registrados actualizados en todo momento, incluyendo el nombre legal de la empresa, el número de IVA/NIF y la información de contacto.",
    ],
  },
  {
    title: "4. Obligaciones del Socio",
    clauses: [
      "El Socio debe cumplir en todo momento con las Reglas Operativas para Socios. Las Reglas Operativas se incorporan a este Acuerdo y tienen la misma fuerza legal.",
      "El Socio debe mantener todas las licencias, permisos, registros y pólizas de seguro requeridos por la ley aplicable para operar un negocio de alquiler de vehículos en su jurisdicción.",
      "El Socio debe asegurarse de que todos los vehículos ofrecidos a través de la Plataforma estén en condiciones de circulación, legalmente registrados, completamente asegurados y cumplan con los estándares establecidos en las Reglas Operativas.",
      "El Socio es el único responsable de la conducta de todos los conductores registrados bajo su cuenta y de garantizar que dichos conductores cumplan con los estándares establecidos en las Reglas Operativas.",
      "El Socio debe cumplir con cada Reserva que acepte. El incumplimiento de una Reserva confirmada sin justificación excepcional constituye un incumplimiento material de este Acuerdo.",
      "El Socio no debe utilizar la Plataforma para ofrecer servicios que no pueda prestar, enviar ofertas sobre solicitudes que no pueda cumplir, ni participar en ninguna práctica que induzca a error a los Clientes.",
      "El Socio debe responder a las consultas y reclamaciones de los Clientes dentro de los plazos establecidos en las Reglas Operativas.",
      "El Socio debe registrar con precisión todos los niveles de combustible utilizando la aplicación de conductores de Camel Global en cada entrega y recogida, de conformidad con la política de combustible de las Reglas Operativas.",
    ],
  },
  {
    title: "5. Obligaciones de Camel Global",
    clauses: [
      "Camel Global empleará esfuerzos razonables para que la Plataforma esté disponible las 24 horas del día, los 7 días de la semana, sujeto a mantenimiento planificado y eventos fuera de nuestro control.",
      "Camel Global procesará las Reservas, los pagos y las notificaciones de acuerdo con la funcionalidad descrita en la Plataforma.",
      "Camel Global notificará a los Socios sobre nuevas solicitudes de clientes dentro de su radio de servicio de manera oportuna.",
      "Camel Global proporcionará asistencia a los Socios a través del formulario de contacto y empleará esfuerzos razonables para responder a las consultas en un plazo de 2 días hábiles.",
      "Camel Global dará a los Socios al menos 14 días de aviso por escrito de cualquier cambio material en estos Términos o en las Reglas Operativas.",
      "Camel Global no garantiza ningún volumen mínimo de Reservas o ingresos a ningún Socio.",
    ],
  },
  {
    title: "6. Reservas y Precios",
    clauses: [
      "Los Socios pueden hacer ofertas sobre cualquier solicitud de cliente que se encuentre dentro de su radio de servicio registrado.",
      "Todos los precios enviados por los Socios deben ser totalmente inclusivos de todos los costes. No se pueden añadir cargos adicionales al Cliente después de que se acepte una oferta.",
      "El Socio queda vinculado por el precio que oferta una vez confirmada la Reserva.",
      "Los Socios solo pueden enviar una oferta por solicitud de cliente. Las ofertas enviadas después de que se haya cerrado la ventana de oferta no serán aceptadas.",
      "El Socio reconoce que los Clientes no tienen obligación de aceptar ninguna oferta.",
      "Camel Global se reserva el derecho de eliminar ofertas que parezcan inexactas, incompletas o en incumplimiento de estos Términos.",
      "Cuando el Socio aplique un límite de kilometraje o requiera un depósito de seguridad, estos deben indicarse claramente en la oferta antes de que el Cliente la acepte. El Socio es el único responsable de cobrar dichos importes directamente al Cliente en el momento de la entrega del vehículo. Estos pagos están completamente fuera del sistema de pagos de Camel Global — Camel Global no cobra, retiene ni procesa cargos por kilometraje ni depósitos de seguridad en nombre de los Socios.",
      "El Socio reconoce que es su exclusiva responsabilidad realizar sus propios arreglos para cobrar cualquier depósito de seguridad o cargo por exceso de kilometraje en el momento de la recogida o devolución. Camel Global no acepta ninguna responsabilidad por el incumplimiento del Socio en el cobro de dichos importes, y ninguna disputa derivada de un depósito de seguridad o cargo por kilometraje está sujeta al proceso de resolución de disputas de Camel Global.",
    ],
  },
  {
    title: "7. Comisión y Pagos",
    clauses: [
      "Camel Global cobra una comisión sobre el Precio de Alquiler de cada Reserva completada. La tasa de comisión estándar es del 20% del Precio de Alquiler, sujeta a una comisión mínima de 10 € (o equivalente en divisa) por Reserva. Las tasas de comisión pueden reducirse para Socios individuales mediante acuerdo con Camel Global — la tasa aplicable a su cuenta se muestra en su página de envío de ofertas y en su cuenta.",
      "Los Cargos por Combustible se transfieren al Socio en su totalidad. Camel Global no cobra comisión sobre los Cargos por Combustible.",
      "El pago al Socio por cada Reserva se calcula como: Precio de Alquiler menos Comisión, más Cargo por Combustible. Camel Global absorbe todas las Tarifas de Procesamiento de Stripe — estas no se deducen del pago al Socio.",
      "Los pagos se procesarán a través de Stripe Connect. El Socio debe completar la incorporación a Stripe Express para recibir pagos. La divisa de facturación del Socio se establece en el momento de la incorporación a Stripe y determina la divisa en la que se reciben los pagos.",
      "Camel Global retiene su comisión íntegramente de cada Reserva. La Tarifa de Procesamiento de Stripe es asumida íntegramente por Camel Global y nunca se deduce del pago al Socio.",
      "Camel Global emitirá facturas de comisión a los Socios mensualmente con tratamiento de inversión del sujeto pasivo según el Artículo 44/196 de la Directiva de IVA de la UE cuando sea aplicable.",
      "El Socio es el único responsable de contabilizar y pagar todos los impuestos sobre los ingresos recibidos a través de la Plataforma.",
      "En caso de una disputa de reembolso del Cliente, la responsabilidad financiera recae en el Socio.",
      "Disputas y contracargos de clientes: Si un Cliente presenta una disputa de pago o contracargo ante su banco o entidad emisora de tarjeta en relación con una Reserva, Camel Global retendrá el pago del Socio correspondiente a esa Reserva hasta que se resuelva la disputa. El Socio será notificado por correo electrónico. El pago permanecerá retenido hasta la resolución completa de la disputa. Si la disputa se resuelve a favor del Cliente, los importes correspondientes serán reembolsados al Cliente y el pago del Socio por esa Reserva quedará anulado. Si la disputa se resuelve a favor del Socio, el pago se liberará y se procesará en el siguiente ciclo mensual de pagos.",
      "Todos los reembolsos de combustible adeudados a los Clientes son procesados automáticamente por la Plataforma desde el saldo de la cuenta conectada del Socio.",
    ],
  },
  {
    title: "7b. Tarifas de Procesamiento de Stripe y Divisa",
    clauses: [
      "Todos los pagos realizados por los Clientes a través de la Plataforma son procesados por Stripe. Stripe cobra una tarifa de procesamiento por cada transacción. Camel Global absorbe esta tarifa en su totalidad — la Tarifa de Procesamiento de Stripe nunca se deduce del pago al Socio.",
      "El pago neto al Socio es el Precio de Alquiler menos la Comisión de Camel, más el Cargo por Combustible. No se deduce ninguna tarifa de Stripe de este importe.",
      "La divisa de facturación del Socio se establece de forma permanente en el momento de la incorporación a Stripe Express. Los pagos siempre se realizan en la divisa de facturación registrada del Socio. Esta divisa no puede modificarse después de la incorporación — los Socios que necesiten cambiar su divisa de facturación deben ponerse en contacto con el servicio de asistencia de Camel Global.",
      "Los Clientes siempre pagan en la divisa de oferta del Socio. No se aplica ninguna conversión de divisa entre el pago del Cliente y el saldo de Stripe del Socio.",
      "La Tarifa de Procesamiento de Stripe exacta aplicada a cada Reserva es visible en la página de detalle de su reserva y en sus informes y exportaciones CSV. Esta tarifa se muestra a efectos de transparencia e información — representa el coste asumido por Camel Global, no una deducción de su pago.",
      "El Socio reconoce que Camel Global no tiene control sobre las tarifas establecidas o cobradas por Stripe. Camel Global se reserva el derecho de revisar su política de absorción de tarifas en el futuro con al menos 14 días de aviso por escrito a los Socios.",
    ],
  },
  {
    title: "8. Cancelaciones y Reembolsos",
    clauses: [
      "La siguiente política de cancelación se aplica a todas las Reservas realizadas a través de la Plataforma. La marca de tiempo de cancelación es registrada automáticamente por la Plataforma en el momento en que se confirma una cancelación.",
      "Si el Socio cancela una Reserva confirmada por cualquier motivo, el Cliente recibirá un reembolso completo de todo lo pagado, incluido el Precio de Alquiler y el depósito de combustible. Las cancelaciones del Socio constituyen un incumplimiento de la cláusula 4 y pueden resultar en la suspensión de la cuenta.",
      "Si el Cliente cancela una Reserva con más de 48 horas de antelación respecto a la hora de recogida programada, el Cliente recibe un reembolso completo de todo lo pagado. El Socio no recibe ningún pago por esa Reserva.",
      "Si el Cliente cancela una Reserva dentro de las 48 horas anteriores a la hora de recogida programada, el Precio de Alquiler no es reembolsable y el Socio retiene su pago neto (Precio de Alquiler menos Comisión). El depósito de combustible siempre se reembolsa al Cliente en su totalidad ya que el combustible no ha sido utilizado.",
      "Una vez recogido el vehículo y en curso el alquiler, no es posible ninguna cancelación y no se dispone de reembolso del Precio de Alquiler. El combustible se liquida en función del uso real al final del alquiler.",
      "El administrador de Camel Global puede cancelar cualquier Reserva en cualquier momento y emitirá un reembolso completo al Cliente. El Socio será notificado por correo electrónico.",
      "Todos los reembolsos son procesados automáticamente por la Plataforma y aparecerán en la cuenta del Cliente en un plazo de 5 a 10 días hábiles.",
      "El umbral de 48 horas se mide desde la hora de recogida programada registrada en la Reserva en el momento de la confirmación. Cualquier cambio en la hora de recogida acordado entre las partes no altera retroactivamente el umbral.",
    ],
  },
  {
    title: "9. IVA, Impuestos y Facturación",
    clauses: [
      "El Socio es el proveedor de servicios de alquiler de vehículos al Cliente. El contrato legal para la prestación de dichos servicios se celebra directamente entre el Socio y el Cliente. Camel Global actúa únicamente como intermediario de la plataforma.",
      "El recibo de confirmación de reserva emitido por Camel Global a los Clientes confirma el pago recibido por NTUK Ltd como intermediario de la plataforma. No constituye una factura de IVA por servicios de alquiler de vehículos y no cumple las obligaciones de facturación del Socio frente a los Clientes.",
      "El Socio es el único responsable de emitir facturas de IVA a los Clientes de conformidad con toda la legislación fiscal aplicable. Cuando un Cliente solicite una factura de IVA por una Reserva, el Socio debe emitirla directamente al Cliente en un plazo razonable. Camel Global no emite facturas de IVA por servicios de alquiler de vehículos y no es responsable del cumplimiento por parte del Socio de sus obligaciones de facturación.",
      "El Socio es responsable de cobrar y contabilizar el IVA sobre el precio total de la Reserva pagado por el Cliente.",
      "Camel Global facturará al Socio la comisión utilizando el mecanismo de inversión del sujeto pasivo según el Artículo 44/196 de la Directiva de IVA de la UE.",
      "Los Socios que operen en España deben proporcionar un NIF válido. Esto es necesario para la activación de la cuenta y la facturación de comisiones.",
      "Es responsabilidad del Socio buscar asesoramiento fiscal independiente. Camel Global no proporciona asesoramiento fiscal.",
    ],
  },
  {
    title: "10. Seguro",
    clauses: [
      "El Socio es el único responsable de garantizar que todos los vehículos estén completamente asegurados en todo momento.",
      "El Socio debe mantener un seguro de responsabilidad civil con una cobertura mínima de 5.000.000 €.",
      "Cuando una oferta indique 'Seguro Completo Incluido', esto debe representar un seguro a todo riesgo genuino.",
      "El Socio indemniza a Camel Global frente a todas las reclamaciones derivadas de cualquier accidente o responsabilidad relacionada con los vehículos o conductores del Socio.",
      "Camel Global no es responsable de ninguna pérdida, daño, lesión o muerte causada por un vehículo, conductor u operaciones del Socio.",
      "El Socio debe informar de cualquier accidente, robo o incidente significativo relacionado con una Reserva de Camel Global en un plazo de 24 horas.",
    ],
  },
  {
    title: "11. Propiedad Intelectual",
    clauses: [
      "Camel Global conserva todos los derechos de propiedad intelectual sobre la Plataforma.",
      "Al Socio se le otorga una licencia limitada, no exclusiva e intransferible para utilizar la Plataforma únicamente para el cumplimiento de Reservas.",
      "El Socio no debe copiar, realizar ingeniería inversa, modificar ni crear obras derivadas de ninguna parte de la Plataforma.",
      "El Socio otorga a Camel Global una licencia para mostrar el nombre y perfil de la empresa del Socio a los Clientes en la Plataforma.",
    ],
  },
  {
    title: "12. Protección de Datos y RGPD",
    clauses: [
      "Cada parte deberá cumplir con toda la legislación aplicable en materia de protección de datos, incluidos el RGPD del Reino Unido y el RGPD de la UE.",
      "Los datos personales del Cliente solo pueden ser procesados por el Socio con el fin de cumplir la Reserva específica para la que fueron compartidos.",
      "El Socio no debe utilizar los datos del Cliente para marketing, elaboración de perfiles, retargeting ni venta a terceros.",
      "El Socio debe implementar medidas apropiadas para proteger los datos del Cliente contra el acceso no autorizado, la pérdida o la divulgación.",
      "A petición, el Socio debe eliminar todos los datos personales relativos a un Cliente en un plazo de 30 días.",
      "El Socio debe notificar a Camel Global cualquier violación de datos personales en un plazo de 72 horas desde que tenga conocimiento de ella.",
    ],
  },
  {
    title: "13. Responsabilidad",
    clauses: [
      "Nada en este Acuerdo limita la responsabilidad por muerte o lesiones personales causadas por negligencia o fraude.",
      "La responsabilidad agregada total de Camel Global no excederá el total de comisiones pagadas por el Socio en los 3 meses anteriores a la reclamación.",
      "Camel Global no será responsable de ninguna pérdida indirecta, consecuente, especial o punitiva, incluida la pérdida de beneficios o ingresos.",
      "Camel Global no será responsable de las pérdidas derivadas del incumplimiento de estos Términos por parte del Socio ni de las acciones de los conductores del Socio.",
    ],
  },
  {
    title: "14. Suspensión y Resolución",
    clauses: [
      "Camel Global puede suspender una cuenta de Socio de inmediato ante una reclamación grave de un cliente, incumplimiento de estándares, falta de cumplimiento de una Reserva o tergiversación.",
      "Tras la suspensión, el Socio será notificado por correo electrónico y dispondrá de 5 días hábiles para responder.",
      "Camel Global puede resolver definitivamente este Acuerdo por incumplimientos reiterados o una sola infracción grave.",
      "El Socio puede resolver el Acuerdo proporcionando un aviso por escrito de 30 días a través del formulario de contacto, siempre que no queden Reservas activas.",
      "Al resolver el Acuerdo, se revoca el acceso a la Plataforma, los importes pendientes se hacen inmediatamente exigibles y los datos del Cliente deben eliminarse en un plazo de 30 días.",
    ],
  },
  {
    title: "15. Modificaciones",
    clauses: [
      "Camel Global se reserva el derecho de modificar estos Términos en cualquier momento.",
      "Los Socios serán notificados de los cambios materiales por correo electrónico con al menos 14 días de antelación.",
      "El uso continuado de la Plataforma tras el período de notificación constituye la aceptación de los Términos actualizados.",
      "La versión actual siempre está disponible en camel-global.com/partner/terms.",
    ],
  },
  {
    title: "16. Disposiciones Generales",
    clauses: [
      "Este Acuerdo constituye el acuerdo completo entre las partes en relación con su objeto.",
      "Si alguna disposición se considera inválida o inaplicable, las disposiciones restantes continúan en plena vigencia.",
      "El Socio no puede ceder derechos u obligaciones sin el consentimiento previo por escrito de Camel Global.",
      "Este Acuerdo se rige por las leyes de Inglaterra y Gales. Cada parte se somete a la jurisdicción exclusiva de los tribunales de Inglaterra y Gales.",
    ],
  },
];


// ---------------------------------------------------------------------------
// FR / IT / PT / DE — Generated via Claude API (Chat 53)
// FR / IT / PT / DE legal text (Chat 53)
// ---------------------------------------------------------------------------
export const PARTNER_TERMS_FR: TermsSection[] = [
  {
    title: "1. Définitions",
    clauses: [
      "\"Accord\" désigne les présentes Conditions Générales Partenaire ainsi que les Règles Opérationnelles Partenaire, qui sont incorporées par référence et font partie intégrante du présent Accord.",
      "\"Camel Global\", \"nous\", \"notre\" ou \"nos\" désigne NTUK Ltd, une société immatriculée en Angleterre et au Pays de Galles (company number 08765474), exerçant son activité sous le nom commercial Camel Global. Notre adresse de siège social est Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN.",
      "\"Partenaire\", \"vous\" ou \"votre\" désigne l'entreprise indépendante de location de véhicules qui s'est inscrite sur la Plateforme et a accepté le présent Accord.",
      "\"Plateforme\" désigne la place de marché en ligne Camel Global, les portails, les API et les services associés disponibles à l'adresse camel-global.com.",
      "\"Client\" désigne tout utilisateur final qui soumet une demande de location de véhicule via la Plateforme.",
      "\"Réservation\" désigne un arrangement de location confirmé entre un Client et un Partenaire, facilité par l'intermédiaire de la Plateforme.",
      "\"Commission\" désigne les frais facturés par Camel Global au Partenaire pour l'utilisation de la Plateforme, tels que définis à la clause 7.",
      "\"Prix de Location\" désigne le prix proposé et accepté pour l'élément de location de véhicule d'une Réservation, à l'exclusion de tout frais de carburant.",
      "\"Frais de Carburant\" désigne le montant facturé à un Client pour le carburant consommé au cours d'une Réservation, calculé conformément aux Règles Opérationnelles Partenaire.",
      "\"Règles Opérationnelles Partenaire\" désigne les normes opérationnelles et les exigences de conduite publiées dans la section de gestion du compte Partenaire, telles que mises à jour périodiquement.",
      "\"Services\" désigne les services de facilitation de la place de marché, de gestion des réservations, de traitement des paiements et les services connexes fournis par Camel Global via la Plateforme.",
      "\"Frais de Traitement Stripe\" désigne les frais de traitement des paiements facturés par Stripe sur chaque transaction. Le taux varie en fonction du mode de paiement, du type de carte du Client et du pays d'émission. Les frais exacts appliqués à chaque Réservation sont visibles sur la page de détail de votre réservation et dans vos rapports. Les Frais de Traitement Stripe sont pris en charge par Camel Global et ne sont pas déduits du versement effectué au Partenaire.",
      "\"Devise de l'Offre\" désigne la devise dans laquelle le Partenaire soumet son offre, qui correspond à la devise de facturation enregistrée du Partenaire, définie lors de l'inscription sur Stripe.",
    ],
  },
  {
    title: "2. Nature de la Relation — Camel Global en tant qu'Intermédiaire",
    clauses: [
      "Camel Global opère en tant qu'intermédiaire de place de marché et plateforme technologique. Camel Global n'est pas un opérateur de location de voitures, ne possède ni n'exploite aucun véhicule, et n'emploie aucun chauffeur.",
      "Le contrat juridique pour la fourniture de services de location de voitures est conclu directement entre le Partenaire et le Client. Camel Global n'est pas partie à ce contrat et n'accepte aucune responsabilité quant à son exécution.",
      "Camel Global n'agit pas en qualité de mandataire pour l'une ou l'autre des parties lors de la conclusion d'une Réservation. Le Partenaire est le prestataire de services et émet toute la documentation pertinente, y compris les factures de TVA, directement aux Clients.",
      "Le Partenaire reconnaît que le rôle de Camel Global se limite à : (a) exploiter la Plateforme ; (b) faciliter la mise en relation des Clients avec les Partenaires ; (c) traiter les paiements pour le compte des Partenaires en tant qu'intermédiaire déclaré ; et (d) fournir les outils décrits dans les Règles Opérationnelles des Partenaires.",
      "Aucune disposition du présent Accord ne crée de relation d'emploi, de mandat, de partenariat, de coentreprise ou de franchise entre Camel Global et le Partenaire ou l'un quelconque des chauffeurs ou employés du Partenaire.",
      "Le Partenaire ne doit pas représenter auprès d'un Client ou d'un tiers que Camel Global est le prestataire de services de location de voitures, ni que les chauffeurs sont employés par Camel Global ou en sont les mandataires.",
    ],
  },
  {
    title: "3. Inscription et Compte",
    clauses: [
      "Pour utiliser la Plateforme, le Partenaire doit compléter le processus d'inscription, fournir des informations exactes et complètes, et obtenir l'approbation de Camel Global.",
      "Le Partenaire garantit que toutes les informations fournies lors de l'inscription et à tout moment par la suite sont vraies, exactes, actuelles et complètes.",
      "Le Partenaire est responsable du maintien de la confidentialité de ses identifiants de compte et de toute activité survenant sous son compte.",
      "Le Partenaire doit notifier immédiatement Camel Global de toute utilisation non autorisée de son compte ou de toute autre violation de la sécurité.",
      "Camel Global se réserve le droit de refuser l'inscription ou de suspendre ou résilier un compte à tout moment conformément à la clause 14.",
      "Chaque compte partenaire est destiné à une seule entité juridique. Le Partenaire ne doit pas créer plusieurs comptes ni permettre à des tiers d'utiliser son compte.",
      "Le Partenaire doit maintenir à jour ses informations enregistrées, y compris la dénomination sociale légale, le numéro de TVA/NIF et les coordonnées, en tout temps.",
    ],
  },
  {
    title: "4. Obligations du Partenaire",
    clauses: [
      "Le Partenaire doit se conformer en tout temps aux Règles d'exploitation du Partenaire. Les Règles d'exploitation sont incorporées au présent Accord et ont la même force juridique.",
      "Le Partenaire doit détenir et maintenir toutes les licences, autorisations, enregistrements et polices d'assurance requis par la législation applicable pour exploiter une activité de location de véhicules dans sa juridiction.",
      "Le Partenaire doit s'assurer que tous les véhicules proposés via la Plateforme sont en état de circuler, légalement immatriculés, entièrement assurés et conformes aux normes énoncées dans les Règles d'exploitation.",
      "Le Partenaire est seul responsable de la conduite de tous les conducteurs enregistrés sous son compte et de s'assurer que ces conducteurs satisfont aux normes énoncées dans les Règles d'exploitation.",
      "Le Partenaire doit honorer chaque Réservation qu'il accepte. Le non-respect d'une Réservation confirmée sans justification exceptionnelle constitue une violation substantielle du présent Accord.",
      "Le Partenaire ne doit pas utiliser la Plateforme pour proposer des services qu'il est dans l'incapacité de fournir, soumettre des offres sur des demandes qu'il ne peut pas honorer, ni se livrer à toute pratique susceptible d'induire les Clients en erreur.",
      "Le Partenaire doit répondre aux demandes de renseignements et aux réclamations des Clients dans les délais énoncés dans les Règles d'exploitation.",
      "Le Partenaire doit enregistrer avec précision tous les niveaux de carburant à l'aide de l'application conducteur Camel Global à chaque livraison et collecte, conformément à la politique relative au carburant figurant dans les Règles d'exploitation.",
    ],
  },
  {
    title: "5. Obligations de Camel Global",
    clauses: [
      "Camel Global mettra en œuvre des efforts raisonnables pour rendre la Plateforme disponible 24 heures sur 24, 7 jours sur 7, sous réserve de maintenances planifiées et d'événements indépendants de notre volonté.",
      "Camel Global traitera les Réservations, les paiements et les notifications conformément aux fonctionnalités décrites dans la Plateforme.",
      "Camel Global informera les Partenaires des nouvelles demandes de clients dans leur rayon de service en temps opportun.",
      "Camel Global fournira une assistance aux Partenaires via le formulaire de contact et mettra en œuvre des efforts raisonnables pour répondre aux demandes dans un délai de 2 jours ouvrables.",
      "Camel Global accordera aux Partenaires un préavis écrit d'au moins 14 jours pour toute modification substantielle des présentes Conditions ou des Règles d'exploitation.",
      "Camel Global ne garantit aucun volume minimum de Réservations ni aucun revenu minimum à quelque Partenaire que ce soit.",
    ],
  },
  {
    title: "6. Réservations et Tarification",
    clauses: [
      "Les Partenaires peuvent soumettre une offre pour toute demande client entrant dans leur rayon de service enregistré.",
      "Tous les prix soumis par les Partenaires doivent être entièrement inclusifs de tous les coûts. Aucun frais supplémentaire ne peut être ajouté au Client après l'acceptation d'une offre.",
      "Le Partenaire est lié par le prix qu'il a soumis dès qu'une Réservation est confirmée.",
      "Les Partenaires ne peuvent soumettre qu'une seule offre par demande client. Les offres soumises après la clôture de la fenêtre de soumission ne seront pas acceptées.",
      "Le Partenaire reconnaît que les Clients n'ont aucune obligation d'accepter une offre quelconque.",
      "Camel Global se réserve le droit de retirer les offres qui semblent inexactes, incomplètes ou en violation des présentes Conditions.",
      "Lorsque le Partenaire applique une limite de kilométrage ou exige un dépôt de garantie, ceux-ci doivent être clairement indiqués dans l'offre avant que le Client ne l'accepte. Le Partenaire est seul responsable de la collecte de ces montants directement auprès du Client au moment de la remise du véhicule. Ces paiements sont entièrement en dehors du système de paiement de Camel Global — Camel Global ne collecte, ne détient ni ne traite les frais de kilométrage ou les dépôts de garantie pour le compte des Partenaires.",
      "Le Partenaire reconnaît qu'il lui incombe exclusivement de prendre ses propres dispositions pour collecter tout dépôt de garantie ou tout supplément de kilométrage au moment de la prise en charge ou du retour du véhicule. Camel Global n'accepte aucune responsabilité pour tout manquement du Partenaire à collecter ces montants, et aucun litige découlant d'un dépôt de garantie ou d'un frais de kilométrage n'est soumis au processus de résolution des litiges de Camel Global.",
    ],
  },
  {
    title: "7. Commission et Paiements",
    clauses: [
      "Camel Global prélève une commission sur le Prix de Location de chaque Réservation complétée. Le taux de commission standard est de 20 % du Prix de Location, sous réserve d'une commission minimale de €10 (ou équivalent en devise) par Réservation. Les taux de commission peuvent être réduits pour des Partenaires individuels par accord avec Camel Global — le taux applicable à votre compte est indiqué sur votre page de soumission d'offre et dans votre compte.",
      "Les Frais de Carburant sont reversés au Partenaire dans leur intégralité. Camel Global ne prélève pas de commission sur les Frais de Carburant.",
      "Le versement au Partenaire pour chaque Réservation est calculé comme suit : Prix de Location moins la Commission, plus les Frais de Carburant. Camel Global absorbe l'intégralité des Frais de Traitement Stripe — ceux-ci ne sont pas déduits du versement au Partenaire.",
      "Les paiements seront traités via Stripe Connect. Le Partenaire doit compléter l'intégration Stripe Express afin de recevoir ses versements. La devise de facturation du Partenaire est définie au moment de l'intégration Stripe et détermine la devise dans laquelle les versements sont reçus.",
      "Camel Global conserve l'intégralité de sa commission sur chaque Réservation. Les Frais de Traitement Stripe sont intégralement pris en charge par Camel Global et ne sont en aucun cas déduits du versement au Partenaire.",
      "Camel Global émettra des factures de commission à l'attention des Partenaires sur une base mensuelle, avec application du mécanisme d'autoliquidation conformément à l'Article 44/196 de la EU VAT Directive, le cas échéant.",
      "Le Partenaire est seul responsable de la déclaration et du paiement de l'ensemble des impôts et taxes sur les revenus perçus via la Plateforme.",
      "En cas de litige relatif au remboursement d'un Client, la responsabilité financière incombe au Partenaire.",
      "Litiges Clients et Rétrofacturations : Si un Client initie un litige de paiement ou une rétrofacturation auprès de sa banque ou de l'émetteur de sa carte en lien avec une Réservation, Camel Global mettra en suspens le versement au Partenaire pour cette Réservation dans l'attente de sa résolution. Le Partenaire en sera informé par courrier électronique. Le versement demeurera en suspens jusqu'à la résolution du litige. Si le litige est résolu en faveur du Client, les montants concernés seront remboursés au Client et le versement au Partenaire pour cette Réservation sera définitivement perdu. Si le litige est résolu en faveur du Partenaire, le versement sera débloqué et traité lors de la prochaine exécution mensuelle des paiements.",
      "Tous les remboursements de carburant dus aux Clients sont traités automatiquement par la Plateforme à partir du solde du compte connecté du Partenaire.",
    ],
  },
  {
    title: "7b. Frais de Traitement Stripe et Devises",
    clauses: [
      "Tous les paiements effectués par les Clients via la Plateforme sont traités par Stripe. Stripe facture des frais de traitement sur chaque transaction. Camel Global absorbe intégralement ces frais — les Frais de Traitement Stripe ne sont jamais déduits du versement du Partenaire.",
      "Le versement net du Partenaire correspond au Prix de Location moins la Commission Camel, plus les Frais de Carburant. Aucun frais Stripe n'est déduit de ce montant.",
      "La devise de facturation du Partenaire est définie de manière permanente lors de l'inscription sur Stripe Express. Les versements sont toujours effectués dans la devise de facturation enregistrée du Partenaire. Cette devise ne peut pas être modifiée après l'inscription — les Partenaires souhaitant changer leur devise de facturation doivent contacter le support de Camel Global.",
      "Les Clients paient toujours dans la devise d'offre du Partenaire. Aucune conversion de devise n'est appliquée entre le paiement du Client et le solde Stripe du Partenaire.",
      "Les Frais de Traitement Stripe exacts appliqués à chaque Réservation sont visibles sur la page de détail de votre réservation ainsi que dans vos rapports et exports CSV. Ces frais sont affichés à titre de transparence et d'information — ils représentent le coût pris en charge par Camel Global, et non une déduction de votre versement.",
      "Le Partenaire reconnaît que Camel Global n'a aucun contrôle sur les frais fixés ou facturés par Stripe. Camel Global se réserve le droit de réviser sa politique d'absorption des frais à l'avenir, moyennant un préavis écrit d'au moins 14 jours adressé aux Partenaires.",
    ],
  },
  {
    title: "8. Annulations et Remboursements",
    clauses: [
      "La politique d'annulation suivante s'applique à toutes les Réservations effectuées via la Plateforme. L'horodatage de l'annulation est enregistré automatiquement par la Plateforme au moment où une annulation est confirmée.",
      "Si le Partenaire annule une Réservation confirmée pour quelque raison que ce soit, le Client recevra un remboursement intégral de tout ce qui a été payé, y compris le Prix de Location et le dépôt de carburant. Les annulations du Partenaire constituent une violation de la clause 4 et peuvent entraîner la suspension du compte.",
      "Si le Client annule une Réservation plus de 48 heures avant l'heure de prise en charge prévue, le Client reçoit un remboursement intégral de tout ce qui a été payé. Le Partenaire ne reçoit aucun versement pour cette Réservation.",
      "Si le Client annule une Réservation dans les 48 heures précédant l'heure de prise en charge prévue, le Prix de Location n'est pas remboursable et le Partenaire conserve son versement net (Prix de Location moins Commission). Le dépôt de carburant est toujours remboursé intégralement au Client, le carburant n'ayant pas été utilisé.",
      "Une fois le véhicule récupéré et la location en cours, aucune annulation n'est possible et aucun remboursement du Prix de Location n'est disponible. Le carburant est réglé sur la base de la consommation réelle à la fin de la location.",
      "L'administration de Camel Global peut annuler toute Réservation à tout moment et procédera à un remboursement intégral au Client. Le Partenaire sera informé par e-mail.",
      "Tous les remboursements sont traités automatiquement par la Plateforme et apparaîtront sur le compte du Client dans un délai de 5 à 10 jours ouvrables.",
      "Le seuil de 48 heures est mesuré à partir de l'heure de prise en charge prévue enregistrée sur la Réservation au moment de la confirmation. Toute modification de l'heure de prise en charge convenue entre les parties ne modifie pas rétroactivement ce seuil.",
    ],
  },
  {
    title: "9. TVA, Fiscalité et Facturation",
    clauses: [
      "Le Partenaire est le fournisseur de services de location de voiture au Client. Le contrat juridique pour la prestation de ces services est conclu entre le Partenaire et le Client. Camel Global est uniquement un intermédiaire de place de marché.",
      "Le reçu de confirmation de réservation émis par Camel Global aux Clients confirme le paiement reçu par NTUK Ltd en tant qu'intermédiaire de plateforme. Il ne constitue pas une facture de TVA pour les services de location de voiture et ne satisfait pas aux obligations de facturation du Partenaire envers les Clients.",
      "Le Partenaire est seul responsable de l'émission des factures de TVA aux Clients conformément à toute législation fiscale applicable. Lorsqu'un Client demande une facture de TVA pour une Réservation, le Partenaire doit en émettre une directement au Client dans un délai raisonnable. Camel Global n'émet pas de factures de TVA pour les services de location de voiture et n'est pas responsable du respect par le Partenaire de ses obligations de facturation.",
      "Le Partenaire est responsable de la facturation et de la comptabilisation de la TVA sur le prix total de la Réservation payé par le Client.",
      "Camel Global facturera au Partenaire la commission en utilisant le mécanisme d'autoliquidation en vertu de Article 44/196 of the EU VAT Directive.",
      "Les Partenaires opérant en Espagne doivent fournir un NIF valide. Celui-ci est requis pour l'activation du compte et la facturation des commissions.",
      "Il appartient au Partenaire de solliciter un conseil fiscal indépendant. Camel Global ne fournit pas de conseil fiscal.",
    ],
  },
  {
    title: "10. Assurance",
    clauses: [
      "Le Partenaire est seul responsable de s'assurer que tous les véhicules sont couverts par une assurance tous risques à tout moment.",
      "Le Partenaire doit maintenir une assurance responsabilité civile avec une couverture minimale de €5,000,000.",
      "Lorsqu'une offre indique \"Full Insurance Included\", cela doit représenter une véritable assurance tous risques.",
      "Le Partenaire indemnise Camel Global contre toutes les réclamations découlant de tout accident ou responsabilité impliquant les véhicules ou les conducteurs du Partenaire.",
      "Camel Global n'est pas responsable de toute perte, dommage, blessure ou décès causé par le véhicule, le conducteur ou les opérations d'un Partenaire.",
      "Le Partenaire doit signaler tout accident, vol ou incident significatif impliquant une réservation Camel Global dans les 24 heures.",
    ],
  },
  {
    title: "11. Propriété Intellectuelle",
    clauses: [
      "Camel Global conserve tous les droits de propriété intellectuelle sur la Plateforme.",
      "Le Partenaire se voit accorder une licence limitée, non exclusive et non transférable pour utiliser la Plateforme uniquement aux fins de l'exécution des Réservations.",
      "Le Partenaire ne doit pas copier, désosser, modifier ou créer des œuvres dérivées à partir d'une quelconque partie de la Plateforme.",
      "Le Partenaire accorde à Camel Global une licence pour afficher le nom de société et le profil du Partenaire auprès des Clients sur la Plateforme.",
    ],
  },
  {
    title: "12. Protection des Données et RGPD",
    clauses: [
      "Chaque partie doit se conformer à toute la législation applicable en matière de protection des données, y compris le UK RGPD et l'EU RGPD.",
      "Les données personnelles des clients ne peuvent être traitées par le Partenaire qu'aux fins de l'exécution de la Réservation spécifique pour laquelle elles ont été partagées.",
      "Le Partenaire ne doit pas utiliser les données des clients à des fins de marketing, de profilage, de reciblage ou de vente à des tiers.",
      "Le Partenaire doit mettre en œuvre des mesures appropriées pour protéger les données des clients contre tout accès non autorisé, toute perte ou toute divulgation.",
      "Sur demande, le Partenaire doit supprimer toutes les données personnelles relatives à un client dans un délai de 30 jours.",
      "Le Partenaire doit notifier Camel Global de toute violation de données personnelles dans les 72 heures suivant le moment où il en a eu connaissance.",
    ],
  },
  {
    title: "13. Responsabilité",
    clauses: [
      "Aucune disposition du présent Accord ne limite la responsabilité en cas de décès ou de dommages corporels causés par négligence ou fraude.",
      "La responsabilité totale et globale de Camel Global ne saurait excéder le montant total des commissions versées par le Partenaire au cours des 3 mois précédant la réclamation.",
      "Camel Global ne saurait être tenue responsable de tout préjudice indirect, consécutif, spécial ou punitif, y compris toute perte de bénéfices ou de revenus.",
      "Camel Global ne saurait être tenue responsable de tout préjudice résultant du manquement du Partenaire à se conformer aux présentes Conditions ou des actes des chauffeurs du Partenaire.",
    ],
  },
  {
    title: "14. Suspension et Résiliation",
    clauses: [
      "Camel Global peut suspendre immédiatement un compte Partenaire en cas de réclamation grave d'un client, de manquement aux normes, d'inexécution d'une Réservation ou de déclaration inexacte.",
      "À la suite d'une suspension, le Partenaire sera notifié par e-mail et disposera de 5 jours ouvrables pour répondre.",
      "Camel Global peut résilier définitivement le présent Contrat en cas de manquements répétés ou d'une violation grave unique.",
      "Le Partenaire peut résilier en fournissant un préavis écrit de 30 jours via le formulaire de contact, sous réserve qu'aucune Réservation active ne soit en cours.",
      "À la résiliation, l'accès à la Plateforme est révoqué, les montants en suspens deviennent immédiatement exigibles, et les données des Clients doivent être supprimées dans un délai de 30 jours.",
    ],
  },
  {
    title: "15. Modifications",
    clauses: [
      "Camel Global se réserve le droit de modifier les présentes Conditions à tout moment.",
      "Les Partenaires seront informés de toute modification substantielle par e-mail avec un préavis d'au moins 14 jours.",
      "L'utilisation continue de la Plateforme après la période de préavis vaut acceptation des Conditions mises à jour.",
      "La version en vigueur est toujours disponible à l'adresse camel-global.com/partner/terms.",
    ],
  },
  {
    title: "16. Général",
    clauses: [
      "Le présent Accord constitue l'intégralité de l'accord entre les parties concernant son objet.",
      "Si une disposition est jugée invalide ou inapplicable, les dispositions restantes continuent de s'appliquer pleinement.",
      "Le Partenaire ne peut pas céder ses droits ou obligations sans le consentement écrit préalable de Camel Global.",
      "Le présent Accord est régi par les lois de l'Angleterre et du Pays de Galles. Chaque partie se soumet à la juridiction exclusive des tribunaux d'Angleterre et du Pays de Galles.",
    ],
  },
];

export const PARTNER_TERMS_IT: TermsSection[] = [
  {
    title: "1. Definizioni",
    clauses: [
      "\"Accordo\" indica i presenti Termini e Condizioni per i Partner unitamente alle Regole Operative per i Partner, che sono incorporate per riferimento e costituiscono parte integrante del presente Accordo.",
      "\"Camel Global\", \"noi\", \"ci\" o \"nostro\" indica NTUK Ltd, una società registrata in Inghilterra e Galles (numero di società 08765474), che opera con il nome commerciale Camel Global. Il nostro indirizzo registrato è Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN.",
      "\"Partner\", \"voi\" o \"vostro\" indica l'attività indipendente di noleggio auto che si è registrata sulla Piattaforma e ha accettato il presente Accordo.",
      "\"Piattaforma\" indica il marketplace online di Camel Global, i portali, le API e i servizi associati disponibili su camel-global.com.",
      "\"Cliente\" indica qualsiasi utente finale che invia una richiesta di noleggio auto tramite la Piattaforma.",
      "\"Prenotazione\" indica un accordo di noleggio confermato tra un Cliente e un Partner facilitato attraverso la Piattaforma.",
      "\"Commissione\" indica la tariffa addebitata da Camel Global al Partner per l'utilizzo della Piattaforma, come indicato nella clausola 7.",
      "\"Prezzo di Noleggio\" indica il prezzo offerto e accettato per la componente di noleggio auto di una Prenotazione, escluso qualsiasi addebito per il carburante.",
      "\"Addebito Carburante\" indica l'importo addebitato a un Cliente per il carburante consumato durante una Prenotazione, calcolato in conformità con le Regole Operative per i Partner.",
      "\"Regole Operative per i Partner\" indica gli standard operativi e i requisiti di condotta pubblicati nella sezione di gestione dell'account Partner, così come aggiornati di volta in volta.",
      "\"Servizi\" indica la facilitazione del marketplace, la gestione delle prenotazioni, l'elaborazione dei pagamenti e i servizi correlati forniti da Camel Global tramite la Piattaforma.",
      "\"Commissione di Elaborazione Stripe\" indica la commissione di elaborazione dei pagamenti addebitata da Stripe su ciascuna transazione. Il tasso varia in base al metodo di pagamento, al tipo di carta del Cliente e al paese di emissione. La commissione esatta applicata a ciascuna Prenotazione è visibile nella pagina di dettaglio della prenotazione e nei report. La Commissione di Elaborazione Stripe è assorbita da Camel Global e non viene detratta dal pagamento spettante al Partner.",
      "\"Valuta dell'Offerta\" indica la valuta in cui il Partner presenta la propria offerta, che corrisponde alla valuta di fatturazione registrata dal Partner durante l'onboarding su Stripe.",
    ],
  },
  {
    title: "2. Natura del Rapporto — Camel Global come Intermediario",
    clauses: [
      "Camel Global opera come intermediario di marketplace e piattaforma tecnologica. Camel Global non è un operatore di autonoleggio, non possiede né gestisce veicoli e non assume conducenti.",
      "Il contratto legale per la fornitura dei servizi di autonoleggio si costituisce direttamente tra il Partner e il Cliente. Camel Global non è parte di tale contratto e non accetta alcuna responsabilità per la sua esecuzione.",
      "Camel Global non agisce come agente di nessuna delle parti nella conclusione di una Prenotazione. Il Partner è il fornitore dei servizi ed emette tutta la documentazione pertinente, incluse le fatture IVA, direttamente ai Clienti.",
      "Il Partner riconosce che il ruolo di Camel Global è limitato a: (a) gestire la Piattaforma; (b) facilitare la presentazione dei Clienti ai Partner; (c) elaborare i pagamenti per conto dei Partner in qualità di intermediario dichiarato; e (d) fornire gli strumenti descritti nelle Norme Operative per i Partner.",
      "Nulla nel presente Contratto crea un rapporto di lavoro, agenzia, partnership, joint venture o franchising tra Camel Global e il Partner o qualsiasi conducente o dipendente del Partner.",
      "Il Partner non deve dichiarare ad alcun Cliente o terza parte che Camel Global è il fornitore dei servizi di autonoleggio, né che i conducenti sono assunti da o agenti di Camel Global.",
    ],
  },
  {
    title: "3. Registrazione e Account",
    clauses: [
      "Per utilizzare la Piattaforma, il Partner deve completare il processo di registrazione, fornire informazioni accurate e complete, e ricevere l'approvazione da Camel Global.",
      "Il Partner garantisce che tutte le informazioni fornite durante la registrazione e in qualsiasi momento successivo siano veritiere, accurate, aggiornate e complete.",
      "Il Partner è responsabile del mantenimento della riservatezza delle proprie credenziali dell'account e di tutte le attività che si svolgono nell'ambito del proprio account.",
      "Il Partner deve notificare immediatamente a Camel Global qualsiasi utilizzo non autorizzato del proprio account o qualsiasi altra violazione della sicurezza.",
      "Camel Global si riserva il diritto di rifiutare la registrazione o di sospendere o terminare un account in qualsiasi momento, conformemente alla clausola 14.",
      "Ogni account partner è destinato a un'unica persona giuridica. Il Partner non deve creare account multipli né consentire a terzi di utilizzare il proprio account.",
      "Il Partner deve mantenere aggiornati in ogni momento i propri dati registrati, inclusi la ragione sociale, il numero di partita IVA/NIF e le informazioni di contatto.",
    ],
  },
  {
    title: "4. Obblighi del Partner",
    clauses: [
      "Il Partner deve rispettare le Regole Operative del Partner in ogni momento. Le Regole Operative sono incorporate nel presente Accordo e hanno la stessa forza legale.",
      "Il Partner deve detenere e mantenere tutte le licenze, i permessi, le registrazioni e le polizze assicurative richieste dalla legge applicabile per gestire un'attività di noleggio auto nella propria giurisdizione.",
      "Il Partner deve garantire che tutti i veicoli offerti tramite la Piattaforma siano in condizioni di marcia idonee, regolarmente immatricolati, completamente assicurati e conformi agli standard stabiliti nelle Regole Operative.",
      "Il Partner è l'unico responsabile della condotta di tutti i conducenti registrati sotto il proprio account e del fatto che tali conducenti soddisfino gli standard stabiliti nelle Regole Operative.",
      "Il Partner deve evadere ogni Prenotazione che accetta. Il mancato adempimento di una Prenotazione confermata senza giustificazione eccezionale costituisce una violazione sostanziale del presente Accordo.",
      "Il Partner non deve utilizzare la Piattaforma per offrire servizi che non è in grado di erogare, presentare offerte su richieste che non può soddisfare o adottare pratiche che inducano in errore i Clienti.",
      "Il Partner deve rispondere alle richieste e ai reclami dei Clienti entro i termini stabiliti nelle Regole Operative.",
      "Il Partner deve registrare accuratamente tutti i livelli di carburante utilizzando l'app per conducenti di Camel Global ad ogni consegna e ritiro, in conformità con la politica sul carburante contenuta nelle Regole Operative.",
    ],
  },
  {
    title: "5. Obblighi di Camel Global",
    clauses: [
      "Camel Global utilizzerà ragionevoli sforzi per rendere la Piattaforma disponibile 24 ore su 24, 7 giorni su 7, salvo manutenzioni programmate ed eventi al di fuori del nostro controllo.",
      "Camel Global elaborerà Prenotazioni, pagamenti e notifiche in conformità con le funzionalità descritte nella Piattaforma.",
      "Camel Global notificherà ai Partner le nuove richieste dei clienti all'interno del loro raggio di servizio in modo tempestivo.",
      "Camel Global fornirà supporto ai Partner tramite il modulo di contatto e utilizzerà ragionevoli sforzi per rispondere alle richieste entro 2 giorni lavorativi.",
      "Camel Global darà ai Partner un preavviso scritto di almeno 14 giorni per qualsiasi modifica sostanziale ai presenti Termini o alle Regole Operative.",
      "Camel Global non garantisce alcun volume minimo di Prenotazioni o ricavi a nessun Partner.",
    ],
  },
  {
    title: "6. Prenotazioni e Prezzi",
    clauses: [
      "I Partner possono fare offerte su qualsiasi richiesta del cliente che rientri nel loro raggio di servizio registrato.",
      "Tutti i prezzi presentati dai Partner devono essere comprensivi di tutti i costi. Nessun costo aggiuntivo può essere addebitato al Cliente dopo che un'offerta è stata accettata.",
      "Il Partner è vincolato al prezzo offerto una volta che una Prenotazione è confermata.",
      "I Partner possono presentare una sola offerta per richiesta del cliente. Le offerte presentate dopo la chiusura della finestra di offerta non saranno accettate.",
      "Il Partner riconosce che i Clienti non hanno alcun obbligo di accettare alcuna offerta.",
      "Camel Global si riserva il diritto di rimuovere le offerte che risultino imprecise, incomplete o in violazione dei presenti Termini.",
      "Qualora il Partner applichi un limite di chilometraggio o richieda un deposito cauzionale, questi devono essere chiaramente indicati nell'offerta prima che il Cliente la accetti. Il Partner è l'unico responsabile della riscossione di tali importi direttamente dal Cliente al momento della consegna del veicolo. Tali pagamenti sono interamente al di fuori del sistema di pagamento di Camel Global — Camel Global non raccoglie, detiene né elabora addebiti per chilometraggio o depositi cauzionali per conto dei Partner.",
      "Il Partner riconosce che è sua esclusiva responsabilità prendere le proprie disposizioni per la riscossione di eventuali depositi cauzionali o eccedenze di chilometraggio al momento del ritiro o della restituzione del veicolo. Camel Global non accetta alcuna responsabilità per qualsiasi inadempienza del Partner nella riscossione di tali importi, e nessuna controversia derivante da un deposito cauzionale o da un addebito per chilometraggio è soggetta al processo di risoluzione delle controversie di Camel Global.",
    ],
  },
  {
    title: "7. Commissioni e Pagamenti",
    clauses: [
      "Camel Global applica una commissione sul Prezzo di Noleggio per ogni Prenotazione completata. La commissione standard è pari al 20% del Prezzo di Noleggio, soggetta a una commissione minima di €10 (o equivalente in valuta) per Prenotazione. Le commissioni possono essere ridotte per singoli Partner previo accordo con Camel Global — la tariffa applicabile al proprio account è indicata nella pagina di invio dell'offerta e nell'account.",
      "Le Spese per il Carburante vengono trasferite integralmente al Partner. Camel Global non applica commissioni sulle Spese per il Carburante.",
      "Il pagamento spettante al Partner per ciascuna Prenotazione è calcolato come segue: Prezzo di Noleggio meno Commissione, più Spese per il Carburante. Camel Global si fa carico di tutte le Spese di Elaborazione di Stripe — queste non vengono detratte dal pagamento del Partner.",
      "I pagamenti saranno elaborati tramite Stripe Connect. Il Partner deve completare l'onboarding su Stripe Express per ricevere i pagamenti. La valuta di fatturazione del Partner viene impostata al momento dell'onboarding su Stripe e determina la valuta in cui vengono ricevuti i pagamenti.",
      "Camel Global trattiene integralmente la propria commissione da ciascuna Prenotazione. Le Spese di Elaborazione di Stripe sono sostenute interamente da Camel Global e non vengono mai detratte dal pagamento del Partner.",
      "Camel Global emetterà fatture di commissione ai Partner su base mensile con applicazione del meccanismo di inversione contabile ai sensi dell'Article 44/196 of the EU VAT Directive ove applicabile.",
      "Il Partner è l'unico responsabile della contabilizzazione e del pagamento di tutte le imposte sui redditi percepiti tramite la Piattaforma.",
      "In caso di controversia relativa al rimborso di un Cliente, la responsabilità finanziaria ricade sul Partner.",
      "Controversie dei Clienti e Storni di Addebito: Qualora un Cliente presenti una contestazione di pagamento o uno storno di addebito presso la propria banca o l'emittente della carta in relazione a una Prenotazione, Camel Global sospenderà il pagamento spettante al Partner per quella Prenotazione in attesa della risoluzione della controversia. Il Partner verrà informato tramite e-mail. Il pagamento rimarrà sospeso fino alla risoluzione della controversia. Se la controversia viene risolta a favore del Cliente, gli importi pertinenti saranno rimborsati al Cliente e il pagamento spettante al Partner per quella Prenotazione sarà perso. Se la controversia viene risolta a favore del Partner, il pagamento verrà sbloccato ed elaborato nel successivo ciclo mensile di pagamenti.",
      "Tutti i rimborsi sul carburante dovuti ai Clienti vengono elaborati automaticamente dalla Piattaforma a partire dal saldo dell'account collegato del Partner.",
    ],
  },
  {
    title: "7b. Commissioni di Elaborazione Stripe e Valuta",
    clauses: [
      "Tutti i pagamenti effettuati dai Clienti tramite la Piattaforma sono elaborati da Stripe. Stripe addebita una commissione di elaborazione su ogni transazione. Camel Global si fa carico integralmente di tale commissione — la Commissione di Elaborazione Stripe non viene mai detratta dal pagamento spettante al Partner.",
      "Il pagamento netto del Partner corrisponde al Prezzo di Noleggio meno la Commissione Camel, più il Costo del Carburante. Nessuna commissione Stripe viene detratta da tale importo.",
      "La valuta di fatturazione del Partner viene impostata in modo permanente al momento dell'onboarding su Stripe Express. I pagamenti vengono sempre effettuati nella valuta di fatturazione registrata dal Partner. Tale valuta non può essere modificata dopo l'onboarding — i Partner che necessitano di modificare la propria valuta di fatturazione devono contattare il supporto di Camel Global.",
      "I Clienti pagano sempre nella valuta dell'offerta del Partner. Non viene applicata alcuna conversione valutaria tra il pagamento del Cliente e il saldo Stripe del Partner.",
      "La Commissione di Elaborazione Stripe esatta applicata a ciascuna Prenotazione è visibile nella pagina di dettaglio della prenotazione e nei report e nelle esportazioni CSV. Tale commissione viene mostrata a scopo di trasparenza e informativo — rappresenta il costo sostenuto da Camel Global, non una detrazione dal pagamento spettante al Partner.",
      "Il Partner prende atto che Camel Global non ha alcun controllo sulle commissioni stabilite o applicate da Stripe. Camel Global si riserva il diritto di rivedere la propria politica di assorbimento delle commissioni in futuro, con un preavviso scritto di almeno 14 giorni ai Partner.",
    ],
  },
  {
    title: "8. Cancellazioni e Rimborsi",
    clauses: [
      "La seguente politica di cancellazione si applica a tutte le Prenotazioni effettuate tramite la Piattaforma. Il timestamp di cancellazione viene registrato automaticamente dalla Piattaforma nel momento in cui una cancellazione viene confermata.",
      "Se il Partner annulla una Prenotazione confermata per qualsiasi motivo, il Cliente riceverà un rimborso completo di tutto quanto pagato, incluso il Prezzo di Noleggio e il deposito carburante. Le cancellazioni da parte del Partner costituiscono una violazione della clausola 4 e possono comportare la sospensione dell'account.",
      "Se il Cliente annulla una Prenotazione più di 48 ore prima dell'orario di ritiro programmato, il Cliente riceve un rimborso completo di tutto quanto pagato. Il Partner non riceve alcun pagamento per tale Prenotazione.",
      "Se il Cliente annulla una Prenotazione entro 48 ore dall'orario di ritiro programmato, il Prezzo di Noleggio non è rimborsabile e il Partner trattiene il proprio pagamento netto (Prezzo di Noleggio meno la Commissione). Il deposito carburante viene sempre rimborsato integralmente al Cliente in quanto il carburante non è stato utilizzato.",
      "Una volta che il veicolo è stato ritirato e il noleggio è in corso, non è possibile alcuna cancellazione e non è disponibile alcun rimborso del Prezzo di Noleggio. Il carburante viene regolato in base all'utilizzo effettivo al termine del noleggio.",
      "L'amministrazione di Camel Global può annullare qualsiasi Prenotazione in qualsiasi momento e provvederà a emettere un rimborso completo al Cliente. Il Partner verrà informato tramite e-mail.",
      "Tutti i rimborsi vengono elaborati automaticamente dalla Piattaforma e appariranno sul conto del Cliente entro 5–10 giorni lavorativi.",
      "La soglia delle 48 ore viene misurata dall'orario di ritiro programmato registrato sulla Prenotazione al momento della conferma. Eventuali modifiche all'orario di ritiro concordate tra le parti non alterano retroattivamente tale soglia.",
    ],
  },
  {
    title: "9. IVA, Imposte e Fatturazione",
    clauses: [
      "Il Partner è il fornitore dei servizi di autonoleggio al Cliente. Il contratto legale per la fornitura di tali servizi è stipulato tra il Partner e il Cliente. Camel Global è esclusivamente un intermediario di marketplace.",
      "La ricevuta di conferma della prenotazione emessa da Camel Global ai Clienti conferma il pagamento ricevuto da NTUK Ltd in qualità di intermediario di piattaforma. Non costituisce una fattura IVA per i servizi di autonoleggio e non adempie agli obblighi di fatturazione del Partner nei confronti dei Clienti.",
      "Il Partner è il solo responsabile dell'emissione delle fatture IVA ai Clienti in conformità con tutta la normativa fiscale applicabile. Qualora un Cliente richieda una fattura IVA per una Prenotazione, il Partner deve emetterla direttamente al Cliente entro un termine ragionevole. Camel Global non emette fatture IVA per i servizi di autonoleggio e non è responsabile del rispetto da parte del Partner degli obblighi di fatturazione.",
      "Il Partner è responsabile dell'applicazione e della contabilizzazione dell'IVA sull'intero prezzo di Prenotazione corrisposto dal Cliente.",
      "Camel Global fatturerà al Partner le commissioni utilizzando il meccanismo dell'inversione contabile ai sensi dell'Article 44/196 della EU VAT Directive.",
      "I Partner operanti in Spagna devono fornire un NIF valido. Tale dato è necessario per l'attivazione dell'account e per la fatturazione delle commissioni.",
      "È responsabilità del Partner richiedere una consulenza fiscale indipendente. Camel Global non fornisce consulenza fiscale.",
    ],
  },
  {
    title: "10. Assicurazione",
    clauses: [
      "Il Partner è l'unico responsabile di garantire che tutti i veicoli siano coperti da assicurazione completa in ogni momento.",
      "Il Partner deve mantenere un'assicurazione di responsabilità civile generale con una copertura minima di €5.000.000.",
      "Laddove un'offerta indichi 'Full Insurance Included', questa deve rappresentare una genuina assicurazione completa.",
      "Il Partner manleva Camel Global da qualsiasi richiesta di risarcimento derivante da qualsiasi incidente o responsabilità che coinvolga i veicoli o i conducenti del Partner.",
      "Camel Global non è responsabile per qualsiasi perdita, danno, lesione o decesso causato da un veicolo, conducente o dalle operazioni di un Partner.",
      "Il Partner deve segnalare qualsiasi incidente, furto o evento significativo che coinvolga una Prenotazione Camel Global entro 24 ore.",
    ],
  },
  {
    title: "11. Proprietà Intellettuale",
    clauses: [
      "Camel Global conserva tutti i diritti di proprietà intellettuale sulla Piattaforma.",
      "Al Partner viene concessa una licenza limitata, non esclusiva e non trasferibile per utilizzare la Piattaforma esclusivamente ai fini dell'evasione delle Prenotazioni.",
      "Il Partner non deve copiare, decompilare, modificare o creare opere derivate da alcuna parte della Piattaforma.",
      "Il Partner concede a Camel Global una licenza per visualizzare il nome e il profilo aziendale del Partner ai Clienti sulla Piattaforma.",
    ],
  },
  {
    title: "12. Protezione dei Dati e GDPR",
    clauses: [
      "Ciascuna parte dovrà conformarsi a tutta la normativa applicabile in materia di protezione dei dati, inclusi il UK GDPR e l'EU GDPR.",
      "I dati personali del Cliente potranno essere trattati dal Partner esclusivamente ai fini dell'adempimento della specifica Prenotazione per la quale sono stati condivisi.",
      "Il Partner non dovrà utilizzare i dati del Cliente per attività di marketing, profilazione, re-targeting o cessione a terzi.",
      "Il Partner dovrà adottare misure adeguate per proteggere i dati del Cliente da accessi non autorizzati, perdita o divulgazione.",
      "Su richiesta, il Partner dovrà cancellare tutti i dati personali relativi a un Cliente entro 30 giorni.",
      "Il Partner dovrà notificare a Camel Global qualsiasi violazione dei dati personali entro 72 ore dal momento in cui ne sia venuto a conoscenza.",
    ],
  },
  {
    title: "13. Responsabilità",
    clauses: [
      "Nessuna disposizione del presente Accordo limita la responsabilità per morte o lesioni personali causate da negligenza o frode.",
      "La responsabilità aggregata totale di Camel Global non supererà la commissione totale pagata dal Partner nei 3 mesi precedenti alla richiesta di risarcimento.",
      "Camel Global non sarà responsabile per alcuna perdita indiretta, consequenziale, speciale o punitiva, inclusa la perdita di profitti o ricavi.",
      "Camel Global non sarà responsabile per perdite derivanti dalla mancata conformità del Partner ai presenti Termini o dalle azioni dei conducenti del Partner.",
    ],
  },
  {
    title: "14. Sospensione e Risoluzione",
    clauses: [
      "Camel Global può sospendere immediatamente un account Partner a seguito di un grave reclamo da parte di un cliente, violazione degli standard, mancato adempimento di una Prenotazione o dichiarazione falsa.",
      "A seguito della sospensione, il Partner verrà informato via e-mail e avrà 5 giorni lavorativi per rispondere.",
      "Camel Global può risolvere definitivamente il presente Contratto in caso di violazioni ripetute o di una singola infrazione grave.",
      "Il Partner può recedere fornendo un preavviso scritto di 30 giorni tramite il modulo di contatto, a condizione che non vi siano Prenotazioni attive in corso.",
      "Alla risoluzione, l'accesso alla Piattaforma viene revocato, gli importi in sospeso diventano immediatamente esigibili e i dati dei Clienti devono essere eliminati entro 30 giorni.",
    ],
  },
  {
    title: "15. Modifiche",
    clauses: [
      "Camel Global si riserva il diritto di modificare i presenti Termini in qualsiasi momento.",
      "I Partner saranno informati delle modifiche sostanziali tramite e-mail con un preavviso di almeno 14 giorni.",
      "Il proseguimento dell'utilizzo della Piattaforma dopo il periodo di preavviso costituisce accettazione dei Termini aggiornati.",
      "La versione corrente è sempre disponibile all'indirizzo camel-global.com/partner/terms.",
    ],
  },
  {
    title: "16. Generale",
    clauses: [
      "Il presente Accordo costituisce l'intero accordo tra le parti in relazione al suo oggetto.",
      "Qualora una disposizione risulti invalida o inapplicabile, le disposizioni rimanenti continuano ad avere piena efficacia.",
      "Il Partner non può cedere diritti o obblighi senza il previo consenso scritto di Camel Global.",
      "Il presente Accordo è disciplinato dalle leggi dell'Inghilterra e del Galles. Ciascuna parte si sottomette alla giurisdizione esclusiva dei tribunali dell'Inghilterra e del Galles.",
    ],
  },
];

export const PARTNER_TERMS_PT: TermsSection[] = [
  {
    title: "1. Definições",
    clauses: [
      "\"Acordo\" significa estes Termos e Condições de Parceiro juntamente com as Regras Operacionais de Parceiro, as quais são incorporadas por referência e constituem parte integrante deste Acordo.",
      "\"Camel Global\", \"nós\", \"nos\" ou \"nosso\" significa NTUK Ltd, uma empresa registada em Inglaterra e no País de Gales (company number 08765474), a operar sob a designação Camel Global. O nosso endereço registado é Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN.",
      "\"Parceiro\", \"você\" ou \"seu\" significa a empresa independente de aluguer de automóveis que se registou na Plataforma e aceitou este Acordo.",
      "\"Plataforma\" significa o marketplace baseado na web da Camel Global, portais, APIs e serviços associados disponíveis em camel-global.com.",
      "\"Cliente\" significa qualquer utilizador final que submeta um pedido de aluguer de automóvel através da Plataforma.",
      "\"Reserva\" significa um acordo de aluguer confirmado entre um Cliente e um Parceiro, facilitado através da Plataforma.",
      "\"Comissão\" significa a taxa cobrada pela Camel Global ao Parceiro pela utilização da Plataforma, conforme estabelecido na cláusula 7.",
      "\"Preço de Aluguer\" significa o preço proposto e aceite para o elemento de aluguer de automóvel de uma Reserva, excluindo qualquer encargo de combustível.",
      "\"Encargo de Combustível\" significa o montante cobrado ao Cliente pelo combustível consumido durante uma Reserva, calculado em conformidade com as Regras Operacionais de Parceiro.",
      "\"Regras Operacionais de Parceiro\" significa as normas operacionais e os requisitos de conduta publicados na secção de gestão de conta do Parceiro, conforme actualizados periodicamente.",
      "\"Serviços\" significa a facilitação do marketplace, a gestão de reservas, o processamento de pagamentos e os serviços conexos prestados pela Camel Global através da Plataforma.",
      "\"Taxa de Processamento Stripe\" significa a taxa de processamento de pagamentos cobrada pela Stripe em cada transacção. A taxa varia consoante o método de pagamento, o tipo de cartão do Cliente e o país de emissão. A taxa exacta aplicada a cada Reserva é visível na página de detalhe da sua reserva e nos seus relatórios. A Taxa de Processamento Stripe é absorvida pela Camel Global e não é deduzida do pagamento ao Parceiro.",
      "\"Moeda de Proposta\" significa a moeda na qual o Parceiro submete a sua proposta, que é a moeda de facturação registada do Parceiro definida durante o processo de integração na Stripe.",
    ],
  },
  {
    title: "2. Natureza da Relação — Camel Global como Intermediário",
    clauses: [
      "A Camel Global opera como intermediária de mercado e plataforma tecnológica. A Camel Global não é uma operadora de aluguer de automóveis, não possui nem opera quaisquer veículos e não emprega quaisquer motoristas.",
      "O contrato legal para a prestação de serviços de aluguer de automóveis é celebrado diretamente entre o Parceiro e o Cliente. A Camel Global não é parte desse contrato e não aceita qualquer responsabilidade pelo seu cumprimento.",
      "A Camel Global não atua como agente de nenhuma das partes na conclusão de uma Reserva. O Parceiro é o fornecedor dos serviços e emite toda a documentação relevante, incluindo faturas de IVA, diretamente aos Clientes.",
      "O Parceiro reconhece que o papel da Camel Global se limita a: (a) operar a Plataforma; (b) facilitar a apresentação de Clientes aos Parceiros; (c) processar pagamentos em nome dos Parceiros na qualidade de intermediária divulgada; e (d) fornecer as ferramentas descritas nas Regras Operacionais do Parceiro.",
      "Nada neste Contrato cria uma relação de trabalho, agência, parceria, joint venture ou franchising entre a Camel Global e o Parceiro ou qualquer um dos motoristas ou colaboradores do Parceiro.",
      "O Parceiro não deve declarar a qualquer Cliente ou terceiro que a Camel Global é o fornecedor de serviços de aluguer de automóveis, ou que os motoristas são empregados ou agentes da Camel Global.",
    ],
  },
  {
    title: "3. Registo e Conta",
    clauses: [
      "Para utilizar a Plataforma, o Parceiro deve concluir o processo de registo, fornecer informações precisas e completas, e obter aprovação da Camel Global.",
      "O Parceiro garante que todas as informações fornecidas durante o registo e em qualquer momento posterior são verdadeiras, precisas, atuais e completas.",
      "O Parceiro é responsável por manter a confidencialidade das credenciais da sua conta e por toda a atividade que ocorra na mesma.",
      "O Parceiro deve notificar imediatamente a Camel Global de qualquer utilização não autorizada da sua conta ou de qualquer outra violação de segurança.",
      "A Camel Global reserva-se o direito de recusar o registo ou de suspender ou encerrar uma conta a qualquer momento, nos termos da cláusula 14.",
      "Cada conta de parceiro destina-se a uma única entidade jurídica. O Parceiro não deve criar múltiplas contas nem permitir que terceiros utilizem a sua conta.",
      "O Parceiro deve manter os seus dados de registo atualizados em todos os momentos, incluindo a denominação social, o número de IVA/NIF e as informações de contacto.",
    ],
  },
  {
    title: "4. Obrigações do Parceiro",
    clauses: [
      "O Parceiro deve cumprir as Regras Operacionais do Parceiro em todos os momentos. As Regras Operacionais estão incorporadas neste Acordo e têm a mesma força jurídica.",
      "O Parceiro deve deter e manter todas as licenças, autorizações, registos e apólices de seguro exigidos pela legislação aplicável para operar um negócio de aluguer de automóveis na sua jurisdição.",
      "O Parceiro deve garantir que todos os veículos disponibilizados através da Plataforma estejam em condições de circular na via pública, legalmente registados, com seguro completo e que cumpram os padrões estabelecidos nas Regras Operacionais.",
      "O Parceiro é o único responsável pela conduta de todos os condutores registados na sua conta e por garantir que esses condutores cumprem os padrões estabelecidos nas Regras Operacionais.",
      "O Parceiro deve cumprir todas as Reservas que aceite. O incumprimento de uma Reserva confirmada sem justificação excecional constitui uma violação material deste Acordo.",
      "O Parceiro não deve utilizar a Plataforma para oferecer serviços que não está em condições de prestar, submeter propostas para pedidos que não consegue cumprir, nem adotar qualquer prática que induza os Clientes em erro.",
      "O Parceiro deve responder às consultas e reclamações dos Clientes dentro dos prazos estabelecidos nas Regras Operacionais.",
      "O Parceiro deve registar com precisão todos os níveis de combustível através da aplicação para condutores Camel Global em cada entrega e recolha, em conformidade com a política de combustível prevista nas Regras Operacionais.",
    ],
  },
  {
    title: "5. Obrigações da Camel Global",
    clauses: [
      "A Camel Global envidará esforços razoáveis para disponibilizar a Plataforma 24 horas por dia, 7 dias por semana, sujeito a manutenções programadas e a eventos fora do nosso controlo.",
      "A Camel Global processará Reservas, pagamentos e notificações em conformidade com as funcionalidades descritas na Plataforma.",
      "A Camel Global notificará os Parceiros sobre novos pedidos de clientes dentro do seu raio de serviço de forma atempada.",
      "A Camel Global prestará suporte aos Parceiros através do formulário de contacto e envidará esforços razoáveis para responder às solicitações no prazo de 2 dias úteis.",
      "A Camel Global concederá aos Parceiros um aviso prévio escrito de, pelo menos, 14 dias relativamente a quaisquer alterações materiais aos presentes Termos ou às Regras de Funcionamento.",
      "A Camel Global não garante qualquer volume mínimo de Reservas ou de receitas a qualquer Parceiro.",
    ],
  },
  {
    title: "6. Reservas e Preços",
    clauses: [
      "Os Parceiros podem fazer licitações em qualquer pedido de cliente que se enquadre no seu raio de serviço registado.",
      "Todos os preços submetidos pelos Parceiros devem ser totalmente inclusivos de todos os custos. Nenhuma cobrança adicional pode ser adicionada ao Cliente após a aceitação de uma licitação.",
      "O Parceiro fica vinculado ao preço que licitou assim que uma Reserva é confirmada.",
      "Os Parceiros podem submeter apenas uma licitação por pedido de cliente. Licitações submetidas após o encerramento do período de licitação não serão aceites.",
      "O Parceiro reconhece que os Clientes não têm qualquer obrigação de aceitar qualquer licitação.",
      "A Camel Global reserva-se o direito de remover licitações que pareçam imprecisas, incompletas ou em violação destes Termos.",
      "Quando o Parceiro aplica um limite de quilometragem ou exige um depósito de segurança, estes devem ser claramente indicados na licitação antes de o Cliente a aceitar. O Parceiro é o único responsável pela cobrança de quaisquer tais montantes diretamente ao Cliente no momento da entrega do veículo. Estes pagamentos estão inteiramente fora do sistema de pagamento da Camel Global — a Camel Global não recolhe, retém nem processa encargos de quilometragem ou depósitos de segurança em nome dos Parceiros.",
      "O Parceiro reconhece que é da sua exclusiva responsabilidade tomar as suas próprias providências para a cobrança de qualquer depósito de segurança ou encargo de excesso de quilometragem no momento da recolha ou devolução do veículo. A Camel Global não aceita qualquer responsabilidade por qualquer falha do Parceiro em cobrar tais montantes, e nenhuma disputa decorrente de um depósito de segurança ou encargo de quilometragem está sujeita ao processo de resolução de disputas da Camel Global.",
    ],
  },
  {
    title: "7. Comissão e Pagamentos",
    clauses: [
      "A Camel Global cobra uma comissão sobre o Preço de Aluguer de cada Reserva concluída. A taxa de comissão padrão é de 20% do Preço de Aluguer, sujeita a uma comissão mínima de €10 (ou equivalente em moeda) por Reserva. As taxas de comissão poderão ser reduzidas para Parceiros individuais mediante acordo com a Camel Global — a taxa aplicável à sua conta é apresentada na sua página de submissão de proposta e na sua conta.",
      "Os Encargos de Combustível são integralmente repercutidos no Parceiro. A Camel Global não cobra comissão sobre os Encargos de Combustível.",
      "O pagamento ao Parceiro por cada Reserva é calculado da seguinte forma: Preço de Aluguer deduzido da Comissão, acrescido do Encargo de Combustível. A Camel Global absorve todas as Taxas de Processamento Stripe — estas não são deduzidas do pagamento ao Parceiro.",
      "Os pagamentos serão processados através do Stripe Connect. O Parceiro deverá concluir o processo de integração no Stripe Express para receber os pagamentos. A moeda de faturação do Parceiro é definida no momento da integração no Stripe e determina a moeda em que os pagamentos são recebidos.",
      "A Camel Global retém integralmente a sua comissão de cada Reserva. A Taxa de Processamento Stripe é suportada exclusivamente pela Camel Global e nunca é deduzida do pagamento ao Parceiro.",
      "A Camel Global emitirá faturas de comissão aos Parceiros numa base mensal, com aplicação do mecanismo de autoliquidação ao abrigo do Article 44/196 of the EU VAT Directive, sempre que aplicável.",
      "O Parceiro é o único responsável pela contabilização e pelo pagamento de todos os impostos sobre os rendimentos recebidos através da Plataforma.",
      "Em caso de litígio relativo ao reembolso de um Cliente, a responsabilidade financeira recai sobre o Parceiro.",
      "Litígios de Clientes e Estornos: Caso um Cliente apresente uma contestação de pagamento ou um estorno junto do seu banco ou emissor de cartão relativamente a uma Reserva, a Camel Global suspenderá o pagamento ao Parceiro referente a essa Reserva até à resolução do litígio. O Parceiro será notificado por correio eletrónico. O pagamento permanecerá suspenso até à resolução do litígio. Se o litígio for resolvido a favor do Cliente, os montantes relevantes serão reembolsados ao Cliente e o pagamento ao Parceiro relativo a essa Reserva será perdido. Se o litígio for resolvido a favor do Parceiro, o pagamento será libertado e processado no próximo ciclo de pagamentos mensais.",
      "Todos os reembolsos de combustível devidos aos Clientes são processados automaticamente pela Plataforma a partir do saldo da conta associada do Parceiro.",
    ],
  },
  {
    title: "7b. Taxas de Processamento e Moeda do Stripe",
    clauses: [
      "Todos os pagamentos efetuados pelos Clientes através da Plataforma são processados pela Stripe. A Stripe cobra uma taxa de processamento sobre cada transação. A Camel Global absorve esta taxa na totalidade — a Taxa de Processamento da Stripe nunca é deduzida do pagamento ao Parceiro.",
      "O pagamento líquido ao Parceiro corresponde ao Preço de Aluguer menos a Comissão Camel, acrescido do Encargo de Combustível. Nenhuma taxa da Stripe é deduzida deste valor.",
      "A moeda de faturação do Parceiro é definida de forma permanente no momento da integração no Stripe Express. Os pagamentos são sempre efetuados na moeda de faturação registada pelo Parceiro. Esta moeda não pode ser alterada após a integração — os Parceiros que necessitem de alterar a sua moeda de faturação devem contactar o suporte da Camel Global.",
      "Os Clientes pagam sempre na moeda de oferta do Parceiro. Não é aplicada qualquer conversão de moeda entre o pagamento do Cliente e o saldo Stripe do Parceiro.",
      "A Taxa de Processamento da Stripe exata aplicada a cada Reserva é visível na página de detalhes da sua reserva, bem como nos seus relatórios e exportações CSV. Esta taxa é apresentada para efeitos de transparência e informação — representa o custo suportado pela Camel Global, não uma dedução do seu pagamento.",
      "O Parceiro reconhece que a Camel Global não tem qualquer controlo sobre as taxas definidas ou cobradas pela Stripe. A Camel Global reserva-se o direito de rever a sua política de absorção de taxas no futuro, mediante um aviso prévio por escrito de pelo menos 14 dias aos Parceiros.",
    ],
  },
  {
    title: "8. Cancelamentos e Reembolsos",
    clauses: [
      "A seguinte política de cancelamento aplica-se a todas as Reservas efetuadas através da Plataforma. O registo de data e hora do cancelamento é registado automaticamente pela Plataforma no momento em que o cancelamento é confirmado.",
      "Se o Parceiro cancelar uma Reserva confirmada por qualquer motivo, o Cliente receberá o reembolso total de tudo o que foi pago, incluindo o Preço de Aluguer e o depósito de combustível. Os cancelamentos por parte do Parceiro constituem uma violação da cláusula 4 e podem resultar na suspensão da conta.",
      "Se o Cliente cancelar uma Reserva com mais de 48 horas de antecedência em relação à hora de recolha agendada, o Cliente receberá o reembolso total de tudo o que foi pago. O Parceiro não receberá qualquer pagamento relativo a essa Reserva.",
      "Se o Cliente cancelar uma Reserva dentro de 48 horas da hora de recolha agendada, o Preço de Aluguer não é reembolsável e o Parceiro retém o seu pagamento líquido (Preço de Aluguer deduzido da Comissão). O depósito de combustível é sempre reembolsado integralmente ao Cliente, uma vez que o combustível não foi utilizado.",
      "Uma vez que o veículo tenha sido recolhido e o aluguer esteja em curso, não é possível qualquer cancelamento nem está disponível qualquer reembolso do Preço de Aluguer. O combustível é liquidado com base no consumo real no final do aluguer.",
      "A administração da Camel Global pode cancelar qualquer Reserva a qualquer momento e emitirá um reembolso total ao Cliente. O Parceiro será notificado por correio eletrónico.",
      "Todos os reembolsos são processados automaticamente pela Plataforma e serão refletidos na conta do Cliente no prazo de 5 a 10 dias úteis.",
      "O limite de 48 horas é contado a partir da hora de recolha agendada registada na Reserva no momento da confirmação. Quaisquer alterações à hora de recolha acordadas entre as partes não alteram retroativamente esse limite.",
    ],
  },
  {
    title: "9. IVA, Impostos e Faturação",
    clauses: [
      "O Parceiro é o fornecedor de serviços de aluguer de automóveis ao Cliente. O contrato legal para a prestação desses serviços é celebrado entre o Parceiro e o Cliente. A Camel Global é apenas um intermediário de marketplace.",
      "O recibo de confirmação de reserva emitido pela Camel Global aos Clientes confirma o pagamento recebido pela NTUK Ltd na qualidade de intermediário da plataforma. Não constitui uma fatura de IVA para serviços de aluguer de automóveis e não cumpre as obrigações de faturação do Parceiro perante os Clientes.",
      "O Parceiro é o único responsável pela emissão de faturas de IVA aos Clientes, em conformidade com toda a legislação fiscal aplicável. Quando um Cliente solicita uma fatura de IVA relativa a uma Reserva, o Parceiro deve emiti-la diretamente ao Cliente dentro de um prazo razoável. A Camel Global não emite faturas de IVA para serviços de aluguer de automóveis e não é responsável pelo cumprimento das obrigações de faturação por parte do Parceiro.",
      "O Parceiro é responsável pela cobrança e contabilização do IVA sobre o preço total da Reserva pago pelo Cliente.",
      "A Camel Global faturará ao Parceiro a comissão utilizando o mecanismo de autoliquidação ao abrigo do Article 44/196 of the EU VAT Directive.",
      "Os Parceiros que operam em Espanha devem fornecer um NIF válido. Este é necessário para a ativação da conta e para a faturação de comissões.",
      "É da responsabilidade do Parceiro obter aconselhamento fiscal independente. A Camel Global não presta aconselhamento fiscal.",
    ],
  },
  {
    title: "10. Seguro",
    clauses: [
      "O Parceiro é o único responsável por garantir que todos os veículos estão sempre cobertos por um seguro completo.",
      "O Parceiro deve manter um seguro de responsabilidade civil com uma cobertura mínima de €5.000.000.",
      "Quando uma proposta indicar 'Full Insurance Included', esta deve representar um seguro verdadeiramente completo.",
      "O Parceiro indemniza a Camel Global contra todos os pedidos de indemnização decorrentes de qualquer acidente ou responsabilidade envolvendo os veículos ou condutores do Parceiro.",
      "A Camel Global não é responsável por qualquer perda, dano, lesão ou morte causada por um veículo, condutor ou operações de um Parceiro.",
      "O Parceiro deve comunicar qualquer acidente, roubo ou incidente significativo envolvendo uma Reserva da Camel Global no prazo de 24 horas.",
    ],
  },
  {
    title: "11. Propriedade Intelectual",
    clauses: [
      "Camel Global retém todos os direitos de propriedade intelectual sobre a Plataforma.",
      "É concedida ao Parceiro uma licença limitada, não exclusiva e intransferível para utilizar a Plataforma exclusivamente para o cumprimento de Reservas.",
      "O Parceiro não pode copiar, realizar engenharia reversa, modificar ou criar obras derivadas de qualquer parte da Plataforma.",
      "O Parceiro concede à Camel Global uma licença para exibir o nome e o perfil da empresa do Parceiro aos Clientes na Plataforma.",
    ],
  },
  {
    title: "12. Proteção de Dados e RGPD",
    clauses: [
      "Cada parte deverá cumprir toda a legislação aplicável em matéria de proteção de dados, incluindo o UK GDPR e o EU GDPR.",
      "Os dados pessoais do Cliente apenas poderão ser tratados pelo Parceiro para efeitos do cumprimento da Reserva específica para a qual foram partilhados.",
      "O Parceiro não poderá utilizar os dados do Cliente para fins de marketing, definição de perfis, retargeting ou venda a terceiros.",
      "O Parceiro deverá implementar medidas adequadas para proteger os dados do Cliente contra acesso não autorizado, perda ou divulgação.",
      "Mediante solicitação, o Parceiro deverá eliminar todos os dados pessoais relativos a um Cliente no prazo de 30 dias.",
      "O Parceiro deverá notificar a Camel Global de qualquer violação de dados pessoais no prazo de 72 horas após tomar conhecimento da mesma.",
    ],
  },
  {
    title: "13. Responsabilidade",
    clauses: [
      "Nada neste Contrato limita a responsabilidade por morte ou lesão corporal causada por negligência ou fraude.",
      "A responsabilidade agregada total da Camel Global não deverá exceder o total das comissões pagas pelo Parceiro nos 3 meses anteriores à reclamação.",
      "A Camel Global não será responsável por qualquer perda indireta, consequente, especial ou punitiva, incluindo perda de lucro ou receita.",
      "A Camel Global não será responsável por perdas decorrentes do incumprimento, por parte do Parceiro, dos presentes Termos ou das ações dos condutores do Parceiro.",
    ],
  },
  {
    title: "14. Suspensão e Rescisão",
    clauses: [
      "A Camel Global pode suspender imediatamente uma conta de Parceiro por reclamação grave de cliente, violação de normas, incumprimento de uma Reserva ou representação falsa.",
      "Após a suspensão, o Parceiro será notificado por correio eletrónico e terá 5 dias úteis para responder.",
      "A Camel Global pode rescindir permanentemente este Contrato em caso de violações repetidas ou de uma única infração grave.",
      "O Parceiro pode rescindir mediante aviso prévio por escrito de 30 dias através do formulário de contacto, desde que não existam Reservas ativas.",
      "Aquando da rescisão, o acesso à Plataforma é revogado, os montantes em dívida tornam-se imediatamente exigíveis e os dados dos Clientes devem ser eliminados no prazo de 30 dias.",
    ],
  },
  {
    title: "15. Alterações",
    clauses: [
      "A Camel Global reserva-se o direito de alterar estes Termos em qualquer momento.",
      "Os Parceiros serão notificados de alterações materiais por correio eletrónico com um aviso mínimo de 14 dias.",
      "A utilização continuada da Plataforma após o período de aviso constitui a aceitação dos Termos atualizados.",
      "A versão atual está sempre disponível em camel-global.com/partner/terms.",
    ],
  },
  {
    title: "16. Disposições Gerais",
    clauses: [
      "Este Acordo constitui o acordo integral entre as partes em relação ao seu objeto.",
      "Se qualquer disposição for considerada inválida ou inexequível, as disposições restantes continuam em pleno vigor.",
      "O Parceiro não pode ceder direitos ou obrigações sem o consentimento prévio por escrito da Camel Global.",
      "Este Acordo é regido pelas leis de Inglaterra e do País de Gales. Cada parte submete-se à jurisdição exclusiva dos tribunais de Inglaterra e do País de Gales.",
    ],
  },
];

export const PARTNER_TERMS_DE: TermsSection[] = [
  {
    title: "1. Definitionen",
    clauses: [
      "\"Vereinbarung\" bezeichnet diese Partnerbedingungen und -konditionen zusammen mit den Partner-Betriebsregeln, die durch Verweis einbezogen werden und Bestandteil dieser Vereinbarung sind.",
      "\"Camel Global\", \"wir\", \"uns\" oder \"unser\" bezeichnet NTUK Ltd, ein in England und Wales eingetragenes Unternehmen (company number 08765474), das unter dem Namen Camel Global tätig ist. Unsere eingetragene Adresse lautet Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN.",
      "\"Partner\", \"Sie\" oder \"Ihr\" bezeichnet das unabhängige Mietwagenunternehmen, das sich auf der Plattform registriert und diese Vereinbarung akzeptiert hat.",
      "\"Plattform\" bezeichnet den webbasierten Marktplatz, die Portale, APIs und zugehörigen Dienste von Camel Global, die unter camel-global.com verfügbar sind.",
      "\"Kunde\" bezeichnet jeden Endnutzer, der über die Plattform eine Mietwagenanfrage einreicht.",
      "\"Buchung\" bezeichnet eine bestätigte Mietvereinbarung zwischen einem Kunden und einem Partner, die über die Plattform vermittelt wird.",
      "\"Provision\" bezeichnet die von Camel Global dem Partner für die Nutzung der Plattform berechnete Gebühr, wie in Klausel 7 dargelegt.",
      "\"Mietpreis\" bezeichnet den angebotenen und akzeptierten Preis für das Mietwagenelements einer Buchung, ausschließlich etwaiger Kraftstoffkosten.",
      "\"Kraftstoffkosten\" bezeichnet den einem Kunden für den während einer Buchung verbrauchten Kraftstoff berechneten Betrag, der gemäß den Partner-Betriebsregeln berechnet wird.",
      "\"Partner-Betriebsregeln\" bezeichnet die im Bereich der Partner-Kontoverwaltung veröffentlichten Betriebsstandards und Verhaltensanforderungen, die von Zeit zu Zeit aktualisiert werden.",
      "\"Dienstleistungen\" bezeichnet die Marktplatzvermittlung, das Buchungsmanagement, die Zahlungsabwicklung und die damit verbundenen Dienstleistungen, die von Camel Global über die Plattform erbracht werden.",
      "\"Stripe Processing Fee\" bezeichnet die von Stripe für jede Transaktion erhobene Zahlungsabwicklungsgebühr. Der Satz variiert je nach Zahlungsmethode, Kartenart des Kunden und Ausstellungsland. Die auf jede Buchung angewandte genaue Gebühr ist auf Ihrer Buchungsdetailseite und in Ihren Berichten einsehbar. Die Stripe Processing Fee wird von Camel Global übernommen und wird nicht von der Auszahlung des Partners abgezogen.",
      "\"Angebotswährung\" bezeichnet die Währung, in der der Partner sein Angebot einreicht, welche der eingetragenen Abrechnungswährung des Partners entspricht, die während des Stripe-Onboardings festgelegt wurde.",
    ],
  },
  {
    title: "2. Art der Beziehung — Camel Global als Vermittler",
    clauses: [
      "Camel Global agiert als Marktplatz-Vermittler und Technologieplattform. Camel Global ist kein Mietwagenunternehmen, besitzt oder betreibt keine Fahrzeuge und beschäftigt keine Fahrer.",
      "Der rechtliche Vertrag über die Erbringung von Mietwagendienstleistungen kommt direkt zwischen dem Partner und dem Kunden zustande. Camel Global ist keine Vertragspartei dieses Vertrags und übernimmt keine Haftung für dessen Erfüllung.",
      "Camel Global handelt beim Abschluss einer Buchung nicht als Bevollmächtigter einer der Parteien. Der Partner ist der Dienstleistungserbringer und stellt alle relevanten Unterlagen, einschließlich Mehrwertsteuerrechnungen, direkt an Kunden aus.",
      "Der Partner erkennt an, dass die Rolle von Camel Global beschränkt ist auf: (a) den Betrieb der Plattform; (b) die Vermittlung von Kunden an Partner; (c) die Abwicklung von Zahlungen im Namen der Partner als offengelegter Vermittler; und (d) die Bereitstellung der in den Partner-Betriebsregeln beschriebenen Instrumente.",
      "Nichts in dieser Vereinbarung begründet ein Arbeitsverhältnis, eine Bevollmächtigung, Partnerschaft, ein Gemeinschaftsunternehmen oder ein Franchiseverhältnis zwischen Camel Global und dem Partner oder einem der Fahrer oder Mitarbeiter des Partners.",
      "Der Partner darf gegenüber keinem Kunden oder Dritten erklären, dass Camel Global der Anbieter von Mietwagendienstleistungen ist oder dass Fahrer von Camel Global beschäftigt werden oder als dessen Bevollmächtigte handeln.",
    ],
  },
  {
    title: "3. Registrierung und Konto",
    clauses: [
      "Um die Plattform nutzen zu können, muss der Partner den Registrierungsprozess abschließen, genaue und vollständige Angaben machen und eine Genehmigung von Camel Global erhalten.",
      "Der Partner versichert, dass alle während der Registrierung und zu jedem späteren Zeitpunkt gemachten Angaben wahrheitsgemäß, korrekt, aktuell und vollständig sind.",
      "Der Partner ist dafür verantwortlich, die Vertraulichkeit seiner Zugangsdaten zu wahren und haftet für alle Aktivitäten, die unter seinem Konto stattfinden.",
      "Der Partner muss Camel Global unverzüglich über jede unbefugte Nutzung seines Kontos oder jeden anderen Sicherheitsverstoß informieren.",
      "Camel Global behält sich das Recht vor, eine Registrierung abzulehnen oder ein Konto jederzeit gemäß Klausel 14 zu sperren oder zu kündigen.",
      "Jedes Partnerkonto ist für eine einzelne juristische Person bestimmt. Der Partner darf keine mehreren Konten anlegen oder Dritten die Nutzung seines Kontos gestatten.",
      "Der Partner muss seine registrierten Angaben, einschließlich des eingetragenen Firmennamens, der USt-IdNr./NIF-Nummer und der Kontaktinformationen, stets aktuell halten.",
    ],
  },
  {
    title: "4. Pflichten des Partners",
    clauses: [
      "Der Partner muss die Partner-Betriebsregeln jederzeit einhalten. Die Betriebsregeln sind Bestandteil dieser Vereinbarung und haben dieselbe Rechtskraft.",
      "Der Partner muss alle Lizenzen, Genehmigungen, Registrierungen und Versicherungspolicen besitzen und aufrechterhalten, die nach geltendem Recht für den Betrieb eines Mietwagenunternehmens in seiner Jurisdiktion erforderlich sind.",
      "Der Partner muss sicherstellen, dass alle über die Plattform angebotenen Fahrzeuge verkehrssicher, ordnungsgemäß zugelassen und vollständig versichert sind sowie die in den Betriebsregeln festgelegten Standards erfüllen.",
      "Der Partner trägt die alleinige Verantwortung für das Verhalten aller unter seinem Konto registrierten Fahrer sowie dafür, dass diese Fahrer die in den Betriebsregeln festgelegten Standards erfüllen.",
      "Der Partner muss jede von ihm angenommene Buchung erfüllen. Die Nichterfüllung einer bestätigten Buchung ohne außergewöhnliche Rechtfertigung stellt eine wesentliche Verletzung dieser Vereinbarung dar.",
      "Der Partner darf die Plattform nicht dazu nutzen, Dienstleistungen anzubieten, die er nicht erbringen kann, Gebote für Anfragen einzureichen, die er nicht erfüllen kann, oder sich an Praktiken zu beteiligen, die Kunden irreführen.",
      "Der Partner muss auf Kundenanfragen und Beschwerden innerhalb der in den Betriebsregeln festgelegten Fristen reagieren.",
      "Der Partner muss alle Kraftstoffstände mithilfe der Camel Global Fahrer-App bei jeder Übergabe und Abholung gemäß der Kraftstoffrichtlinie in den Betriebsregeln korrekt erfassen.",
    ],
  },
  {
    title: "5. Pflichten von Camel Global",
    clauses: [
      "Camel Global wird angemessene Bemühungen unternehmen, die Plattform 24 Stunden am Tag, 7 Tage die Woche verfügbar zu machen, vorbehaltlich geplanter Wartungsarbeiten und Ereignisse, die außerhalb unserer Kontrolle liegen.",
      "Camel Global wird Buchungen, Zahlungen und Benachrichtigungen gemäß den in der Plattform beschriebenen Funktionen verarbeiten.",
      "Camel Global wird Partner zeitnah über neue Kundenanfragen innerhalb ihres Serviceradius informieren.",
      "Camel Global wird Partner-Support über das Kontaktformular bereitstellen und angemessene Bemühungen unternehmen, auf Anfragen innerhalb von 2 Werktagen zu antworten.",
      "Camel Global wird Partnern mindestens 14 Tage im Voraus schriftlich über wesentliche Änderungen dieser Bedingungen oder der Betriebsregeln informieren.",
      "Camel Global garantiert keinem Partner ein Mindestvolumen an Buchungen oder Einnahmen.",
    ],
  },
  {
    title: "6. Buchungen und Preisgestaltung",
    clauses: [
      "Partner können auf jede Kundenanfrage bieten, die in ihren registrierten Serviceradius fällt.",
      "Alle von Partnern eingereichten Preise müssen sämtliche Kosten vollständig einschließen. Nach Annahme eines Angebots dürfen dem Kunden keine zusätzlichen Gebühren berechnet werden.",
      "Der Partner ist an den von ihm gebotenen Preis gebunden, sobald eine Buchung bestätigt wurde.",
      "Partner dürfen pro Kundenanfrage nur ein Angebot einreichen. Angebote, die nach Ablauf des Angebotszeitraums eingereicht werden, werden nicht akzeptiert.",
      "Der Partner erkennt an, dass Kunden nicht verpflichtet sind, ein Angebot anzunehmen.",
      "Camel Global behält sich das Recht vor, Angebote zu entfernen, die ungenau oder unvollständig erscheinen oder gegen diese Bedingungen verstoßen.",
      "Sofern der Partner ein Kilometerlimit anwendet oder eine Sicherheitsleistung verlangt, müssen diese im Angebot klar angegeben sein, bevor der Kunde dieses annimmt. Der Partner trägt die alleinige Verantwortung für die direkte Einziehung solcher Beträge vom Kunden zum Zeitpunkt der Fahrzeugübergabe. Diese Zahlungen liegen vollständig außerhalb des Zahlungssystems von Camel Global — Camel Global erhebt, hält oder verarbeitet keine Kilometergebühren oder Sicherheitsleistungen im Namen von Partnern.",
      "Der Partner erkennt an, dass es seine alleinige Verantwortung ist, eigenständige Vorkehrungen zur Einziehung etwaiger Sicherheitsleistungen oder Kilometermehrkosten zum Zeitpunkt der Abholung oder Rückgabe zu treffen. Camel Global übernimmt keine Haftung für ein etwaiges Versäumnis des Partners, solche Beträge einzuziehen, und kein Streit, der aus einer Sicherheitsleistung oder Kilometergebühr entsteht, unterliegt dem Streitbeilegungsverfahren von Camel Global.",
    ],
  },
  {
    title: "7. Provision und Zahlungen",
    clauses: [
      "Camel Global erhebt eine Provision auf den Mietpreis jeder abgeschlossenen Buchung. Der Standardprovisionssatz beträgt 20 % des Mietpreises, vorbehaltlich einer Mindestprovision von €10 (oder dem Gegenwert in der jeweiligen Währung) pro Buchung. Provisionssätze können für einzelne Partner durch Vereinbarung mit Camel Global reduziert werden — der für Ihr Konto geltende Satz wird auf Ihrer Angebotseinreichungsseite und in Ihrem Konto angezeigt.",
      "Kraftstoffkosten werden vollständig an den Partner weitergegeben. Camel Global erhebt keine Provision auf Kraftstoffkosten.",
      "Die Auszahlung des Partners für jede Buchung wird wie folgt berechnet: Mietpreis abzüglich Provision, zuzüglich Kraftstoffkosten. Camel Global trägt sämtliche Stripe-Bearbeitungsgebühren — diese werden nicht von der Auszahlung des Partners abgezogen.",
      "Zahlungen werden über Stripe Connect abgewickelt. Der Partner muss das Stripe Express-Onboarding abschließen, um Auszahlungen zu erhalten. Die Abrechnungswährung des Partners wird zum Zeitpunkt des Stripe-Onboardings festgelegt und bestimmt die Währung, in der Auszahlungen erfolgen.",
      "Camel Global behält seine Provision aus jeder Buchung vollständig ein. Die Stripe-Bearbeitungsgebühr wird vollständig von Camel Global getragen und wird niemals von der Auszahlung des Partners abgezogen.",
      "Camel Global stellt Partnern monatlich Provisionsrechnungen aus, gegebenenfalls mit Umkehrung der Steuerschuldnerschaft gemäß Article 44/196 of the EU VAT Directive.",
      "Der Partner ist allein verantwortlich für die buchhalterische Erfassung und Entrichtung aller Steuern auf Einkünfte, die über die Plattform erzielt werden.",
      "Im Falle eines Rückerstattungsstreits mit einem Kunden liegt die finanzielle Haftung beim Partner.",
      "Kundendispute & Rückbuchungen: Wenn ein Kunde im Zusammenhang mit einer Buchung einen Zahlungsstreit oder eine Rückbuchung bei seiner Bank oder seinem Kartenaussteller einleitet, wird Camel Global die Auszahlung des Partners für diese Buchung bis zur Klärung einbehalten. Der Partner wird per E-Mail benachrichtigt. Die Auszahlung bleibt bis zur Beilegung des Disputs einbehalten. Wird der Disput zugunsten des Kunden entschieden, werden die entsprechenden Beträge an den Kunden erstattet und die Auszahlung des Partners für diese Buchung verfällt. Wird der Disput zugunsten des Partners entschieden, wird die Auszahlung freigegeben und im nächsten monatlichen Auszahlungslauf verarbeitet.",
      "Alle an Kunden zu erstattenden Kraftstoffrückerstattungen werden von der Plattform automatisch vom verbundenen Kontoguthaben des Partners verarbeitet.",
    ],
  },
  {
    title: "7b. Stripe Bearbeitungsgebühren und Währung",
    clauses: [
      "Alle Zahlungen, die von Kunden über die Plattform geleistet werden, werden von Stripe verarbeitet. Stripe erhebt eine Bearbeitungsgebühr für jede Transaktion. Camel Global übernimmt diese Gebühr vollständig — die Stripe Processing Fee wird niemals vom Auszahlungsbetrag des Partners abgezogen.",
      "Die Nettoauszahlung des Partners entspricht dem Mietpreis abzüglich der Camel-Provision, zuzüglich der Kraftstoffgebühr. Von diesem Betrag wird keine Stripe-Gebühr abgezogen.",
      "Die Abrechnungswährung des Partners wird zum Zeitpunkt des Stripe Express-Onboardings dauerhaft festgelegt. Auszahlungen erfolgen stets in der registrierten Abrechnungswährung des Partners. Diese Währung kann nach dem Onboarding nicht mehr geändert werden — Partner, die ihre Abrechnungswährung ändern müssen, wenden sich bitte an den Support von Camel Global.",
      "Kunden zahlen stets in der Angebotswährung des Partners. Zwischen der Kundenzahlung und dem Stripe-Guthaben des Partners wird keine Währungsumrechnung vorgenommen.",
      "Die genaue Stripe Processing Fee, die auf jede Buchung angewendet wird, ist auf Ihrer Buchungsdetailseite sowie in Ihren Berichten und CSV-Exporten einsehbar. Diese Gebühr wird aus Transparenzgründen und zu Informationszwecken ausgewiesen — sie stellt die von Camel Global getragenen Kosten dar und wird nicht von Ihrer Auszahlung abgezogen.",
      "Der Partner erkennt an, dass Camel Global keinen Einfluss auf die von Stripe festgelegten oder erhobenen Gebühren hat. Camel Global behält sich das Recht vor, seine Gebührenübernahmerichtlinie künftig mit einer schriftlichen Frist von mindestens 14 Tagen gegenüber den Partnern zu überprüfen.",
    ],
  },
  {
    title: "8. Stornierungen und Rückerstattungen",
    clauses: [
      "Die folgende Stornierungsrichtlinie gilt für alle über die Plattform vorgenommenen Buchungen. Der Zeitstempel der Stornierung wird von der Plattform automatisch zum Zeitpunkt der Bestätigung der Stornierung erfasst.",
      "Wenn der Partner eine bestätigte Buchung aus irgendeinem Grund storniert, erhält der Kunde eine vollständige Rückerstattung aller geleisteten Zahlungen, einschließlich des Mietpreises und der Kraftstoffkaution. Stornierungen durch den Partner stellen einen Verstoß gegen Klausel 4 dar und können zur Sperrung des Kontos führen.",
      "Wenn der Kunde eine Buchung mehr als 48 Stunden vor dem geplanten Abholzeitpunkt storniert, erhält der Kunde eine vollständige Rückerstattung aller geleisteten Zahlungen. Der Partner erhält für diese Buchung keine Auszahlung.",
      "Wenn der Kunde eine Buchung innerhalb von 48 Stunden vor dem geplanten Abholzeitpunkt storniert, ist der Mietpreis nicht erstattungsfähig und der Partner behält seine Nettovergütung (Mietpreis abzüglich Provision). Die Kraftstoffkaution wird dem Kunden stets vollständig zurückerstattet, da der Kraftstoff nicht verbraucht wurde.",
      "Sobald ein Fahrzeug übernommen wurde und die Miete läuft, ist keine Stornierung mehr möglich und eine Rückerstattung des Mietpreises nicht vorgesehen. Der Kraftstoff wird am Ende der Mietzeit auf Basis des tatsächlichen Verbrauchs abgerechnet.",
      "Camel Global-Administratoren können jede Buchung jederzeit stornieren und werden dem Kunden eine vollständige Rückerstattung ausstellen. Der Partner wird per E-Mail benachrichtigt.",
      "Alle Rückerstattungen werden automatisch von der Plattform verarbeitet und erscheinen innerhalb von 5–10 Werktagen auf dem Konto des Kunden.",
      "Die 48-Stunden-Frist wird ab dem geplanten Abholzeitpunkt gemessen, der zum Zeitpunkt der Bestätigung in der Buchung erfasst wurde. Etwaige zwischen den Parteien vereinbarte Änderungen des Abholzeitpunkts ändern die Frist nicht rückwirkend.",
    ],
  },
  {
    title: "9. Mehrwertsteuer, Steuern und Rechnungsstellung",
    clauses: [
      "Der Partner ist der Anbieter von Mietwagendienstleistungen gegenüber dem Kunden. Der rechtliche Vertrag über die Erbringung dieser Dienstleistungen besteht zwischen dem Partner und dem Kunden. Camel Global ist ausschließlich ein Marktplatzvermittler.",
      "Die von Camel Global an Kunden ausgestellte Buchungsbestätigungsquittung bestätigt den von NTUK Ltd als Plattformvermittler empfangenen Zahlungseingang. Sie stellt keine Umsatzsteuerrechnung für Mietwagendienstleistungen dar und erfüllt nicht die Rechnungsstellungspflichten des Partners gegenüber Kunden.",
      "Der Partner ist allein verantwortlich für die Ausstellung von Umsatzsteuerrechnungen an Kunden in Übereinstimmung mit allen geltenden Steuervorschriften. Wenn ein Kunde eine Umsatzsteuerrechnung für eine Buchung anfordert, muss der Partner diese innerhalb einer angemessenen Frist direkt an den Kunden ausstellen. Camel Global stellt keine Umsatzsteuerrechnungen für Mietwagendienstleistungen aus und ist nicht verantwortlich für die Einhaltung der Rechnungsstellungspflichten durch den Partner.",
      "Der Partner ist verantwortlich für die Berechnung und Abführung der Umsatzsteuer auf den vom Kunden gezahlten vollständigen Buchungspreis.",
      "Camel Global stellt dem Partner Rechnungen für Provisionen unter Anwendung des Reverse-Charge-Verfahrens gemäß Article 44/196 of the EU VAT Directive aus.",
      "Partner, die in Spanien tätig sind, müssen eine gültige NIF vorlegen. Diese ist für die Kontoaktivierung und die Provisionsabrechnung erforderlich.",
      "Es liegt in der Verantwortung des Partners, unabhängige steuerliche Beratung einzuholen. Camel Global bietet keine Steuerberatung an.",
    ],
  },
  {
    title: "10. Versicherung",
    clauses: [
      "Der Partner ist allein dafür verantwortlich, dass alle Fahrzeuge jederzeit vollständig versichert sind.",
      "Der Partner muss eine Betriebshaftpflichtversicherung mit einer Mindestdeckung von €5.000.000 unterhalten.",
      "Wenn ein Angebot \"Full Insurance Included\" angibt, muss dies eine echte Vollkaskoversicherung darstellen.",
      "Der Partner stellt Camel Global von allen Ansprüchen frei, die aus einem Unfall oder einer Haftung im Zusammenhang mit den Fahrzeugen oder Fahrern des Partners entstehen.",
      "Camel Global haftet nicht für Verluste, Schäden, Verletzungen oder Todesfälle, die durch ein Fahrzeug, einen Fahrer oder den Betrieb eines Partners verursacht werden.",
      "Der Partner muss jeden Unfall, Diebstahl oder bedeutenden Vorfall im Zusammenhang mit einer Camel Global-Buchung innerhalb von 24 Stunden melden.",
    ],
  },
  {
    title: "11. Geistiges Eigentum",
    clauses: [
      "Camel Global behält alle Rechte an geistigem Eigentum an der Plattform.",
      "Dem Partner wird eine eingeschränkte, nicht-exklusive, nicht übertragbare Lizenz gewährt, die Plattform ausschließlich zur Abwicklung von Buchungen zu nutzen.",
      "Der Partner darf keinen Teil der Plattform kopieren, zurückentwickeln, modifizieren oder davon abgeleitete Werke erstellen.",
      "Der Partner gewährt Camel Global eine Lizenz zur Anzeige des Unternehmensnamens und Profils des Partners gegenüber Kunden auf der Plattform.",
    ],
  },
  {
    title: "12. Datenschutz und DSGVO",
    clauses: [
      "Jede Partei hat alle anwendbaren Datenschutzgesetze einzuhalten, einschließlich der UK DSGVO und der EU-DSGVO.",
      "Personenbezogene Daten von Kunden dürfen vom Partner ausschließlich zum Zweck der Erfüllung der konkreten Buchung verarbeitet werden, für die sie übermittelt wurden.",
      "Der Partner darf Kundendaten nicht für Marketingzwecke, Profilerstellung, Retargeting oder den Verkauf an Dritte verwenden.",
      "Der Partner hat angemessene Maßnahmen zu ergreifen, um Kundendaten vor unbefugtem Zugriff, Verlust oder Offenlegung zu schützen.",
      "Auf Anfrage hat der Partner alle personenbezogenen Daten eines Kunden innerhalb von 30 Tagen zu löschen.",
      "Der Partner hat Camel Global über jede Verletzung des Schutzes personenbezogener Daten innerhalb von 72 Stunden nach Bekanntwerden zu unterrichten.",
    ],
  },
  {
    title: "13. Haftung",
    clauses: [
      "Nichts in dieser Vereinbarung schränkt die Haftung für Tod oder Körperverletzung infolge von Fahrlässigkeit oder Betrug ein.",
      "Die gesamte Gesamthaftung von Camel Global darf die Gesamtprovision, die der Partner in den 3 Monaten vor dem Anspruch gezahlt hat, nicht überschreiten.",
      "Camel Global haftet nicht für mittelbare, Folge-, besondere oder Strafschäden, einschließlich entgangenen Gewinns oder Umsatzes.",
      "Camel Global haftet nicht für Verluste, die aus der Nichteinhaltung dieser Bedingungen durch den Partner oder aus dem Verhalten der Fahrer des Partners entstehen.",
    ],
  },
  {
    title: "14. Sperrung und Kündigung",
    clauses: [
      "Camel Global kann ein Partnerkonto bei einer schwerwiegenden Kundenbeschwerde, einem Verstoß gegen die Standards, der Nichterfüllung einer Buchung oder einer Falschdarstellung mit sofortiger Wirkung aussetzen.",
      "Nach der Aussetzung wird der Partner per E-Mail benachrichtigt und erhält 5 Werktage Zeit, um zu antworten.",
      "Camel Global kann diesen Vertrag bei wiederholten Verstößen oder einem einzelnen schwerwiegenden Verstoß dauerhaft kündigen.",
      "Der Partner kann den Vertrag durch eine schriftliche Kündigung mit einer Frist von 30 Tagen über das Kontaktformular kündigen, vorausgesetzt, es bestehen keine aktiven Buchungen mehr.",
      "Bei Beendigung des Vertrags wird der Plattformzugang gesperrt, ausstehende Beträge werden sofort fällig, und Kundendaten müssen innerhalb von 30 Tagen gelöscht werden.",
    ],
  },
  {
    title: "15. Änderungen",
    clauses: [
      "Camel Global behält sich das Recht vor, diese Bedingungen jederzeit zu ändern.",
      "Partner werden über wesentliche Änderungen per E-Mail mit einer Frist von mindestens 14 Tagen informiert.",
      "Die fortgesetzte Nutzung der Plattform nach Ablauf der Benachrichtigungsfrist gilt als Zustimmung zu den aktualisierten Bedingungen.",
      "Die aktuelle Version ist stets unter camel-global.com/partner/terms verfügbar.",
    ],
  },
  {
    title: "16. Allgemeines",
    clauses: [
      "Diese Vereinbarung stellt die gesamte Übereinkunft zwischen den Parteien in Bezug auf ihren Gegenstand dar.",
      "Sollte eine Bestimmung als ungültig oder nicht durchsetzbar befunden werden, bleiben die übrigen Bestimmungen in vollem Umfang in Kraft.",
      "Der Partner darf Rechte oder Pflichten nicht ohne die vorherige schriftliche Zustimmung von Camel Global abtreten.",
      "Diese Vereinbarung unterliegt dem Recht von England und Wales. Jede Partei unterwirft sich der ausschließlichen Zuständigkeit der Gerichte von England und Wales.",
    ],
  },
];

// ---------------------------------------------------------------------------
// PDF generator — bilingual (English + selected locale)
// ---------------------------------------------------------------------------
type PdfLocale = "en" | "es" | "fr" | "it" | "pt" | "de";

const TERMS_TRANSLATIONS: Record<Exclude<PdfLocale, "en">, { sections: TermsSection[]; label: string; subtitle: string; legalNote: string }> = {
  es: { sections: PARTNER_TERMS_ES, label: "VERSIÓN EN ESPAÑOL / SPANISH VERSION", subtitle: "Estos Términos rigen el uso de la plataforma Camel Global como socio. Al registrarse como socio, acepta quedar vinculado por estos Términos en su totalidad.", legalNote: "⚠️  La versión en inglés prevalece en caso de conflicto. The English version prevails in the event of any conflict." },
  fr: { sections: PARTNER_TERMS_FR, label: "VERSION FRANÇAISE / FRENCH VERSION", subtitle: "Les présentes Conditions régissent votre utilisation de la plateforme Camel Global en qualité de partenaire. En vous inscrivant en tant que partenaire, vous acceptez d'être lié par l'intégralité des présentes Conditions.", legalNote: "⚠️  La version anglaise prévaut en cas de conflit. The English version prevails in the event of any conflict." },
  it: { sections: PARTNER_TERMS_IT, label: "VERSIONE ITALIANA / ITALIAN VERSION", subtitle: "I presenti Termini disciplinano l'utilizzo della piattaforma Camel Global in qualità di partner. Effettuando la registrazione come partner, l'utente accetta di essere vincolato integralmente dai presenti Termini.", legalNote: "⚠️  La versione inglese prevale in caso di conflitto. The English version prevails in the event of any conflict." },
  pt: { sections: PARTNER_TERMS_PT, label: "VERSÃO PORTUGUESA / PORTUGUESE VERSION", subtitle: "Os presentes Termos regem a utilização da plataforma Camel Global na qualidade de parceiro. Ao registar-se como parceiro, o utilizador declara aceitar ficar vinculado integralmente pelos presentes Termos.", legalNote: "⚠️  A versão inglesa prevalece em caso de conflito. The English version prevails in the event of any conflict." },
  de: { sections: PARTNER_TERMS_DE, label: "DEUTSCHE VERSION / GERMAN VERSION", subtitle: "Diese Bedingungen regeln Ihre Nutzung der Camel Global-Plattform als Partner. Mit der Registrierung als Partner erklären Sie sich damit einverstanden, vollumfänglich an diese Bedingungen gebunden zu sein.", legalNote: "⚠️  Bei Widersprüchen ist die englische Fassung maßgeblich. The English version prevails in the event of any conflict." },
};

export async function downloadPartnerTermsPDF(locale: PdfLocale = "en") {
  const { jsPDF } = await import("jspdf");
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableW = pageW - margin * 2;
  let y = margin;

  const translation = locale !== "en" ? TERMS_TRANSLATIONS[locale] : undefined;

  function checkPage(needed = 8) {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  }

  function renderHeader() {
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("CAMEL GLOBAL", margin, 7);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Meet and greet car hire", margin, 12);
    doc.text("Partner Terms and Conditions", pageW - margin, 7, { align: "right" });
    doc.text(`Version: ${TERMS_VERSION} — Effective: ${TERMS_EFFECTIVE}`, pageW - margin, 11, { align: "right" });
    doc.text(`Generated: ${dateStr}`, pageW - margin, 15, { align: "right" });
  }

  function renderTermsSection(sections: TermsSection[], translated: boolean) {
    for (const { title, clauses } of sections) {
      checkPage(12);
      doc.setFillColor(translated ? 230 : 240, 240, translated ? 255 : 240);
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
  }

  renderHeader();
  y = 26;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Terms and Conditions", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const subtitleEN = doc.splitTextToSize(
    "These Terms govern your use of the Camel Global platform as a partner. By registering as a partner you agree to be bound by these Terms in full.",
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

  renderTermsSection(PARTNER_TERMS, false);

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
    renderTermsSection(translation.sections, true);
  }

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global Partner Terms and Conditions — Version ${TERMS_VERSION} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Global-Partner-Terms-${TERMS_VERSION}${locale !== "en" ? "-" + locale.toUpperCase() : ""}.pdf`);
}
