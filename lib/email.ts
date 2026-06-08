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
  if (locale === "es" && headingES && bodyES) {
    return `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
        <div style="background:#000; padding:24px 32px;">
          <h2 style="color:#fff; margin:0;">${headingES}</h2>
        </div>
        <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
          ${bodyES}
          <p style="margin-top:32px; color:#888; font-size:14px;">Saludos,<br/><strong style="color:#222;">El equipo de Camel Global</strong></p>
        </div>
      </div>`;
  }
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px;">
        <h2 style="color:#fff; margin:0;">${headingEN}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${bodyEN}
        <p style="margin-top:32px; color:#888; font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>
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

export async function sendApprovalEmail(to: string, locale: "en" | "es" = "en") {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";

  const subjectEN = "Your Camel Global account has been approved ✅";
  const subjectES = "Tu cuenta de Camel Global ha sido aprobada ✅";

  const bodyEN = `
    <p>Your partner account has been approved.</p>
    <p><strong>You are not live yet.</strong></p>
    <p>Please log in and complete the following before going live:</p>
    <ul>
      <li>Add your fleet</li>
      <li>Confirm your fleet base address</li>
      <li>Check your service radius</li>
    </ul>
    <p><a href="${baseUrl}/partner/login">Log in here</a></p>`;

  const bodyES = `
    <p>Tu cuenta de socio ha sido aprobada.</p>
    <p><strong>Tu cuenta aún no está activa.</strong></p>
    <p>Por favor, inicia sesión y completa los siguientes pasos antes de activarla:</p>
    <ul>
      <li>Añade tu flota</li>
      <li>Confirma la dirección base de tu flota</li>
      <li>Comprueba tu radio de servicio</li>
    </ul>
    <p><a href="${baseUrl}/partner/login">Acceder aquí</a></p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("You're approved ✅", "¡Cuenta aprobada! ✅", bodyEN, bodyES, locale),
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