import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendApprovalEmail } from "@/lib/email";

async function getPartnerLocale(
  db: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string | null
): Promise<"en" | "es"> {
  if (!userId) return "en";
  try {
    const { data } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.communication_locale === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const adminEmail = String(userData?.user?.email || "").trim().toLowerCase();
    if (userErr || !adminEmail) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admin_users")
      .select("role")
      .eq("email", adminEmail)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }
    if (!adminRow) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const applicationId = String(body?.applicationId || "").trim();

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const { data: application, error: appErr } = await db
      .from("partner_applications")
      .select("id, email, status, user_id, company_name")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const currentStatus = String(application.status || "").trim().toLowerCase();
    if (currentStatus !== "approved") {
      return NextResponse.json(
        { error: "Can only resend approval email to approved accounts." },
        { status: 400 }
      );
    }

    const toEmail = String(application.email || "").trim().toLowerCase();
    if (!toEmail) {
      return NextResponse.json({ error: "No email address on record." }, { status: 400 });
    }

    const locale = await getPartnerLocale(db, application.user_id);
    await sendApprovalEmail(toEmail, locale, application.company_name || "");

    return NextResponse.json(
      { ok: true, message: `Approval email resent to ${toEmail}.` },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
