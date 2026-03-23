import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { sendCustomerBookingCompletedEmail } from "@/lib/email";

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

function sameFuel(a: unknown, b: unknown) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function isLocked(opts: {
  partnerConfirmed?: boolean | null;
  customerConfirmed?: boolean | null;
  partnerFuel?: string | null;
  customerFuel?: string | null;
}) {
  return (
    !!opts.partnerConfirmed &&
    !!opts.customerConfirmed &&
    sameFuel(opts.partnerFuel, opts.customerFuel)
  );
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
      .select(`
        id,
        request_id,
        booking_status,
        job_number,

        collection_confirmed_by_partner,
        collection_confirmed_by_partner_at,
        collection_fuel_level_partner,
        collection_partner_notes,

        return_confirmed_by_partner,
        return_confirmed_by_partner_at,
        return_fuel_level_partner,
        return_partner_notes,

        collection_confirmed_by_customer,
        collection_confirmed_by_customer_at,
        collection_fuel_level_customer,
        collection_customer_notes,

        return_confirmed_by_customer,
        return_confirmed_by_customer_at,
        return_fuel_level_customer,
        return_customer_notes
      `)
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
      .select("customer_user_id, customer_email")
      .eq("id", bookingRow.request_id)
      .maybeSingle();

    if (!requestRow || requestRow.customer_user_id !== customerUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const collectionAlreadyLocked = isLocked({
      partnerConfirmed: bookingRow.collection_confirmed_by_partner,
      customerConfirmed: bookingRow.collection_confirmed_by_customer,
      partnerFuel: bookingRow.collection_fuel_level_partner,
      customerFuel: bookingRow.collection_fuel_level_customer,
    });

    const returnAlreadyLocked = isLocked({
      partnerConfirmed: bookingRow.return_confirmed_by_partner,
      customerConfirmed: bookingRow.return_confirmed_by_customer,
      partnerFuel: bookingRow.return_fuel_level_partner,
      customerFuel: bookingRow.return_fuel_level_customer,
    });

    if (section === "collection" && collectionAlreadyLocked) {
      return NextResponse.json(
        { error: "Collection is locked because both sides already agreed." },
        { status: 400 }
      );
    }

    if (section === "return" && returnAlreadyLocked) {
      return NextResponse.json(
        { error: "Return is locked because both sides already agreed." },
        { status: 400 }
      );
    }

    if (section === "collection" && !!bookingRow.collection_confirmed_by_partner) {
      if (!confirmed) {
        return NextResponse.json(
          {
            error:
              "Partner has already confirmed collection. You must also confirm collection with the same fuel level.",
          },
          { status: 400 }
        );
      }

      if (!sameFuel(fuel, bookingRow.collection_fuel_level_partner)) {
        return NextResponse.json(
          {
            error: `Collection fuel mismatch. Partner saved "${String(
              bookingRow.collection_fuel_level_partner || "—"
            )}". Save the same value to lock collection.`,
          },
          { status: 400 }
        );
      }
    }

    if (section === "return" && !!bookingRow.return_confirmed_by_partner) {
      if (!confirmed) {
        return NextResponse.json(
          {
            error:
              "Partner has already confirmed return. You must also confirm return with the same fuel level.",
          },
          { status: 400 }
        );
      }

      if (!sameFuel(fuel, bookingRow.return_fuel_level_partner)) {
        return NextResponse.json(
          {
            error: `Return fuel mismatch. Partner saved "${String(
              bookingRow.return_fuel_level_partner || "—"
            )}". Save the same value to lock return.`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {};

    if (section === "collection") {
      updatePayload.collection_confirmed_by_customer = confirmed;
      updatePayload.collection_confirmed_by_customer_at = confirmed
        ? bookingRow.collection_confirmed_by_customer_at || now
        : null;
      updatePayload.collection_fuel_level_customer = fuel;
      updatePayload.collection_customer_notes = notes;
    }

    if (section === "return") {
      updatePayload.return_confirmed_by_customer = confirmed;
      updatePayload.return_confirmed_by_customer_at = confirmed
        ? bookingRow.return_confirmed_by_customer_at || now
        : null;
      updatePayload.return_fuel_level_customer = fuel;
      updatePayload.return_customer_notes = notes;
    }

    const nextCollectionLocked =
      section === "collection"
        ? isLocked({
            partnerConfirmed: bookingRow.collection_confirmed_by_partner,
            customerConfirmed: confirmed,
            partnerFuel: bookingRow.collection_fuel_level_partner,
            customerFuel: fuel,
          })
        : isLocked({
            partnerConfirmed: bookingRow.collection_confirmed_by_partner,
            customerConfirmed: bookingRow.collection_confirmed_by_customer,
            partnerFuel: bookingRow.collection_fuel_level_partner,
            customerFuel: bookingRow.collection_fuel_level_customer,
          });

    const nextReturnLocked =
      section === "return"
        ? isLocked({
            partnerConfirmed: bookingRow.return_confirmed_by_partner,
            customerConfirmed: confirmed,
            partnerFuel: bookingRow.return_fuel_level_partner,
            customerFuel: fuel,
          })
        : isLocked({
            partnerConfirmed: bookingRow.return_confirmed_by_partner,
            customerConfirmed: bookingRow.return_confirmed_by_customer,
            partnerFuel: bookingRow.return_fuel_level_partner,
            customerFuel: bookingRow.return_fuel_level_customer,
          });

    const wasCompleted = String(bookingRow.booking_status || "") === "completed";

    if (nextCollectionLocked && nextReturnLocked) {
      updatePayload.booking_status = "completed";
    } else if (nextCollectionLocked) {
      updatePayload.booking_status = "collected";
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    const becameCompleted =
      !wasCompleted && updatePayload.booking_status === "completed";

    if (becameCompleted && requestRow.customer_email) {
      try {
        await sendCustomerBookingCompletedEmail(
          requestRow.customer_email,
          bookingRow.job_number
        );
      } catch (e) {
        console.error("Failed to send booking completed email:", e);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        collection_locked: nextCollectionLocked,
        return_locked: nextReturnLocked,
        booking_status: updatePayload.booking_status || bookingRow.booking_status,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}