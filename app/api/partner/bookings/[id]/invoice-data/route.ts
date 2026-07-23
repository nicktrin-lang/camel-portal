import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { generateInvoiceDataPDF } from "@/lib/portal/generateInvoiceDataPDF";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const adminMode = isAdminRole(role);
    const db        = createServiceRoleSupabaseClient();

    // ── Fetch booking ─────────────────────────────────────────────────────────
    let bookingQuery = db
      .from("partner_bookings")
      .select(`
        id, request_id, partner_user_id, job_number,
        booking_status, currency, created_at,
        car_hire_price, fuel_price, amount,
        fuel_charge, fuel_refund,
        post_completion_refund_total
      `)
      .eq("id", bookingId);

    if (!adminMode) bookingQuery = bookingQuery.eq("partner_user_id", user.id);

    const { data: bk, error: bkErr } = await bookingQuery.maybeSingle();
    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!bk)   return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // ── PDF language ──────────────────────────────────────────────────────────
    // The Invoice Data sheet is a finance/legal document (NTUK) and, like every
    // attached PDF, stays ENGLISH regardless of the partner's communication_locale.
    // (Previously this used `communication_locale === "es" ? "es" : "en"`, the
    // forbidden es-collapse pattern — removed. No email is sent from this route.)
    const locale: "en" = "en";

    // ── Fetch request + customer billing details ───────────────────────────────
    const { data: cr } = await db
      .from("customer_requests")
      .select(`
        id, customer_name, customer_email, customer_phone,
        customer_user_id,
        pickup_address, dropoff_address, pickup_at, dropoff_at,
        journey_duration_minutes, vehicle_category_name,
        passengers, driver_age, additional_drivers, additional_driver_ages
      `)
      .eq("id", bk.request_id)
      .maybeSingle();

    let customerBillingAddress: string | null = null;
    let customerTaxId: string | null = null;

    if (cr?.customer_user_id) {
      const { data: custProfile } = await db
        .from("customer_profiles")
        .select("billing_address, tax_id")
        .eq("user_id", cr.customer_user_id)
        .maybeSingle();
      if (custProfile) {
        customerBillingAddress = custProfile.billing_address ?? null;
        customerTaxId          = custProfile.tax_id ?? null;
      }
    }

    // ── Fetch post-completion refunds ─────────────────────────────────────────
    const { data: refundRows } = await db
      .from("partner_booking_refunds")
      .select("id, amount, reason, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    const postCompletionRefunds = (refundRows ?? []).map((r: any) => ({
      id:         r.id,
      amount:     Number(r.amount),
      reason:     r.reason ?? null,
      created_at: r.created_at,
    }));

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const currency = (bk.currency || "EUR").toUpperCase();
    const ref      = bk.job_number ?? bookingId.slice(0, 8);

    const pdfBuffer = await generateInvoiceDataPDF({
      jobNumber:              bk.job_number,
      bookingId,
      bookingStatus:          bk.booking_status || "completed",
      bookingCreatedAt:       bk.created_at || null,
      customerName:           cr?.customer_name    || null,
      customerEmail:          cr?.customer_email   || null,
      customerPhone:          cr?.customer_phone   || null,
      customerBillingAddress,
      customerTaxId,
      pickupAddress:          cr?.pickup_address   || null,
      dropoffAddress:         cr?.dropoff_address  || null,
      pickupAt:               cr?.pickup_at        || null,
      dropoffAt:              cr?.dropoff_at       || null,
      durationMinutes:        cr?.journey_duration_minutes || null,
      vehicleCategory:        cr?.vehicle_category_name   || null,
      passengers:             cr?.passengers       ?? null,
      driverAge:              cr?.driver_age       ?? null,
      additionalDrivers:      cr?.additional_drivers      ?? 0,
      additionalDriverAges:   cr?.additional_driver_ages  ?? null,
      currency,
      carHire:                Number(bk.car_hire_price || 0),
      fuelDeposit:            Number(bk.fuel_price     || 0),
      fuelCharge:             Number(bk.fuel_charge    || 0),
      fuelRefund:             Number(bk.fuel_refund    || 0),
      postCompletionRefunds,
      issuedAt:               new Date().toISOString(),
      locale,
    });

    // ── Upload to storage and return signed URL ───────────────────────────────
    const BUCKET      = "booking-receipts";
    const storagePath = `${bk.request_id}/invoice-data-${ref}.pdf`;

    const { error: uploadErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("invoice-data: upload failed", uploadErr.message);
      return NextResponse.json({ error: "Failed to store PDF" }, { status: 500 });
    }

    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    console.error("invoice-data: generation failed", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
