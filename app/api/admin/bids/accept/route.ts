import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

async function requireAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();

  const email = (userData?.user?.email || "").toLowerCase().trim();

  if (userErr || !email) {
    return { ok: false as const, status: 401, email: "" };
  }

  const db = createServiceRoleSupabaseClient();

  const { data: adminRow, error: adminErr } = await db
    .from("admins")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (adminErr) {
    return { ok: false as const, status: 400, email };
  }

  if (!adminRow) {
    return { ok: false as const, status: 403, email };
  }

  return { ok: true as const, status: 200, email, db };
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
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

    if (!bidId) {
      return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });
    }

    const { db } = gate;

    const { data: bidRow, error: bidErr } = await db
      .from("partner_bids")
      .select("*")
      .eq("id", bidId)
      .maybeSingle();

    if (bidErr) {
      return NextResponse.json({ error: bidErr.message }, { status: 400 });
    }

    if (!bidRow) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const requestId = String((bidRow as any).request_id || "");
    const partnerUserId = String((bidRow as any).partner_user_id || "");
    const totalPrice = Number((bidRow as any).total_price || 0);

    const { error: acceptErr } = await db
      .from("partner_bids")
      .update({ status: "accepted" })
      .eq("id", bidId);

    if (acceptErr) {
      return NextResponse.json({ error: acceptErr.message }, { status: 400 });
    }

    const { error: rejectOthersErr } = await db
      .from("partner_bids")
      .update({ status: "rejected" })
      .eq("request_id", requestId)
      .neq("id", bidId);

    if (rejectOthersErr) {
      return NextResponse.json({ error: rejectOthersErr.message }, { status: 400 });
    }

    const { error: requestUpdateErr } = await db
      .from("customer_requests")
      .update({ status: "booked" })
      .eq("id", requestId);

    if (requestUpdateErr) {
      return NextResponse.json({ error: requestUpdateErr.message }, { status: 400 });
    }

    const { error: matchWinnerErr } = await db
      .from("request_partner_matches")
      .update({ match_status: "accepted" })
      .eq("request_id", requestId)
      .eq("partner_user_id", partnerUserId);

    if (matchWinnerErr) {
      return NextResponse.json({ error: matchWinnerErr.message }, { status: 400 });
    }

    const { error: matchOtherErr } = await db
      .from("request_partner_matches")
      .update({ match_status: "closed" })
      .eq("request_id", requestId)
      .neq("partner_user_id", partnerUserId);

    if (matchOtherErr) {
      return NextResponse.json({ error: matchOtherErr.message }, { status: 400 });
    }

    const { data: existingBooking } = await db
      .from("partner_bookings")
      .select("id")
      .eq("winning_bid_id", bidId)
      .maybeSingle();

    if (!existingBooking?.id) {
      const { error: bookingErr } = await db.from("partner_bookings").insert({
        request_id: requestId,
        winning_bid_id: bidId,
        partner_user_id: partnerUserId,
        booking_status: "active",
        amount: totalPrice,
      });

      if (bookingErr) {
        return NextResponse.json({ error: bookingErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}