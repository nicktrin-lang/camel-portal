import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/**
 * Single source of truth for partner LIVE-READINESS (the "computed live" concept).
 *
 * A partner is matchable when their application is APPROVED **and** they pass
 * these checks. "live" is NEVER a stored status value — it is computed from these.
 *
 * The 7 checks (an active DRIVER is deliberately NOT one of them):
 *   service_radius_km > 0, base_address, base_lat, base_lng, active fleet,
 *   default_currency, vat_number.
 *
 * A driver is a FULFILMENT-time requirement, not a matching-time one: a partner
 * assigns a driver when they process a won booking (partner_bookings.assigned_driver_id
 * is nullable and filled in at delivery/collection). Requiring a driver to receive
 * bids was too strict, so it was removed here. The partner dashboard checklist still
 * nudges partners to add a driver — it is just no longer a blocking gate.
 *
 * This helper has NO side effects. refreshPartnerLiveStatus() layers the
 * "first time live → stamp + email" behaviour on top of it.
 */

export type LiveReadiness = { isLive: boolean; missing: string[] };

function hasText(value: unknown) {
  return String(value || "").trim().length > 0;
}

function hasValidNumber(value: unknown) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

export async function computeLiveReadiness(userId: string): Promise<LiveReadiness> {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) throw new Error("Missing userId");

  const db = createServiceRoleSupabaseClient();

  const { data: profile, error: profileErr } = await db
    .from("partner_profiles")
    .select("service_radius_km, base_address, base_lat, base_lng, default_currency, vat_number")
    .eq("user_id", cleanUserId)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (!profile)   throw new Error("Partner profile not found.");

  const { data: fleetRows, error: fleetErr } = await db
    .from("partner_fleet")
    .select("id")
    .eq("user_id", cleanUserId)
    .eq("is_active", true)
    .limit(1);
  if (fleetErr) throw new Error(fleetErr.message);

  const hasRadius =
    profile.service_radius_km !== null &&
    profile.service_radius_km !== undefined &&
    Number(profile.service_radius_km) > 0;

  const missing: string[] = [];
  if (!hasRadius)                                           missing.push("service_radius_km");
  if (!hasText(profile.base_address))                       missing.push("base_address");
  if (!hasValidNumber(profile.base_lat))                    missing.push("base_lat");
  if (!hasValidNumber(profile.base_lng))                    missing.push("base_lng");
  if (!Array.isArray(fleetRows) || fleetRows.length === 0)  missing.push("fleet");
  if (!hasText(profile.default_currency))                   missing.push("default_currency");
  if (!hasText(profile.vat_number))                         missing.push("vat_number");

  return { isLive: missing.length === 0, missing };
}
