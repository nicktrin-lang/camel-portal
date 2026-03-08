import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admins")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }

    if (!adminRow) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select(
        "id,user_id,email,company_name,full_name,phone,address,address1,address2,province,postcode,country,website,status,created_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }

    if (!application) {
      return NextResponse.json({ error: "Partner application not found" }, { status: 404 });
    }

    let profile: any = null;

    if (application.user_id) {
      const { data: profileRow } = await db
        .from("partner_profiles")
        .select(
          "id,user_id,company_name,contact_name,phone,address,website,service_radius_km,base_address,base_lat,base_lng"
        )
        .eq("user_id", application.user_id)
        .maybeSingle();

      profile = profileRow || null;
    }

    return NextResponse.json(
      {
        application,
        profile,
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