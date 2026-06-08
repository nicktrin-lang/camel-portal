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

function getLocale(country?: string | null): "es" | "en" {
  const esCountries = ["spain", "españa", "espana"];
  return esCountries.includes((country || "").toLowerCase().trim()) ? "es" : "en";
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
    const { prospect_id, test_email, resend } = body || {};

    // TEST MODE
    if (test_email) {
      const testProspect = {
        id: "test-id",
        company_name: "Coches Sol S.L.",
        contact_name: "María García",
        city: "Málaga",
        country: "Spain",
        notes: null,
      };
      const emailHtml = await generateEmail(testProspect);
      await sendEmail({
        to: adminEmail,
        from: "Camel Global Partners <partners@camel-global.com>",
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
        error: `Daily limit of ${DAILY_LIMIT} emails reached. Come back tomorrow.`,
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

    // Always block unsubscribed — even on resend
    if (prospect.unsubscribed) {
      return NextResponse.json({ error: "Prospect has unsubscribed" }, { status: 400 });
    }

    const emailHtml = await generateEmail(prospect);
    const unsubscribeUrl = `https://portal.camel-global.com/api/admin/outreach/unsubscribe?id=${prospect_id}`;

    await sendEmail({
      to: prospect.email,
      from: "Camel Global Partners <partners@camel-global.com>",
      subject: emailHtml.subject,
      html: emailHtml.fullHtml,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    await db
      .from("outreach_prospects")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", prospect_id);

    return NextResponse.json({ ok: true, subject: emailHtml.subject, sent_today: sentToday + 1, remaining: Math.max(0, DAILY_LIMIT - sentToday - 1) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

async function generateEmail(prospect: {
  id: string;
  company_name: string;
  contact_name?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
}) {
  const locale = getLocale(prospect.country);
  const unsubscribeUrl = `https://portal.camel-global.com/api/admin/outreach/unsubscribe?id=${prospect.id}`;

  const promptEs = `Eres un asistente que escribe emails de captación en nombre de Camel Global — una plataforma de alquiler de coches meet & greet.

Qué es Camel Global: es un canal digital adicional que conecta empresas de alquiler de coches con clientes que quieren recibir el vehículo directamente donde están — en el aeropuerto, hotel, domicilio u otra ubicación. Funciona perfectamente junto a tu negocio de alquiler existente, sin interferir con tus operaciones actuales ni con tus canales actuales. No lo sustituye — simplemente te da acceso a más clientes que de otro modo no te encontrarían.

Así funciona: los clientes envían solicitudes online, las empresas de alquiler cercanas reciben la solicitud, envían su presupuesto, y cuando ganan la reserva, uno de sus conductores entrega el coche directamente al cliente. Simple, eficiente, y completamente gestionado desde nuestra plataforma.

Escribe un email de captación corto, profesional y cercano a la siguiente empresa de alquiler de coches:

Nombre de la empresa: ${prospect.company_name}
Nombre del contacto: ${prospect.contact_name || "no conocido — usa 'Hola,' o 'Estimado equipo,'"}
Ciudad: ${prospect.city || "España"}
País: ${prospect.country || "España"}
${prospect.notes ? `Notas: ${prospect.notes}` : ""}

Requisitos estrictos:
- Primera línea: asunto del email, con el prefijo "Asunto: "
- Línea en blanco
- Cuerpo en HTML simple: etiquetas <p> y <strong> únicamente, sin <html>/<body>
- Máximo 160 palabras
- Menciona su ciudad si se conoce
- Destaca que Camel Global funciona junto a su negocio actual como canal adicional, no lo reemplaza
- NO menciones comisiones, porcentajes ni precios en este email
- Termina con: <p>Si te interesa saber más, puedes registrarte en <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> o simplemente responder a este email.</p>
- Firma: <p>El equipo de Camel Global</p>
- No uses marcadores de posición como [NOMBRE]`;

  const promptEn = `You are an assistant writing outreach emails on behalf of Camel Global — a meet & greet car hire platform.

What is Camel Global: it is an additional digital channel that connects car hire companies with customers who want a vehicle delivered directly to them — at the airport, hotel, home or any other location. It works perfectly alongside your existing car hire business, without interfering with your current operations or existing channels. It doesn't replace anything — it simply gives you access to more customers who wouldn't otherwise find you.

How it works: customers submit requests online, nearby car hire companies receive the request, submit their quote, and when they win the booking, one of their drivers delivers the car directly to the customer. Simple, efficient, and fully managed through our platform.

Write a short, professional and friendly outreach email to the following car hire company:

Company name: ${prospect.company_name}
Contact name: ${prospect.contact_name || "unknown — use 'Hi,' or 'Dear team,'"}
City: ${prospect.city || ""}
Country: ${prospect.country || ""}
${prospect.notes ? `Notes: ${prospect.notes}` : ""}

Strict requirements:
- First line: email subject, prefixed with "Subject: "
- Blank line
- Body in simple HTML: <p> and <strong> tags only, no <html>/<body>
- Maximum 160 words
- Mention their city if known
- Emphasise that Camel Global works alongside their existing business as an additional channel, not replacing it
- DO NOT mention commission rates, percentages or pricing in this email
- End with: <p>If you'd like to find out more, you can register at <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> or simply reply to this email.</p>
- Sign off: <p>The Camel Global Team</p>
- Do not use placeholder text like [NAME]`;

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
      messages: [{ role: "user", content: locale === "es" ? promptEs : promptEn }],
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
  const subjectLine = lines.find((l: string) => /^(asunto|subject):/i.test(l.trim())) || "";
  const subject = subjectLine.replace(/^(asunto|subject):\s*/i, "").trim()
    || (locale === "es"
      ? `Amplía tu negocio de alquiler con Camel Global — ${prospect.company_name}`
      : `Grow your car hire business with Camel Global — ${prospect.company_name}`);

  const bodyStartIndex = lines.findIndex((l: string) => /^(asunto|subject):/i.test(l.trim()));
  const htmlBody = lines.slice(bodyStartIndex + 2).join("\n").trim();

  const headerLabel = locale === "es" ? "Camel Global · Invitación a Socios" : "Camel Global · Partner Invitation";

  const footerEs = `
    Camel Global &middot; <a href="mailto:partners@camel-global.com" style="color:#999;text-decoration:none;">partners@camel-global.com</a> &middot; <a href="https://camel-global.com" style="color:#999;text-decoration:none;">camel-global.com</a><br/>
    Recibes este email porque tu empresa fue identificada como posible socio en tu área.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Cancelar suscripción</a>
  `;

  const footerEn = `
    Camel Global &middot; <a href="mailto:partners@camel-global.com" style="color:#999;text-decoration:none;">partners@camel-global.com</a> &middot; <a href="https://camel-global.com" style="color:#999;text-decoration:none;">camel-global.com</a><br/>
    You are receiving this email because your business was identified as a potential partner in your area.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a>
  `;

  const fullHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#222;line-height:1.7;max-width:600px;">
      <div style="background:#000;padding:20px 28px;margin-bottom:0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="vertical-align:middle;">
              <img src="https://portal.camel-global.com/camel-invoice-logo.png" alt="Camel Global" style="height:36px;width:auto;display:block;" />
            </td>
            <td style="vertical-align:middle;padding-left:16px;">
              <p style="color:#ff7a00;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0;">${headerLabel}</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="padding:28px;border:1px solid #eee;border-top:none;">
        ${htmlBody}
      </div>
      <div style="padding:16px 28px;background:#f8f8f8;border:1px solid #eee;border-top:none;font-size:12px;color:#999;line-height:1.8;">
        ${locale === "es" ? footerEs : footerEn}
      </div>
    </div>
  `;

  return { subject, htmlBody, fullHtml };
}