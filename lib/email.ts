function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type EmailAttachment = {
  filename: string;
  content: string;   // base64-encoded
  encoding: "base64";
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  from: fromOverride,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  from?: string;
  headers?: Record<string, string>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = fromOverride || process.env.EMAIL_FROM;

  const cleanTo = String(to || "").trim().toLowerCase();

  console.log("📧 Raw email input:", to);
  console.log("📧 Clean email:", cleanTo);

  if (!cleanTo || !isValidEmail(cleanTo)) {
    console.error("❌ Invalid email detected:", cleanTo);
    throw new Error(`Invalid email address: ${cleanTo}`);
  }

  if (!apiKey) {
    console.error("❌ Missing RESEND_API_KEY");
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    console.error("❌ Missing EMAIL_FROM");
    throw new Error("Missing EMAIL_FROM");
  }

  console.log("📧 Sending email to:", cleanTo);

  const body: Record<string, unknown> = { from, to: cleanTo, subject, html };
  if (attachments?.length) body.attachments = attachments;
  if (headers && Object.keys(headers).length) body.headers = headers;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Resend failed:", res.status, text);
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  console.log("✅ Email sent successfully:", json?.id || json);
  return json;
}

// ---------------------------------------------------------------------------
// Locale handling — notification emails are localized to all 6 supported
// languages. PDF attachments are generated elsewhere and stay English (NTUK
// legal requirement). Any unknown/missing locale falls back to English.
// ---------------------------------------------------------------------------
export type EmailLocale = "en" | "es" | "fr" | "it" | "pt" | "de";

const EMAIL_LOCALES: EmailLocale[] = ["en", "es", "fr", "it", "pt", "de"];

export function coerceEmailLocale(v: unknown): EmailLocale {
  return typeof v === "string" && (EMAIL_LOCALES as string[]).includes(v)
    ? (v as EmailLocale)
    : "en";
}

// Default email locale derived from a partner/customer country at account
// creation. Countries are stored as freeform strings (e.g. "Spain", "España",
// "Deutschland"), so we match on normalized name variants and ISO codes.
// Anything unrecognised falls back to English. This is only a DEFAULT — the
// recipient can override it in account settings (communication_locale).
export function countryToEmailLocale(country: unknown): EmailLocale {
  const c = String(country ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents: "espana" (accents removed)
  if (!c) return "en";
  const map: Record<string, EmailLocale> = {
    // Spain
    spain: "es", espana: "es", es: "es", esp: "es",
    // Germany
    germany: "de", deutschland: "de", de: "de", deu: "de", ger: "de",
    // France
    france: "fr", fr: "fr", fra: "fr",
    // Italy
    italy: "it", italia: "it", it: "it", ita: "it",
    // Portugal
    portugal: "pt", pt: "pt", prt: "pt",
  };
  return map[c] ?? "en";
}

function pick<T>(map: Record<EmailLocale, T>, locale: EmailLocale): T {
  return map[locale] ?? map.en;
}

// ---------------------------------------------------------------------------
// Shared email wrapper — black header + light body, consistent brand style.
// Heading and body are already-localized strings; the wrapper supplies the
// localized sign-off. The "Meet & Greet Car Hire" tagline stays English as a
// brand descriptor (matches prior ES behaviour).
// ---------------------------------------------------------------------------
const SIGNOFF: Record<EmailLocale, string> = {
  en: "Best regards,",
  es: "Saludos,",
  fr: "Cordialement,",
  it: "Cordiali saluti,",
  pt: "Atenciosamente,",
  de: "Mit freundlichen Grüßen,",
};

const TEAM: Record<EmailLocale, string> = {
  en: "The Camel Global Team",
  es: "El equipo de Camel Global",
  fr: "L'équipe Camel Global",
  it: "Il team di Camel Global",
  pt: "A equipa da Camel Global",
  de: "Das Camel Global Team",
};

function brandEmail(heading: string, body: string, locale: EmailLocale): string {
  const logoUrl = "https://portal.camel-global.com/camel-logo-white-new.png";
  const signoff = pick(SIGNOFF, locale);
  const team    = pick(TEAM, locale);
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px; display:flex; align-items:center; gap:16px;">
        <img src="${logoUrl}" alt="Camel Global" style="height:70px; width:auto; display:block; margin-right:20px;" />
        <h2 style="color:#fff; margin:0;">${heading}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${body}
        <p style="margin-top:32px; color:#888; font-size:14px;">${signoff}<br/><strong style="color:#222;">${team}</strong><br/><span style="color:#aaa;">Meet &amp; Greet Car Hire</span></p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Partner emails — all accept optional locale (default "en")
// ---------------------------------------------------------------------------

export async function sendApplicationReceivedEmail(to: string, locale: EmailLocale = "en") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  const subject: Record<EmailLocale, string> = {
    en: "Your Camel Global partner application has been received",
    es: "Tu solicitud de socio en Camel Global ha sido recibida",
    fr: "Votre candidature de partenaire Camel Global a bien été reçue",
    it: "La tua candidatura come partner Camel Global è stata ricevuta",
    pt: "A sua candidatura a parceiro Camel Global foi recebida",
    de: "Ihre Camel Global Partnerbewerbung ist eingegangen",
  };

  const heading: Record<EmailLocale, string> = {
    en: "Application received",
    es: "Solicitud recibida",
    fr: "Candidature reçue",
    it: "Candidatura ricevuta",
    pt: "Candidatura recebida",
    de: "Bewerbung eingegangen",
  };

  const body: Record<EmailLocale, string> = {
    en: `
    <p>Thanks for applying to become a Camel Global partner.</p>
    <p>We have received your application and our team will review it shortly.</p>
    <p>No action is required at this stage.</p>
    <p><a href="${baseUrl}/partner/login">Partner login</a></p>`,
    es: `
    <p>Gracias por solicitar convertirte en socio de Camel Global.</p>
    <p>Hemos recibido tu solicitud y nuestro equipo la revisará en breve.</p>
    <p>No es necesario que hagas nada en este momento.</p>
    <p><a href="${baseUrl}/partner/login">Acceso para socios</a></p>`,
    fr: `
    <p>Merci d'avoir postulé pour devenir partenaire Camel Global.</p>
    <p>Nous avons bien reçu votre candidature et notre équipe l'examinera sous peu.</p>
    <p>Aucune action n'est requise à ce stade.</p>
    <p><a href="${baseUrl}/partner/login">Connexion partenaire</a></p>`,
    it: `
    <p>Grazie per aver richiesto di diventare partner di Camel Global.</p>
    <p>Abbiamo ricevuto la tua candidatura e il nostro team la esaminerà a breve.</p>
    <p>Al momento non è richiesta alcuna azione.</p>
    <p><a href="${baseUrl}/partner/login">Accesso partner</a></p>`,
    pt: `
    <p>Obrigado por se candidatar a parceiro da Camel Global.</p>
    <p>Recebemos a sua candidatura e a nossa equipa irá analisá-la em breve.</p>
    <p>Não é necessária qualquer ação nesta fase.</p>
    <p><a href="${baseUrl}/partner/login">Acesso de parceiro</a></p>`,
    de: `
    <p>Vielen Dank für Ihre Bewerbung als Camel Global Partner.</p>
    <p>Wir haben Ihre Bewerbung erhalten und unser Team wird sie in Kürze prüfen.</p>
    <p>Zu diesem Zeitpunkt ist keine Aktion erforderlich.</p>
    <p><a href="${baseUrl}/partner/login">Partner-Login</a></p>`,
  };

  return sendEmail({
    to,
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), pick(body, locale), locale),
  });
}

export async function sendApprovalEmail(to: string, locale: EmailLocale = "en", partnerName: string = "") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/partner/login`;

  const greeting: Record<EmailLocale, string> = {
    en: partnerName ? `Dear ${partnerName},`            : "Dear Partner,",
    es: partnerName ? `Estimado/a ${partnerName},`      : "Estimado/a socio/a,",
    fr: partnerName ? `Cher/Chère ${partnerName},`      : "Cher partenaire,",
    it: partnerName ? `Gentile ${partnerName},`         : "Gentile partner,",
    pt: partnerName ? `Caro(a) ${partnerName},`         : "Caro parceiro,",
    de: partnerName ? `Sehr geehrte(r) ${partnerName},` : "Sehr geehrter Partner,",
  };

  const stepWord: Record<EmailLocale, string> = {
    en: "Step", es: "Paso", fr: "Étape", it: "Passaggio", pt: "Passo", de: "Schritt",
  };

  const steps: Record<EmailLocale, string[]> = {
    en: [
      "Set your location &amp; service radius",
      "Set your billing currency",
      "Add your billing details",
      "Add your fleet vehicles",
      "Add your drivers",
      "Connect your Stripe payout account",
      "Go live!",
    ],
    es: [
      "Establece tu ubicación y radio de servicio",
      "Selecciona tu moneda de facturación",
      "Añade tus datos de facturación",
      "Añade tus vehículos",
      "Añade tus conductores",
      "Conecta tu cuenta de pagos Stripe",
      "¡Actívate!",
    ],
    fr: [
      "Définissez votre emplacement et votre rayon de service",
      "Choisissez votre devise de facturation",
      "Ajoutez vos informations de facturation",
      "Ajoutez les véhicules de votre flotte",
      "Ajoutez vos chauffeurs",
      "Connectez votre compte de versement Stripe",
      "Activez votre compte !",
    ],
    it: [
      "Imposta la tua posizione e il raggio di servizio",
      "Imposta la tua valuta di fatturazione",
      "Aggiungi i tuoi dati di fatturazione",
      "Aggiungi i veicoli della tua flotta",
      "Aggiungi i tuoi conducenti",
      "Collega il tuo account di pagamento Stripe",
      "Attivati!",
    ],
    pt: [
      "Defina a sua localização e raio de serviço",
      "Defina a sua moeda de faturação",
      "Adicione os seus dados de faturação",
      "Adicione os veículos da sua frota",
      "Adicione os seus condutores",
      "Ligue a sua conta de pagamentos Stripe",
      "Fique ativo!",
    ],
    de: [
      "Legen Sie Ihren Standort und Servicebereich fest",
      "Legen Sie Ihre Abrechnungswährung fest",
      "Fügen Sie Ihre Rechnungsdaten hinzu",
      "Fügen Sie Ihre Flottenfahrzeuge hinzu",
      "Fügen Sie Ihre Fahrer hinzu",
      "Verbinden Sie Ihr Stripe-Auszahlungskonto",
      "Gehen Sie live!",
    ],
  };

  const intro: Record<EmailLocale, string> = {
    en: "Great news — your Camel Global partner account has been approved.",
    es: "¡Buenas noticias! Tu cuenta de socio en Camel Global ha sido aprobada.",
    fr: "Bonne nouvelle — votre compte partenaire Camel Global a été approuvé.",
    it: "Ottime notizie — il tuo account partner Camel Global è stato approvato.",
    pt: "Ótimas notícias — a sua conta de parceiro Camel Global foi aprovada.",
    de: "Großartige Neuigkeiten — Ihr Camel Global Partnerkonto wurde genehmigt.",
  };

  const notLive: Record<EmailLocale, string> = {
    en: "You are <strong>not live yet</strong>. To start receiving bookings, please log in and complete your onboarding:",
    es: "Tu cuenta <strong>aún no está activa</strong>. Para empezar a recibir reservas, inicia sesión y completa el proceso de incorporación:",
    fr: "Votre compte <strong>n'est pas encore actif</strong>. Pour commencer à recevoir des réservations, veuillez vous connecter et compléter votre intégration :",
    it: "Il tuo account <strong>non è ancora attivo</strong>. Per iniziare a ricevere prenotazioni, accedi e completa la procedura di attivazione:",
    pt: "A sua conta <strong>ainda não está ativa</strong>. Para começar a receber reservas, inicie sessão e conclua a sua integração:",
    de: "Ihr Konto ist <strong>noch nicht aktiv</strong>. Um Buchungen zu erhalten, melden Sie sich bitte an und schließen Sie Ihr Onboarding ab:",
  };

  const closing: Record<EmailLocale, string> = {
    en: "Once all steps are complete your account will go live automatically and you will receive a confirmation email.",
    es: "Una vez completados todos los pasos, tu cuenta se activará automáticamente y recibirás un email de confirmación.",
    fr: "Une fois toutes les étapes terminées, votre compte sera activé automatiquement et vous recevrez un email de confirmation.",
    it: "Una volta completati tutti i passaggi, il tuo account verrà attivato automaticamente e riceverai un'email di conferma.",
    pt: "Assim que todos os passos estiverem concluídos, a sua conta ficará ativa automaticamente e receberá um email de confirmação.",
    de: "Sobald alle Schritte abgeschlossen sind, wird Ihr Konto automatisch aktiviert und Sie erhalten eine Bestätigungs-E-Mail.",
  };

  const cta: Record<EmailLocale, string> = {
    en: "Log in to your account →",
    es: "Acceder a tu cuenta →",
    fr: "Connectez-vous à votre compte →",
    it: "Accedi al tuo account →",
    pt: "Inicie sessão na sua conta →",
    de: "Bei Ihrem Konto anmelden →",
  };

  const subject: Record<EmailLocale, string> = {
    en: "Your Camel Global account has been approved ✅",
    es: "Tu cuenta de Camel Global ha sido aprobada ✅",
    fr: "Votre compte Camel Global a été approuvé ✅",
    it: "Il tuo account Camel Global è stato approvato ✅",
    pt: "A sua conta Camel Global foi aprovada ✅",
    de: "Ihr Camel Global Konto wurde genehmigt ✅",
  };

  const heading: Record<EmailLocale, string> = {
    en: "Your account has been approved ✅",
    es: "¡Tu cuenta ha sido aprobada! ✅",
    fr: "Votre compte a été approuvé ✅",
    it: "Il tuo account è stato approvato ✅",
    pt: "A sua conta foi aprovada ✅",
    de: "Ihr Konto wurde genehmigt ✅",
  };

  const stepRows = pick(steps, locale)
    .map((s, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f8f8f8";
      return `      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:${bg};"><strong>${pick(stepWord, locale)} ${i + 1}</strong> — ${s}</td></tr>`;
    })
    .join("\n");

  const body = `
    <p>${pick(greeting, locale)}</p>
    <p>${pick(intro, locale)}</p>
    <p>${pick(notLive, locale)}</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
${stepRows}
    </table>
    <p>${pick(closing, locale)}</p>
    <p style="margin-top:24px;">
      <a href="${loginUrl}" style="background:#ff7a00; color:#fff; text-decoration:none; padding:14px 28px; font-weight:700; display:inline-block;">${pick(cta, locale)}</a>
    </p>`;

  return sendEmail({
    to,
    from: "Camel Global <noreply@camel-global.com>",
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), body, locale),
  });
}

export async function sendRejectionEmail(to: string, locale: EmailLocale = "en") {
  const subject: Record<EmailLocale, string> = {
    en: "Your Camel Global partner application was not approved",
    es: "Tu solicitud de socio en Camel Global no ha sido aprobada",
    fr: "Votre candidature de partenaire Camel Global n'a pas été approuvée",
    it: "La tua candidatura come partner Camel Global non è stata approvata",
    pt: "A sua candidatura a parceiro Camel Global não foi aprovada",
    de: "Ihre Camel Global Partnerbewerbung wurde nicht genehmigt",
  };

  const heading: Record<EmailLocale, string> = {
    en: "Application update",
    es: "Actualización de tu solicitud",
    fr: "Mise à jour de votre candidature",
    it: "Aggiornamento sulla tua candidatura",
    pt: "Atualização da sua candidatura",
    de: "Aktualisierung Ihrer Bewerbung",
  };

  const body: Record<EmailLocale, string> = {
    en: `
    <p>Thank you for your interest in becoming a Camel Global partner.</p>
    <p>After review, we are unable to approve your application at this time.</p>
    <p>If you believe this was a mistake or would like to discuss your application, please contact our team.</p>`,
    es: `
    <p>Gracias por tu interés en convertirte en socio de Camel Global.</p>
    <p>Tras la revisión, en este momento no podemos aprobar tu solicitud.</p>
    <p>Si crees que se trata de un error o deseas hablar sobre tu solicitud, por favor contacta con nuestro equipo.</p>`,
    fr: `
    <p>Merci de l'intérêt que vous portez à devenir partenaire Camel Global.</p>
    <p>Après examen, nous ne sommes pas en mesure d'approuver votre candidature pour le moment.</p>
    <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez discuter de votre candidature, veuillez contacter notre équipe.</p>`,
    it: `
    <p>Grazie per il tuo interesse a diventare partner di Camel Global.</p>
    <p>Dopo un'attenta valutazione, al momento non possiamo approvare la tua candidatura.</p>
    <p>Se ritieni che si tratti di un errore o desideri parlare della tua candidatura, contatta il nostro team.</p>`,
    pt: `
    <p>Obrigado pelo seu interesse em tornar-se parceiro da Camel Global.</p>
    <p>Após análise, não nos é possível aprovar a sua candidatura neste momento.</p>
    <p>Se considera que se trata de um erro ou pretende falar sobre a sua candidatura, contacte a nossa equipa.</p>`,
    de: `
    <p>Vielen Dank für Ihr Interesse, Camel Global Partner zu werden.</p>
    <p>Nach Prüfung können wir Ihre Bewerbung derzeit leider nicht genehmigen.</p>
    <p>Falls Sie der Meinung sind, dass dies ein Fehler ist, oder Ihre Bewerbung besprechen möchten, wenden Sie sich bitte an unser Team.</p>`,
  };

  return sendEmail({
    to,
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), pick(body, locale), locale),
  });
}

export async function sendAccountLiveEmail(to: string, locale: EmailLocale = "en") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  const subject: Record<EmailLocale, string> = {
    en: "Your Camel Global account is now live 🚀",
    es: "Tu cuenta de Camel Global ya está activa 🚀",
    fr: "Votre compte Camel Global est désormais actif 🚀",
    it: "Il tuo account Camel Global è ora attivo 🚀",
    pt: "A sua conta Camel Global está agora ativa 🚀",
    de: "Ihr Camel Global Konto ist jetzt aktiv 🚀",
  };

  const heading: Record<EmailLocale, string> = {
    en: "Your account is now live 🚀",
    es: "Tu cuenta ya está activa 🚀",
    fr: "Votre compte est désormais actif 🚀",
    it: "Il tuo account è ora attivo 🚀",
    pt: "A sua conta está agora ativa 🚀",
    de: "Ihr Konto ist jetzt aktiv 🚀",
  };

  const body: Record<EmailLocale, string> = {
    en: `
    <p>Your partner account is now live and ready to receive bookings.</p>
    <p>Please make sure:</p>
    <ul>
      <li>Your fleet is up to date</li>
      <li>Your service radius is correct</li>
      <li>Your contact details are current</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Go to dashboard</a></p>`,
    es: `
    <p>Tu cuenta de socio ya está activa y lista para recibir reservas.</p>
    <p>Por favor, asegúrate de que:</p>
    <ul>
      <li>Tu flota está actualizada</li>
      <li>Tu radio de servicio es correcto</li>
      <li>Tus datos de contacto están al día</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Ir al panel de control</a></p>`,
    fr: `
    <p>Votre compte partenaire est désormais actif et prêt à recevoir des réservations.</p>
    <p>Veuillez vous assurer que :</p>
    <ul>
      <li>Votre flotte est à jour</li>
      <li>Votre rayon de service est correct</li>
      <li>Vos coordonnées sont à jour</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Accéder au tableau de bord</a></p>`,
    it: `
    <p>Il tuo account partner è ora attivo e pronto a ricevere prenotazioni.</p>
    <p>Assicurati che:</p>
    <ul>
      <li>La tua flotta sia aggiornata</li>
      <li>Il tuo raggio di servizio sia corretto</li>
      <li>I tuoi dati di contatto siano aggiornati</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Vai alla dashboard</a></p>`,
    pt: `
    <p>A sua conta de parceiro está agora ativa e pronta a receber reservas.</p>
    <p>Certifique-se de que:</p>
    <ul>
      <li>A sua frota está atualizada</li>
      <li>O seu raio de serviço está correto</li>
      <li>Os seus dados de contacto estão atualizados</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Ir para o painel</a></p>`,
    de: `
    <p>Ihr Partnerkonto ist jetzt aktiv und bereit, Buchungen zu empfangen.</p>
    <p>Bitte stellen Sie sicher, dass:</p>
    <ul>
      <li>Ihre Flotte aktuell ist</li>
      <li>Ihr Servicebereich korrekt ist</li>
      <li>Ihre Kontaktdaten aktuell sind</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Zum Dashboard</a></p>`,
  };

  return sendEmail({
    to,
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), pick(body, locale), locale),
  });
}

// ---------------------------------------------------------------------------
// Booking cancellation emails — localized to the recipient's locale. The
// refund amount ({AMT}) and company name are proper values, not translated.
// The attached documents (none here) and money logic live in the route.
// ---------------------------------------------------------------------------

export async function sendCustomerCancellationEmail(to: string, opts: {
  locale?: EmailLocale;
  jobNo: string;                 // "#1234" or ""
  customerName?: string | null;
  cancelledByName: string;       // "Camel Global" or the partner company name
  reason?: string | null;
  pickupTime?: string | null;
  pickupAddress?: string | null;
  refundAmountText: string;      // pre-formatted, e.g. "€150.00"
  siteUrl: string;
}) {
  const locale = opts.locale ?? "en";
  const t = <T,>(m: Record<EmailLocale, T>) => m[locale] ?? m.en;
  const JOB = opts.jobNo;
  const genericName: Record<EmailLocale, string> = { en: "there", es: "cliente", fr: "client", it: "cliente", pt: "cliente", de: "Kunde" };
  const name = (opts.customerName && opts.customerName.trim()) || t(genericName);

  const subject: Record<EmailLocale, string> = {
    en: `Your Camel Global booking ${JOB} has been cancelled`,
    es: `Tu reserva de Camel Global ${JOB} ha sido cancelada`,
    fr: `Votre réservation Camel Global ${JOB} a été annulée`,
    it: `La tua prenotazione Camel Global ${JOB} è stata annullata`,
    pt: `A sua reserva Camel Global ${JOB} foi cancelada`,
    de: `Ihre Camel Global Buchung ${JOB} wurde storniert`,
  };
  const heading: Record<EmailLocale, string> = {
    en: "Booking Cancelled", es: "Reserva cancelada", fr: "Réservation annulée",
    it: "Prenotazione annullata", pt: "Reserva cancelada", de: "Buchung storniert",
  };
  const hi: Record<EmailLocale, string> = {
    en: `Hi ${name},`, es: `Hola ${name},`, fr: `Bonjour ${name},`,
    it: `Ciao ${name},`, pt: `Olá ${name},`, de: `Hallo ${name},`,
  };
  const line: Record<EmailLocale, string> = {
    en: `Your car hire booking ${JOB} has been cancelled by ${opts.cancelledByName}.`,
    es: `Tu reserva de alquiler ${JOB} ha sido cancelada por ${opts.cancelledByName}.`,
    fr: `Votre réservation de location ${JOB} a été annulée par ${opts.cancelledByName}.`,
    it: `La tua prenotazione di noleggio ${JOB} è stata annullata da ${opts.cancelledByName}.`,
    pt: `A sua reserva de aluguer ${JOB} foi cancelada por ${opts.cancelledByName}.`,
    de: `Ihre Mietwagenbuchung ${JOB} wurde von ${opts.cancelledByName} storniert.`,
  };
  const reasonLbl: Record<EmailLocale, string> = { en: "Reason:", es: "Motivo:", fr: "Motif :", it: "Motivo:", pt: "Motivo:", de: "Grund:" };
  const pickupLbl: Record<EmailLocale, string> = { en: "Pickup was:", es: "Recogida:", fr: "Prise en charge :", it: "Ritiro:", pt: "Recolha:", de: "Abholung:" };
  const pickupAddrLbl: Record<EmailLocale, string> = { en: "Pickup address:", es: "Dirección de recogida:", fr: "Adresse de prise en charge :", it: "Indirizzo di ritiro:", pt: "Morada de recolha:", de: "Abholadresse:" };
  const refundHead: Record<EmailLocale, string> = {
    en: `✅ Full refund of ${opts.refundAmountText} will be processed to your original payment method.`,
    es: `✅ Se procesará un reembolso completo de ${opts.refundAmountText} a tu método de pago original.`,
    fr: `✅ Un remboursement intégral de ${opts.refundAmountText} sera effectué sur votre moyen de paiement d'origine.`,
    it: `✅ Verrà elaborato un rimborso completo di ${opts.refundAmountText} sul tuo metodo di pagamento originale.`,
    pt: `✅ Será processado um reembolso total de ${opts.refundAmountText} para o seu método de pagamento original.`,
    de: `✅ Eine vollständige Rückerstattung von ${opts.refundAmountText} wird auf Ihr ursprüngliches Zahlungsmittel veranlasst.`,
  };
  const refundSub: Record<EmailLocale, string> = {
    en: "Car hire and fuel deposit will both be refunded in full. Please allow 5–10 business days.",
    es: "El alquiler y el depósito de combustible se reembolsarán íntegramente. El reembolso puede tardar de 5 a 10 días hábiles.",
    fr: "La location et le dépôt de carburant seront intégralement remboursés. Comptez 5 à 10 jours ouvrés.",
    it: "Il noleggio e il deposito carburante saranno interamente rimborsati. Sono necessari da 5 a 10 giorni lavorativi.",
    pt: "O aluguer e o depósito de combustível serão totalmente reembolsados. Aguarde 5 a 10 dias úteis.",
    de: "Mietwagen und Kraftstoffkaution werden vollständig erstattet. Bitte rechnen Sie mit 5–10 Werktagen.",
  };
  const questions: Record<EmailLocale, string> = {
    en: "Questions? Email", es: "¿Preguntas? Escribe a", fr: "Des questions ? Écrivez à",
    it: "Domande? Scrivi a", pt: "Dúvidas? Escreva para", de: "Fragen? Schreiben Sie an",
  };
  const cta: Record<EmailLocale, string> = {
    en: "View My Bookings", es: "Ver mis reservas", fr: "Voir mes réservations",
    it: "Vedi le mie prenotazioni", pt: "Ver as minhas reservas", de: "Meine Buchungen ansehen",
  };

  const body = `
    <p>${t(hi)}</p>
    <p>${t(line)}</p>
    ${opts.reason ? `<p><strong>${t(reasonLbl)}</strong> ${opts.reason}</p>` : ""}
    <p><strong>${t(pickupLbl)}</strong> ${opts.pickupTime || "—"}${opts.pickupAddress ? `<br/><strong>${t(pickupAddrLbl)}</strong> ${opts.pickupAddress}` : ""}</p>
    <div style="background:#f0fff4;border:1px solid #22c55e;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:700;">${t(refundHead)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">${t(refundSub)}</p>
    </div>
    <p>${t(questions)} <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a></p>
    <a href="${opts.siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">${t(cta)}</a>`;

  return sendEmail({ to, subject: t(subject), html: brandEmail(t(heading), body, locale) });
}

export async function sendPartnerCancellationEmail(to: string, opts: {
  locale?: EmailLocale;
  jobNo: string;
  cancelledByName: string;       // already-localized actor phrase
  reason?: string | null;
  customerName?: string | null;
  pickupTime?: string | null;
}) {
  const locale = opts.locale ?? "en";
  const t = <T,>(m: Record<EmailLocale, T>) => m[locale] ?? m.en;
  const JOB = opts.jobNo;

  const subject: Record<EmailLocale, string> = {
    en: `Booking ${JOB} has been cancelled`,
    es: `La reserva ${JOB} ha sido cancelada`,
    fr: `La réservation ${JOB} a été annulée`,
    it: `La prenotazione ${JOB} è stata annullata`,
    pt: `A reserva ${JOB} foi cancelada`,
    de: `Buchung ${JOB} wurde storniert`,
  };
  const heading: Record<EmailLocale, string> = {
    en: "Booking Cancelled", es: "Reserva cancelada", fr: "Réservation annulée",
    it: "Prenotazione annullata", pt: "Reserva cancelada", de: "Buchung storniert",
  };
  const line: Record<EmailLocale, string> = {
    en: `Booking ${JOB} has been cancelled by ${opts.cancelledByName}.`,
    es: `La reserva ${JOB} ha sido cancelada por ${opts.cancelledByName}.`,
    fr: `La réservation ${JOB} a été annulée par ${opts.cancelledByName}.`,
    it: `La prenotazione ${JOB} è stata annullata da ${opts.cancelledByName}.`,
    pt: `A reserva ${JOB} foi cancelada por ${opts.cancelledByName}.`,
    de: `Buchung ${JOB} wurde von ${opts.cancelledByName} storniert.`,
  };
  const reasonLbl: Record<EmailLocale, string> = { en: "Reason:", es: "Motivo:", fr: "Motif :", it: "Motivo:", pt: "Motivo:", de: "Grund:" };
  const custLbl: Record<EmailLocale, string> = { en: "Customer:", es: "Cliente:", fr: "Client :", it: "Cliente:", pt: "Cliente:", de: "Kunde:" };
  const pickupLbl: Record<EmailLocale, string> = { en: "Pickup was:", es: "Recogida:", fr: "Prise en charge :", it: "Ritiro:", pt: "Recolha:", de: "Abholung:" };
  const note: Record<EmailLocale, string> = {
    en: "The customer will receive a full refund. No further action is required from you.",
    es: "El cliente recibirá un reembolso completo. No es necesario que hagas nada más.",
    fr: "Le client recevra un remboursement intégral. Aucune action supplémentaire n'est requise de votre part.",
    it: "Il cliente riceverà un rimborso completo. Non è richiesta alcuna ulteriore azione da parte tua.",
    pt: "O cliente receberá um reembolso total. Não é necessária qualquer ação adicional da sua parte.",
    de: "Der Kunde erhält eine vollständige Rückerstattung. Von Ihnen ist keine weitere Aktion erforderlich.",
  };

  const body = `
    <p>${t(line)}</p>
    ${opts.reason ? `<p><strong>${t(reasonLbl)}</strong> ${opts.reason}</p>` : ""}
    <p><strong>${t(custLbl)}</strong> ${opts.customerName || "—"}<br/><strong>${t(pickupLbl)}</strong> ${opts.pickupTime || "—"}</p>
    <p>${t(note)}</p>`;

  return sendEmail({ to, subject: t(subject), html: brandEmail(t(heading), body, locale) });
}

// ---------------------------------------------------------------------------
// Customer emails — all accept optional locale (default "en")
// ---------------------------------------------------------------------------

export async function sendCustomerBidReceivedEmail(
  to: string,
  jobNumber?: number | null,
  locale: EmailLocale = "en"
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const bookingUrl  = `${customerUrl}/bookings`;
  const jobFrag = jobNumber ? ` <strong>#${jobNumber}</strong>` : "";

  const subject: Record<EmailLocale, string> = {
    en: `A new partner bid has been received${jobNumber ? ` for booking #${jobNumber}` : ""}`,
    es: `Nueva oferta recibida${jobNumber ? ` para la reserva #${jobNumber}` : ""}`,
    fr: `Une nouvelle offre de partenaire a été reçue${jobNumber ? ` pour la réservation #${jobNumber}` : ""}`,
    it: `È stata ricevuta una nuova offerta${jobNumber ? ` per la prenotazione #${jobNumber}` : ""}`,
    pt: `Foi recebida uma nova proposta${jobNumber ? ` para a reserva #${jobNumber}` : ""}`,
    de: `Ein neues Partnerangebot ist eingegangen${jobNumber ? ` für Buchung #${jobNumber}` : ""}`,
  };

  const heading: Record<EmailLocale, string> = {
    en: "You have a new bid ⭐",
    es: "Tienes una nueva oferta ⭐",
    fr: "Vous avez une nouvelle offre ⭐",
    it: "Hai una nuova offerta ⭐",
    pt: "Tem uma nova proposta ⭐",
    de: "Sie haben ein neues Angebot ⭐",
  };

  const greet: Record<EmailLocale, string> = {
    en: "Hi,", es: "Hola,", fr: "Bonjour,", it: "Ciao,", pt: "Olá,", de: "Hallo,",
  };

  const line1: Record<EmailLocale, string> = {
    en: `A car hire company has submitted a bid for your booking request${jobFrag}.`,
    es: `Una empresa de alquiler ha enviado una oferta para tu solicitud${jobFrag}.`,
    fr: `Une société de location de voitures a soumis une offre pour votre demande de réservation${jobFrag}.`,
    it: `Una società di autonoleggio ha inviato un'offerta per la tua richiesta di prenotazione${jobFrag}.`,
    pt: `Uma empresa de aluguer de automóveis enviou uma proposta para o seu pedido de reserva${jobFrag}.`,
    de: `Ein Autovermietungsunternehmen hat ein Angebot für Ihre Buchungsanfrage${jobFrag} abgegeben.`,
  };

  const line2: Record<EmailLocale, string> = {
    en: "Log in to view the full price breakdown and accept the offer that suits you best.",
    es: "Inicia sesión para ver el desglose completo del precio y aceptar la oferta que mejor te convenga.",
    fr: "Connectez-vous pour voir le détail complet du prix et accepter l'offre qui vous convient le mieux.",
    it: "Accedi per visualizzare il dettaglio completo del prezzo e accettare l'offerta più adatta a te.",
    pt: "Inicie sessão para ver o detalhe completo do preço e aceitar a proposta que melhor lhe convém.",
    de: "Melden Sie sich an, um die vollständige Preisaufschlüsselung zu sehen und das für Sie passende Angebot anzunehmen.",
  };

  const cta: Record<EmailLocale, string> = {
    en: "View Bid →",
    es: "Ver oferta →",
    fr: "Voir l'offre →",
    it: "Vedi l'offerta →",
    pt: "Ver proposta →",
    de: "Angebot ansehen →",
  };

  const body = `
    <p>${pick(greet, locale)}</p>
    <p>${pick(line1, locale)}</p>
    <p>${pick(line2, locale)}</p>
    <p style="margin:24px 0;">
      <a href="${bookingUrl}" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        ${pick(cta, locale)}
      </a>
    </p>`;

  return sendEmail({
    to,
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), body, locale),
  });
}

// NOT CALLED — superseded by lib/portal/completeBooking.tsx which sends the rich completion email
// with fuel summary and PDF attachment. Do not call this function.
export async function sendCustomerBookingCompletedEmail(to: string, jobNumber?: number | null) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  return sendEmail({
    to,
    subject: `Your Camel Global booking is now completed${jobNumber ? ` - #${jobNumber}` : ""}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>Booking completed</h2>
        <p>Your booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} has now been marked as completed.</p>
        <p>The vehicle return has been confirmed.</p>
        <p><a href="${customerUrl}/bookings">View booking details</a></p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}

export async function sendReviewReminderEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null,
  locale: EmailLocale = "en"
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const reviewUrl   = requestId
    ? `${customerUrl}/bookings/${requestId}#review`
    : `${customerUrl}/bookings`;
  const jobFrag = jobNumber ? ` <strong>#${jobNumber}</strong>` : "";

  const subject: Record<EmailLocale, string> = {
    en: `How was your car hire experience?${jobNumber ? ` (Booking #${jobNumber})` : ""}`,
    es: `¿Qué tal fue tu experiencia de alquiler?${jobNumber ? ` (Reserva #${jobNumber})` : ""}`,
    fr: `Comment s'est passée votre location de voiture ?${jobNumber ? ` (Réservation #${jobNumber})` : ""}`,
    it: `Com'è andata la tua esperienza di noleggio?${jobNumber ? ` (Prenotazione #${jobNumber})` : ""}`,
    pt: `Como foi a sua experiência de aluguer?${jobNumber ? ` (Reserva #${jobNumber})` : ""}`,
    de: `Wie war Ihre Mietwagen-Erfahrung?${jobNumber ? ` (Buchung #${jobNumber})` : ""}`,
  };

  const heading: Record<EmailLocale, string> = {
    en: "How was your car hire experience? ⭐",
    es: "¿Qué tal fue tu experiencia de alquiler? ⭐",
    fr: "Comment s'est passée votre location de voiture ? ⭐",
    it: "Com'è andata la tua esperienza di noleggio? ⭐",
    pt: "Como foi a sua experiência de aluguer? ⭐",
    de: "Wie war Ihre Mietwagen-Erfahrung? ⭐",
  };

  const greet: Record<EmailLocale, string> = {
    en: "Hi,", es: "Hola,", fr: "Bonjour,", it: "Ciao,", pt: "Olá,", de: "Hallo,",
  };

  const line1: Record<EmailLocale, string> = {
    en: `Your Camel Global car hire booking${jobFrag} is now complete. We'd love to hear how it went.`,
    es: `Tu reserva de alquiler de coches con Camel Global${jobFrag} ha finalizado. Nos encantaría saber cómo fue.`,
    fr: `Votre réservation de location de voiture Camel Global${jobFrag} est terminée. Nous aimerions savoir comment cela s'est passé.`,
    it: `La tua prenotazione di autonoleggio Camel Global${jobFrag} è ora completata. Ci piacerebbe sapere com'è andata.`,
    pt: `A sua reserva de aluguer de automóvel Camel Global${jobFrag} está agora concluída. Gostaríamos de saber como correu.`,
    de: `Ihre Camel Global Mietwagenbuchung${jobFrag} ist jetzt abgeschlossen. Wir würden gerne erfahren, wie es gelaufen ist.`,
  };

  const line2: Record<EmailLocale, string> = {
    en: "Your review helps other customers choose the right car hire company for their trip.",
    es: "Tu reseña ayuda a otros clientes a elegir la empresa de alquiler adecuada para su viaje.",
    fr: "Votre avis aide d'autres clients à choisir la bonne société de location pour leur voyage.",
    it: "La tua recensione aiuta altri clienti a scegliere la società di noleggio giusta per il loro viaggio.",
    pt: "A sua avaliação ajuda outros clientes a escolher a empresa de aluguer certa para a sua viagem.",
    de: "Ihre Bewertung hilft anderen Kunden, die richtige Autovermietung für ihre Reise zu wählen.",
  };

  const cta: Record<EmailLocale, string> = {
    en: "Leave a Review →",
    es: "Dejar una reseña →",
    fr: "Laisser un avis →",
    it: "Lascia una recensione →",
    pt: "Deixar uma avaliação →",
    de: "Bewertung abgeben →",
  };

  const footer: Record<EmailLocale, string> = {
    en: "It only takes 30 seconds.",
    es: "Solo lleva 30 segundos.",
    fr: "Cela ne prend que 30 secondes.",
    it: "Bastano solo 30 secondi.",
    pt: "Demora apenas 30 segundos.",
    de: "Es dauert nur 30 Sekunden.",
  };

  const body = `
          <p>${pick(greet, locale)}</p>
          <p>${pick(line1, locale)}</p>
          <p>${pick(line2, locale)}</p>
          <p style="margin:24px 0;">
            <a href="${reviewUrl}"
              style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block; font-family: system-ui, Arial, sans-serif;">
              ${pick(cta, locale)}
            </a>
          </p>
          <p style="color:#888; font-size:14px;">${pick(footer, locale)}</p>`;

  return sendEmail({
    to,
    subject: pick(subject, locale),
    html: brandEmail(pick(heading, locale), body, locale),
  });
}
