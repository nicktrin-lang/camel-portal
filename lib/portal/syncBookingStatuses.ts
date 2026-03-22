import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

type SyncResult = {
  ok: boolean;
  bookingId: string;
  requestId: string | null;
  bookingStatus: string | null;
  requestStatus: string | null;
};

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export async function syncBookingStatuses(bookingId: string): Promise<SyncResult> {
  const cleanBookingId = String(bookingId || "").trim();

  if (!cleanBookingId) {
    throw new Error("Missing bookingId");
  }

  const db = createServiceRoleSupabaseClient();

  const { data: booking, error: bookingErr } = await db
    .from("partner_bookings")
    .select(`
      id,
      request_id,
      booking_status,
      collection_confirmed_by_partner,
      collection_confirmed_by_customer,
      return_confirmed_by_partner,
      return_confirmed_by_customer
    `)
    .eq("id", cleanBookingId)
    .maybeSingle();

  if (bookingErr) {
    throw new Error(bookingErr.message);
  }

  if (!booking) {
    throw new Error("Booking not found");
  }

  const currentBookingStatus = normalizeStatus(booking.booking_status);
  const requestId = String(booking.request_id || "").trim() || null;

  const collectionDone =
    !!booking.collection_confirmed_by_partner &&
    !!booking.collection_confirmed_by_customer;

  const returnDone =
    !!booking.return_confirmed_by_partner &&
    !!booking.return_confirmed_by_customer;

  let nextBookingStatus = currentBookingStatus || "confirmed";
  let nextRequestStatus = currentBookingStatus || "confirmed";

  if (nextBookingStatus === "cancelled") {
    nextRequestStatus = "cancelled";
  } else if (returnDone) {
    nextBookingStatus = "completed";
    nextRequestStatus = "completed";
  } else if (normalizeStatus(nextBookingStatus) === "completed") {
    nextRequestStatus = "completed";
  } else if (normalizeStatus(nextBookingStatus) === "returned") {
    nextRequestStatus = "returned";
  } else if (collectionDone) {
    if (
      nextBookingStatus === "confirmed" ||
      nextBookingStatus === "driver_assigned" ||
      nextBookingStatus === "en_route" ||
      nextBookingStatus === "arrived"
    ) {
      nextBookingStatus = "collected";
    }
    nextRequestStatus = "in_progress";
  } else if (normalizeStatus(nextBookingStatus) === "collected") {
    nextRequestStatus = "collected";
  } else if (normalizeStatus(nextBookingStatus) === "arrived") {
    nextRequestStatus = "arrived";
  } else if (normalizeStatus(nextBookingStatus) === "en_route") {
    nextRequestStatus = "en_route";
  } else if (normalizeStatus(nextBookingStatus) === "driver_assigned") {
    nextRequestStatus = "driver_assigned";
  } else {
    nextBookingStatus = "confirmed";
    nextRequestStatus = "confirmed";
  }

  if (nextBookingStatus !== currentBookingStatus) {
    const { error: updateBookingErr } = await db
      .from("partner_bookings")
      .update({ booking_status: nextBookingStatus })
      .eq("id", cleanBookingId);

    if (updateBookingErr) {
      throw new Error(updateBookingErr.message);
    }
  }

  if (requestId) {
    const { error: updateRequestErr } = await db
      .from("customer_requests")
      .update({ status: nextRequestStatus })
      .eq("id", requestId);

    if (updateRequestErr) {
      throw new Error(updateRequestErr.message);
    }
  }

  return {
    ok: true,
    bookingId: cleanBookingId,
    requestId,
    bookingStatus: nextBookingStatus,
    requestStatus: requestId ? nextRequestStatus : null,
  };
}