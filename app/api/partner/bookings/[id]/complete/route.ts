import { NextRequest, NextResponse } from "next/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { isAdminRole } from "@/lib/portal/roles";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { completeBooking } from "@/lib/portal/completeBooking";

/**
 * POST /api/partner/bookings/[id]/complete
 * Manual trigger — issues fuel refund and marks payout_status = ready.
 * The same logic runs automatically via the update route when status → completed.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
    }

    // Auth — partner can only trigger for their own bookings, admin can do any
    const { user, role, error: authError } = await getPortalUserRole();
    if (!user) {
      return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });
    }

    const isAdmin = isAdminRole(role);
    if (!isAdmin) {
      // Verify booking belongs to this partner
      const db = createServiceRoleSupabaseClient();
      const { data: booking } = await db
        .from("partner_bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("partner_user_id", user.id)
        .maybeSingle();

      if (!booking) {
        return NextResponse.json({ error: "Booking not found or not yours" }, { status: 404 });
      }
    }

    const result = await completeBooking(bookingId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Complete route error:", e?.message);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}