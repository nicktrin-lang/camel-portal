import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;

  const customerSupabase = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await customerSupabase.auth.getUser(accessToken);

  if (error || !data?.user) return null;
  return data.user;
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function POST(req: Request) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await safeJson(req);
    const bidId = String(body?.bid_id || "").trim();

    if (!bidId) {
      return NextResponse.json({ error: "Missing bid_id" }, { status: 400 });
    }

    const partnerDb = createServiceRoleSupabaseClient();

    const { data: bidRow, error: bidErr } = await partnerDb
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
    const bidNotes = String((bidRow as any).notes || "").trim() || null;

    const { data: requestRow, error: requestErr } = await partnerDb
      .from("customer_requests")
      .select("id, customer_user_id, status, job_number, expires_at")
      .eq("id", requestId)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json(
        { error: "Request not found for this customer" },
        { status: 404 }
      );
    }

    if (requestRow.status !== "open") {
      return NextResponse.json(
        { error: "This request is no longer open." },
        { status: 400 }
      );
    }

    if (isExpired(requestRow.expires_at)) {
      await partnerDb
        .from("customer_requests")
        .update({ status: "expired" })
        .eq("id", requestId)
        .eq("status", "open");

      await partnerDb
        .from("request_partner_matches")
        .update({ match_status: "expired" })
        .eq("request_id", requestId)
        .eq("match_status", "open");

      await partnerDb
        .from("partner_bids")
        .update({ status: "expired" })
        .eq("request_id", requestId)
        .eq("status", "submitted");

      return NextResponse.json(
        { error: "This request has expired." },
        { status: 400 }
      );
    }

    const jobNumber = (requestRow as any).job_number ?? null;

    const { error: acceptErr } = await partnerDb
      .from("partner_bids")
      .update({ status: "accepted" })
      .eq("id", bidId);

    if (acceptErr) {
      return NextResponse.json({ error: acceptErr.message }, { status: 400 });
    }

    const { error: rejectErr } = await partnerDb
      .from("partner_bids")
      .update({ status: "unsuccessful" })
      .eq("request_id", requestId)
      .neq("id", bidId);

    if (rejectErr) {
      return NextResponse.json({ error: rejectErr.message }, { status: 400 });
    }

    const { error: requestUpdateErr } = await partnerDb
      .from("customer_requests")
      .update({ status: "confirmed" })
      .eq("id", requestId);

    if (requestUpdateErr) {
      return NextResponse.json({ error: requestUpdateErr.message }, { status: 400 });
    }

    const { error: winnerMatchErr } = await partnerDb
      .from("request_partner_matches")
      .update({ match_status: "accepted" })
      .eq("request_id", requestId)
      .eq("partner_user_id", partnerUserId);

    if (winnerMatchErr) {
      return NextResponse.json({ error: winnerMatchErr.message }, { status: 400 });
    }

    const { error: loserMatchErr } = await partnerDb
      .from("request_partner_matches")
      .update({ match_status: "closed" })
      .eq("request_id", requestId)
      .neq("partner_user_id", partnerUserId);

    if (loserMatchErr) {
      return NextResponse.json({ error: loserMatchErr.message }, { status: 400 });
    }

    const { data: existingBooking, error: existingBookingErr } = await partnerDb
      .from("partner_bookings")
      .select("id")
      .eq("winning_bid_id", bidId)
      .maybeSingle();

    if (existingBookingErr) {
      return NextResponse.json({ error: existingBookingErr.message }, { status: 400 });
    }

    if (!existingBooking?.id) {
      const { error: bookingErr } = await partnerDb
  .from("partner_bookings")
  .insert({
    request_id: requestId,
    winning_bid_id: bidId,
    partner_user_id: partnerUserId,
    booking_status: "confirmed",
    amount: totalPrice,
    notes: bidNotes,
    job_number: jobNumber,
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