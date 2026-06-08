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
      return NextResponse.json({ ok: true, test: true, subject: emailHtml.subject });
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

  // Ask AI only for the personalised opening line — everything else is hardcoded
  const promptEs = `Escribe SOLO una frase de apertura personalizada para un email de captación a una empresa de alquiler de coches.

La frase debe mencionar su ciudad (si se conoce) y preguntar si les gustaría acceder a clientes que buscan alquiler de coches con entrega directa en aeropuerto, hotel o domicilio.

Empresa: ${prospect.company_name}
Contacto: ${prospect.contact_name || "no conocido"}
Ciudad: ${prospect.city || "España"}

Devuelve SOLO la frase de apertura en HTML simple (una etiqueta <p>). Sin saludos, sin asunto, sin nada más.`;

  const promptEn = `Write ONLY a single personalised opening sentence for a car hire company outreach email.

The sentence should mention their city (if known) and ask whether they would like access to customers looking for car hire with direct delivery to the airport, hotel or home.

Company: ${prospect.company_name}
Contact: ${prospect.contact_name || "unknown"}
City: ${prospect.city || ""}

Return ONLY the opening sentence as simple HTML (a single <p> tag). No greeting, no subject line, nothing else.`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: locale === "es" ? promptEs : promptEn }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const anthropicJson = await anthropicRes.json();
  const openingLine: string = anthropicJson?.content?.[0]?.text?.trim() || "";

  // Greeting
  const greeting = prospect.contact_name
    ? (locale === "es" ? `<p>Estimado/a ${prospect.contact_name},</p>` : `<p>Dear ${prospect.contact_name},</p>`)
    : (locale === "es" ? `<p>Estimado equipo,</p>` : `<p>Dear team,</p>`);

  // Subject
  const subject = locale === "es"
    ? `Invitación a socio fundador — Camel Global · ${prospect.city || prospect.company_name}`
    : `Founding partner invitation — Camel Global · ${prospect.city || prospect.company_name}`;

  // Hardcoded body in agreed structure
  const bodyEs = `
    ${greeting}
    ${openingLine || `<p>¿Le gustaría acceder a clientes que buscan alquiler de coches con entrega directa en aeropuerto, hotel o domicilio en ${prospect.city || "su área"}?</p>`}
    <p><strong>Camel Global es un canal digital adicional</strong> diseñado para empresas de alquiler independientes como la suya. No reemplaza su negocio — simplemente lo complementa. Los clientes solicitan online, usted envía su presupuesto, y su conductor entrega el vehículo directamente al cliente. Todo gestionado desde nuestra plataforma.</p>
    <p>Las plazas de <strong>socio fundador son limitadas por destino</strong>. Los primeros socios obtendrán visibilidad prioritaria cuando lancemos en España y nos expandamos internacionalmente.</p>
    <p>Unirse es completamente gratuito — sin cuotas de alta, sin suscripción mensual. El registro tarda aproximadamente 5 minutos.</p>
    <p>Si le interesa asegurar su plaza, puede registrarse en <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> o simplemente responder a este email.</p>
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fundador — Camel Global</p>
  `;

  const bodyEn = `
    ${greeting}
    ${openingLine || `<p>Would you like access to customers looking for car hire with direct delivery to the airport, hotel or home in ${prospect.city || "your area"}?</p>`}
    <p><strong>Camel Global is an additional digital channel</strong> built for independent car hire companies like yours. It doesn't replace your business — it simply adds to it. Customers request online, you submit a quote, and your driver delivers the vehicle directly to them. Everything managed through our platform.</p>
    <p><strong>Founding partner places are limited per destination.</strong> Early partners get priority visibility as we launch across Spain and expand internationally.</p>
    <p>Joining is completely free — no setup fees, no monthly subscription. Registration takes around 5 minutes.</p>
    <p>If you'd like to secure your place, you can register at <a href="https://www.camel-global.com/partner/signup" style="color:#ff7a00;">camel-global.com/partner/signup</a> or simply reply to this email.</p>
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Founder — Camel Global</p>
  `;

  const htmlBody = locale === "es" ? bodyEs : bodyEn;

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
      <!-- White logo strip -->
      <div style="background:#ffffff;padding:16px 28px;border:1px solid #eee;border-bottom:none;">
        <img src="https://portal.camel-global.com/camel-invoice-logo.png" alt="Camel Global" style="height:48px;width:auto;display:block;" />
      </div>
      <!-- Black header bar -->
      <div style="background:#000;padding:14px 28px;">
        <p style="color:#ff7a00;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0;">${headerLabel}</p>
      </div>
      <!-- Body -->
      <div style="padding:28px;border:1px solid #eee;border-top:none;">
        ${htmlBody}
      </div>
      <!-- Footer -->
      <div style="padding:16px 28px;background:#f8f8f8;border:1px solid #eee;border-top:none;font-size:12px;color:#999;line-height:1.8;">
        ${locale === "es" ? footerEs : footerEn}
      </div>
    </div>
  `;

  return { subject, htmlBody, fullHtml };
}