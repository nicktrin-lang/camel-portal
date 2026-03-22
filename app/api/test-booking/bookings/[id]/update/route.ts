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

function normalizeFuel(value: string | null) {
  if (!value) return null;

  const v = value.toLowerCase();

  if (v === "empty") return "empty";
  if (v === "quarter") return "quarter";
  if (v === "half") return "half";
  if (v === "three_quarter") return "3/4";
  if (v === "full") return "full";

  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const section = String(body?.section || "");
    const confirmed = !!body?.confirmed;
    const fuel = normalizeFuel(body?.fuel_level || null);
    const notes = String(body?.notes || "").trim() || null;

    if (section !== "collection" && section !== "return") {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select("id, request_id")
      .eq("id", id)
      .maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: requestRow } = await db
      .from("customer_requests")
      .select("customer_user_id")
      .eq("id", bookingRow.request_id)
      .maybeSingle();

    if (!requestRow || requestRow.customer_user_id !== customerUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date().toISOString();

    const updatePayload: any = {};

    if (section === "collection") {
      updatePayload.collection_confirmed_by_customer = confirmed;
      updatePayload.collection_confirmed_by_customer_at = confirmed ? now : null;
      updatePayload.collection_fuel_level_customer = fuel;
      updatePayload.collection_customer_notes = notes;
    }

    if (section === "return") {
      updatePayload.return_confirmed_by_customer = confirmed;
      updatePayload.return_confirmed_by_customer_at = confirmed ? now : null;
      updatePayload.return_fuel_level_customer = fuel;
      updatePayload.return_customer_notes = notes;
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
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