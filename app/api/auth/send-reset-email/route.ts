import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getIp(req);
  const { allowed } = rateLimit(ip, "send-reset-email");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  const { email, redirectTo } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.camel-global.com";
  const redirect = redirectTo ?? siteUrl + "/partner/reset-password";

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

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 400 });
  }

  const actionUrl = new URL(data.properties.action_link);
  actionUrl.searchParams.set("redirect_to", redirect);
  const resetLink = actionUrl.toString();

  try {
    await sendEmail({
      to: email,
      subject: "Reset your Camel Global password",
      html: "<div style='font-family:Arial;color:#222;line-height:1.6'><h2>Reset your password</h2><p>Click below to reset your password. This link expires in 1 hour.</p><p><a href='" + resetLink + "' style='display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600'>Reset Password</a></p><p style='margin-top:16px;font-size:13px;color:#666'>If you did not request this, ignore this email.</p><p style='margin-top:24px'>Best Regards,<br>The Camel Global Team</p></div>",
    });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}