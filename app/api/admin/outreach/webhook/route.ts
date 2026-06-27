import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Read the RAW body first — svix signature verification must run on the
  // exact bytes Resend signed, before any JSON parsing.
  const body = await req.text();

  // ── Verify the webhook signature (svix / Resend) ──────────────────────────
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("outreach-webhook: RESEND_WEBHOOK_SECRET not set — rejecting");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let payload: any;
  try {
    const wh = new Webhook(secret);
    // verify() throws on a bad/missing signature and returns the parsed payload on success
    payload = wh.verify(body, {
      "svix-id":        req.headers.get("svix-id")        ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    });
  } catch (err: any) {
    console.warn("outreach-webhook: signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Process the (now verified) event ──────────────────────────────────────
  try {
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
    // Signature already verified — return 200 on a processing error so Resend
    // does not retry indefinitely for a legit-but-unprocessable event.
    return NextResponse.json({ ok: true });
  }
}
