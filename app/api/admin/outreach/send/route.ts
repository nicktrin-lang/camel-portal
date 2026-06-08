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

  const promptEs = `Eres un asistente que escribe emails de captación en nombre de Camel Global — una plataforma de alquiler de coches meet & greet construida específicamente para operadores independientes.

Escribe un email de captación corto, profesional y directo siguiendo EXACTAMENTE esta estructura:

1. Saludo personalizado usando el nombre del contacto si se conoce, o "Estimado equipo," si no
2. Una frase de apertura que mencione su ciudad (si se conoce) y pregunte si les gustaría acceder a clientes que buscan alquiler de coches con entrega directa en aeropuerto, hotel o domicilio
3. Un párrafo corto que explique que Camel Global es un canal digital adicional — no reemplaza su negocio, simplemente lo complementa. Los clientes solicitan online, la empresa envía presupuesto, el conductor entrega directamente al cliente.
4. Una línea sobre las plazas de socio fundador: limitadas por destino, con visibilidad prioritaria al lanzar en España y expandirse internacionalmente
5. Una línea: completamente gratuito — sin cuotas de alta, sin suscripción mensual, registro en 5 minutos
6. CTA: <p>Si te interesa, puedes registrarte en <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> o simplemente responder a este email.</p>
7. Firma: <p>Nicholas Trinnaman<br/>Fundador — Camel Global</p>

Empresa: ${prospect.company_name}
Contacto: ${prospect.contact_name || "no conocido — usa 'Estimado equipo,'"}
Ciudad: ${prospect.city || "España"}
País: ${prospect.country || "España"}
${prospect.notes ? `Notas: ${prospect.notes}` : ""}

Requisitos estrictos:
- Primera línea del output: asunto del email con el prefijo "Asunto: "
- Línea en blanco
- Cuerpo en HTML simple: etiquetas <p> y <strong> únicamente, sin <html>/<body>
- Máximo 150 palabras en el cuerpo
- NO menciones comisiones, porcentajes ni precios
- No uses marcadores de posición como [NOMBRE]`;

  const promptEn = `You are an assistant writing outreach emails on behalf of Camel Global — a meet & greet car hire platform built specifically for independent operators.

Write a short, professional and direct outreach email following EXACTLY this structure:

1. Personalised greeting using the contact name if known, or "Dear team," if not
2. An opening line that mentions their city (if known) and asks whether they'd like access to customers looking for car hire with direct delivery to the airport, hotel or home
3. A short paragraph explaining that Camel Global is an additional digital channel — it doesn't replace their business, it simply adds to it. Customers request online, the company submits a quote, the driver delivers directly to the customer.
4. One line about founding partner places: limited per destination, with priority visibility as the platform launches across Spain and expands internationally
5. One line: completely free — no setup fees, no monthly subscription, registration takes around 5 minutes
6. CTA: <p>If you'd like to secure your place, you can register at <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> or simply reply to this email.</p>
7. Sign off: <p>Nicholas Trinnaman<br/>Founder — Camel Global</p>

Company: ${prospect.company_name}
Contact: ${prospect.contact_name || "unknown — use 'Dear team,'"}
City: ${prospect.city || ""}
Country: ${prospect.country || ""}
${prospect.notes ? `Notes: ${prospect.notes}` : ""}

Strict requirements:
- First line of output: email subject prefixed with "Subject: "
- Blank line
- Body in simple HTML: <p> and <strong> tags only, no <html>/<body>
- Maximum 150 words in the body
- DO NOT mention commission rates, percentages or pricing
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
      ? `Invitación a socio fundador — Camel Global · ${prospect.city || prospect.company_name}`
      : `Founding partner invitation — Camel Global · ${prospect.city || prospect.company_name}`);

  const bodyStartIndex = lines.findIndex((l: string) => /^(asunto|subject):/i.test(l.trim()));
  const htmlBody = lines.slice(bodyStartIndex + 2).join("\n").trim();

  const headerLabel = locale === "es" ? "Camel Global · Invitación a Socios Fundadores" : "Camel Global · Founding Partner Invitation";

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
      <div style="background:#000;padding:24px 28px;margin-bottom:0;text-align:center;">
        <img src="https://portal.camel-global.com/camel-logo.png" alt="Camel Global" style="height:56px;width:auto;display:inline-block;filter:brightness(0) invert(1);" />
        <p style="color:#ff7a00;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:10px 0 0 0;">${headerLabel}</p>
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