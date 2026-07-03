import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { coerceCurrency } from "@/lib/currency";
import { sendCustomerBidReceivedEmail, coerceEmailLocale, type EmailLocale } from "@/lib/email";

async function getCustomerLocale(db: ReturnType<typeof createServiceRoleSupabaseClient>, customerUserId: string): Promise<EmailLocale> {
  try {
    console.log("🌍 getCustomerLocale: looking up user_id:", customerUserId);
    const { data: profile, error } = await db
      .from("customer_profiles")
      .select("communication_locale")
      .eq("user_id", customerUserId)
      .maybeSingle();
    console.log("🌍 getCustomerLocale: profile result:", JSON.stringify(profile), "error:", error?.message);
    return coerceEmailLocale(profile?.communication_locale);
  } catch (e: any) {
    console.error("🌍 getCustomerLocale: exception:", e?.message);
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

    // Partner currency = their Stripe settlement currency (default_currency).
    // The bid currency must equal that. If a currency is passed in the body we
    // coerce it, but the profile default is the authoritative source of truth.
    const bidCurrency = currency
      ? coerceCurrency(currency)
      : coerceCurrency(profileRow?.default_currency);

    const { data: requestRow, error: requestErr } = await db
      .from("customer_requests")
      .select("id, status, expires_at, job_number, customer_email, customer_user_id")
      .eq("id", request_id)
      .maybeSingle();

    if (requestErr) return NextResponse.json({ error: requestErr.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (requestRow.status !== "open") return NextResponse.json({ error: "This request is no longer open" }, { status: 400 });

    const expired = requestRow.expires_at && new Date(requestRow.expires_at).getTime() <= Date.now();
    if (expired) return NextResponse.json({ error: "This request has expired" }, { status: 400 });

    console.log("📋 requestRow customer_user_id:", requestRow.customer_user_id, "customer_email:", requestRow.customer_email);

    const { data: existingBid } = await db
      .from("partner_bids")
      .select("id")
      .eq("request_id", request_id)
      .eq("partner_user_id", userId)
      .maybeSingle();

    if (existingBid) {
      console.log("📋 existing bid found — no email sent");
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
      console.log("📋 new bid — inserting and sending email");
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

      if (requestRow.customer_email && requestRow.customer_user_id) {
        try {
          const locale = await getCustomerLocale(db, requestRow.customer_user_id);
          console.log("📧 sending bid email to:", requestRow.customer_email, "locale:", locale);
          await sendCustomerBidReceivedEmail(
            requestRow.customer_email,
            requestRow.job_number ?? null,
            locale,
          );
          console.log("📧 bid email sent successfully");
        } catch (e) {
          console.error("📧 Failed to send bid received email:", e);
        }
      } else {
        console.log("📋 no customer_email or customer_user_id — skipping email");
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
