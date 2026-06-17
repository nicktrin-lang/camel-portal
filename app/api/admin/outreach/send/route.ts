import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const DAILY_LIMIT = 50;

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

function getLocale(country?: string | null): "es" | "en" {
  const esCountries = ["spain", "españa", "espana"];
  return esCountries.includes((country || "").toLowerCase().trim()) ? "es" : "en";
}

function countrySlug(country?: string | null): string {
  return (country || "unknown").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function buildSignupUrl(prospectId: string, country?: string | null): string {
  const params = new URLSearchParams({
    utm_source:   "outreach",
    utm_medium:   "email",
    utm_campaign: "founding-partner",
    utm_content:  "signup-button",
    utm_term:     countrySlug(country),
    ref:          prospectId,
  });
  // Links directly to signup page to reduce friction
  return `https://portal.camel-global.com/?${params.toString()}`;
}

function buildUnsubscribeUrl(prospectId: string, country?: string | null): string {
  const params = new URLSearchParams({
    id:           prospectId,
    utm_source:   "outreach",
    utm_medium:   "email",
    utm_campaign: "founding-partner",
    utm_content:  "unsubscribe",
    utm_term:     countrySlug(country),
  });
  return `https://portal.camel-global.com/api/admin/outreach/unsubscribe?${params.toString()}`;
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
        id:           "test-id",
        company_name: "City Car Hire Ltd",
        contact_name: "James Smith",
        city:         "Manchester",
        country:      "UK",
        notes:        null,
      };
      const emailHtml = await generateEmail(testProspect);
      await sendEmail({
        to:      adminEmail,
        from:    "Camel Global <noreply@e.camel-global.com>",
        subject: `[TEST] ${emailHtml.subject}`,
        html:    emailHtml.fullHtml,
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
        sent_today:  sentToday,
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

    const emailHtml     = await generateEmail(prospect);
    const unsubscribeUrl = buildUnsubscribeUrl(prospect_id, prospect.country);

    await sendEmail({
      to:      prospect.email,
      from:    "Camel Global <noreply@e.camel-global.com>",
      subject: emailHtml.subject,
      html:    emailHtml.fullHtml,
      headers: {
        "List-Unsubscribe":      `<${unsubscribeUrl}>`,
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
  const locale        = getLocale(prospect.country);
  const signupUrl     = buildSignupUrl(prospect.id, prospect.country);
  const unsubscribeUrl = buildUnsubscribeUrl(prospect.id, prospect.country);

  const contactFirst = prospect.contact_name ? prospect.contact_name.split(" ")[0] : null;
  const openingLine  = locale === "es"
    ? `<p>${contactFirst ? `Hola ${contactFirst},` : ""} ¿le gustaría que ${prospect.company_name} atrajera más clientes de alquiler de coches${prospect.city ? ` en ${prospect.city}` : ""}?</p>`
    : `<p>${contactFirst ? `Hi ${contactFirst},` : ""} would you like ${prospect.company_name} to attract more customers searching for car hire${prospect.city ? ` in ${prospect.city}` : ""}?</p>`;

  const greeting = prospect.contact_name
    ? (locale === "es" ? `<p>Estimado/a ${prospect.contact_name},</p>` : `<p>Dear ${prospect.contact_name},</p>`)
    : (locale === "es" ? `<p>Estimado equipo,</p>` : `<p>Dear team,</p>`);

  const subject = locale === "es"
    ? `Camel Global - Meet & Greet Alquiler de Coches - Invitación a Socio Fundador`
    : `Camel Global - Meet & Greet Car Hire - Founding Partner Invitation`;

  const ctaEs = `
    <p style="text-align:left;margin:32px 0;">
      <a href="${signupUrl}" style="background:#ff7a00;color:#ffffff;padding:14px 36px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.05em;">REGÍSTRATE AHORA</a>
    </p>`;

  const ctaEn = `
    <p style="text-align:left;margin:32px 0;">
      <a href="${signupUrl}" style="background:#ff7a00;color:#ffffff;padding:14px 36px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.05em;">SIGN UP NOW</a>
    </p>`;

  const bodyEs = `
    ${greeting}
    ${openingLine}
    <p>Estamos lanzando Camel Global — una plataforma de alquiler de coches meet &amp; greet construida específicamente para empresas de alquiler de coches independientes — y nos gustaría invitar a ${prospect.company_name} a unirse como socio fundador.</p>
    <p>Cómo funciona: los clientes solicitan un vehículo online, usted envía un presupuesto, el cliente paga y su conductor lo entrega directamente en el aeropuerto, hotel o donde el cliente lo necesite. Funciona junto a su negocio existente como un canal adicional de reservas — nada cambia en cómo opera.</p>
    <p><strong>Las plazas de socio fundador son limitadas por destino.</strong> Los primeros socios obtienen visibilidad prioritaria cuando lancemos en España y nos expandamos internacionalmente.</p>
    <p>Unirse es completamente gratuito. Sin cuotas de alta, sin suscripción, sin costes mensuales. El registro tarda aproximadamente cinco minutos.</p>
    ${ctaEs}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fundador — Camel Global</p>
  `;

  const bodyEn = `
    ${greeting}
    ${openingLine}
    <p>We're launching Camel Global — a meet &amp; greet car rental platform built specifically for independent car hire companies — and we'd like to invite ${prospect.company_name} to join as a founding partner.</p>
    <p>How it works: Customers request a vehicle online, you send a quote, the customer pays and your driver delivers it directly to the airport, hotel, or wherever the customer needs it. It works alongside your existing business as an additional booking channel — nothing changes in how you operate.</p>
    <p><strong>Founding partner positions are limited per destination.</strong> Early partners receive priority visibility when we launch in Spain and expand internationally.</p>
    <p>Joining is completely free. No sign-up fees, no subscription, no monthly costs. Registration takes approximately five minutes.</p>
    ${ctaEn}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Founder — Camel Global</p>
  `;

  const htmlBody = locale === "es" ? bodyEs : bodyEn;

  const footerEs = `
    Recibes este email porque tu empresa fue identificada como posible socio en tu área.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Cancelar suscripción</a>
  `;

  const footerEn = `
    You are receiving this email because your business was identified as a potential partner in your area.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a>
  `;

  const fullHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#222;line-height:1.7;max-width:600px;">
      <div style="background:#000;padding:28px;text-align:center;">
        <img src="https://portal.camel-global.com/camel-logo-white-new.png" alt="Camel Global" style="height:108px;width:auto;display:inline-block;" />
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
