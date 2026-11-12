import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { generateBookingVoucherPDF } from "@/lib/portal/generateBookingVoucherPDF";

// Prepaid booking voucher (English PDF): proof for the partner's rental desk that the
// customer has paid this hire in full to Camel Global. Read-only; moves no money.

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

    let bookingQuery = db
      .from("partner_bookings")
      .select("id, request_id, partner_user_id, job_number, booking_status, currency, created_at, car_hire_price, fuel_price, payment_id")
      .eq("id", bookingId);
    if (!adminMode) bookingQuery = bookingQuery.eq("partner_user_id", user.id);

    const { data: bk, error: bkErr } = await bookingQuery.maybeSingle();
    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!bk)   return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const [{ data: cr }, { data: pmt }, { data: profile }] = await Promise.all([
      db.from("customer_requests")
        .select("customer_name, customer_phone, pickup_address, dropoff_address, pickup_at, dropoff_at, vehicle_category_name, passengers, driver_age, additional_drivers")
        .eq("id", bk.request_id).maybeSingle(),
      bk.payment_id
        ? db.from("payments").select("stripe_payment_intent_id, amount_car_hire, amount_fuel_deposit, created_at").eq("id", bk.payment_id).maybeSingle()
        : Promise.resolve({ data: null }),
      db.from("partner_profiles").select("company_name, vat_number").eq("user_id", bk.partner_user_id).maybeSingle(),
    ]);

    // A booking row only exists once the charge has succeeded (customer-repo webhook),
    // so the booking's own created_at is the fallback for the paid date.
    const currency = (bk.currency || "EUR").toUpperCase();
    const ref      = bk.job_number ?? bookingId.slice(0, 8);

    const pdfBuffer = await generateBookingVoucherPDF({
      jobNumber:         bk.job_number,
      bookingId,
      bookingStatus:     bk.booking_status || "confirmed",
      partnerCompany:    profile?.company_name ?? null,
      partnerVat:        profile?.vat_number ?? null,
      customerName:      cr?.customer_name ?? null,
      customerPhone:     cr?.customer_phone ?? null,
      pickupAddress:     cr?.pickup_address ?? null,
      dropoffAddress:    cr?.dropoff_address ?? null,
      pickupAt:          cr?.pickup_at ?? null,
      dropoffAt:         cr?.dropoff_at ?? null,
      vehicleCategory:   cr?.vehicle_category_name ?? null,
      passengers:        cr?.passengers ?? null,
      driverAge:         cr?.driver_age ?? null,
      additionalDrivers: cr?.additional_drivers ?? 0,
      currency,
      carHire:           Number(pmt?.amount_car_hire ?? bk.car_hire_price ?? 0),
      fuelDeposit:       Number(pmt?.amount_fuel_deposit ?? bk.fuel_price ?? 0),
      paidAt:            pmt?.created_at ?? bk.created_at ?? null,
      paymentReference:  pmt?.stripe_payment_intent_id ?? null,
      issuedAt:          new Date().toISOString(),
    });

    const BUCKET      = "booking-receipts";
    const storagePath = `${bk.request_id}/voucher-${ref}.pdf`;
    const { error: uploadErr } = await db.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (uploadErr) {
      console.error("voucher: upload failed", uploadErr.message);
      return NextResponse.json({ error: "Failed to store PDF" }, { status: 500 });
    }

    const { data: signed, error: signErr } = await db.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    console.error("voucher: generation failed", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
