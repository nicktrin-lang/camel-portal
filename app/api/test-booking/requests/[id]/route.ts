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
    if (!customerUser) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id } = await params;
    const db = createServiceRoleSupabaseClient();

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select(`
        id, job_number, customer_user_id, pickup_address, dropoff_address,
        pickup_at, dropoff_at, journey_duration_minutes, passengers,
        suitcases, hand_luggage, vehicle_category_name, notes,
        status, created_at, expires_at
      `)
      .eq("id", id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const { data: bidRows, error: bidErr } = await db
      .from("partner_bids")
      .select(`
        id, partner_user_id, vehicle_category_name, car_hire_price,
        fuel_price, total_price, full_insurance_included,
        full_tank_included, notes, status, created_at
      `)
      .eq("request_id", id)
      .order("total_price", { ascending: true });

    if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 400 });

    const partnerIds = Array.from(new Set(
      (bidRows || []).map((r: any) => String(r.partner_user_id || "")).filter(Boolean)
    ));

    let profileMap = new Map<string, any>();
    if (partnerIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select("user_id, company_name, phone")
        .in("user_id", partnerIds);
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
      profileMap = new Map((profileRows || []).map((r: any) => [String(r.user_id), r]));
    }

    const bids = (bidRows || []).map((bid: any) => {
      const profile = profileMap.get(String(bid.partner_user_id)) || null;
      return {
        id: bid.id,
        partner_user_id: bid.partner_user_id,
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

    const acceptedBid = bids.find((b: any) => b.status === "accepted") || null;
    let booking: any = null;

    if (acceptedBid) {
      const { data: bookingRows, error: bookingErr } = await db
        .from("partner_bookings")
        .select(`
          id, request_id, partner_user_id, winning_bid_id,
          booking_status, amount, notes, created_at, job_number,
          assigned_driver_id, driver_name, driver_phone,
          driver_vehicle, driver_notes, driver_assigned_at,

          fuel_price, car_hire_price,
          fuel_used_quarters, fuel_charge, fuel_refund,

          collection_confirmed_by_driver,
          collection_confirmed_by_driver_at,
          collection_fuel_level_driver,

          return_confirmed_by_driver,
          return_confirmed_by_driver_at,
          return_fuel_level_driver,

          collection_confirmed_by_partner,
          collection_confirmed_by_partner_at,
          collection_fuel_level_partner,
          collection_partner_notes,

          return_confirmed_by_partner,
          return_confirmed_by_partner_at,
          return_fuel_level_partner,
          return_partner_notes,

          collection_confirmed_by_customer,
          collection_confirmed_by_customer_at,
          collection_fuel_level_customer,
          collection_customer_notes,

          return_confirmed_by_customer,
          return_confirmed_by_customer_at,
          return_fuel_level_customer,
          return_customer_notes
        `)
        .eq("winning_bid_id", acceptedBid.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });

      const bk = bookingRows?.[0] || null;
      if (bk) {
        const winnerProfile = profileMap.get(String(bk.partner_user_id || "")) || null;
        booking = {
          id: bk.id,
          request_id: bk.request_id,
          partner_user_id: bk.partner_user_id,
          winning_bid_id: bk.winning_bid_id,
          booking_status: bk.booking_status,
          amount: bk.amount,
          notes: bk.notes,
          created_at: bk.created_at,
          job_number: bk.job_number,
          assigned_driver_id: bk.assigned_driver_id || null,
          company_name: winnerProfile?.company_name || acceptedBid.partner_company_name || "Car Hire Company",
          company_phone: winnerProfile?.phone || acceptedBid.partner_phone || null,
          driver_name: bk.driver_name || null,
          driver_phone: bk.driver_phone || null,
          driver_vehicle: bk.driver_vehicle || null,
          driver_notes: bk.driver_notes || null,
          driver_assigned_at: bk.driver_assigned_at || null,

          // ── Fuel pricing (EUR) ────────────────────────────────────
          fuel_price: bk.fuel_price ?? 0,
          car_hire_price: bk.car_hire_price ?? 0,
          fuel_used_quarters: bk.fuel_used_quarters ?? null,
          fuel_charge: bk.fuel_charge ?? null,   // GBP
          fuel_refund: bk.fuel_refund ?? null,   // GBP

          // ── Driver confirmations ──────────────────────────────────
          collection_confirmed_by_driver: !!bk.collection_confirmed_by_driver,
          collection_confirmed_by_driver_at: bk.collection_confirmed_by_driver_at || null,
          collection_fuel_level_driver: bk.collection_fuel_level_driver || null,
          return_confirmed_by_driver: !!bk.return_confirmed_by_driver,
          return_confirmed_by_driver_at: bk.return_confirmed_by_driver_at || null,
          return_fuel_level_driver: bk.return_fuel_level_driver || null,

          // ── Partner confirmations ─────────────────────────────────
          collection_confirmed_by_partner: !!bk.collection_confirmed_by_partner,
          collection_confirmed_by_partner_at: bk.collection_confirmed_by_partner_at || null,
          collection_fuel_level_partner: bk.collection_fuel_level_partner || null,
          collection_partner_notes: bk.collection_partner_notes || null,
          return_confirmed_by_partner: !!bk.return_confirmed_by_partner,
          return_confirmed_by_partner_at: bk.return_confirmed_by_partner_at || null,
          return_fuel_level_partner: bk.return_fuel_level_partner || null,
          return_partner_notes: bk.return_partner_notes || null,

          // ── Customer confirmations ────────────────────────────────
          collection_confirmed_by_customer: !!bk.collection_confirmed_by_customer,
          collection_confirmed_by_customer_at: bk.collection_confirmed_by_customer_at || null,
          collection_fuel_level_customer: bk.collection_fuel_level_customer || null,
          collection_customer_notes: bk.collection_customer_notes || null,
          return_confirmed_by_customer: !!bk.return_confirmed_by_customer,
          return_confirmed_by_customer_at: bk.return_confirmed_by_customer_at || null,
          return_fuel_level_customer: bk.return_fuel_level_customer || null,
          return_customer_notes: bk.return_customer_notes || null,
        };
      }
    }

    return NextResponse.json({ request: requestRow, bids, booking }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}