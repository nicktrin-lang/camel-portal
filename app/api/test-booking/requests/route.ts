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
        created_at
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
      return NextResponse.json(
        { error: "Vehicle category is required" },
        { status: 400 }
      );
    }

    const partnerDb = createServiceRoleSupabaseClient();

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
        dropoff_address,
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
      })
      .select("id, job_number, passengers, suitcases, hand_luggage, vehicle_category_slug")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const { data: fleetRows, error: fleetErr } = await partnerDb
      .from("partner_fleet")
      .select(
        "id, user_id, category_slug, max_passengers, max_suitcases, max_hand_luggage, is_active"
      )
      .eq("is_active", true);

    if (fleetErr) {
      return NextResponse.json({ error: fleetErr.message }, { status: 400 });
    }

    const eligiblePartners = new Map<string, { fleet_id: string | null }>();

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

      if (fitsCategory && fitsPassengers && fitsSuitcases && fitsHandLuggage) {
        const partnerUserId = String(fleet.user_id || "");
        if (partnerUserId && !eligiblePartners.has(partnerUserId)) {
          eligiblePartners.set(partnerUserId, {
            fleet_id: String(fleet.id || "") || null,
          });
        }
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