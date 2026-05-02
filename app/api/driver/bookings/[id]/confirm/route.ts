import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

const ALLOWED_FUEL_LEVELS = ["full", "3/4", "half", "quarter", "empty"] as const;
type AllowedFuelLevel = (typeof ALLOWED_FUEL_LEVELS)[number];

function normalizeFuel(value: unknown): AllowedFuelLevel | null {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "full" || clean === "3/4" || clean === "half" || clean === "quarter" || clean === "empty") {
    return clean as AllowedFuelLevel;
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    // Accept either "action" (new page) or "stage" (legacy) so both work
    const action = String(body?.action || body?.stage || "").trim().toLowerCase();
    const fuelLevel = normalizeFuel(body?.fuel_level);

    if (!["collection", "return", "insurance"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // Fuel is required for collection and return, not for insurance-only
    if (action !== "insurance" && !fuelLevel) {
      return NextResponse.json({ error: "Valid fuel level is required." }, { status: 400 });
    }

    const { user, error: authError } = await getPortalUserRole();
    if (!user) {
      return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();
    const signedInEmail = String(user.email || "").trim().toLowerCase();

    let driverRow: any = null;

    const { data: byAuthUser, error: byAuthErr } = await db
      .from("partner_drivers")
      .select("id, partner_user_id, auth_user_id, full_name, email, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (byAuthErr) return NextResponse.json({ error: byAuthErr.message }, { status: 400 });
    driverRow = byAuthUser || null;

    if (!driverRow && signedInEmail) {
      const { data: byEmail, error: byEmailErr } = await db
        .from("partner_drivers")
        .select("id, partner_user_id, auth_user_id, full_name, email, is_active")
        .ilike("email", signedInEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (byEmailErr) return NextResponse.json({ error: byEmailErr.message }, { status: 400 });
      driverRow = byEmail || null;
    }

    if (!driverRow) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select("id, assigned_driver_id, booking_status, collection_confirmed_by_driver, return_confirmed_by_driver, delivery_driver_id, collection_driver_id")
      .eq("id", id)
      .eq("assigned_driver_id", driverRow.id)
      .maybeSingle();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    if (!bookingRow) return NextResponse.json({ error: "Booking not found for this driver." }, { status: 404 });

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {};

    if (action === "insurance") {
      // Standalone insurance confirmation — no fuel required
      updatePayload.insurance_docs_confirmed_by_driver = true;
      updatePayload.insurance_docs_confirmed_by_driver_at = now;
    }

    if (action === "collection") {
      updatePayload.collection_confirmed_by_driver = true;
      updatePayload.collection_confirmed_by_driver_at = now;
      updatePayload.collection_fuel_level_driver = fuelLevel;

      // Also stamp insurance if not already confirmed separately
      if (!bookingRow.collection_confirmed_by_driver) {
        updatePayload.insurance_docs_confirmed_by_driver = true;
        updatePayload.insurance_docs_confirmed_by_driver_at = now;
      }

      if (!bookingRow.delivery_driver_id) {
        updatePayload.delivery_driver_id = driverRow.id;
        updatePayload.delivery_driver_name = driverRow.full_name || null;
        updatePayload.delivery_confirmed_at = now;
      }

      if (["confirmed", "driver_assigned", "en_route", "arrived"].includes(bookingRow.booking_status)) {
        updatePayload.booking_status = "collected";
      }
    }

    if (action === "return") {
      updatePayload.return_confirmed_by_driver = true;
      updatePayload.return_confirmed_by_driver_at = now;
      updatePayload.return_fuel_level_driver = fuelLevel;

      if (!bookingRow.collection_driver_id) {
        updatePayload.collection_driver_id = driverRow.id;
        updatePayload.collection_driver_name = driverRow.full_name || null;
        updatePayload.collection_confirmed_at = now;
      }

      if (["collected", "returned"].includes(bookingRow.booking_status)) {
        updatePayload.booking_status = "returned";
      }
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id)
      .eq("assigned_driver_id", driverRow.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, action, fuel_level: fuelLevel }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}