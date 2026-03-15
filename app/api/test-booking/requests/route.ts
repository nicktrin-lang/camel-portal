import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

async function getUser() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data, error } = await authed.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("customer_requests")
      .select(`
        id,
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
        created_at
      `)
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const pickup_address = String(body?.pickup_address || "").trim();
    const dropoff_address = String(body?.dropoff_address || "").trim();
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
    if (!dropoff_address) {
      return NextResponse.json({ error: "Dropoff is required" }, { status: 400 });
    }
    if (!pickup_at) {
      return NextResponse.json({ error: "Pickup time is required" }, { status: 400 });
    }
    if (!vehicle_category_slug || !vehicle_category_name) {
      return NextResponse.json({ error: "Vehicle category is required" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    const { error: profileErr } = await db
      .from("customer_profiles")
      .upsert({
        user_id: user.id,
        full_name: String(user.user_metadata?.full_name || "").trim() || null,
        phone: String(user.user_metadata?.phone || "").trim() || null,
      });

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    const { data: requestRow, error: insertErr } = await db
      .from("customer_requests")
      .insert({
        customer_user_id: user.id,
        customer_name:
          String(user.user_metadata?.full_name || "").trim() || user.email || "Customer",
        customer_email: user.email || null,
        customer_phone: String(user.user_metadata?.phone || "").trim() || null,
        pickup_address,
        dropoff_address,
        pickup_at,
        dropoff_at || null,
        journey_duration_minutes: journey_duration_minutes || null,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_slug,
        vehicle_category_name,
        notes: notes || null,
        status: "open",
      })
      .select("id, passengers, suitcases, hand_luggage, vehicle_category_slug")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const { data: fleetRows, error: fleetErr } = await db
      .from("partner_fleet")
      .select("id, user_id, category_slug, max_passengers, max_suitcases, max_hand_luggage, is_active")
      .eq("is_active", true);

    if (fleetErr) {
      return NextResponse.json({ error: fleetErr.message }, { status: 400 });
    }

    const eligiblePartners = new Map<string, { fleet_id: string | null }>();

    for (const fleet of fleetRows || []) {
      const fitsCategory =
        String(fleet.category_slug || "") === String(requestRow.vehicle_category_slug || "");
      const fitsPassengers =
        Number(fleet.max_passengers || 0) >= Number(requestRow.passengers || 0);
      const fitsSuitcases =
        Number(fleet.max_suitcases || 0) >= Number(requestRow.suitcases || 0);
      const fitsHand =
        Number(fleet.max_hand_luggage || 0) >= Number(requestRow.hand_luggage || 0);

      if (fitsCategory && fitsPassengers && fitsSuitcases && fitsHand) {
        const partnerUserId = String(fleet.user_id || "");
        if (partnerUserId && !eligiblePartners.has(partnerUserId)) {
          eligiblePartners.set(partnerUserId, {
            fleet_id: String(fleet.id || "") || null,
          });
        }
      }
    }

    const matchRows = Array.from(eligiblePartners.entries()).map(([partner_user_id, meta]) => ({
      request_id: requestRow.id,
      partner_user_id,
      matched_fleet_id: meta.fleet_id,
      match_status: "open",
    }));

    if (matchRows.length > 0) {
      const { error: matchErr } = await db
        .from("request_partner_matches")
        .insert(matchRows);

      if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { ok: true, data: { id: requestRow.id } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}