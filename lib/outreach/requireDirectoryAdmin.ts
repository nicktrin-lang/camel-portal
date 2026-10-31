import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

// Shared guard for the outreach directory routes: admin or super_admin in admin_users.
export async function requireDirectoryAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!adminRow || (adminRow.role !== "admin" && adminRow.role !== "super_admin")) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { db };
}
