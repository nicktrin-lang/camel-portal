import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  DAILY_LIMIT, OUTREACH_FROM, OUTREACH_REPLY_TO, TEST_PROSPECTS, generateEmail, sendToProspect, sentTodayCount,
  type Locale,
} from "@/lib/outreach/outreachEmail";

// Admin outreach sending: GET = today's count against the daily limit; POST = send one
// prospect, or a test email in a chosen language. The email itself is built in
// lib/outreach/outreachEmail.ts, shared with the weekday auto-send cron.

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const sentToday = await sentTodayCount(db);
    return NextResponse.json({ sent_today: sentToday, daily_limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - sentToday) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const adminEmail = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !adminEmail) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", adminEmail).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const { prospect_id, test_email, resend, locale: testLocale, near_airport } = body || {};

    // TEST MODE
    if (test_email) {
      const lang: Locale = (["en", "es", "fr", "it", "pt", "de"] as const).includes(testLocale) ? testLocale : "en";
      const sample = TEST_PROSPECTS[lang];
      const testProspect = { id: "test-id", company_name: sample.company_name, contact_name: null, city: sample.city, country: sample.country, notes: null };
      const emailHtml = await generateEmail(testProspect, near_airport === false ? null : sample.airport);
      await sendEmail({
        to:      adminEmail,
        from:    OUTREACH_FROM,
        subject: `[TEST ${lang.toUpperCase()}] ${emailHtml.subject}`,
        html:    emailHtml.fullHtml,
        headers: { "Reply-To": OUTREACH_REPLY_TO },
      });
      return NextResponse.json({ ok: true, test: true, subject: emailHtml.subject });
    }

    const sentToday = await sentTodayCount(db);

    if (sentToday >= DAILY_LIMIT) {
      return NextResponse.json({
        error: `Daily limit of ${DAILY_LIMIT} emails reached. Come back tomorrow.`,
        sent_today:  sentToday,
        daily_limit: DAILY_LIMIT,
      }, { status: 429 });
    }

    if (!prospect_id) return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });

    const { data: prospect, error: fetchError } = await db
      .from("outreach_prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();
    if (fetchError || !prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    if (prospect.unsubscribed) {
      return NextResponse.json({ error: "Prospect has unsubscribed" }, { status: 400 });
    }

    const subject = await sendToProspect(db, prospect);

    return NextResponse.json({ ok: true, subject, sent_today: sentToday + 1, remaining: Math.max(0, DAILY_LIMIT - sentToday - 1) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

