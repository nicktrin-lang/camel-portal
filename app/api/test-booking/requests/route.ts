import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;

  const customerSupabase = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await customerSupabase.auth.getUser(accessToken);

  if (error || !data?.user) return null;
  return data.user;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getBidWindowHours(
  db: ReturnType<typeof createServiceRoleSupabaseClient>
) {
  const { data, error } = await db
    .from("portal_settings")
    .select("value_number")
    .eq("key", "request_bid_window_hours")
    .maybeSingle();

  if (error) {
    return 24;
  }

  const raw = Number(data?.value_number ?? 24);

  if (Number.isNaN(raw) || raw <= 0) {
    return 24;
  }

  return raw;
}

function addHoursToNow(hours: number) {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

export async function GET(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const partnerDb = createServiceRoleSupabaseClient();

    const { data, error } = await partnerDb
      .from("customer_requests")
      .select(`
        id,
        job_number,
        pickup_address,
        dropoff_address,
        pickup_at,
        dropoff_at,
        journey_duration_minutes,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_slug,
        vehicle_category_name,
        notes,
        status,
        created_at,
        expires_at
      `)
      .eq("customer_user_id", customerUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const pickup_address = String(body?.pickup_address || "").trim();
    const pickup_lat =
      body?.pickup_lat === null || body?.pickup_lat === undefined
        ? null
        : Number(body.pickup_lat);
    const pickup_lng =
      body?.pickup_lng === null || body?.pickup_lng === undefined
        ? null
        : Number(body.pickup_lng);

    const dropoff_address = String(body?.dropoff_address || "").trim();
    const dropoff_lat =
      body?.dropoff_lat === null ||
      body?.dropoff_lat === undefined ||
      body?.dropoff_lat === ""
        ? null
        : Number(body.dropoff_lat);
    const dropoff_lng =
      body?.dropoff_lng === null ||
      body?.dropoff_lng === undefined ||
      body?.dropoff_lng === ""
        ? null
        : Number(body.dropoff_lng);

    const pickup_at = String(body?.pickup_at || "").trim();
    const dropoff_at = String(body?.dropoff_at || "").trim();
    const journey_duration_minutes = Number(body?.journey_duration_minutes || 0);
    const passengers = Number(body?.passengers || 0);
    const suitcases = Number(body?.suitcases || 0);
    const hand_luggage = Number(body?.hand_luggage || 0);
    const vehicle_category_slug = String(body?.vehicle_category_slug || "").trim();
    const vehicle_category_name = String(body?.vehicle_category_name || "").trim();
    const notes = String(body?.notes || "").trim();

    if (!pickup_address) {
      return NextResponse.json({ error: "Pickup is required" }, { status: 400 });
    }

    if (pickup_lat === null || pickup_lng === null) {
      return NextResponse.json(
        { error: "Pickup latitude and longitude are required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(pickup_lat) || Number.isNaN(pickup_lng)) {
      return NextResponse.json(
        { error: "Pickup coordinates must be valid numbers" },
        { status: 400 }
      );
    }

    if (!dropoff_address) {
      return NextResponse.json({ error: "Dropoff is required" }, { status: 400 });
    }

    if (dropoff_lat !== null && Number.isNaN(dropoff_lat)) {
      return NextResponse.json(
        { error: "Dropoff latitude must be valid" },
        { status: 400 }
      );
    }

    if (dropoff_lng !== null && Number.isNaN(dropoff_lng)) {
      return NextResponse.json(
        { error: "Dropoff longitude must be valid" },
        { status: 400 }
      );
    }

    if (!pickup_at) {
      return NextResponse.json({ error: "Pickup time is required" }, { status: 400 });
    }

    if (!vehicle_category_slug || !vehicle_category_name) {
      return NextResponse.json(
        { error: "Vehicle category is required" },
        { status: 400 }
      );
    }

    const partnerDb = createServiceRoleSupabaseClient();

    const bidWindowHours = await getBidWindowHours(partnerDb);
    const expires_at = addHoursToNow(bidWindowHours);

    const customer_name =
      String(customerUser.user_metadata?.full_name || "").trim() ||
      String(customerUser.email || "").trim() ||
      "Customer";

    const customer_phone =
      String(customerUser.user_metadata?.phone || "").trim() || null;

    const { data: requestRow, error: insertErr } = await partnerDb
      .from("customer_requests")
      .insert({
        customer_user_id: customerUser.id,
        customer_name,
        customer_email: customerUser.email || null,
        customer_phone,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dropoff_address,
        dropoff_lat,
        dropoff_lng,
        pickup_at,
        dropoff_at: dropoff_at || null,
        journey_duration_minutes: journey_duration_minutes || null,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_slug,
        vehicle_category_name,
        notes: notes || null,
        status: "open",
        expires_at,
      })
      .select(
        `
        id,
        job_number,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_slug,
        pickup_lat,
        pickup_lng,
        expires_at
      `
      )
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const { data: fleetRows, error: fleetErr } = await partnerDb
      .from("partner_fleet")
      .select(
        `
        id,
        user_id,
        category_slug,
        max_passengers,
        max_suitcases,
        max_hand_luggage,
        is_active
      `
      )
      .eq("is_active", true);

    if (fleetErr) {
      return NextResponse.json({ error: fleetErr.message }, { status: 400 });
    }

    const partnerUserIds = Array.from(
      new Set(
        (fleetRows || [])
          .map((fleet: any) => String(fleet.user_id || ""))
          .filter(Boolean)
      )
    );

    let partnerProfileMap = new Map<string, any>();

    if (partnerUserIds.length > 0) {
      const { data: profileRows, error: profileErr } = await partnerDb
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          role,
          base_lat,
          base_lng,
          service_radius_km
        `)
        .in("user_id", partnerUserIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      partnerProfileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
      );
    }

    const eligiblePartners = new Map<
      string,
      { fleet_id: string | null; distance_km: number | null }
    >();

    for (const fleet of fleetRows || []) {
      const fitsCategory =
        String(fleet.category_slug || "") ===
        String(requestRow.vehicle_category_slug || "");

      const fitsPassengers =
        Number(fleet.max_passengers || 0) >= Number(requestRow.passengers || 0);

      const fitsSuitcases =
        Number(fleet.max_suitcases || 0) >= Number(requestRow.suitcases || 0);

      const fitsHandLuggage =
        Number(fleet.max_hand_luggage || 0) >=
        Number(requestRow.hand_luggage || 0);

      if (!fitsCategory || !fitsPassengers || !fitsSuitcases || !fitsHandLuggage) {
        continue;
      }

      const partnerUserId = String(fleet.user_id || "");
      if (!partnerUserId) continue;

      const profile = partnerProfileMap.get(partnerUserId);
      if (!profile) continue;

      const role = String(profile.role || "partner").trim();

      // Admin and super admin can see everything, but should not receive live matches
      if (role === "admin" || role === "super_admin") {
        continue;
      }

      const baseLat =
        profile.base_lat === null || profile.base_lat === undefined
          ? null
          : Number(profile.base_lat);
      const baseLng =
        profile.base_lng === null || profile.base_lng === undefined
          ? null
          : Number(profile.base_lng);
      const radiusKm =
        profile.service_radius_km === null || profile.service_radius_km === undefined
          ? null
          : Number(profile.service_radius_km);

      if (
        baseLat === null ||
        baseLng === null ||
        radiusKm === null ||
        Number.isNaN(baseLat) ||
        Number.isNaN(baseLng) ||
        Number.isNaN(radiusKm)
      ) {
        continue;
      }

      const distanceKm = haversineKm(
        Number(requestRow.pickup_lat),
        Number(requestRow.pickup_lng),
        baseLat,
        baseLng
      );

      if (distanceKm > radiusKm) {
        continue;
      }

      if (!eligiblePartners.has(partnerUserId)) {
        eligiblePartners.set(partnerUserId, {
          fleet_id: String(fleet.id || "") || null,
          distance_km: distanceKm,
        });
      }
    }

    const matchRows = Array.from(eligiblePartners.entries()).map(
      ([partner_user_id, meta]) => ({
        request_id: requestRow.id,
        partner_user_id,
        matched_fleet_id: meta.fleet_id,
        match_status: "open",
      })
    );

    if (matchRows.length > 0) {
      const { error: matchErr } = await partnerDb
        .from("request_partner_matches")
        .insert(matchRows);

      if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: requestRow.id,
          job_number: requestRow.job_number,
          expires_at: requestRow.expires_at,
          matched_partners_count: matchRows.length,
          bid_window_hours: bidWindowHours,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}