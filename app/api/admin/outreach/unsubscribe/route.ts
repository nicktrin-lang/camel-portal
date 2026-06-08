import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || id === "test-id") {
      return NextResponse.redirect("https://portal.camel-global.com/?unsubscribed=true");
    }

    const db = createServiceRoleSupabaseClient();
    await db
      .from("outreach_prospects")
      .update({ unsubscribed: true })
      .eq("id", id);

    return NextResponse.redirect("https://portal.camel-global.com/?unsubscribed=true");
  } catch {
    return NextResponse.redirect("https://portal.camel-global.com/?unsubscribed=true");
  }
}