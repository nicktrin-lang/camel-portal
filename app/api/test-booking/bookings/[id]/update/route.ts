import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";

const ALLOWED_FUEL_LEVELS = [
  "full",
  "3/4",
  "half",
  "quarter",
  "empty",
  "three_quarter",
] as const;

type FuelLevel = (typeof ALLOWED_FUEL_LEVELS)[number];

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

function normalizeFuelLevel(value: unknown): FuelLevel | null {
  const clean = String(value || "").trim().toLowerCase();

  if (
    clean === "full" ||
    clean === "3/4" ||
    clean === "half" ||
    clean === "quarter" ||
    clean === "empty" ||
    clean === "three_quarter"
  ) {
    return clean as FuelLevel;
  }

  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);

    const section = String(body?.section || "").trim().toLowerCase();

    if (section !== "collection" && section !== "return") {
      return NextResponse.json(
        { error: "Section must be collection or return" },
        { status: 400 }
      );
    }

    const confirmed = !!body?.confirmed;
    const fuelLevel = normalizeFuelLevel(body?.fuel_level);
    const notes = String(body?.notes || "").trim() || null;

    const db = createServiceRoleSupabaseClient();

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select(`
        id,
        request_id,
        customer_requests!inner (
          id,
          customer_user_id
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const ownerId = String(
      (bookingRow as any)?.customer_requests?.customer_user_id || ""
    ).trim();

    if (!ownerId || ownerId !== customerUser.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    const updatePayload =
      section === "collection"
        ? {
            collection_confirmed_by_customer: confirmed,
            collection_confirmed_by_customer_at: confirmed ? nowIso : null,
            collection_fuel_level_customer: fuelLevel,
            collection_customer_notes: notes,
          }
        : {
            return_confirmed_by_customer: confirmed,
            return_confirmed_by_customer_at: confirmed ? nowIso : null,
            return_fuel_level_customer: fuelLevel,
            return_customer_notes: notes,
          };

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    const sync = await syncBookingStatuses(id);

    return NextResponse.json({ ok: true, sync }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}