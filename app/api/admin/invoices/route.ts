import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { generateCommissionInvoice } from "@/lib/portal/generateCommissionInvoice";

async function isAdmin(db: any, email: string): Promise<boolean> {
  const { data } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  return data?.role === "admin" || data?.role === "super_admin";
}

export async function GET(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const email = (userData.user.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const db = createServiceRoleSupabaseClient();
    if (!(await isAdmin(db, email))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const url   = new URL(req.url);
    const month = url.searchParams.get("month");
    const pid   = url.searchParams.get("partner_id");

    let query = db
      .from("commission_invoices")
      .select("id, invoice_number, partner_user_id, period_start, period_end, currency, subtotal, booking_count, storage_path, issued_at, emailed_at, status")
      .order("issued_at", { ascending: false });

    if (month) query = query.gte("period_start", `${month}-01`).lt("period_start", `${month}-32`);
    if (pid)   query = query.eq("partner_user_id", pid);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const partnerIds = [...new Set((data || []).map((r: any) => r.partner_user_id).filter(Boolean))];
    let nameMap = new Map<string, string>();
    if (partnerIds.length) {
      const { data: profiles } = await db.from("partner_profiles").select("user_id, company_name").in("user_id", partnerIds);
      nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.company_name]));
    }

    const invoices = await Promise.all(
      (data || []).map(async (inv: any) => {
        let download_url = null;
        if (inv.storage_path) {
          const { data: signed } = await db.storage.from("commission-invoices").createSignedUrl(inv.storage_path, 3600);
          download_url = signed?.signedUrl || null;
        }
        return {
          ...inv,
          period_month:         inv.period_start ? inv.period_start.slice(0, 7) : null,
          total_commission:     inv.subtotal,
          generated_at:         inv.issued_at,
          partner_company_name: nameMap.get(inv.partner_user_id) || null,
          download_url,
        };
      })
    );

    return NextResponse.json({ data: invoices }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData } = await authed.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const email = (userData.user.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const db = createServiceRoleSupabaseClient();
    if (!(await isAdmin(db, email))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json();
    const { partner_id, period_month } = body || {};
    if (!partner_id || !period_month) {
      return NextResponse.json({ error: "partner_id and period_month are required" }, { status: 400 });
    }

    const [year, month] = period_month.split("-").map(Number);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();

    const { data: bookings, error: bkErr } = await db
      .from("partner_bookings")
      .select("id, job_number, created_at, car_hire_price, commission_rate, commission_amount, currency, booking_status, refund_status, cancellation_reason")
      .eq("partner_user_id", partner_id)
      .in("booking_status", ["completed", "cancelled"])
      .gte("created_at", from)
      .lt("created_at", to);

    if (bkErr) return NextResponse.json({ error: bkErr.message }, { status: 400 });
    if (!bookings?.length) {
      return NextResponse.json({ error: "No completed bookings found for this partner and period" }, { status: 400 });
    }

    const result = await generateCommissionInvoice(partner_id, period_month, bookings);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({ ...result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}