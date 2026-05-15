import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { invoiceGenerator } from "@/lib/portal/invoiceGenerator";

async function isAdmin(db: any, userId: string): Promise<boolean> {
  const { data } = await db.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin" || data?.role === "super_admin";
}

// GET — list all invoices (admin), with optional ?partner_id= and ?month= filters
export async function GET(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    if (!(await isAdmin(db, userData.user.id))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const url    = new URL(req.url);
    const month  = url.searchParams.get("month");
    const pid    = url.searchParams.get("partner_id");

    let query = db
      .from("commission_invoices")
      .select("id, invoice_number, partner_user_id, period_month, currency, total_commission, booking_count, storage_path, generated_at, emailed_at")
      .order("generated_at", { ascending: false });

    if (month) query = query.eq("period_month", month);
    if (pid)   query = query.eq("partner_user_id", pid);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Attach partner names + signed URLs
    const partnerIds = [...new Set((data || []).map((r: any) => r.partner_user_id))];
    let nameMap = new Map<string, string>();
    if (partnerIds.length) {
      const { data: profiles } = await db
        .from("partner_profiles")
        .select("user_id, company_name")
        .in("user_id", partnerIds);
      nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.company_name]));
    }

    const invoices = await Promise.all(
      (data || []).map(async (inv: any) => {
        const { data: signedUrl } = await db.storage
          .from("commission-invoices")
          .createSignedUrl(inv.storage_path, 3600);
        return {
          ...inv,
          partner_company_name: nameMap.get(inv.partner_user_id) || null,
          download_url: signedUrl?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ data: invoices }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST — on-demand invoice generation (admin)
// Body: { partner_id, period_month }  e.g. { partner_id: "uuid", period_month: "2026-05" }
export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    if (!(await isAdmin(db, userData.user.id))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, period_month } = body || {};
    if (!partner_id || !period_month) {
      return NextResponse.json({ error: "partner_id and period_month are required" }, { status: 400 });
    }

    // Fetch completed bookings for this partner in this period
    const [year, month] = period_month.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();

    const { data: bookings, error: bkErr } = await db
      .from("partner_bookings")
      .select("id, job_number, pickup_at, car_hire_price, commission_rate, currency, booking_status, refund_status, cancellation_reason")
      .eq("partner_user_id", partner_id)
      .in("booking_status", ["completed", "cancelled"])
      .gte("created_at", from)
      .lt("created_at", to);

    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!bookings?.length) {
      return NextResponse.json({ error: "No completed bookings found for this partner and period" }, { status: 400 });
    }

    const result = await invoiceGenerator(partner_id, period_month, bookings);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({ ...result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}