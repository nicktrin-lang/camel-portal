import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { DAILY_LIMIT, sendToProspect, sentTodayCount } from "@/lib/outreach/outreachEmail";

// Vercel cron: weekday outreach batch at 09:00 Spanish time, when switched on at /admin/outreach.
// Scheduled at 07:00 AND 08:00 UTC Mon-Fri (vercel.json): one of them is 09:00 in Madrid
// whichever side of daylight saving we're on. The run only sends when it's a weekday in
// Madrid, the local hour is 9 or later, and today's batch hasn't been claimed yet.
//
// Sends to the oldest pending prospects first, up to what's left of the daily limit (manual
// sends earlier the same day count). Admin is emailed if fewer than DAILY_LIMIT are queued
// for the next run, which is the one thing a human has to keep topped up.

export const maxDuration = 300;

const GAP_MS = 600; // stays under Resend's default 2 requests/second

function madridNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: parts.weekday };
}

const isTestAddress = (email: string | null) => /nicktrin\+/i.test(String(email || ""));

async function queuedCount(db: ReturnType<typeof createServiceRoleSupabaseClient>) {
  const { count } = await db.from("outreach_prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending").or("unsubscribed.is.null,unsubscribed.eq.false");
  return count || 0;
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceRoleSupabaseClient();
  // ?dry=1: report what would be sent now, ignoring the switch and the clock. Sends nothing.
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const { data: settings, error: setErr } = await db.from("outreach_autosend").select("enabled, last_run_on").eq("id", 1).maybeSingle();
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });
  const now = madridNow();
  if (dry) {
    const remaining = Math.max(0, DAILY_LIMIT - (await sentTodayCount(db)));
    const { data: pending } = await db.from("outreach_prospects")
      .select("company_name, email, country, created_at")
      .eq("status", "pending").or("unsubscribed.is.null,unsubscribed.eq.false")
      .order("created_at", { ascending: true }).limit(remaining + 20);
    const batch = (pending ?? []).filter((p) => !isTestAddress(p.email)).slice(0, remaining);
    return NextResponse.json({ dry: true, enabled: !!settings?.enabled, madrid: now, last_run_on: settings?.last_run_on ?? null, remaining, would_send: batch.length, batch });
  }
  if (!settings?.enabled) return NextResponse.json({ skipped: "switched off" });
  if (["Sat", "Sun"].includes(now.weekday)) return NextResponse.json({ skipped: "weekend in Madrid" });
  if (now.hour < 9) return NextResponse.json({ skipped: `${now.hour}:00 in Madrid, before 09:00` });
  if (settings.last_run_on === now.date) return NextResponse.json({ skipped: "already ran today" });

  // Claim today. The conditional update means a second invocation can't also send.
  const { data: claimed, error: claimErr } = await db.from("outreach_autosend")
    .update({ last_run_on: now.date })
    .eq("id", 1).eq("enabled", true)
    .or(`last_run_on.is.null,last_run_on.neq.${now.date}`)
    .select("id");
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!claimed?.length) return NextResponse.json({ skipped: "claimed by another run" });

  const remaining = Math.max(0, DAILY_LIMIT - (await sentTodayCount(db)));
  let sent = 0;
  const errors: string[] = [];

  if (remaining > 0) {
    // A few extra so test addresses (skipped) don't shrink the batch.
    const { data: pending, error } = await db.from("outreach_prospects")
      .select("id, email, company_name, contact_name, city, country, notes, unsubscribed")
      .eq("status", "pending").or("unsubscribed.is.null,unsubscribed.eq.false")
      .order("created_at", { ascending: true })
      .limit(remaining + 20);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const batch = (pending ?? []).filter((p) => !isTestAddress(p.email)).slice(0, remaining);
    for (const p of batch) {
      try {
        await sendToProspect(db, p);
        sent++;
      } catch (e: any) {
        errors.push(`${p.company_name} <${p.email}>: ${String(e?.message || e).slice(0, 160)}`);
      }
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
  }

  const queuedAfter = await queuedCount(db);
  const result = { at: new Date().toISOString(), sent, failed: errors.length, errors: errors.slice(0, 20), queued_after: queuedAfter };
  await db.from("outreach_autosend").update({ last_result: result }).eq("id", 1);

  // The human's one job: keep DAILY_LIMIT prospects queued. Say so when they aren't.
  if (queuedAfter < DAILY_LIMIT || errors.length) {
    const admins = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
    const html = `<div style="font-family:system-ui,Arial;line-height:1.6">
      <p>Today's outreach batch sent <b>${sent}</b> email${sent === 1 ? "" : "s"}${errors.length ? ` and <b>${errors.length}</b> failed` : ""}.</p>
      ${queuedAfter < DAILY_LIMIT ? `<p><b>Only ${queuedAfter} prospect${queuedAfter === 1 ? " is" : "s are"} queued for the next run</b> (it sends up to ${DAILY_LIMIT}). Add more from the Car Hire Directory: https://portal.camel-global.com/admin/outreach/directory</p>` : ""}
      ${errors.length ? `<p>Failures:</p><ul>${errors.slice(0, 20).map((e) => `<li>${e.replace(/</g, "&lt;")}</li>`).join("")}</ul>` : ""}
    </div>`;
    for (const to of admins) {
      try {
        await sendEmail({ to, subject: `[Admin] Outreach auto-send: ${sent} sent, ${queuedAfter} queued`, html });
      } catch { /* the run result is stored either way */ }
    }
  }

  return NextResponse.json(result);
}
