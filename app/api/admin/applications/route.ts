import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

function getAdminEmails() {
  const raw =
    process.env.CAMEL_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_CAMEL_ADMIN_EMAILS ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  try {
    // 1) Cookie-based client to identify logged-in user
    const authClient = createServerSupabaseClient();
    const { data: userData, error: userErr } = await authClient.auth.getUser();

    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // 2) Check admin allowlist
    const email = userData.user.email.toLowerCase().trim();
    const admins = getAdminEmails();

    if (!admins.includes(email)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // 3) Service role client for DB (bypasses RLS)
    const db = createServiceSupabaseClient();

    const { data, error } = await db
      .from("partner_applications")
      .select("id,email,company_name,full_name,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}