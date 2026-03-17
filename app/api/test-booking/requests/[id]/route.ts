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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { id } = await params;
    const db = createServiceRoleSupabaseClient();

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id,
        job_number,
        customer_user_id,
        pickup_address,
        dropoff_address,
        pickup_at,
        dropoff_at,
        journey_duration_minutes,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_name,
        notes,
        status,
        created_at,
        expires_at
      `)
      .eq("id", id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { data: bidRows, error: bidErr } = await db
      .from("partner_bids")
      .select(`
        id,
        partner_user_id,
        vehicle_category_name,
        car_hire_price,
        fuel_price,
        total_price,
        full_insurance_included,
        full_tank_included,
        notes,
        status,
        created_at
      `)
      .eq("request_id", id)
      .order("total_price", { ascending: true });

    if (bidErr) {
      return NextResponse.json({ error: bidErr.message }, { status: 400 });
    }

    const partnerIds = Array.from(
      new Set((bidRows || []).map((row: any) => String(row.partner_user_id || "")).filter(Boolean))
    );

    let profileMap = new Map<string, any>();

    if (partnerIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          phone
        `)
        .in("user_id", partnerIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
      );
    }

    const bids = (bidRows || []).map((bid: any) => {
      const profile = profileMap.get(String(bid.partner_user_id)) || null;

      return {
        id: bid.id,
        partner_company_name: profile?.company_name || "Car Hire Company",
        partner_contact_name: null,
        partner_phone: profile?.phone || null,
        partner_address: null,
        vehicle_category_name: bid.vehicle_category_name,
        car_hire_price: bid.car_hire_price,
        fuel_price: bid.fuel_price,
        total_price: bid.total_price,
        full_insurance_included: !!bid.full_insurance_included,
        full_tank_included: !!bid.full_tank_included,
        notes: bid.notes || null,
        status: bid.status,
        created_at: bid.created_at,
      };
    });

    return NextResponse.json(
      {
        request: requestRow,
        bids,
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