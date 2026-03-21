function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: cleanTo,
      subject,
      html,
    }),
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
        <p>
          <a href="${baseUrl}/partner/login">Partner login</a>
        </p>
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
        <p>
          <a href="${baseUrl}/partner/login">Log in here</a>
        </p>
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
        <p>
          <a href="${baseUrl}/partner/dashboard">Go to dashboard</a>
        </p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });
}