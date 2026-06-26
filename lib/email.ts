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
// Shared email wrapper — black header + light body, consistent brand style
// ---------------------------------------------------------------------------
function brandEmail(headingEN: string, headingES: string | null, bodyEN: string, bodyES: string | null, locale: "en" | "es"): string {
  const logoUrl = "https://portal.camel-global.com/camel-invoice-logo.png";
  if (locale === "es" && headingES && bodyES) {
    return `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
        <div style="background:#000; padding:24px 32px; display:flex; align-items:center; gap:16px;">
          <img src="${logoUrl}" alt="Camel Global" style="height:40px; width:auto; display:block;" />
          <h2 style="color:#fff; margin:0;">${headingES}</h2>
        </div>
        <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
          ${bodyES}
          <p style="margin-top:32px; color:#888; font-size:14px;">Saludos,<br/><strong style="color:#222;">El equipo de Camel Global</strong><br/><span style="color:#aaa;">Meet &amp; Greet Car Hire</span></p>
        </div>
      </div>`;
  }
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px; display:flex; align-items:center; gap:16px;">
        <img src="${logoUrl}" alt="Camel Global" style="height:40px; width:auto; display:block;" />
        <h2 style="color:#fff; margin:0;">${headingEN}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${bodyEN}
        <p style="margin-top:32px; color:#888; font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong><br/><span style="color:#aaa;">Meet &amp; Greet Car Hire</span></p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Partner emails — all accept optional locale (default "en")
// ---------------------------------------------------------------------------

export async function sendApplicationReceivedEmail(to: string, locale: "en" | "es" = "en") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  const subjectEN = "Your Camel Global partner application has been received";
  const subjectES = "Tu solicitud de socio en Camel Global ha sido recibida";

  const bodyEN = `
    <p>Thanks for applying to become a Camel Global partner.</p>
    <p>We have received your application and our team will review it shortly.</p>
    <p>No action is required at this stage.</p>
    <p><a href="${baseUrl}/partner/login">Partner login</a></p>`;

  const bodyES = `
    <p>Gracias por solicitar convertirte en socio de Camel Global.</p>
    <p>Hemos recibido tu solicitud y nuestro equipo la revisará en breve.</p>
    <p>No es necesario que hagas nada en este momento.</p>
    <p><a href="${baseUrl}/partner/login">Acceso para socios</a></p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("Application received", "Solicitud recibida", bodyEN, bodyES, locale),
  });
}

export async function sendApprovalEmail(to: string, locale: "en" | "es" = "en", partnerName: string = "") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/partner/login`;
  const greeting = partnerName ? (locale === "es" ? `Estimado/a ${partnerName},` : `Dear ${partnerName},`) : (locale === "es" ? "Estimado/a socio/a," : "Dear Partner,");

  const subjectEN = "Your Camel Global account has been approved ✅";
  const subjectES = "Tu cuenta de Camel Global ha sido aprobada ✅";

  const bodyEN = `
    <p>${greeting}</p>
    <p>Great news — your Camel Global partner account has been approved.</p>
    <p>You are <strong>not live yet</strong>. To start receiving bookings, please log in and complete your onboarding:</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Step 1</strong> — Set your location &amp; service radius</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Step 2</strong> — Set your billing currency</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Step 3</strong> — Add your billing details</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Step 4</strong> — Add your fleet vehicles</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Step 5</strong> — Add your drivers</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Step 6</strong> — Connect your Stripe payout account</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Step 7</strong> — Go live!</td></tr>
    </table>
    <p>Once all steps are complete your account will go live automatically and you will receive a confirmation email.</p>
    <p style="margin-top:24px;">
      <a href="${loginUrl}" style="background:#ff7a00; color:#fff; text-decoration:none; padding:14px 28px; font-weight:700; display:inline-block;">Log in to your account →</a>
    </p>`;

  const bodyES = `
    <p>${greeting}</p>
    <p>¡Buenas noticias! Tu cuenta de socio en Camel Global ha sido aprobada.</p>
    <p>Tu cuenta <strong>aún no está activa</strong>. Para empezar a recibir reservas, inicia sesión y completa el proceso de incorporación:</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Paso 1</strong> — Establece tu ubicación y radio de servicio</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Paso 2</strong> — Selecciona tu moneda de facturación</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Paso 3</strong> — Añade tus datos de facturación</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Paso 4</strong> — Añade tus vehículos</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Paso 5</strong> — Añade tus conductores</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#f8f8f8;"><strong>Paso 6</strong> — Conecta tu cuenta de pagos Stripe</td></tr>
      <tr><td style="padding:10px 12px; border:1px solid #e5e5e5; background:#fff;"><strong>Paso 7</strong> — ¡Actívate!</td></tr>
    </table>
    <p>Una vez completados todos los pasos, tu cuenta se activará automáticamente y recibirás un email de confirmación.</p>
    <p style="margin-top:24px;">
      <a href="${loginUrl}" style="background:#ff7a00; color:#fff; text-decoration:none; padding:14px 28px; font-weight:700; display:inline-block;">Acceder a tu cuenta →</a>
    </p>`;

  return sendEmail({
    to,
    from: "Camel Global <noreply@camel-global.com>",
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("Your account has been approved ✅", "¡Tu cuenta ha sido aprobada! ✅", bodyEN, bodyES, locale),
  });
}

export async function sendRejectionEmail(to: string, locale: "en" | "es" = "en") {
  const subjectEN = "Your Camel Global partner application was not approved";
  const subjectES = "Tu solicitud de socio en Camel Global no ha sido aprobada";

  const bodyEN = `
    <p>Thank you for your interest in becoming a Camel Global partner.</p>
    <p>After review, we are unable to approve your application at this time.</p>
    <p>If you believe this was a mistake or would like to discuss your application, please contact our team.</p>`;

  const bodyES = `
    <p>Gracias por tu interés en convertirte en socio de Camel Global.</p>
    <p>Tras la revisión, en este momento no podemos aprobar tu solicitud.</p>
    <p>Si crees que se trata de un error o deseas hablar sobre tu solicitud, por favor contacta con nuestro equipo.</p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("Application update", "Actualización de tu solicitud", bodyEN, bodyES, locale),
  });
}

export async function sendAccountLiveEmail(to: string, locale: "en" | "es" = "en") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  const subjectEN = "Your Camel Global account is now live 🚀";
  const subjectES = "Tu cuenta de Camel Global ya está activa 🚀";

  const bodyEN = `
    <p>Your partner account is now live and ready to receive bookings.</p>
    <p>Please make sure:</p>
    <ul>
      <li>Your fleet is up to date</li>
      <li>Your service radius is correct</li>
      <li>Your contact details are current</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Go to dashboard</a></p>`;

  const bodyES = `
    <p>Tu cuenta de socio ya está activa y lista para recibir reservas.</p>
    <p>Por favor, asegúrate de que:</p>
    <ul>
      <li>Tu flota está actualizada</li>
      <li>Tu radio de servicio es correcto</li>
      <li>Tus datos de contacto están al día</li>
    </ul>
    <p><a href="${baseUrl}/partner/dashboard">Ir al panel de control</a></p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("Your account is now live 🚀", "Tu cuenta ya está activa 🚀", bodyEN, bodyES, locale),
  });
}

// ---------------------------------------------------------------------------
// Customer emails — all accept optional locale (default "en")
// ---------------------------------------------------------------------------

export async function sendCustomerBidReceivedEmail(
  to: string,
  jobNumber?: number | null,
  locale: "en" | "es" = "en"
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const bookingUrl  = `${customerUrl}/bookings`;

  const subjectEN = `A new partner bid has been received${jobNumber ? ` for booking #${jobNumber}` : ""}`;
  const subjectES = `Nueva oferta recibida${jobNumber ? ` para la reserva #${jobNumber}` : ""}`;

  const bodyEN = `
    <p>Hi,</p>
    <p>A car hire company has submitted a bid for your booking request${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""}.</p>
    <p>Log in to view the full price breakdown and accept the offer that suits you best.</p>
    <p style="margin:24px 0;">
      <a href="${bookingUrl}" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        View Bid →
      </a>
    </p>`;

  const bodyES = `
    <p>Hola,</p>
    <p>Una empresa de alquiler ha enviado una oferta para tu solicitud${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""}.</p>
    <p>Inicia sesión para ver el desglose completo del precio y aceptar la oferta que mejor te convenga.</p>
    <p style="margin:24px 0;">
      <a href="${bookingUrl}" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Ver oferta →
      </a>
    </p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("You have a new bid ⭐", "Tienes una nueva oferta ⭐", bodyEN, bodyES, locale),
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
  locale: "en" | "es" = "en"
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const reviewUrl   = requestId
    ? `${customerUrl}/bookings/${requestId}#review`
    : `${customerUrl}/bookings`;

  const subjectEN = `How was your car hire experience?${jobNumber ? ` (Booking #${jobNumber})` : ""}`;
  const subjectES = `¿Qué tal fue tu experiencia de alquiler?${jobNumber ? ` (Reserva #${jobNumber})` : ""}`;

  const bodyEN = `
          <p>Hi,</p>
          <p>Your Camel Global car hire booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} is now complete. We'd love to hear how it went.</p>
          <p>Your review helps other customers choose the right car hire company for their trip.</p>
          <p style="margin:24px 0;">
            <a href="${reviewUrl}"
              style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block; font-family: system-ui, Arial, sans-serif;">
              Leave a Review →
            </a>
          </p>
          <p style="color:#888; font-size:14px;">It only takes 30 seconds.</p>`;

  const bodyES = `
          <p>Hola,</p>
          <p>Tu reserva de alquiler de coches con Camel Global${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} ha finalizado. Nos encantaría saber cómo fue.</p>
          <p>Tu reseña ayuda a otros clientes a elegir la empresa de alquiler adecuada para su viaje.</p>
          <p style="margin:24px 0;">
            <a href="${reviewUrl}"
              style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block; font-family: system-ui, Arial, sans-serif;">
              Dejar una reseña →
            </a>
          </p>
          <p style="color:#888; font-size:14px;">Solo lleva 30 segundos.</p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail(
      "How was your car hire experience? ⭐",
      "¿Qué tal fue tu experiencia de alquiler? ⭐",
      bodyEN,
      bodyES,
      locale
    ),
  });
}