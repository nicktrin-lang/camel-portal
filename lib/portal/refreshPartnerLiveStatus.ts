import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendAccountLiveEmail } from "@/lib/email";

type RefreshResult = {
  ok: boolean;
  userId: string;
  isLiveNow: boolean;
  becameLive: boolean;
  alreadyLive: boolean;
  missing: string[];
};

function hasText(value: unknown) {
  return String(value || "").trim().length > 0;
}

function hasValidNumber(value: unknown) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

export async function refreshPartnerLiveStatus(userId: string): Promise<RefreshResult> {
  const cleanUserId = String(userId || "").trim();

  if (!cleanUserId) throw new Error("Missing userId");

  const db = createServiceRoleSupabaseClient();

  const { data: profile, error: profileErr } = await db
    .from("partner_profiles")
    .select(`user_id, service_radius_km, base_address, base_lat, base_lng, default_currency, vat_number`)
    .eq("user_id", cleanUserId)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (!profile) throw new Error("Partner profile not found.");

  const { data: fleetRows, error: fleetErr } = await db
    .from("partner_fleet")
    .select("id")
    .eq("user_id", cleanUserId)
    .eq("is_active", true)
    .limit(1);

  if (fleetErr) throw new Error(fleetErr.message);

  const { data: driverRows, error: driverErr } = await db
    .from("partner_drivers")
    .select("id")
    .eq("partner_user_id", cleanUserId)
    .eq("is_active", true)
    .limit(1);

  if (driverErr) throw new Error(driverErr.message);

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

    const { data: fallbackApplication, error: fallbackErr } = await db
      .from("partner_applications")
      .select("id, email, status, user_id, live_email_sent_at")
      .eq("email", authEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackErr) throw new Error(fallbackErr.message);
    resolvedApplication = fallbackApplication || null;
  }

  if (!resolvedApplication) throw new Error("Partner application not found.");

  const missing: string[] = [];

  const hasRadius = profile.service_radius_km !== null &&
    profile.service_radius_km !== undefined &&
    Number(profile.service_radius_km) > 0;

  if (!hasRadius)                                            missing.push("service_radius_km");
  if (!hasText(profile.base_address))                        missing.push("base_address");
  if (!hasValidNumber(profile.base_lat))                     missing.push("base_lat");
  if (!hasValidNumber(profile.base_lng))                     missing.push("base_lng");
  if (!Array.isArray(fleetRows) || fleetRows.length === 0)   missing.push("fleet");
  if (!Array.isArray(driverRows) || driverRows.length === 0) missing.push("driver");
  if (!hasText(profile.default_currency))                    missing.push("default_currency");
  if (!hasText(profile.vat_number))                          missing.push("vat_number");

  const isLiveNow = missing.length === 0;
  const liveEmailAlreadySent = !!resolvedApplication.live_email_sent_at;

  if (!isLiveNow) {
    return { ok: true, userId: cleanUserId, isLiveNow: false, becameLive: false, alreadyLive: liveEmailAlreadySent, missing };
  }

  if (liveEmailAlreadySent) {
    return { ok: true, userId: cleanUserId, isLiveNow: true, becameLive: false, alreadyLive: true, missing: [] };
  }

  const partnerEmail = String(resolvedApplication.email || "").trim().toLowerCase();
  if (!partnerEmail) throw new Error("Partner email not found.");

  await sendAccountLiveEmail(partnerEmail);

  const { error: updateErr } = await db
    .from("partner_applications")
    .update({ user_id: cleanUserId, status: "live", live_email_sent_at: new Date().toISOString() })
    .eq("id", resolvedApplication.id);

  if (updateErr) throw new Error(updateErr.message);

  return { ok: true, userId: cleanUserId, isLiveNow: true, becameLive: true, alreadyLive: false, missing: [] };
}