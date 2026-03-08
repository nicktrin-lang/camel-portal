import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendApprovalEmail } from "@/lib/email";

type StatusValue = "pending" | "approved" | "rejected";
function isAllowedStatus(s: any): s is StatusValue {
  return s === "pending" || s === "approved" || s === "rejected";
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

    // Who is calling (cookie session)
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();

    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Check admin_users table (admin OR super_admin)
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

    // Read current
    const { data: current, error: currentErr } = await db
      .from("partner_applications")
      .select("id,email,status")
      .eq("id", id)
      .single();

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 400 });
    }

    const prevStatus = String(current?.status || "").toLowerCase() as StatusValue;

    // Update
    const { data: updated, error: updateErr } = await db
      .from("partner_applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id,status,email")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Email only when it becomes approved
    const updatedStatus = String(updated?.status || "").toLowerCase() as StatusValue;
    const toEmail = updated?.email || current?.email || null;
    const becameApproved = prevStatus !== "approved" && updatedStatus === "approved";

    if (becameApproved && toEmail) {
      try {
        await sendApprovalEmail(toEmail);
      } catch (emailErr: any) {
        return NextResponse.json(
          { ok: true, data: updated, warning: emailErr?.message || "Approved but email failed" },
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