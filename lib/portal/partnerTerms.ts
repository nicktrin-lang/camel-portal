export const TERMS_VERSION   = "2026-06c";
export const TERMS_EFFECTIVE = "10 June 2026";

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
    title: "9. IVA e Impuestos",
    clauses: [
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
// PDF generator — bilingual when locale === "es"
// ---------------------------------------------------------------------------
export async function downloadPartnerTermsPDF(locale: "en" | "es" = "en") {
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

  function renderTermsSection(sections: TermsSection[], lang: "en" | "es") {
    for (const { title, clauses } of sections) {
      checkPage(12);
      doc.setFillColor(lang === "es" ? 230 : 240, lang === "es" ? 240 : 240, lang === "es" ? 255 : 240);
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

  // Title page
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Partner Terms and Conditions", margin, y); y += 7;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  const subtitleEN = doc.splitTextToSize(
    "These Terms govern your use of the Camel Global platform as a partner. By registering as a partner you agree to be bound by these Terms in full.",
    usableW
  );
  doc.text(subtitleEN, margin, y); y += subtitleEN.length * 4 + 4;

  if (locale === "es") {
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 160);
    const subtitleES = doc.splitTextToSize(
      "Estos Términos rigen el uso de la plataforma Camel Global como socio. Al registrarse como socio, acepta quedar vinculado por estos Términos en su totalidad.",
      usableW
    );
    doc.text(subtitleES, margin, y); y += subtitleES.length * 4 + 4;
  }

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 6;

  // English section
  renderTermsSection(PARTNER_TERMS, "en");

  if (locale === "es") {
    // Divider between EN and ES
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
    renderTermsSection(PARTNER_TERMS_ES, "es");
  }

  // Footer on every page
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Camel Global Partner Terms and Conditions — Version ${TERMS_VERSION} — camel-global.com`, margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`Camel-Global-Partner-Terms-${TERMS_VERSION}${locale === "es" ? "-ES" : ""}.pdf`);
}