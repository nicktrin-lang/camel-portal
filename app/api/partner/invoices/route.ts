import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";

export async function GET() {
  try {
    const { user, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();

    const { data, error } = await db
      .from("commission_invoices")
      .select("id, invoice_number, partner_user_id, period_start, period_end, currency, subtotal, booking_count, storage_path, issued_at, emailed_at, status")
      .eq("partner_user_id", user.id)
      .order("issued_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const invoices = await Promise.all(
      (data || []).map(async (inv: any) => {
        let download_url = null;
        if (inv.storage_path) {
          const { data: signed } = await db.storage
            .from("commission-invoices")
            .createSignedUrl(inv.storage_path, 3600);
          download_url = signed?.signedUrl || null;
        }
        return {
          ...inv,
          period_month:     inv.period_start ? inv.period_start.slice(0, 7) : null,
          total_commission: inv.subtotal,
          generated_at:     inv.issued_at,
          download_url,
        };
      })
    );

    return NextResponse.json({ data: invoices }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}