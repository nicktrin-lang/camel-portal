import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

const ALLOWED_BOOKING_STATUSES = [
  "confirmed", "driver_assigned", "en_route", "arrived",
  "collected", "returned", "completed", "cancelled",
] as const;

const ALLOWED_FUEL_LEVELS = ["full", "3/4", "half", "quarter", "empty"] as const;

type AllowedBookingStatus = (typeof ALLOWED_BOOKING_STATUSES)[number];
type AllowedFuelLevel = (typeof ALLOWED_FUEL_LEVELS)[number];

function normalizeBookingStatus(value: unknown): AllowedBookingStatus {
  const clean = String(value || "").trim();
  if (
    clean === "driver_assigned" || clean === "en_route" || clean === "arrived" ||
    clean === "collected" || clean === "returned" || clean === "completed" || clean === "cancelled"
  ) return clean;
  return "confirmed";
}

function normalizeFuelLevel(value: unknown): AllowedFuelLevel | null {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "full" || clean === "3/4" || clean === "half" || clean === "quarter" || clean === "empty") {
    return clean as AllowedFuelLevel;
  }
  return null;
}

function normalizeFuel(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s === "empty") return "empty";
  if (s === "quarter") return "quarter";
  if (s === "half") return "half";
  if (s === "three_quarter" || s === "3/4") return "3/4";
  if (s === "full") return "full";
  return null;
}

function sameFuel(a: unknown, b: unknown) {
  return normalizeFuel(a) === normalizeFuel(b) && normalizeFuel(a) !== null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, role, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });
    }

    const userId = user.id;
    const adminMode = isAdminRole(role);
    const body = await req.json().catch(() => null);

    let booking_status = normalizeBookingStatus(body?.booking_status);
    const assigned_driver_id = String(body?.assigned_driver_id || "").trim() || null;
    const driver_name = String(body?.driver_name || "").trim() || null;
    const driver_phone = String(body?.driver_phone || "").trim() || null;
    const driver_vehicle = String(body?.driver_vehicle || "").trim() || null;
    const driver_notes = String(body?.driver_notes || "").trim() || null;

    const collection_fuel_level_partner = normalizeFuelLevel(body?.collection_fuel_level_partner);
    const return_fuel_level_partner = normalizeFuelLevel(body?.return_fuel_level_partner);
    const collection_partner_notes = String(body?.collection_partner_notes || "").trim() || null;
    const return_partner_notes = String(body?.return_partner_notes || "").trim() || null;
    const collection_confirmed_by_partner = !!body?.collection_confirmed_by_partner;
    const return_confirmed_by_partner = !!body?.return_confirmed_by_partner;

    const db = createServiceRoleSupabaseClient();

    let bookingQuery = db
      .from("partner_bookings")
      .select(`
        id, partner_user_id, assigned_driver_id,
        driver_name, driver_phone, driver_vehicle, driver_notes, driver_assigned_at,
        collection_confirmed_by_partner, collection_confirmed_by_partner_at,
        collection_fuel_level_partner, collection_partner_notes,
        return_confirmed_by_partner, return_confirmed_by_partner_at,
        return_fuel_level_partner, return_partner_notes,
        collection_confirmed_by_customer, collection_confirmed_by_customer_at,
        collection_fuel_level_customer,
        return_confirmed_by_customer, return_confirmed_by_customer_at,
        return_fuel_level_customer,
        collection_confirmed_by_driver, collection_confirmed_by_driver_at,
        return_confirmed_by_driver, return_confirmed_by_driver_at
      `)
      .eq("id", id);

    if (!adminMode) bookingQuery = bookingQuery.eq("partner_user_id", userId);

    const { data: bookingRow, error: bookingErr } = await bookingQuery.maybeSingle();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    if (!bookingRow) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // ── GUARD: prevent marking complete until driver has confirmed both stages ──
    if (booking_status === "completed") {
      const driverConfirmedCollection = !!bookingRow.collection_confirmed_by_driver;
      const driverConfirmedReturn = !!bookingRow.return_confirmed_by_driver;

      if (!driverConfirmedCollection) {
        return NextResponse.json(
          { error: "Cannot mark as completed — driver has not yet confirmed collection." },
          { status: 400 }
        );
      }

      if (!driverConfirmedReturn) {
        return NextResponse.json(
          { error: "Cannot mark as completed — driver has not yet confirmed return." },
          { status: 400 }
        );
      }
    }

    if (assigned_driver_id) {
      let driverQuery = db
        .from("partner_drivers")
        .select("id, partner_user_id, full_name, phone, is_active")
        .eq("id", assigned_driver_id)
        .eq("is_active", true);

      if (!adminMode) driverQuery = driverQuery.eq("partner_user_id", userId);

      const { data: driverRow, error: driverErr } = await driverQuery.maybeSingle();

      if (driverErr) return NextResponse.json({ error: driverErr.message }, { status: 400 });
      if (!driverRow) return NextResponse.json(
        { error: "Selected saved driver is invalid or inactive." },
        { status: 400 }
      );
    }

    const driverAssigned =
      !!assigned_driver_id || !!driver_name || !!driver_phone ||
      !!driver_vehicle || booking_status === "driver_assigned";

    if (driverAssigned && booking_status === "confirmed") {
      booking_status = "driver_assigned";
    }

    // Effective fuel = partner override if set, else driver reading
    const effectiveCollectionFuel = collection_fuel_level_partner ||
      normalizeFuel(bookingRow.collection_fuel_level_driver);
    const effectiveReturnFuel = return_fuel_level_partner ||
      normalizeFuel(bookingRow.return_fuel_level_driver);

    const collectionMatched =
      !!effectiveCollectionFuel &&
      !!bookingRow.collection_confirmed_by_customer &&
      sameFuel(effectiveCollectionFuel, bookingRow.collection_fuel_level_customer);

    const returnMatched =
      !!effectiveReturnFuel &&
      !!bookingRow.return_confirmed_by_customer &&
      sameFuel(effectiveReturnFuel, bookingRow.return_fuel_level_customer);

    const updatePayload: Record<string, any> = {
      booking_status,
      assigned_driver_id,
      driver_name, driver_phone, driver_vehicle, driver_notes,
      driver_assigned_at: driverAssigned
        ? bookingRow.driver_assigned_at || new Date().toISOString()
        : null,

      collection_fuel_level_partner,
      collection_partner_notes,
      collection_confirmed_by_partner,
      collection_confirmed_by_partner_at: collection_confirmed_by_partner
        ? bookingRow.collection_confirmed_by_partner_at || new Date().toISOString()
        : null,

      return_fuel_level_partner,
      return_partner_notes,
      return_confirmed_by_partner,
      return_confirmed_by_partner_at: return_confirmed_by_partner
        ? bookingRow.return_confirmed_by_partner_at || new Date().toISOString()
        : null,
    };

    // Auto-advance status based on fuel matching
    if (collectionMatched && returnMatched) {
      // Only auto-complete if driver has confirmed both stages
      if (bookingRow.collection_confirmed_by_driver && bookingRow.return_confirmed_by_driver) {
        updatePayload.booking_status = "completed";
      } else {
        updatePayload.booking_status = "returned";
      }
    } else if (collectionMatched) {
      updatePayload.booking_status = "collected";
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    return NextResponse.json(
      { ok: true, collection_locked: collectionMatched, return_locked: returnMatched },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}