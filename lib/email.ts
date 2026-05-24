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
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM;

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

export async function sendApplicationReceivedEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: "Your Camel Global partner application has been received",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>Application received</h2>
        <p>Thanks for applying to become a Camel Global partner.</p>
        <p>We have received your application and our team will review it shortly.</p>
        <p>No action is required at this stage.</p>
        <p><a href="${baseUrl}/partner/login">Partner login</a></p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}

export async function sendApprovalEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: "Your Camel Global account has been approved ✅",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>You're approved ✅</h2>
        <p>Your partner account has been approved.</p>
        <p><strong>You are not live yet.</strong></p>
        <p>Please log in and complete the following before going live:</p>
        <ul>
          <li>Add your fleet</li>
          <li>Confirm your fleet base address</li>
          <li>Check your service radius</li>
        </ul>
        <p><a href="${baseUrl}/partner/login">Log in here</a></p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}

export async function sendRejectionEmail(to: string) {
  return sendEmail({
    to,
    subject: "Your Camel Global partner application was not approved",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>Application update</h2>
        <p>Thank you for your interest in becoming a Camel Global partner.</p>
        <p>After review, we are unable to approve your application at this time.</p>
        <p>If you believe this was a mistake or would like to discuss your application, please contact our team.</p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}

export async function sendAccountLiveEmail(to: string) {
  const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: "Your Camel Global account is now live 🚀",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>Your account is now live 🚀</h2>
        <p>Your partner account is now live and ready to receive bookings.</p>
        <p>Please make sure:</p>
        <ul>
          <li>Your fleet is up to date</li>
          <li>Your service radius is correct</li>
          <li>Your contact details are current</li>
        </ul>
        <p><a href="${baseUrl}/partner/dashboard">Go to dashboard</a></p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}

// FIX: was incorrectly linking to portal. Now links to customer site /bookings/[requestId].
// requestId is the customer_requests.id — matches the /bookings/[id] route on the customer site.
export async function sendCustomerBidReceivedEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const bookingUrl  = requestId
    ? `${customerUrl}/bookings/${requestId}`
    : `${customerUrl}/bookings`;
  return sendEmail({
    to,
    subject: `A new partner bid has been received${jobNumber ? ` for booking #${jobNumber}` : ""}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
        <div style="background:#000; padding:24px 32px;">
          <h2 style="color:#fff; margin:0;">You have a new bid ⭐</h2>
        </div>
        <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
          <p>Hi,</p>
          <p>A car hire company has submitted a bid for your booking request${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""}.</p>
          <p>Log in to view the full price breakdown and accept the offer that suits you best.</p>
          <p style="margin:24px 0;">
            <a href="${bookingUrl}"
              style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block; font-family: system-ui, Arial, sans-serif;">
              View Bid →
            </a>
          </p>
          <p style="margin-top:32px; color:#888; font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>
        </div>
      </div>
    `,
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

// FIX: was routing via /login?next=... which sent customers to the portal login page.
// Now links directly to the booking page on the customer site with #review anchor.
// If the customer is not logged in, the booking page handles the redirect to customer login itself.
export async function sendReviewReminderEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null
) {
  const customerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
  const reviewUrl   = requestId
    ? `${customerUrl}/bookings/${requestId}#review`
    : `${customerUrl}/bookings`;

  return sendEmail({
    to,
    subject: `How was your car hire experience?${jobNumber ? ` (Booking #${jobNumber})` : ""}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
        <div style="background:#000; padding:24px 32px;">
          <h2 style="color:#fff; margin:0;">How was your car hire experience? ⭐</h2>
        </div>
        <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
          <p>Hi,</p>
          <p>Your Camel Global car hire booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} is now complete. We'd love to hear how it went.</p>
          <p>Your review helps other customers choose the right car hire company for their trip.</p>
          <p style="margin:24px 0;">
            <a href="${reviewUrl}"
              style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block; font-family: system-ui, Arial, sans-serif;">
              Leave a Review →
            </a>
          </p>
          <p style="color:#888; font-size:14px;">It only takes 30 seconds.</p>
          <p style="margin-top:32px; color:#888; font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>
        </div>
      </div>
    `,
  });
}