import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData } = await authed.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const db = createServiceRoleSupabaseClient();

  const { data, error } = await db
    .from("partner_bookings")
    .select(
      `
      *,
      customer_requests (
        pickup_address,
        dropoff_address,
        pickup_at,
        dropoff_at,
        journey_duration_minutes,
        passengers,
        suitcases,
        hand_luggage,
        vehicle_category_name
      )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const db = createServiceRoleSupabaseClient();

  const { error } = await db
    .from("partner_bookings")
    .update({
      driver_name: body.driver_name,
      driver_phone: body.driver_phone,
      vehicle_plate: body.vehicle_plate,
      vehicle_model: body.vehicle_model,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}