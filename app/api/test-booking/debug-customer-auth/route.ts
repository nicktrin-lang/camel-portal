import { NextResponse } from "next/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();

    const supabase = createCustomerServiceRoleSupabaseClient();

    const result: any = {
      projectUrl: process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL || null,
      email,
    };

    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();

    result.authError = usersErr ? usersErr.message : null;

    if (email) {
      result.authUsers =
        usersData?.users?.filter(
          (u) => (u.email || "").toLowerCase() === email
        ) || [];
    } else {
      result.authUsersCount = usersData?.users?.length || 0;
      result.authUsersSample =
        usersData?.users?.slice(0, 5).map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
        })) || [];
    }

    const { data: profiles, error: profileErr } = await supabase
      .from("customer_profiles")
      .select("*")
      .limit(20);

    result.profileError = profileErr ? profileErr.message : null;
    result.profiles = profiles || [];

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}