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
    .from("admin_users")
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

export async function GET() {
  try {
    const gate = await requireAdmin();

    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
        { status: gate.status }
      );
    }

    const { db } = gate;

    const { data: requests, error: reqErr } = await db
      .from("customer_requests")
      .select(
        "id, customer_name, customer_email, pickup_address, dropoff_address, pickup_at, passengers, suitcases, hand_luggage, vehicle_category_name, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 400 });
    }

    const { data: bids, error: bidsErr } = await db
      .from("partner_bids")
      .select("request_id, status");

    if (bidsErr) {
      return NextResponse.json({ error: bidsErr.message }, { status: 400 });
    }

    const bidCountByRequest = new Map<string, number>();
    const acceptedCountByRequest = new Map<string, number>();

    for (const bid of bids || []) {
      const requestId = String((bid as any).request_id || "");
      if (!requestId) continue;

      bidCountByRequest.set(requestId, (bidCountByRequest.get(requestId) || 0) + 1);

      if (String((bid as any).status || "") === "accepted") {
        acceptedCountByRequest.set(
          requestId,
          (acceptedCountByRequest.get(requestId) || 0) + 1
        );
      }
    }

    const rows = (requests || []).map((row: any) => ({
      ...row,
      bid_count: bidCountByRequest.get(row.id) || 0,
      has_accepted_bid: (acceptedCountByRequest.get(row.id) || 0) > 0,
    }));

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}