import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendAccountLiveEmail } from "@/lib/email";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const adminEmail = String(userData?.user?.email || "")
      .trim()
      .toLowerCase();

    if (userErr || !adminEmail) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const applicationId = String(body?.applicationId || "").trim();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing applicationId" },
        { status: 400 }
      );
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

    if (!adminRow || !isAllowed(adminRow.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: application, error: applicationErr } = await db
      .from("partner_applications")
      .select(`
        id,
        email,
        status,
        user_id,
        company_name,
        full_name
      `)
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationErr) {
      return NextResponse.json({ error: applicationErr.message }, { status: 400 });
    }

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const currentStatus = String(application.status || "").trim().toLowerCase();

    if (currentStatus !== "approved" && currentStatus !== "live") {
      return NextResponse.json(
        { error: "Only approved accounts can be made live." },
        { status: 400 }
      );
    }

    if (currentStatus === "live") {
      return NextResponse.json(
        {
          ok: true,
          alreadyLive: true,
          message: "Account is already live.",
        },
        { status: 200 }
      );
    }

    const { error: updateErr } = await db
      .from("partner_applications")
      .update({ status: "live" })
      .eq("id", applicationId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    const partnerEmail = String(application.email || "").trim().toLowerCase();

    if (partnerEmail) {
      try {
        await sendAccountLiveEmail(partnerEmail);
      } catch (emailErr: any) {
        console.error("❌ Failed to send account live email:", emailErr?.message || emailErr);

        return NextResponse.json(
          {
            ok: true,
            warning:
              emailErr?.message ||
              "Partner was made live but the live email failed to send.",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Partner account marked live and email sent.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}