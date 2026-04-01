import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ role: "partner" });
    }

    // Try to get admin record
    const { data, error } = await supabase
      .from("admins")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();

    // 🔑 KEY FIX: NEVER throw error to frontend
    if (error || !data) {
      return NextResponse.json({ role: "partner" });
    }

    return NextResponse.json({
      role: data.role || "admin",
    });
  } catch {
    // 🔑 ABSOLUTE SAFETY NET
    return NextResponse.json({ role: "partner" });
  }
}