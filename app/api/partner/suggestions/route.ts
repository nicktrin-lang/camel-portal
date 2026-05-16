import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// ── GET — list partner's own suggestions ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createServiceRoleSupabaseClient();
  const { data, error } = await db
    .from("partner_suggestions")
    .select("id, title, category, description, status, admin_notes, created_at, updated_at")
    .eq("partner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suggestions: data || [] });
}

// ── POST — submit a new suggestion ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { title, category, description } = body || {};

  if (!title?.trim())       return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!category?.trim())    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

  const validCategories = ["feature", "bug", "improvement"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const db = createServiceRoleSupabaseClient();

  // Get partner name for email
  const { data: profile } = await db
    .from("partner_profiles")
    .select("company_name, contact_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const partnerName = profile?.company_name || profile?.contact_name || user.email || "Unknown partner";

  const { data: inserted, error } = await db
    .from("partner_suggestions")
    .insert({
      partner_user_id: user.id,
      partner_name:    partnerName,
      title:           title.trim(),
      category,
      description:     description.trim(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categoryLabel = category === "feature" ? "Feature Request" : category === "bug" ? "Bug Report" : "Improvement";
  const portalUrl     = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";
  const adminEmails   = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

  // Email partner — confirmation
  sendEmail({
    to: user.email!,
    subject: `We've received your suggestion — ${title}`,
    html: `
      <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
        <div style="background:#000;padding:20px 28px;">
          <h2 style="color:#fff;margin:0;">Suggestion Received ✅</h2>
        </div>
        <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
          <p>Hi ${profile?.contact_name || partnerName},</p>
          <p>Thanks for your suggestion. We've received it and our team will review it shortly.</p>
          <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">${title}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#666;">Category: ${categoryLabel}</p>
            <p style="margin:8px 0 0;font-size:14px;">${description}</p>
          </div>
          <p style="font-size:13px;color:#666;">You can track the status of your suggestions in the partner portal.</p>
          <a href="${portalUrl}/partner/suggestions" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">View My Suggestions</a>
          <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
        </div>
      </div>
    `,
  }).catch(e => console.error("Suggestion confirmation email failed:", e?.message));

  // Email admin — notification
  for (const adminEmail of adminEmails) {
    sendEmail({
      to: adminEmail,
      subject: `[Admin] New suggestion from ${partnerName} — ${categoryLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <p>A partner has submitted a new suggestion.</p>
          <p>
            <strong>Partner:</strong> ${partnerName}<br/>
            <strong>Category:</strong> ${categoryLabel}<br/>
            <strong>Title:</strong> ${title}<br/>
            <strong>Description:</strong> ${description}
          </p>
          <a href="${portalUrl}/admin/suggestions" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;">View in Admin</a>
        </div>
      `,
    }).catch(e => console.error("Admin suggestion notification email failed:", e?.message));
  }

  return NextResponse.json({ success: true, id: inserted.id });
}