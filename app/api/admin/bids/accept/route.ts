import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { calculateCommission } from "@/lib/portal/calculateCommission";

async function requireAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { ok: false as const, status: 401, email: "" };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow, error: adminErr } = await db
    .from("admin_users").select("role").eq("email", email).maybeSingle();
  if (adminErr) return { ok: false as const, status: 400, email };
  if (!adminRow) return { ok: false as const, status: 403, email };
  return { ok: true as const, status: 200, email, db };
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
        { status: gate.status }
      );
    }

    const body = await safeJson(req);
    const bidId = String(body?.bid_id || "").trim();
    if (!bidId) return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });

    const { db } = gate;

    // 1. Load bid
    const { data: bidRow, error: bidErr } = await db
      .from("partner_bids").select("*").eq("id", bidId).maybeSingle();
    if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 400 });
    if (!bidRow) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

    const requestId     = String((bidRow as any).request_id || "");
    const partnerUserId = String((bidRow as any).partner_user_id || "");
    const carHirePrice  = Number((bidRow as any).car_hire_price || 0);
    const fuelPrice     = Number((bidRow as any).fuel_price || 0);
    const totalPrice    = Number((bidRow as any).total_price || 0);
    const bidCurrency   = String((bidRow as any).currency || "EUR");
    const bidNotes      = String((bidRow as any).notes || "").trim() || null;

    // 2. Get partner's commission rate (profile override → platform default → hardcoded 20%)
    const [profileRes, platformRes] = await Promise.all([
      db.from("partner_profiles")
        .select("commission_rate")
        .eq("user_id", partnerUserId)
        .maybeSingle(),
      db.from("platform_settings")
        .select("default_commission_rate, minimum_commission_amount")
        .limit(1)
        .maybeSingle(),
    ]);

    const commissionRatePct: number =
      profileRes.data?.commission_rate ??
      platformRes.data?.default_commission_rate ??
      20;
    const minimumCommission: number =
      platformRes.data?.minimum_commission_amount ?? 10;

    // 3. Calculate commission using shared utility
    const { commissionAmount, partnerPayoutAmount, rateApplied } = calculateCommission(
      carHirePrice,
      commissionRatePct,
      minimumCommission
    );

    // 4. Accept this bid
    const { error: acceptErr } = await db
      .from("partner_bids").update({ status: "accepted" }).eq("id", bidId);
    if (acceptErr) return NextResponse.json({ error: acceptErr.message }, { status: 400 });

    // 5. Reject other bids for this request
    const { error: rejectOthersErr } = await db
      .from("partner_bids")
      .update({ status: "rejected" })
      .eq("request_id", requestId)
      .neq("id", bidId);
    if (rejectOthersErr) return NextResponse.json({ error: rejectOthersErr.message }, { status: 400 });

    // 6. Mark request as booked
    const { error: requestUpdateErr } = await db
      .from("customer_requests").update({ status: "booked" }).eq("id", requestId);
    if (requestUpdateErr) return NextResponse.json({ error: requestUpdateErr.message }, { status: 400 });

    // 7. Update match statuses
    const { error: matchWinnerErr } = await db
      .from("request_partner_matches")
      .update({ match_status: "accepted" })
      .eq("request_id", requestId)
      .eq("partner_user_id", partnerUserId);
    if (matchWinnerErr) return NextResponse.json({ error: matchWinnerErr.message }, { status: 400 });

    const { error: matchOtherErr } = await db
      .from("request_partner_matches")
      .update({ match_status: "closed" })
      .eq("request_id", requestId)
      .neq("partner_user_id", partnerUserId);
    if (matchOtherErr) return NextResponse.json({ error: matchOtherErr.message }, { status: 400 });

    // 8. Create booking — stamp all financial fields including commission
    const { data: existingBooking } = await db
      .from("partner_bookings").select("id").eq("winning_bid_id", bidId).maybeSingle();

    if (!existingBooking?.id) {
      const { error: bookingErr } = await db.from("partner_bookings").insert({
        request_id:            requestId,
        winning_bid_id:        bidId,
        partner_user_id:       partnerUserId,
        booking_status:        "active",
        amount:                totalPrice,
        currency:              bidCurrency,
        car_hire_price:        carHirePrice,
        fuel_price:            fuelPrice,
        commission_rate:       rateApplied,
        commission_amount:     commissionAmount,
        partner_payout_amount: partnerPayoutAmount,
        notes:                 bidNotes,
      });
      if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}