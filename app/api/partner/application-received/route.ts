import { NextResponse } from "next/server";
import { sendApplicationReceivedEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    console.log("📨 application-received route called for:", email);

    if (!email) {
      console.error("❌ Missing email in application-received route");
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const result = await sendApplicationReceivedEmail(email);

    console.log("✅ Application received email sent:", result);

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (e: any) {
    console.error("❌ Failed to send application received email:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to send application received email" },
      { status: 500 }
    );
  }
}