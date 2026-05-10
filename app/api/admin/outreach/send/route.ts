import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

const DAILY_LIMIT = 50;

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function GET() {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const email = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await db
      .from("outreach_prospects")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", todayStart.toISOString());

    const sentToday = count || 0;
    return NextResponse.json({ sent_today: sentToday, daily_limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - sentToday) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authed = await createRouteHandlerSupabaseClient();
    const { data: userData, error: userErr } = await authed.auth.getUser();
    const adminEmail = (userData?.user?.email || "").toLowerCase().trim();
    if (userErr || !adminEmail) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = createServiceRoleSupabaseClient();
    const { data: adminRow } = await db.from("admin_users").select("role").eq("email", adminEmail).maybeSingle();
    if (!adminRow || !isAllowed(adminRow.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const { prospect_id, test_email } = body || {};

    // TEST MODE — send a preview to the admin's own email without touching any prospect
    if (test_email) {
      const testProspect = {
        company_name: "Coches Sol S.L.",
        contact_name: "María García",
        city: "MÁLAGA, MÁLAGA",
        country: "Spain",
        notes: null,
      };
      const emailHtml = await generateEmail(testProspect);
      await sendEmail({
        to: adminEmail,
        subject: `[TEST] ${emailHtml.subject}`,
        html: emailHtml.fullHtml,
      });
      return NextResponse.json({ ok: true, test: true, subject: emailHtml.subject, preview: emailHtml.htmlBody.slice(0, 300) });
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await db
      .from("outreach_prospects")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", todayStart.toISOString());
    const sentToday = count || 0;

    if (sentToday >= DAILY_LIMIT) {
      return NextResponse.json({
        error: `Límite diario de ${DAILY_LIMIT} emails alcanzado. Vuelve mañana.`,
        sent_today: sentToday,
        daily_limit: DAILY_LIMIT,
      }, { status: 429 });
    }

    if (!prospect_id) return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });

    const { data: prospect, error: fetchError } = await db
      .from("outreach_prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();
    if (fetchError || !prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    if (prospect.status === "sent" || prospect.status === "onboarded") {
      return NextResponse.json({ error: `Prospect already has status: ${prospect.status}` }, { status: 400 });
    }

    const emailHtml = await generateEmail(prospect);
    await sendEmail({ to: prospect.email, subject: emailHtml.subject, html: emailHtml.fullHtml });

    await db
      .from("outreach_prospects")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", prospect_id);

    return NextResponse.json({ ok: true, subject: emailHtml.subject, sent_today: sentToday + 1, remaining: Math.max(0, DAILY_LIMIT - sentToday - 1) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

async function generateEmail(prospect: { company_name: string; contact_name?: string | null; city?: string | null; country?: string | null; notes?: string | null; }) {
  const prompt = `Eres un asistente que escribe emails de captación en nombre de Camel Global — una plataforma de alquiler de coches meet & greet que opera en España.

Así funciona la plataforma: los clientes envían solicitudes de alquiler online, las empresas de alquiler cercanas reciben la solicitud y envían presupuestos, el cliente acepta el mejor presupuesto, y un conductor entrega el coche directamente al cliente (aeropuerto, hotel, domicilio, etc.). La empresa de alquiler se queda con aproximadamente el 80% del precio del alquiler (Camel cobra una comisión del 20%, mínimo €10). No hay costes iniciales ni cuotas de suscripción — los socios solo pagan cuando completan una reserva.

Escribe un email de captación corto, profesional y cercano a la siguiente empresa de alquiler de coches, invitándoles a unirse como socios:

Nombre de la empresa: ${prospect.company_name}
Nombre del contacto: ${prospect.contact_name || "no conocido — usa un saludo genérico como 'Estimado equipo'"}
Ciudad: ${prospect.city || "España"}
País: ${prospect.country || "España"}
${prospect.notes ? `Notas adicionales: ${prospect.notes}` : ""}

Requisitos:
- La línea de asunto en la primera línea, con el prefijo "Asunto: "
- Luego una línea en blanco
- Luego el cuerpo del email en HTML simple (sin markdown, usa etiquetas <p>, sin <html>/<body>)
- Máximo 200 palabras
- Menciona su ciudad si se conoce
- Termina con: "Si estás interesado, puedes registrarte en https://www.camel-global.com/partner/signup o responder a este email."
- Firma como: El equipo de Camel Global | contact@camel-global.com
- No uses texto de marcador de posición como [NOMBRE] — usa los valores reales proporcionados o un saludo genérico si no se conocen`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const anthropicJson = await anthropicRes.json();
  const rawText: string = anthropicJson?.content?.[0]?.text || "";
  if (!rawText) throw new Error("Claude returned empty response");

  const lines = rawText.split("\n");
  const subjectLine = lines.find((l: string) => l.toLowerCase().startsWith("asunto:") || l.toLowerCase().startsWith("subject:")) || "";
  const subject = subjectLine.replace(/^(asunto|subject):\s*/i, "").trim() || `Únete a Camel Global como socio — ${prospect.company_name}`;
  const bodyStartIndex = lines.findIndex((l: string) => l.toLowerCase().startsWith("asunto:") || l.toLowerCase().startsWith("subject:"));
  const htmlBody = lines.slice(bodyStartIndex + 2).join("\n").trim();

  const fullHtml = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.7; max-width:600px;">
      <div style="background:#000; padding:20px 28px; margin-bottom:0;">
        <p style="color:#ff7a00; font-size:11px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; margin:0;">Camel Global · Invitación a Socios</p>
      </div>
      <div style="padding:28px; border:1px solid #eee; border-top:none;">
        ${htmlBody}
      </div>
      <div style="padding:16px 28px; background:#f8f8f8; border:1px solid #eee; border-top:none; font-size:12px; color:#999;">
        Camel Global · contact@camel-global.com · camel-global.com<br/>
        Recibes este email porque tu empresa fue identificada como posible socio en tu área.
        Si no deseas recibir más emails, responde con "cancelar suscripción".
      </div>
    </div>
  `;

  return { subject, htmlBody, fullHtml };
}