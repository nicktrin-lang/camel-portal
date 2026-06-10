import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow } = await db
      .from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !["admin","super_admin"].includes(adminRow.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select(`
        id, request_id, partner_user_id, winning_bid_id,
        booking_status, amount, currency, charge_currency, conversion_rate,
        fuel_price, car_hire_price,
        fuel_used_quarters, fuel_charge, fuel_refund,
        commission_rate, commission_amount, partner_payout_amount,
        cancelled_by, cancelled_at, cancellation_reason, refund_status,
        notes, created_at, job_number, assigned_driver_id,
        driver_name, driver_phone, driver_vehicle, driver_notes, driver_assigned_at,
        collection_confirmed_by_driver, collection_confirmed_by_driver_at, collection_fuel_level_driver,
        return_confirmed_by_driver, return_confirmed_by_driver_at, return_fuel_level_driver,
        collection_confirmed_by_partner, collection_confirmed_by_partner_at, collection_fuel_level_partner, collection_partner_notes,
        return_confirmed_by_partner, return_confirmed_by_partner_at, return_fuel_level_partner, return_partner_notes,
        collection_confirmed_by_customer, collection_confirmed_by_customer_at, collection_fuel_level_customer, collection_customer_notes,
        return_confirmed_by_customer, return_confirmed_by_customer_at, return_fuel_level_customer, return_customer_notes,
        insurance_docs_confirmed_by_driver, insurance_docs_confirmed_by_driver_at,
        insurance_docs_confirmed_by_customer, insurance_docs_confirmed_by_customer_at,
        delivery_driver_id, delivery_driver_name, delivery_confirmed_at,
        collection_driver_id, collection_driver_name, collection_confirmed_at,
        payment_id, payout_hold, payout_hold_reason,
        post_completion_refund_total
      `)
      .eq("id", id)
      .maybeSingle();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    if (!bookingRow) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // ── Payment data ────────────────────────────────────────────────────────
    let paymentData: {
      stripe_fee: number | null;
      stripe_fee_currency: string | null;
      exchange_rate: number | null;
      charge_currency: string | null;
      amount_total: number | null;
      amount_car_hire: number | null;
      amount_fuel_deposit: number | null;
      cancellation_refund_amount: number | null;
      cancellation_refund_stripe_id: string | null;
      cancelled_refunded_at: string | null;
      fuel_refund_amount: number | null;
      fuel_refund_stripe_id: string | null;
    } | null = null;

    if (bookingRow.payment_id) {
      const { data: pmtRow } = await db
        .from("payments")
        .select(`
          stripe_fee, stripe_fee_currency, exchange_rate,
          currency, amount_total, amount_car_hire, amount_fuel_deposit,
          cancellation_refund_amount, cancellation_refund_stripe_id, cancelled_refunded_at,
          fuel_refund_amount, fuel_refund_stripe_id
        `)
        .eq("id", bookingRow.payment_id)
        .maybeSingle();
      if (pmtRow) {
        paymentData = {
          stripe_fee:                    pmtRow.stripe_fee ?? null,
          stripe_fee_currency:           pmtRow.stripe_fee_currency ?? null,
          exchange_rate:                 pmtRow.exchange_rate ?? null,
          charge_currency:               pmtRow.currency ?? null,
          amount_total:                  pmtRow.amount_total ?? null,
          amount_car_hire:               pmtRow.amount_car_hire ?? null,
          amount_fuel_deposit:           pmtRow.amount_fuel_deposit ?? null,
          cancellation_refund_amount:    pmtRow.cancellation_refund_amount ?? null,
          cancellation_refund_stripe_id: pmtRow.cancellation_refund_stripe_id ?? null,
          cancelled_refunded_at:         pmtRow.cancelled_refunded_at ?? null,
          fuel_refund_amount:            pmtRow.fuel_refund_amount ?? null,
          fuel_refund_stripe_id:         pmtRow.fuel_refund_stripe_id ?? null,
        };
      }
    }

    // ── Request ─────────────────────────────────────────────────────────────
    let requestRow = null;
    if (bookingRow.request_id) {
      const { data: reqData } = await db
        .from("customer_requests")
        .select(`
          id, job_number, customer_name, customer_email, customer_phone,
          pickup_address, dropoff_address, pickup_at, dropoff_at,
          journey_duration_minutes, passengers, suitcases, hand_luggage,
          sport_equipment, driver_age, additional_drivers, additional_driver_ages,
          vehicle_category_name, notes, status, created_at
        `)
        .eq("id", bookingRow.request_id)
        .maybeSingle();
      requestRow = reqData || null;
    }

    // ── Partner profile ──────────────────────────────────────────────────────
    const { data: profileRow } = await db
      .from("partner_profiles")
      .select("company_name")
      .eq("user_id", bookingRow.partner_user_id)
      .maybeSingle();

    // ── Partner email from partner_applications ──────────────────────────────
    const { data: applicationRow } = await db
      .from("partner_applications")
      .select("email")
      .eq("user_id", bookingRow.partner_user_id)
      .maybeSingle();

    // ── Post-completion refunds ──────────────────────────────────────────────
    const { data: refundRows } = await db
      .from("partner_booking_refunds")
      .select("id, amount, reason, stripe_refund_id, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: true });

    const postCompletionRefunds = (refundRows ?? []).map((r: any) => ({
      id:               r.id,
      amount:           Number(r.amount),
      reason:           r.reason ?? null,
      stripe_refund_id: r.stripe_refund_id ?? null,
      created_at:       r.created_at,
    }));

    return NextResponse.json({
      booking: {
        ...bookingRow,
        partner_company_name:  profileRow?.company_name || null,
        partner_contact_email: applicationRow?.email    || null,
      },
      payment:                paymentData,
      request:                requestRow,
      role:                   adminRow.role,
      postCompletionRefunds,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// ── PATCH — hold or release payout (admin only) ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow } = await db
      .from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !["admin","super_admin"].includes(adminRow.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const { payout_hold, payout_hold_reason } = body || {};

    if (typeof payout_hold !== "boolean") {
      return NextResponse.json({ error: "payout_hold must be a boolean" }, { status: 400 });
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        payout_hold,
        payout_hold_reason: payout_hold ? (payout_hold_reason || null) : null,
      })
      .eq("id", id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, payout_hold, payout_hold_reason: payout_hold ? (payout_hold_reason || null) : null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}