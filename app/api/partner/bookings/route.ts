import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

export async function GET() {
  try {
    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const userId = user.id;
    const db     = createServiceRoleSupabaseClient();

    let adminMode = isAdminRole(role);
    if (!adminMode) {
      const email = String(user.email || "").toLowerCase().trim();
      if (email) {
        const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
        if (adminRow?.role === "admin" || adminRow?.role === "super_admin") adminMode = true;
      }
    }

    let bookingsQuery = db
      .from("partner_bookings")
      .select(`
        id, request_id, partner_user_id, winning_bid_id,
        booking_status, amount, currency, charge_currency, conversion_rate,
        car_hire_price, fuel_price,
        fuel_used_quarters, fuel_charge, fuel_refund,
        commission_rate, commission_amount, partner_payout_amount,
        cancelled_by, cancelled_at, cancellation_reason, refund_status,
        notes, created_at, job_number,
        driver_name, driver_phone, driver_vehicle, driver_notes, driver_assigned_at,
        delivery_confirmed_at, collection_confirmed_at,
        collection_fuel_level_driver, collection_fuel_level_partner, collection_fuel_level_customer,
        collection_confirmed_by_customer,
        return_fuel_level_driver, return_fuel_level_partner, return_fuel_level_customer,
        return_confirmed_by_customer,
        insurance_docs_confirmed_by_driver, insurance_docs_confirmed_by_customer,
        payment_id, payout_status, payout_hold
      `)
      .order("created_at", { ascending: false });

    if (!adminMode) bookingsQuery = bookingsQuery.eq("partner_user_id", userId);

    const { data: bookingRows, error: bookingErr } = await bookingsQuery;
    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });

    const rows = bookingRows || [];

    // ── Requests ────────────────────────────────────────────────────────────
    const requestIds = Array.from(new Set(rows.map((r: any) => String(r.request_id || "")).filter(Boolean)));
    let requestMap = new Map<string, any>();
    if (requestIds.length > 0) {
      const { data: requestRows, error: requestErr } = await db
        .from("customer_requests")
        .select(`
          id, job_number, pickup_address, dropoff_address, pickup_at, dropoff_at,
          journey_duration_minutes, passengers, suitcases, hand_luggage,
          vehicle_category_name, customer_name, customer_email, customer_phone,
          notes, status, created_at, expires_at
        `)
        .in("id", requestIds);
      if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
      requestMap = new Map((requestRows || []).map((r: any) => [String(r.id), r]));
    }

    // ── Partner profiles ────────────────────────────────────────────────────
    const partnerUserIds = Array.from(new Set(rows.map((r: any) => String(r.partner_user_id || "")).filter(Boolean)));
    let profileMap = new Map<string, any>();
    if (partnerUserIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select("user_id, company_name, phone, legal_company_name, vat_number, company_registration_number, base_country")
        .in("user_id", partnerUserIds);
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
      profileMap = new Map((profileRows || []).map((r: any) => [String(r.user_id), r]));
    }

    // ── Payments — join stripe_fee + exchange_rate ──────────────────────────
    const paymentIds = Array.from(new Set(rows.map((r: any) => String(r.payment_id || "")).filter(Boolean)));
    let paymentMap = new Map<string, any>();
    if (paymentIds.length > 0) {
      const { data: paymentRows } = await db
        .from("payments")
        .select("id, stripe_fee, stripe_fee_currency, exchange_rate, currency")
        .in("id", paymentIds);
      paymentMap = new Map((paymentRows || []).map((p: any) => [String(p.id), p]));
    }

    const data = rows.map((booking: any) => {
      const request        = requestMap.get(String(booking.request_id)) || null;
      const partnerProfile = profileMap.get(String(booking.partner_user_id)) || null;
      const payment        = booking.payment_id ? paymentMap.get(String(booking.payment_id)) || null : null;

      const isCancelled  = String(booking.booking_status || "").toLowerCase() === "cancelled";
      const refundStatus = booking.refund_status || null;
      const fuel         = Number(booking.fuel_price ?? 0);

      let effectiveCarHire    = booking.car_hire_price ?? null;
      let effectiveCommission = booking.commission_amount ?? null;
      let effectivePayout     = booking.partner_payout_amount ?? null;
      let effectiveFuelRefund = booking.fuel_refund ?? null;

      if (isCancelled && refundStatus === "full") {
        effectiveCarHire    = 0;
        effectiveCommission = 0;
        effectivePayout     = 0;
        effectiveFuelRefund = fuel;
      } else if (isCancelled && refundStatus === "partial") {
        effectiveFuelRefund = fuel;
      }

      return {
        id: booking.id,
        request_id: booking.request_id,
        partner_user_id: booking.partner_user_id,
        winning_bid_id: booking.winning_bid_id,
        booking_status: booking.booking_status,
        amount: booking.amount,
        currency: booking.currency ?? "EUR",
        charge_currency: booking.charge_currency ?? null,
        conversion_rate: booking.conversion_rate ?? null,
        car_hire_price: effectiveCarHire,
        fuel_price: booking.fuel_price ?? null,
        fuel_used_quarters: booking.fuel_used_quarters ?? null,
        fuel_charge: booking.fuel_charge ?? null,
        fuel_refund: effectiveFuelRefund,
        commission_rate: booking.commission_rate ?? null,
        commission_amount: effectiveCommission,
        partner_payout_amount: effectivePayout,
        cancelled_by: booking.cancelled_by || null,
        cancelled_at: booking.cancelled_at || null,
        cancellation_reason: booking.cancellation_reason || null,
        refund_status: refundStatus,
        notes: booking.notes,
        created_at: booking.created_at,
        job_number: booking.job_number ?? request?.job_number ?? null,
        driver_name: booking.driver_name || null,
        driver_phone: booking.driver_phone || null,
        driver_vehicle: booking.driver_vehicle || null,
        driver_notes: booking.driver_notes || null,
        driver_assigned_at: booking.driver_assigned_at || null,
        delivery_confirmed_at: booking.delivery_confirmed_at || null,
        collection_confirmed_at: booking.collection_confirmed_at || null,
        collection_fuel_level_driver: booking.collection_fuel_level_driver || null,
        collection_fuel_level_partner: booking.collection_fuel_level_partner || null,
        collection_fuel_level_customer: booking.collection_fuel_level_customer || null,
        collection_confirmed_by_customer: booking.collection_confirmed_by_customer ?? false,
        return_fuel_level_driver: booking.return_fuel_level_driver || null,
        return_fuel_level_partner: booking.return_fuel_level_partner || null,
        return_fuel_level_customer: booking.return_fuel_level_customer || null,
        return_confirmed_by_customer: booking.return_confirmed_by_customer ?? false,
        insurance_docs_confirmed_by_driver: booking.insurance_docs_confirmed_by_driver ?? false,
        insurance_docs_confirmed_by_customer: booking.insurance_docs_confirmed_by_customer ?? false,
        partner_company_name: partnerProfile?.company_name || null,
        partner_company_phone: partnerProfile?.phone || null,
        partner_legal_company_name: partnerProfile?.legal_company_name || null,
        partner_vat_number: partnerProfile?.vat_number || null,
        partner_company_registration_number: partnerProfile?.company_registration_number || null,
        partner_country: partnerProfile?.base_country || null,
        pickup_address: request?.pickup_address || null,
        dropoff_address: request?.dropoff_address || null,
        pickup_at: request?.pickup_at || null,
        dropoff_at: request?.dropoff_at || null,
        journey_duration_minutes: request?.journey_duration_minutes ?? null,
        passengers: request?.passengers ?? null,
        suitcases: request?.suitcases ?? null,
        hand_luggage: request?.hand_luggage ?? null,
        vehicle_category_name: request?.vehicle_category_name || null,
        customer_name: request?.customer_name || null,
        customer_email: request?.customer_email || null,
        customer_phone: request?.customer_phone || null,
        request_status: request?.status || null,
        // ── Payment / Stripe fee data ──
        stripe_fee: payment?.stripe_fee ?? null,
        stripe_fee_currency: payment?.stripe_fee_currency ?? null,
        exchange_rate: payment?.exchange_rate ?? null,
        payout_status: booking.payout_status ?? null,
        payout_hold: booking.payout_hold ?? false,
        role,
        adminMode,
      };
    });

    return NextResponse.json({ data, role, adminMode }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}