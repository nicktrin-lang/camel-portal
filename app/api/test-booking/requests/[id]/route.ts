import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

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

export async function GET(
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

    const partnerDb = createServiceRoleSupabaseClient();

    const { data: requestRow, error: requestErr } = await partnerDb
      .from("customer_requests")
      .select("*")
      .eq("id", id)
      .eq("customer_user_id", customerUser.id)
      .maybeSingle();

    if (requestErr) {
      return NextResponse.json({ error: requestErr.message }, { status: 400 });
    }

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { data: bids, error: bidsErr } = await partnerDb
      .from("partner_bids")
      .select(`
        id,
        request_id,
        partner_user_id,
        fleet_id,
        vehicle_category_slug,
        vehicle_category_name,
        car_hire_price,
        fuel_price,
        total_price,
        full_insurance_included,
        full_tank_included,
        notes,
        status,
        created_at
      `)
      .eq("request_id", id)
      .order("created_at", { ascending: true });

    if (bidsErr) {
      return NextResponse.json({ error: bidsErr.message }, { status: 400 });
    }

    const partnerUserIds = Array.from(
      new Set(
        (bids || [])
          .map((b: any) => String(b.partner_user_id || ""))
          .filter(Boolean)
      )
    );

    let profileMap = new Map<string, any>();

    if (partnerUserIds.length > 0) {
      const { data: profiles, error: profilesErr } = await partnerDb
        .from("partner_profiles")
        .select("user_id, company_name, contact_name, phone, address")
        .in("user_id", partnerUserIds);

      if (profilesErr) {
        return NextResponse.json({ error: profilesErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profiles || []).map((profile: any) => [String(profile.user_id), profile])
      );
    }

    const bidRows = (bids || []).map((bid: any) => {
      const profile = profileMap.get(String(bid.partner_user_id)) || null;

      return {
        ...bid,
        partner_company_name: profile?.company_name || null,
        partner_contact_name: profile?.contact_name || null,
        partner_phone: profile?.phone || null,
        partner_address: profile?.address || null,
      };
    });

    return NextResponse.json(
      {
        request: requestRow,
        bids: bidRows,
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