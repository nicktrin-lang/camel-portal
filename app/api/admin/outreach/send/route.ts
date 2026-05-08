import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const { prospect_id } = body || {};
    if (!prospect_id) return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });

    // Fetch prospect
    const { data: prospect, error: fetchError } = await db
      .from("outreach_prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();
    if (fetchError || !prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    if (prospect.status === "sent" || prospect.status === "onboarded") {
      return NextResponse.json({ error: `Prospect already has status: ${prospect.status}` }, { status: 400 });
    }

    // Ask Claude to generate a personalised email
    const prompt = `You are writing a cold outreach email on behalf of Camel Global — a meet & greet car hire platform launching in Spain.

The platform works like this: customers submit car hire requests online, nearby car hire companies receive the request and submit bids, the customer accepts the best bid, and a driver delivers the car directly to the customer (airport, hotel, home, etc). The car hire company keeps ~80% of the hire price (Camel charges 20% commission, minimum €10). There are no upfront costs or subscription fees — partners only pay when they complete a booking.

Write a short, professional, friendly outreach email to the following car hire company inviting them to join as a partner:

Company name: ${prospect.company_name}
Contact name: ${prospect.contact_name || "not known — use a generic greeting"}
City: ${prospect.city || "Spain"}
Country: ${prospect.country || "Spain"}
${prospect.notes ? `Additional notes: ${prospect.notes}` : ""}

Requirements:
- Subject line on the first line, prefixed with "Subject: "
- Then a blank line
- Then the email body in plain HTML (no markdown, use <p> tags, no <html>/<body> wrapper)
- Keep it under 200 words
- Mention their city if known
- End with: "If you're interested, you can apply at https://www.camel-global.com/partner/signup or reply to this email."
- Sign off as: The Camel Global Team | contact@camel-global.com
- Do not use any placeholder text like [NAME] — use the actual values provided or a generic greeting if not known`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 });
    }

    const anthropicJson = await anthropicRes.json();
    const rawText: string = anthropicJson?.content?.[0]?.text || "";
    if (!rawText) return NextResponse.json({ error: "Claude returned empty response" }, { status: 500 });

    // Parse subject and body
    const lines = rawText.split("\n");
    const subjectLine = lines.find((l: string) => l.toLowerCase().startsWith("subject:")) || "";
    const subject = subjectLine.replace(/^subject:\s*/i, "").trim() || `Join Camel Global as a partner — ${prospect.company_name}`;
    const bodyStartIndex = lines.findIndex((l: string) => l.toLowerCase().startsWith("subject:"));
    const htmlBody = lines.slice(bodyStartIndex + 2).join("\n").trim();

    const fullHtml = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.7; max-width:600px;">
        <div style="background:#000; padding:20px 28px; margin-bottom:0;">
          <p style="color:#ff7a00; font-size:11px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; margin:0;">Camel Global · Partner Invitation</p>
        </div>
        <div style="padding:28px; border:1px solid #eee; border-top:none;">
          ${htmlBody}
        </div>
        <div style="padding:16px 28px; background:#f8f8f8; border:1px solid #eee; border-top:none; font-size:12px; color:#999;">
          Camel Global · contact@camel-global.com · camel-global.com<br/>
          You are receiving this because your business was identified as a potential partner in your area.
          If you do not wish to receive further emails, please reply with "unsubscribe".
        </div>
      </div>
    `;

    // Send via Resend
    await sendEmail({ to: prospect.email, subject, html: fullHtml });

    // Update prospect status
    await db
      .from("outreach_prospects")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", prospect_id);

    return NextResponse.json({ ok: true, subject, preview: htmlBody.slice(0, 200) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}