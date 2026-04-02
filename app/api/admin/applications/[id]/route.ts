import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = String(params?.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admin_users")
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

    let profile = null;

    if (application.user_id) {
      const { data: profileByUserId, error: profileErr } = await db
        .from("partner_profiles")
        .select(
          "id,user_id,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
        )
        .eq("user_id", application.user_id)
        .maybeSingle();

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profile = profileByUserId;
    }

    if (!profile && application.email) {
      const { data: authUsersData, error: authErr } = await db.auth.admin.listUsers();

      if (!authErr) {
        const matchedUser = authUsersData?.users?.find(
          (u) =>
            (u.email || "").toLowerCase().trim() ===
            String(application.email).toLowerCase().trim()
        );

        if (matchedUser?.id) {
          const { data: profileByResolvedUserId, error: profileErr2 } = await db
            .from("partner_profiles")
            .select(
              "id,user_id,company_name,contact_name,phone,address,address1,address2,province,postcode,country,website,service_radius_km,base_address,base_lat,base_lng"
            )
            .eq("user_id", matchedUser.id)
            .maybeSingle();

          if (profileErr2) {
            return NextResponse.json({ error: profileErr2.message }, { status: 400 });
          }

          profile = profileByResolvedUserId;
        }
      }
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