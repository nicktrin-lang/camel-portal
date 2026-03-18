import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const userId = String(userData?.user?.id || "").trim();

    if (userErr || !userId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: me, error: meErr } = await db
      .from("partner_profiles")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 400 });
    }

    if (!me || !isAllowed(me.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: applications, error: applicationsErr } = await db
      .from("partner_applications")
      .select("id,email,company_name,full_name,status,created_at")
      .order("created_at", { ascending: false });

    if (applicationsErr) {
      return NextResponse.json(
        { error: applicationsErr.message },
        { status: 400 }
      );
    }

    const applicationRows = applications || [];
    const applicationEmails = Array.from(
      new Set(
        applicationRows
          .map((row: any) => String(row.email || "").toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const { data: authUsers, error: authUsersErr } = await db.auth.admin.listUsers();

    if (authUsersErr) {
      return NextResponse.json({ error: authUsersErr.message }, { status: 400 });
    }

    const emailToUserId = new Map<string, string>();
    for (const user of authUsers?.users || []) {
      const userEmail = String(user.email || "").toLowerCase().trim();
      const authUserId = String(user.id || "").trim();
      if (userEmail && authUserId && applicationEmails.includes(userEmail)) {
        emailToUserId.set(userEmail, authUserId);
      }
    }

    const profileUserIds = Array.from(
      new Set(Array.from(emailToUserId.values()).filter(Boolean))
    );

    let profileMap = new Map<string, any>();

    if (profileUserIds.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("partner_profiles")
        .select(`
          user_id,
          company_name,
          contact_name,
          phone,
          address,
          role
        `)
        .in("user_id", profileUserIds);

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }

      profileMap = new Map(
        (profileRows || []).map((row: any) => [String(row.user_id), row])
      );
    }

    const data = applicationRows.map((row: any) => {
      const applicationEmail = String(row.email || "").toLowerCase().trim();
      const matchedUserId = emailToUserId.get(applicationEmail) || null;
      const profile = matchedUserId ? profileMap.get(matchedUserId) || null : null;

      return {
        id: row.id,
        email: row.email || "",
        company_name: profile?.company_name || row.company_name || "",
        full_name: profile?.contact_name || row.full_name || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
        role: profile?.role || "partner",
        status: row.status,
        created_at: row.created_at,
        user_id: matchedUserId,
        has_profile: !!profile,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}