import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { sendCustomerBidReceivedEmail } from "@/lib/email";

function asMoney(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const request_id = String(body?.request_id || "").trim();
    const vehicle_category_name = String(body?.vehicle_category_name || "").trim();
    const notes = String(body?.notes || "").trim() || null;

    const car_hire_price = asMoney(body?.car_hire_price);
    const fuel_price = asMoney(body?.fuel_price);
    const total_price = asMoney(body?.total_price);

    const full_insurance_included = !!body?.full_insurance_included;
    const full_tank_included = !!body?.full_tank_included;

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    if (!vehicle_category_name) {
      return NextResponse.json(
        { error: "Vehicle category is required" },
        { status: 400 }
      );
    }

    if (total_price <= 0) {
      return NextResponse.json(
        { error: "Total price must be greater than zero" },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select("id, job_number, customer_email, status, expires_at")
      .eq("id", request_id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (String(requestRow.status || "") !== "open") {
      return NextResponse.json(
        { error: "This request is no longer open for bidding" },
        { status: 400 }
      );
    }

    if (
      requestRow.expires_at &&
      new Date(requestRow.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This request has expired" },
        { status: 400 }
      );
    }

    const { data: existingBid, error: existingBidErr } = await db
      .from("partner_bids")
      .select("id")
      .eq("request_id", request_id)
      .eq("partner_user_id", user.id)
      .maybeSingle();

    if (existingBidErr) {
      return NextResponse.json({ error: existingBidErr.message }, { status: 400 });
    }

    if (existingBid?.id) {
      return NextResponse.json(
        { error: "You have already submitted a bid for this request" },
        { status: 400 }
      );
    }

    const { data: insertedBid, error: insertErr } = await db
      .from("partner_bids")
      .insert({
        request_id,
        partner_user_id: user.id,
        vehicle_category_name,
        car_hire_price,
        fuel_price,
        total_price,
        full_insurance_included,
        full_tank_included,
        notes,
        status: "submitted",
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    if (requestRow.customer_email) {
      try {
        await sendCustomerBidReceivedEmail(
          requestRow.customer_email,
          requestRow.job_number
        );
      } catch (emailErr) {
        console.error("Failed to send customer bid email:", emailErr);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        bid_id: insertedBid.id,
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