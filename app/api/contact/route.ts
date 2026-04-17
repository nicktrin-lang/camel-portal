import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { rateLimit, getIp } from "@/lib/rateLimit";

const CONTACT_EMAIL = "contact@camel-global.com";

export async function POST(req: Request) {
  const ip = getIp(req);
  const { allowed } = rateLimit(ip, "contact-form");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; subject?: string; message?: string; captchaToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, subject, message, captchaToken } = body;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!captchaToken) {
    return NextResponse.json({ error: "CAPTCHA token is required." }, { status: 400 });
  }

  const captchaOk = await verifyHCaptcha(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const safeName    = name.trim().slice(0, 100);
  const safeEmail   = email.trim().toLowerCase().slice(0, 200);
  const safeSubject = subject.trim().slice(0, 200);
  const safeMessage = message.trim().slice(0, 5000);

  try {
    // Email to Camel Global inbox
    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `Contact form: ${safeSubject}`,
      html: `
        <div style="font-family:system-ui,-apple-system,Arial;color:#222;line-height:1.6;max-width:600px;">
          <div style="background:#003768;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:18px;">New Contact Form Submission</h2>
          </div>
          <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:6px 0;color:#64748b;width:100px;">Name</td><td style="padding:6px 0;font-weight:600;">${safeName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${safeEmail}" style="color:#005b9f;">${safeEmail}</a></td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;font-weight:600;">${safeSubject}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Message:</p>
            <p style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:14px;white-space:pre-wrap;">${safeMessage}</p>
            <p style="margin-top:20px;font-size:12px;color:#94a3b8;">
              Sent from Camel Global contact form · IP: ${ip ?? "unknown"}
            </p>
          </div>
        </div>
      `,
    });

    // Auto-reply to the sender
    await sendEmail({
      to: safeEmail,
      subject: "We've received your message — Camel Global",
      html: `
        <div style="font-family:system-ui,-apple-system,Arial;color:#222;line-height:1.6;max-width:600px;">
          <div style="background:#003768;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:18px;">Thanks for getting in touch</h2>
          </div>
          <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <p>Hi ${safeName},</p>
            <p>We've received your message and will get back to you as soon as we can — usually within one business day.</p>
            <p style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:13px;color:#475569;">
              <strong>Your message:</strong><br /><br />
              <em>${safeMessage.slice(0, 500)}${safeMessage.length > 500 ? "…" : ""}</em>
            </p>
            <p>In the meantime, if your enquiry is urgent you can reply directly to this email.</p>
            <p style="margin-top:24px;">Best regards,<br /><strong>The Camel Global Team</strong></p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Contact form email error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}