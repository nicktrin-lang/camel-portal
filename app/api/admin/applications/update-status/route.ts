import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";

type StatusValue = "pending" | "approved" | "rejected";

function isAllowedStatus(s: any): s is StatusValue {
  return s === "pending" || s === "approved" || s === "rejected";
}

async function getPartnerLocale(db: ReturnType<typeof createServiceRoleSupabaseClient>, userId: string | null): Promise<"en" | "es"> {
  if (!userId) return "en";
  try {
    const { data } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.communication_locale === "es") ? "es" : "en";
  } catch {
    return "en";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id;
    const nextStatus = body?.status;

    if (!id) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    if (!isAllowedStatus(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid status (pending, approved, rejected)" },
        { status: 400 }
      );
    }

    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = createServiceRoleSupabaseClient();

    const { data: adminRow, error: adminErr } = await db
      .from("admin_users")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }

    if (!adminRow) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: current, error: currentErr } = await db
      .from("partner_applications")
      .select("id,email,status,user_id,company_name")
      .eq("id", id)
      .single();

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 400 });
    }

    const prevStatus = String(current?.status || "").toLowerCase() as StatusValue;

    const { data: updated, error: updateErr } = await db
      .from("partner_applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id,status,email,user_id")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    const updatedStatus = String(updated?.status || "").toLowerCase() as StatusValue;
    const toEmail       = updated?.email || current?.email || null;
    const userId        = updated?.user_id || current?.user_id || null;

    const becameApproved = prevStatus !== "approved" && updatedStatus === "approved";
    const becameRejected = prevStatus !== "rejected" && updatedStatus === "rejected";

    if (becameApproved && toEmail) {
      try {
        const locale = await getPartnerLocale(db, userId);
        await sendApprovalEmail(toEmail, locale, current?.company_name || "");
        await db.from("partner_applications").update({ approval_email_last_sent_at: new Date().toISOString() }).eq("id", id);
      } catch (emailErr: any) {
        return NextResponse.json(
          {
            ok: true,
            data: updated,
            warning: emailErr?.message || "Approved but approval email failed",
          },
          { status: 200 }
        );
      }
    }

    if (becameRejected && toEmail) {
      try {
        const locale = await getPartnerLocale(db, userId);
        await sendRejectionEmail(toEmail, locale);
      } catch (emailErr: any) {
        return NextResponse.json(
          {
            ok: true,
            data: updated,
            warning: emailErr?.message || "Rejected but rejection email failed",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}