import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }

  const email = data.user.email.toLowerCase().trim();
  const admins = getAdminEmails();

  return NextResponse.json({ isAdmin: admins.includes(email) }, { status: 200 });
}