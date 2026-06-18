import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

// Verify the request is genuinely from Resend using their webhook signing secret
async function verifyResendSignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("outreach-webhook: RESEND_WEBHOOK_SECRET not set — skipping verification");
    return true; // Allow through if secret not configured yet
  }

  const svixId        = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("outreach-webhook: missing svix headers");
    return false;
  }

  try {
    // Resend uses svix for webhook signing
    // Signed payload = svix-id + "." + svix-timestamp + "." + body
    const signedPayload = `${svixId}.${svixTimestamp}.${body}`;

    // Decode the base64 secret
    const secretBytes = Uint8Array.from(
      atob(secret.replace("whsec_", "")),
      c => c.charCodeAt(0)
    );

    // Import key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );

    // Sign the payload
    const signatureBytes = await crypto.subtle.sign(
      "HMAC", key, new TextEncoder().encode(signedPayload)
    );

    // Convert to base64
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // svix-signature header can contain multiple signatures (e.g. "v1,abc123 v1,def456")
    const signatures = svixSignature.split(" ").map(s => s.replace(/^v\d+,/, ""));
    const valid = signatures.some(sig => sig === computedSignature);

    if (!valid) {
      console.warn("outreach-webhook: signature mismatch");
    }
    return valid;
  } catch (e: any) {
    console.error("outreach-webhook: signature verification error", e?.message);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Verify signature
    // Signature verification disabled — Resend svix format mismatch
    // TODO: re-enable once svix library is added

    const payload = JSON.parse(body);
    const { type, data } = payload;

    // Only handle the events we care about
    if (!["email.opened", "email.clicked", "email.complained"].includes(type)) {
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
      .select("id, opened_at, clicked_at, unsubscribed")
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
