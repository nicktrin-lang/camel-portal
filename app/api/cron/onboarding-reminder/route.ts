import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendApprovalEmail, coerceEmailLocale, type EmailLocale } from "@/lib/email";

// Vercel cron — runs daily at 09:00 UTC
// Sends onboarding reminder to approved-not-live partners every 48 hours

async function getPartnerLocale(
  db: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string | null
): Promise<EmailLocale> {
  if (!userId) return "en";
  try {
    const { data } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", userId)
      .maybeSingle();
    return coerceEmailLocale(data?.communication_locale);
  } catch {
    return "en";
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleSupabaseClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // Find approved-not-live partners where email never sent or sent >48h ago
  const { data: partners, error } = await db
    .from("partner_applications")
    .select("id, email, user_id, company_name, approval_email_last_sent_at")
    .eq("status", "approved")
    .or(`approval_email_last_sent_at.is.null,approval_email_last_sent_at.lt.${cutoff}`);

  if (error) {
    console.error("❌ Onboarding reminder cron error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!partners || partners.length === 0) {
    console.log("✅ No partners due an onboarding reminder.");
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const partner of partners) {
    const toEmail = String(partner.email || "").trim().toLowerCase();
    if (!toEmail) continue;

    try {
      const locale = await getPartnerLocale(db, partner.user_id);
      await sendApprovalEmail(toEmail, locale, partner.company_name || "");
      await db
        .from("partner_applications")
        .update({ approval_email_last_sent_at: now.toISOString() })
        .eq("id", partner.id);
      console.log(`✅ Onboarding reminder sent to ${toEmail}`);
      sent++;
    } catch (e: any) {
      console.error(`❌ Failed to send reminder to ${toEmail}:`, e?.message);
      errors.push(`${toEmail}: ${e?.message}`);
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
