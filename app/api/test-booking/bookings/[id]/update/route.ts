import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";
import { sendCustomerBookingCompletedEmail } from "@/lib/email";
import { calculateFuelCharge } from "@/lib/portal/calculateFuelCharge";

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

function normalizeFuel(value: unknown): string | null {
  if (!value) return null;
  const v = String(value).toLowerCase().trim();
  if (v === "empty") return "empty";
  if (v === "quarter") return "quarter";
  if (v === "half") return "half";
  if (v === "three_quarter" || v === "3/4") return "3/4";
  if (v === "full") return "full";
  return null;
}

function sameFuel(a: unknown, b: unknown) {
  return normalizeFuel(a) === normalizeFuel(b) && normalizeFuel(a) !== null;
}

function isFuelLocked(opts: {
  driverConfirmed?: boolean | null;
  customerConfirmed?: boolean | null;
  driverFuel?: string | null;
  customerFuel?: string | null;
}) {
  return (
    !!opts.driverConfirmed &&
    !!opts.customerConfirmed &&
    sameFuel(opts.driverFuel, opts.customerFuel)
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
    const notes = String(body?.notes || "").trim() || null;
    // Insurance confirmation — only valid on collection section
    const insuranceConfirmed = section === "collection" ? !!body?.insurance_confirmed : undefined;

    if (section !== "collection" && section !== "return") {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select(`
        id, request_id, booking_status, job_number,
        fuel_price, car_hire_price,
        collection_confirmed_by_driver, collection_fuel_level_driver, collection_confirmed_by_driver_at,
        return_confirmed_by_driver, return_fuel_level_driver, return_confirmed_by_driver_at,
        collection_confirmed_by_customer, collection_confirmed_by_customer_at,
        collection_fuel_level_customer, collection_customer_notes,
        return_confirmed_by_customer, return_confirmed_by_customer_at,
        return_fuel_level_customer, return_customer_notes,
        collection_confirmed_by_partner, collection_fuel_level_partner,
        return_confirmed_by_partner, return_fuel_level_partner,
        insurance_docs_confirmed_by_driver, insurance_docs_confirmed_by_driver_at,
        insurance_docs_confirmed_by_customer, insurance_docs_confirmed_by_customer_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    if (!bookingRow) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Verify this customer owns this booking
    const { data: requestRow } = await db
      .from("customer_requests")
      .select("customer_user_id, customer_email")
      .eq("id", bookingRow.request_id)
      .maybeSingle();

    if (!requestRow || requestRow.customer_user_id !== customerUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const collectionAlreadyLocked = isFuelLocked({
      driverConfirmed: bookingRow.collection_confirmed_by_driver,
      customerConfirmed: bookingRow.collection_confirmed_by_customer,
      driverFuel: bookingRow.collection_fuel_level_driver,
      customerFuel: bookingRow.collection_fuel_level_customer,
    });

    const returnAlreadyLocked = isFuelLocked({
      driverConfirmed: bookingRow.return_confirmed_by_driver,
      customerConfirmed: bookingRow.return_confirmed_by_customer,
      driverFuel: bookingRow.return_fuel_level_driver,
      customerFuel: bookingRow.return_fuel_level_customer,
    });

    if (section === "collection" && collectionAlreadyLocked) {
      return NextResponse.json({ error: "Collection is already locked — both driver and customer agreed." }, { status: 400 });
    }
    if (section === "return" && returnAlreadyLocked) {
      return NextResponse.json({ error: "Return is already locked — both driver and customer agreed." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {};

    if (section === "collection") {
      const driverFuel = normalizeFuel(bookingRow.collection_fuel_level_driver);

      if (confirmed && !bookingRow.collection_confirmed_by_driver) {
        return NextResponse.json(
          { error: "Driver has not yet confirmed delivery. Please wait for the driver to record the fuel level." },
          { status: 400 }
        );
      }

      updatePayload.collection_confirmed_by_customer = confirmed;
      updatePayload.collection_confirmed_by_customer_at = confirmed
        ? bookingRow.collection_confirmed_by_customer_at || now
        : null;
      updatePayload.collection_fuel_level_customer = confirmed ? driverFuel : null;
      updatePayload.collection_customer_notes = notes;

      // Insurance confirmation — customer confirms they received the docs
      if (insuranceConfirmed !== undefined) {
        updatePayload.insurance_docs_confirmed_by_customer = insuranceConfirmed;
        updatePayload.insurance_docs_confirmed_by_customer_at = insuranceConfirmed
          ? bookingRow.insurance_docs_confirmed_by_customer_at || now
          : null;
      }
    }

    if (section === "return") {
      const driverFuel = normalizeFuel(bookingRow.return_fuel_level_driver);

      if (confirmed && !bookingRow.return_confirmed_by_driver) {
        return NextResponse.json(
          { error: "Driver has not yet confirmed collection. Please wait for the driver to record the fuel level." },
          { status: 400 }
        );
      }

      updatePayload.return_confirmed_by_customer = confirmed;
      updatePayload.return_confirmed_by_customer_at = confirmed
        ? bookingRow.return_confirmed_by_customer_at || now
        : null;
      updatePayload.return_fuel_level_customer = confirmed ? driverFuel : null;
      updatePayload.return_customer_notes = notes;
    }

    // Recalculate lock state after this update
    const nextCollectionLocked = section === "collection"
      ? isFuelLocked({
          driverConfirmed: bookingRow.collection_confirmed_by_driver,
          customerConfirmed: confirmed,
          driverFuel: bookingRow.collection_fuel_level_driver,
          customerFuel: updatePayload.collection_fuel_level_customer,
        })
      : collectionAlreadyLocked;

    const nextReturnLocked = section === "return"
      ? isFuelLocked({
          driverConfirmed: bookingRow.return_confirmed_by_driver,
          customerConfirmed: confirmed,
          driverFuel: bookingRow.return_fuel_level_driver,
          customerFuel: updatePayload.return_fuel_level_customer,
        })
      : returnAlreadyLocked;

    const wasCompleted = bookingRow.booking_status === "completed";

    if (nextCollectionLocked && nextReturnLocked) {
      updatePayload.booking_status = "completed";

      const collFuel = normalizeFuel(bookingRow.collection_fuel_level_partner) ||
        normalizeFuel(bookingRow.collection_fuel_level_driver);
      const retFuel = normalizeFuel(section === "return"
        ? updatePayload.return_fuel_level_customer
        : bookingRow.return_fuel_level_customer);

      const calc = calculateFuelCharge({
        collectionFuel: collFuel,
        returnFuel: retFuel,
        fullTankPrice: Number(bookingRow.fuel_price || 0),
      });

      if (calc) {
        updatePayload.fuel_used_quarters = calc.used_quarters;
        updatePayload.fuel_charge = calc.fuel_charge;
        updatePayload.fuel_refund = calc.fuel_refund;
      }
    } else if (nextCollectionLocked) {
      updatePayload.booking_status = "collected";
    }

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

    const becameCompleted = !wasCompleted && updatePayload.booking_status === "completed";
    if (becameCompleted && requestRow.customer_email) {
      try {
        await sendCustomerBookingCompletedEmail(requestRow.customer_email, bookingRow.job_number);
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
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}