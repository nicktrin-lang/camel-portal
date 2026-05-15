import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { generateCommissionInvoice } from "@/lib/portal/generateCommissionInvoice";

// POST — partner triggers generation of their own invoice
// Body: { period_month }  e.g. { period_month: "2026-05" }
export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const body = await req.json();
    const { period_month } = body || {};
    if (!period_month) {
      return NextResponse.json({ error: "period_month is required" }, { status: 400 });
    }

    const db = createServiceRoleSupabaseClient();

    // Check if invoice already exists for this period
    const { data: existing } = await db
      .from("commission_invoices")
      .select("id, invoice_number, storage_path")
      .eq("partner_user_id", user.id)
      .eq("period_month", period_month)
      .maybeSingle();

    if (existing) {
      // Already generated — return signed URL to existing invoice
      const { data: signedUrl } = await db.storage
        .from("commission-invoices")
        .createSignedUrl(existing.storage_path, 3600);
      return NextResponse.json({
        ok: true,
        already_exists: true,
        invoice_number: existing.invoice_number,
        download_url: signedUrl?.signedUrl || null,
      }, { status: 200 });
    }

    // Fetch completed/cancelled bookings for this period
    const [year, month] = period_month.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();

    const { data: bookings, error: bkErr } = await db
      .from("partner_bookings")
      .select("id, job_number, pickup_at, car_hire_price, commission_rate, currency, booking_status, refund_status, cancellation_reason")
      .eq("partner_user_id", user.id)
      .in("booking_status", ["completed", "cancelled"])
      .gte("created_at", from)
      .lt("created_at", to);

    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!bookings?.length) {
      return NextResponse.json({ error: "No completed bookings found for this period" }, { status: 400 });
    }

    const result = await generateCommissionInvoice(user.id, period_month, bookings);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

    // Return signed download URL
    const { data: signedUrl } = await db.storage
      .from("commission-invoices")
      .createSignedUrl(result.storage_path!, 3600);

    return NextResponse.json({
      ok: true,
      invoice_number: result.invoice_number,
      download_url: signedUrl?.signedUrl || null,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}