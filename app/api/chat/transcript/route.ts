import { NextResponse } from "next/server";
import { getPortalUserRole } from "@/lib/portal/getPortalUserRole";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail, coerceEmailLocale, EmailLocale } from "@/lib/email";

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

    // Localize the transcript email chrome to the partner's locale. The chat
    // message contents are the user's own words and are left verbatim.
    const db = createServiceRoleSupabaseClient();
    const { data: profile } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", user.id)
      .maybeSingle();
    const emailLocale = coerceEmailLocale(profile?.communication_locale);
    const tL = <T,>(m: Record<EmailLocale, T>) => m[emailLocale] ?? m.en;

    const youLbl: Record<EmailLocale, string> = { en: "You", es: "Tú", fr: "Vous", it: "Tu", pt: "Você", de: "Sie" };
    const subjectL: Record<EmailLocale, string> = {
      en: `Your Camel Help chat transcript — ${timestamp}`,
      es: `Tu transcripción del chat de Camel Help — ${timestamp}`,
      fr: `Votre transcription du chat Camel Help — ${timestamp}`,
      it: `La tua trascrizione della chat Camel Help — ${timestamp}`,
      pt: `A sua transcrição do chat Camel Help — ${timestamp}`,
      de: `Ihr Camel Help Chat-Protokoll — ${timestamp}`,
    };
    const titleL: Record<EmailLocale, string> = {
      en: "Camel Help — Chat Transcript", es: "Camel Help — Transcripción del chat", fr: "Camel Help — Transcription du chat",
      it: "Camel Help — Trascrizione della chat", pt: "Camel Help — Transcrição do chat", de: "Camel Help — Chat-Protokoll",
    };
    const introL: Record<EmailLocale, string> = {
      en: `Hi ${name} — here is a record of your support chat on ${timestamp}`,
      es: `Hola ${name} — aquí tienes un registro de tu chat de soporte del ${timestamp}`,
      fr: `Bonjour ${name} — voici un enregistrement de votre chat d'assistance du ${timestamp}`,
      it: `Ciao ${name} — ecco un resoconto della tua chat di assistenza del ${timestamp}`,
      pt: `Olá ${name} — aqui está o registo do seu chat de suporte de ${timestamp}`,
      de: `Hallo ${name} — hier ist ein Protokoll Ihres Support-Chats vom ${timestamp}`,
    };
    const stillL: Record<EmailLocale, string> = {
      en: "If you still need help, email us at", es: "Si aún necesitas ayuda, escríbenos a", fr: "Si vous avez encore besoin d'aide, écrivez-nous à",
      it: "Se hai ancora bisogno di aiuto, scrivici a", pt: "Se ainda precisar de ajuda, escreva-nos para", de: "Wenn Sie weitere Hilfe benötigen, schreiben Sie uns an",
    };

    const transcriptHtml = messages.map(m => `
      <tr>
        <td style="padding:10px 14px; vertical-align:top; width:80px;">
          <span style="font-size:11px; font-weight:700; color:${m.role === "user" ? "#ff7a00" : "#555"}; text-transform:uppercase; letter-spacing:0.05em;">
            ${m.role === "user" ? tL(youLbl) : "Camel Help"}
          </span>
        </td>
        <td style="padding:10px 14px; font-size:14px; color:#222; line-height:1.6; background:${m.role === "user" ? "#fff8f4" : "#f8f8f8"};">
          ${m.content.replace(/\n/g, "<br/>")}
        </td>
      </tr>
    `).join("");

    await sendEmail({
      to: email,
      subject: tL(subjectL),
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; max-width:640px;">
          <div style="background:#000; padding:20px 28px;">
            <h2 style="color:#fff; margin:0; font-size:18px;">${tL(titleL)}</h2>
            <p style="color:#999; margin:4px 0 0; font-size:13px;">${tL(introL)}</p>
          </div>
          <div style="padding:24px 28px; background:#fff; border:1px solid #eee;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #eee;">
              ${transcriptHtml}
            </table>
            <p style="margin-top:24px; font-size:13px; color:#999;">
              ${tL(stillL)} <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a>
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