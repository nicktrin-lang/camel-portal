import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendApprovalEmail, coerceEmailLocale, type EmailLocale } from "@/lib/email";
import { computeLiveReadiness } from "@/lib/portal/computeLiveReadiness";

// Vercel cron — runs daily at 09:00 UTC
// Sends onboarding reminder to approved-but-NOT-LIVE partners every 48 hours.
// A partner that is already live (passes the 7 live-readiness checks — note an
// active driver is NOT one of them) is skipped: we never nag a live partner.
// Only partners still missing a live requirement (base address, coords, radius,
// active fleet, currency, VAT) receive the reminder.

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
  let skippedLive = 0;
  const errors: string[] = [];

  for (const partner of partners) {
    const toEmail = String(partner.email || "").trim().toLowerCase();
    if (!toEmail) continue;

    // Skip partners that are already live — a driver is NOT required for live,
    // so a partner missing only a driver counts as live and is not nagged.
    // If readiness can't be computed (e.g. no profile yet) treat as not-live
    // and send the reminder — they still have onboarding to finish.
    try {
      const { isLive } = await computeLiveReadiness(String(partner.user_id || ""));
      if (isLive) {
        skippedLive++;
        continue;
      }
    } catch {
      // fall through and send — partner has not completed enough to be live
    }

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

  return NextResponse.json({ ok: true, sent, skippedLive, errors });
}
