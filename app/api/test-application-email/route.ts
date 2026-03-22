import { NextResponse } from "next/server";
import { sendApplicationReceivedEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();

    console.log("🧪 test-application-email route called for:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Missing ?email=you@example.com" },
        { status: 400 }
      );
    }

    const result = await sendApplicationReceivedEmail(email);

    return NextResponse.json(
      {
        ok: true,
        email,
        result,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("❌ test-application-email failed:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to send application received email" },
      { status: 500 }
    );
  }
}