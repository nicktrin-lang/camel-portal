import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

// Resend webhook events we care about
// email.opened — fired when recipient opens the email
// email.clicked — fired when recipient clicks a link

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { type, data } = body;

    // Only handle open and click events
    if (type !== "email.opened" && type !== "email.clicked") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Resend sends the email address in data.to (array) or data.email_id
    // We match on the recipient email address
    const toAddress: string | null =
      Array.isArray(data?.to) ? data.to[0] : (data?.to || null);

    if (!toAddress) {
      console.warn("outreach-webhook: no recipient address in payload", body);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const db = createServiceRoleSupabaseClient();

    // Find the prospect by email
    const { data: prospect } = await db
      .from("outreach_prospects")
      .select("id, opened_at, clicked_at")
      .eq("email", toAddress.toLowerCase().trim())
      .maybeSingle();

    if (!prospect) {
      // Not an outreach prospect — could be a transactional email, ignore
      return NextResponse.json({ ok: true, ignored: true });
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = {};

    if (type === "email.opened" && !prospect.opened_at) {
      updates.opened_at = now;
    }

    if (type === "email.clicked" && !prospect.clicked_at) {
      updates.clicked_at = now;
      // If they clicked, mark as opened too if not already
      if (!prospect.opened_at) updates.opened_at = now;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .from("outreach_prospects")
        .update(updates)
        .eq("id", prospect.id);

      console.log(`outreach-webhook: ${type} for ${toAddress} — updated`, updates);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("outreach-webhook error:", e?.message);
    // Always return 200 to Resend — otherwise it will retry
    return NextResponse.json({ ok: true });
  }
}
