import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { sendCustomerBidReceivedEmail } from "@/lib/email";

async function getCustomerLocale(db: ReturnType<typeof createServiceRoleSupabaseClient>, customerEmail: string): Promise<"en" | "es"> {
  try {
    // Customer auth lives in a separate Supabase project — must use customer credentials
    const customerDb = createClient(
      process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
      process.env.CUSTOMER_SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: usersData } = await customerDb.auth.admin.listUsers();
    const matchedUser = usersData?.users?.find(u => (u.email || "").toLowerCase() === customerEmail.toLowerCase());
    if (!matchedUser) return "en";
    // customer_profiles lives in the portal DB — use portal client to read it
    const { data: profile } = await db
      .from("customer_profiles")
      .select("communication_locale")
      .eq("user_id", matchedUser.id)
      .maybeSingle();
    return (profile?.communication_locale === "es") ? "es" : "en";
  } catch {
    return "en";
  }
}

export async function POST(req: Request) {
  try {
    const { user, role } = await getPortalUserRole();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const {
      request_id, fleet_id, vehicle_category_slug, vehicle_category_name,
      car_hire_price, fuel_price, total_price,
      full_insurance_included, full_tank_included, notes,
      currency, mileage_limit, security_deposit_notes,
    } = body;

    if (!request_id) return NextResponse.json({ error: "Missing request_id" }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    const { data: profileRow } = await db
      .from("partner_profiles")
      .select("default_currency")
      .eq("user_id", userId)
      .maybeSingle();
    const bidCurrency: "EUR" | "GBP" =
      (currency === "EUR" || currency === "GBP") ? currency :
      (profileRow?.default_currency as "EUR" | "GBP") ?? "EUR";

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select("id, status, expires_at, job_number, customer_email")
      .eq("id", request_id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (requestRow.status !== "open") return NextResponse.json({ error: "This request is no longer open" }, { status: 400 });

    const expired = requestRow.expires_at && new Date(requestRow.expires_at).getTime() <= Date.now();
    if (expired) return NextResponse.json({ error: "This request has expired" }, { status: 400 });

    const { data: existingBid } = await db
      .from("partner_bids")
      .select("id")
      .eq("request_id", request_id)
      .eq("partner_user_id", userId)
      .maybeSingle();

    if (existingBid) {
      // Update existing bid — no email (avoid spamming customer on every edit)
      const { error: updateErr } = await db
        .from("partner_bids")
        .update({
          fleet_id: fleet_id || null,
          vehicle_category_slug: vehicle_category_slug || null,
          vehicle_category_name: vehicle_category_name || null,
          car_hire_price: Number(car_hire_price || 0),
          fuel_price: Number(fuel_price || 0),
          total_price: Number(total_price || 0),
          full_insurance_included: !!full_insurance_included,
          full_tank_included: !!full_tank_included,
          notes: notes || null,
          currency: bidCurrency,
          mileage_limit: String(mileage_limit || "").trim() || null,
          security_deposit_notes: String(security_deposit_notes || "").trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBid.id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
    } else {
      // New bid — insert then notify customer
      const { error: insertErr } = await db
        .from("partner_bids")
        .insert({
          request_id,
          partner_user_id: userId,
          fleet_id: fleet_id || null,
          vehicle_category_slug: vehicle_category_slug || null,
          vehicle_category_name: vehicle_category_name || null,
          car_hire_price: Number(car_hire_price || 0),
          fuel_price: Number(fuel_price || 0),
          total_price: Number(total_price || 0),
          full_insurance_included: !!full_insurance_included,
          full_tank_included: !!full_tank_included,
          notes: notes || null,
          currency: bidCurrency,
          mileage_limit: String(mileage_limit || "").trim() || null,
          security_deposit_notes: String(security_deposit_notes || "").trim() || null,
          status: "submitted",
        });
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

      // Send bid notification email to customer in their preferred language
      if (requestRow.customer_email) {
        getCustomerLocale(db, requestRow.customer_email).then(locale =>
          sendCustomerBidReceivedEmail(
            requestRow.customer_email,
            requestRow.job_number ?? null,
            locale,
          ).catch(e => console.error("Failed to send bid received email:", e))
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}