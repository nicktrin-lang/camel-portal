import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendApprovalEmail } from "@/lib/email";

type StatusValue = "pending" | "approved" | "rejected";

function isAllowedStatus(s: any): s is StatusValue {
  return s === "pending" || s === "approved" || s === "rejected";
}

function getAdminEmails() {
  const raw = process.env.CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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
        { error: "Invalid status (must be pending, approved, or rejected)" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1) Who is calling?
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // 2) Is caller an admin?
    const adminEmail = userData.user.email.toLowerCase().trim();
    const admins = getAdminEmails();
    if (!admins.includes(adminEmail)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // 3) Read current
    const { data: current, error: currentErr } = await supabase
      .from("partner_applications")
      .select("id,email,status")
      .eq("id", id)
      .single();

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 400 });
    }

    const prevStatus = String(current?.status || "").toLowerCase() as StatusValue;

    // 4) Update
    const { data: updated, error: updateErr } = await supabase
      .from("partner_applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id,status,email")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 5) Email if changed -> approved
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