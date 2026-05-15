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
      .select("id, invoice_number, period_month, currency, total_commission, booking_count, storage_path, generated_at, emailed_at")
      .eq("partner_user_id", user.id)
      .order("generated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Generate signed URLs for each invoice
    const invoices = await Promise.all(
      (data || []).map(async (inv: any) => {
        const { data: signedUrl } = await db.storage
          .from("commission-invoices")
          .createSignedUrl(inv.storage_path, 3600); // 1 hour
        return { ...inv, download_url: signedUrl?.signedUrl || null };
      })
    );

    return NextResponse.json({ data: invoices }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}