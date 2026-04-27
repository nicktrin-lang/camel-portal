import { NextResponse } from "next/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getPortalUserRole();
    if (!user) return NextResponse.json({ error: authError || "Not signed in" }, { status: 401 });

    const email = user.email;
    if (!email) return NextResponse.json({ error: "No email on account" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const messages: { role: string; content: string }[] = body?.messages || [];
    if (messages.length === 0) return NextResponse.json({ ok: true });

    const name = String(user.user_metadata?.full_name || email.split("@")[0] || "Partner");
    const timestamp = new Date().toLocaleString("en-GB", { timeZone: "Europe/Madrid" });

    const transcriptHtml = messages.map(m => `
      <tr>
        <td style="padding:10px 14px; vertical-align:top; width:80px;">
          <span style="font-size:11px; font-weight:700; color:${m.role === "user" ? "#ff7a00" : "#555"}; text-transform:uppercase; letter-spacing:0.05em;">
            ${m.role === "user" ? "You" : "Camel Help"}
          </span>
        </td>
        <td style="padding:10px 14px; font-size:14px; color:#222; line-height:1.6; background:${m.role === "user" ? "#fff8f4" : "#f8f8f8"};">
          ${m.content.replace(/\n/g, "<br/>")}
        </td>
      </tr>
    `).join("");

    await sendEmail({
      to: email,
      subject: `Your Camel Help chat transcript — ${timestamp}`,
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; max-width:640px;">
          <div style="background:#000; padding:20px 28px;">
            <h2 style="color:#fff; margin:0; font-size:18px;">Camel Help — Chat Transcript</h2>
            <p style="color:#999; margin:4px 0 0; font-size:13px;">Hi ${name} — here is a record of your support chat on ${timestamp}</p>
          </div>
          <div style="padding:24px 28px; background:#fff; border:1px solid #eee;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #eee;">
              ${transcriptHtml}
            </table>
            <p style="margin-top:24px; font-size:13px; color:#999;">
              If you still need help, email us at <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Chat transcript email failed:", e?.message);
    return NextResponse.json({ ok: true });
  }
}