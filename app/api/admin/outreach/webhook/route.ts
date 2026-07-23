import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

// Best-effort IP → ISO country code, for the "possibly forwarded" heuristic: a
// click from a country different to the prospect's own suggests the email was
// forwarded on. Fails silently (returns null) so it can never break the webhook.
// Only used on CLICKS — open IPs are Apple Mail Privacy relays and meaningless.
async function geolocateCountry(ip: string): Promise<string | null> {
  try {
    if (!ip || ip.startsWith("127.") || ip === "::1") return null;
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const code = (await res.text()).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

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
    if (!["email.delivered", "email.opened", "email.clicked", "email.complained", "email.bounced"].includes(type)) {
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
      .select("id, opened_at, clicked_at, delivered_at, unsubscribed, status, open_count, click_count")
      .eq("email", toAddress.toLowerCase().trim())
      .maybeSingle();

    if (!prospect) {
      // Not an outreach prospect — transactional email, ignore
      return NextResponse.json({ ok: true, ignored: true });
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | boolean | number | null> = {};

    if (type === "email.delivered" && !prospect.delivered_at) {
      // Confirmed reached the inbox (vs merely handed to Resend)
      updates.delivered_at = now;
    }

    if (type === "email.opened") {
      if (!prospect.opened_at) updates.opened_at = now;
      updates.open_count = Number(prospect.open_count || 0) + 1;
    }

    if (type === "email.clicked") {
      if (!prospect.clicked_at) updates.clicked_at = now;
      // A click implies an open
      if (!prospect.opened_at) updates.opened_at = now;
      updates.click_count = Number(prospect.click_count || 0) + 1;
      // Capture click context so we can filter out security-scanner "bot" clicks
      const click = data?.click || {};
      if (click.userAgent) updates.last_click_user_agent = String(click.userAgent).slice(0, 400);
      if (click.ipAddress) {
        updates.last_click_ip = String(click.ipAddress).slice(0, 64);
        // Geolocate the click IP — a country ≠ the prospect's own = possibly forwarded.
        const cc = await geolocateCountry(String(click.ipAddress));
        if (cc) updates.click_country = cc;
      }
    }

    if (type === "email.complained") {
      // Spam complaint — record it AND unsubscribe. (Previously only unsubscribed,
      // so complaints were invisible on the dashboard.)
      updates.complained_at = now;
      updates.unsubscribed  = true;
      console.log(`outreach-webhook: SPAM COMPLAINT from ${toAddress} — recording + unsubscribing`);
    }

    if (type === "email.bounced") {
      // Mark bounced; capture hard vs soft so we know whether to retry.
      updates.status      = "bounced";
      const bounceType    = data?.bounce?.type || data?.type || null;
      if (bounceType) updates.bounce_type = String(bounceType).toLowerCase().includes("hard") ? "hard" : "soft";
      console.log(`outreach-webhook: bounce (${updates.bounce_type || "unknown"}) from ${toAddress}`);
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
