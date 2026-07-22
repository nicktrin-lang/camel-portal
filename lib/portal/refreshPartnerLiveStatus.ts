import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendAccountLiveEmail } from "@/lib/email";
import { computeLiveReadiness } from "@/lib/portal/computeLiveReadiness";

type RefreshResult = {
  ok: boolean;
  userId: string;
  isLiveNow: boolean;
  becameLive: boolean;
  alreadyLive: boolean;
  missing: string[];
};

export async function refreshPartnerLiveStatus(userId: string): Promise<RefreshResult> {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) throw new Error("Missing userId");

  const db = createServiceRoleSupabaseClient();

  const { data: application, error: applicationErr } = await db
    .from("partner_applications")
    .select("id, email, status, user_id, live_email_sent_at")
    .eq("user_id", cleanUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (applicationErr) throw new Error(applicationErr.message);

  let resolvedApplication = application || null;

  if (!resolvedApplication) {
    const { data: authUser, error: authErr } = await db.auth.admin.getUserById(cleanUserId);
    if (authErr) throw new Error(authErr.message);
    const authEmail = String(authUser?.user?.email || "").trim().toLowerCase();
    if (!authEmail) throw new Error("Partner application not found.");
    const { data: fallbackApp, error: fallbackErr } = await db
      .from("partner_applications")
      .select("id, email, status, user_id, live_email_sent_at")
      .eq("email", authEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallbackErr) throw new Error(fallbackErr.message);
    resolvedApplication = fallbackApp || null;
  }

  if (!resolvedApplication) throw new Error("Partner application not found.");

  // ── Live-readiness (7 checks; an active driver is deliberately NOT one) ────
  // Single source of truth — mirrors the customer match loop. Driver is a
  // fulfilment-time requirement, not a matching gate.
  const { isLive: isLiveNow, missing } = await computeLiveReadiness(cleanUserId);

  const liveEmailAlreadySent = !!resolvedApplication.live_email_sent_at;

  // Not live — return early, no email
  if (!isLiveNow) {
    return { ok: true, userId: cleanUserId, isLiveNow: false, becameLive: false, alreadyLive: liveEmailAlreadySent, missing };
  }

  // Already sent — return early, no email
  if (liveEmailAlreadySent) {
    return { ok: true, userId: cleanUserId, isLiveNow: true, becameLive: false, alreadyLive: true, missing: [] };
  }

  // ── First time going live — stamp DB FIRST, then send email ──────────────
  // Stamping first means even if the email call fails or this function is
  // called concurrently, the email will never be sent twice.
  const { error: updateErr } = await db
    .from("partner_applications")
    .update({
      user_id:             cleanUserId,
      live_email_sent_at:  new Date().toISOString(),
    })
    .eq("id", resolvedApplication.id)
    .is("live_email_sent_at", null); // extra safety — only update if still null

  if (updateErr) throw new Error(updateErr.message);

  // Send email after DB is committed
  const partnerEmail = String(resolvedApplication.email || "").trim().toLowerCase();
  if (partnerEmail) {
    try {
      await sendAccountLiveEmail(partnerEmail);
    } catch (emailErr) {
      // Email failed but DB is already stamped — won't retry, log only
      console.error("Live email send failed (DB already stamped):", emailErr);
    }
  }

  return { ok: true, userId: cleanUserId, isLiveNow: true, becameLive: true, alreadyLive: false, missing: [] };
}