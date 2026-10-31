import { NextResponse } from "next/server";
import { requireDirectoryAdmin } from "@/lib/outreach/requireDirectoryAdmin";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

// The weekday auto-send switch on /admin/outreach (OUTREACH_AUTOSEND_SCHEMA.sql).
// GET = state + last run + how many prospects are queued; POST { enabled } flips it.

async function queued(db: any) {
  const { count } = await db.from("outreach_prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending").or("unsubscribed.is.null,unsubscribed.eq.false");
  return count || 0;
}

export async function GET() {
  try {
    const auth = await requireDirectoryAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;
    const { data, error } = await db.from("outreach_autosend").select("enabled, last_run_on, last_result, updated_at, updated_by").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ...(data ?? { enabled: false }), queued: await queued(db) });
  } catch (e: any) {
    const msg = e?.message || "Server error";
    return NextResponse.json({ error: /outreach_autosend/.test(msg) ? `${msg} (has OUTREACH_AUTOSEND_SCHEMA.sql been run?)` : msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireDirectoryAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;
    const body = await req.json().catch(() => null);
    if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Send { enabled: true | false }" }, { status: 400 });
    const authed = await createRouteHandlerSupabaseClient();
    const { data: u } = await authed.auth.getUser();
    const { error } = await db.from("outreach_autosend")
      .upsert({ id: 1, enabled: body.enabled, updated_at: new Date().toISOString(), updated_by: u?.user?.email ?? null });
    if (error) throw error;
    return NextResponse.json({ ok: true, enabled: body.enabled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
