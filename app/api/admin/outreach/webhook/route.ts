import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Signature verification disabled — Resend svix format mismatch
    // TODO: re-enable once svix library is added

    const payload = JSON.parse(body);
    const { type, data } = payload;

    // Only handle the events we care about
    if (!["email.opened", "email.clicked", "email.complained", "email.bounced"].includes(type)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Resend sends the recipient address in data.to (array)
    const toAddress: string | null =
      Array.isArray(data?.to) ? data.to[0] : (data?.to || null);

    if (!toAddress) {
      console.warn("outreach-webhook: no recipient address in payload");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const db = createServiceRoleSupabaseClient();

    // Find the prospect by email
    const { data: prospect } = await db
      .from("outreach_prospects")
      .select("id, opened_at, clicked_at, unsubscribed, status")
      .eq("email", toAddress.toLowerCase().trim())
      .maybeSingle();

    if (!prospect) {
      // Not an outreach prospect — transactional email, ignore
      return NextResponse.json({ ok: true, ignored: true });
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | boolean> = {};

    if (type === "email.opened" && !prospect.opened_at) {
      updates.opened_at = now;
    }

    if (type === "email.clicked" && !prospect.clicked_at) {
      updates.clicked_at = now;
      // If they clicked, they must have opened
      if (!prospect.opened_at) updates.opened_at = now;
    }

    if (type === "email.complained") {
      // Spam complaint — unsubscribe immediately
      updates.unsubscribed = true;
      console.log(`outreach-webhook: spam complaint from ${toAddress} — unsubscribing`);
    }

    if (type === "email.bounced") {
      // Hard bounce — mark as bounced so we don't keep trying
      updates.status = "bounced";
      console.log(`outreach-webhook: bounce from ${toAddress} — marking bounced`);
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
    // Always return 200 to Resend — otherwise it will retry indefinitely
    return NextResponse.json({ ok: true });
  }
}
