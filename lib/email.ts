export async function sendReviewReminderEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null,
  locale: "en" | "es" = "en"
) {
  const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const reviewUrl = requestId
    ? `${baseUrl}/bookings/${requestId}`
    : `${baseUrl}/bookings`;

  const subjectEN = `How was your car hire experience?${jobNumber ? ` (Booking #${jobNumber})` : ""}`;
  const subjectES = `¿Qué tal fue tu experiencia de alquiler?${jobNumber ? ` (Reserva #${jobNumber})` : ""}`;

  const bodyEN = `
    <p>Hi,</p>
    <p>Your Camel Global car hire booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} is now complete. We'd love to hear how it went.</p>
    <p>Your review helps other customers choose the right car hire company for their trip.</p>
    <p style="margin:24px 0;">
      <a href="${reviewUrl}"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Leave a Review
      </a>
    </p>
    <p style="color:#64748b; font-size:14px;">It only takes 30 seconds.</p>`;

  const bodyES = `
    <p>Hola,</p>
    <p>Tu reserva de alquiler de coches con Camel Global${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} ha finalizado. Nos encantaría saber cómo fue.</p>
    <p>Tu reseña ayuda a otros clientes a elegir la empresa de alquiler adecuada para su viaje.</p>
    <p style="margin:24px 0;">
      <a href="${reviewUrl}"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Dejar una reseña
      </a>
    </p>
    <p style="color:#64748b; font-size:14px;">Solo lleva 30 segundos.</p>`;

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