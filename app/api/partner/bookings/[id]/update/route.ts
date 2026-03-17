import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";

const ALLOWED_BOOKING_STATUSES = [
  "confirmed",
  "driver_assigned",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
] as const;

type AllowedBookingStatus = (typeof ALLOWED_BOOKING_STATUSES)[number];

function normalizeBookingStatus(value: unknown): AllowedBookingStatus {
  const clean = String(value || "").trim();
  if (
    clean === "driver_assigned" ||
    clean === "en_route" ||
    clean === "arrived" ||
    clean === "completed" ||
    clean === "cancelled"
  ) {
    return clean;
  }
  return "confirmed";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user, role, error: authError } = await getPortalUserRole();

    if (!user) {
      return NextResponse.json(
        { error: authError || "Not signed in" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const adminMode = isAdminRole(role);

    const body = await req.json().catch(() => null);

    const booking_status = normalizeBookingStatus(body?.booking_status);
    const driver_name = String(body?.driver_name || "").trim() || null;
    const driver_phone = String(body?.driver_phone || "").trim() || null;
    const driver_vehicle = String(body?.driver_vehicle || "").trim() || null;
    const driver_notes = String(body?.driver_notes || "").trim() || null;

    const db = createServiceRoleSupabaseClient();

    let bookingQuery = db
      .from("partner_bookings")
      .select("id, partner_user_id")
      .eq("id", id);

    if (!adminMode) {
      bookingQuery = bookingQuery.eq("partner_user_id", userId);
    }

    const { data: bookingRow, error: bookingErr } = await bookingQuery.maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const driverAssigned =
      !!driver_name || !!driver_phone || !!driver_vehicle || booking_status === "driver_assigned";

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update({
        booking_status,
        driver_name,
        driver_phone,
        driver_vehicle,
        driver_notes,
        driver_assigned_at: driverAssigned ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}