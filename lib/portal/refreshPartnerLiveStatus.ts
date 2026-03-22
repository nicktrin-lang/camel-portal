import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendAccountLiveEmail } from "@/lib/email";

type RefreshResult = {
  ok: boolean;
  userId: string;
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

  if (!cleanUserId) {
    throw new Error("Missing userId");
  }

  const db = createServiceRoleSupabaseClient();

  const { data: profile, error: profileErr } = await db
    .from("partner_profiles")
    .select(`
      user_id,
      company_name,
      contact_name,
      phone,
      address,
      service_radius_km,
      base_address,
      base_lat,
      base_lng
    `)
    .eq("user_id", cleanUserId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(profileErr.message);
  }

  if (!profile) {
    throw new Error("Partner profile not found.");
  }

  const { data: fleetRows, error: fleetErr } = await db
    .from("partner_fleet")
    .select("id")
    .eq("user_id", cleanUserId)
    .limit(1);

  if (fleetErr) {
    throw new Error(fleetErr.message);
  }

  const { data: application, error: applicationErr } = await db
    .from("partner_applications")
    .select("id, email, status, user_id")
    .eq("user_id", cleanUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationErr) {
    throw new Error(applicationErr.message);
  }

  let resolvedApplication = application || null;

  if (!resolvedApplication) {
    const possibleEmails: string[] = [];

    const { data: authUser, error: authErr } = await db.auth.admin.getUserById(cleanUserId);

    if (!authErr) {
      const authEmail = String(authUser?.user?.email || "").trim().toLowerCase();
      if (authEmail) possibleEmails.push(authEmail);
    }

    // Fallback: try matching most recent application by profile/company/phone if needed
    if (possibleEmails.length > 0) {
      const { data: fallbackApplication, error: fallbackErr } = await db
        .from("partner_applications")
        .select("id, email, status, user_id")
        .in("email", possibleEmails)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackErr) {
        throw new Error(fallbackErr.message);
      }

      resolvedApplication = fallbackApplication || null;
    }
  }

  if (!resolvedApplication) {
    throw new Error("Partner application not found.");
  }

  const missing: string[] = [];

  const hasRadius =
    profile?.service_radius_km !== null &&
    profile?.service_radius_km !== undefined &&
    Number(profile.service_radius_km) > 0;

  const hasBaseAddress = hasText(profile?.base_address);
  const hasBaseLat = hasValidNumber(profile?.base_lat);
  const hasBaseLng = hasValidNumber(profile?.base_lng);
  const hasFleet = Array.isArray(fleetRows) && fleetRows.length > 0;

  if (!hasRadius) missing.push("service_radius_km");
  if (!hasBaseAddress) missing.push("base_address");
  if (!hasBaseLat) missing.push("base_lat");
  if (!hasBaseLng) missing.push("base_lng");
  if (!hasFleet) missing.push("fleet");

  const isLiveNow = missing.length === 0;
  const currentStatus = String(resolvedApplication.status || "").trim().toLowerCase();
  const alreadyLive = currentStatus === "live";

  if (!isLiveNow) {
    return {
      ok: true,
      userId: cleanUserId,
      becameLive: false,
      alreadyLive,
      missing,
    };
  }

  if (alreadyLive) {
    return {
      ok: true,
      userId: cleanUserId,
      becameLive: false,
      alreadyLive: true,
      missing: [],
    };
  }

  const { error: updateErr } = await db
    .from("partner_applications")
    .update({
      status: "live",
      user_id: cleanUserId,
    })
    .eq("id", resolvedApplication.id);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  const partnerEmail = String(resolvedApplication.email || "").trim().toLowerCase();

  if (partnerEmail) {
    await sendAccountLiveEmail(partnerEmail);
  }

  return {
    ok: true,
    userId: cleanUserId,
    becameLive: true,
    alreadyLive: false,
    missing: [],
  };
}