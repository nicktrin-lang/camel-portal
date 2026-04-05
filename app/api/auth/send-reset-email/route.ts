import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email, redirectTo } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const redirect = redirectTo ?? `${process.env.NEXT_PUBLIC_SITE_URL}/partner/reset-password`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirect },
  });

  if (error || !data?.properties) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 400 });
  }

  // Build the link directly using the token hash — bypasses Supabase's redirect logic entirely
  const tokenHash = data.properties.hashed_token;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.camel-global.com";
  const resetLink = `${siteUrl}/api/auth/exchange-reset-code?token_hash=${tokenHash}&type=recovery`;

  await sendEmail({
    to: email,
    subject: "Reset your Camel Global password",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6;">
        <h2>Reset your password</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="margin-top:16px;font-size:13px;color:#666;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="margin-top:24px;">Best Regards,<br />The Camel Global Team</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}