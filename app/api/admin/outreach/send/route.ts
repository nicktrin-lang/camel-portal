import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const DAILY_LIMIT = 50;

/** Outreach is sent from a noreply@ address, so without an explicit Reply-To an
 *  interested partner who hits Reply reaches nobody. Cold B2B outreach lives on the
 *  reply, and the recipient SEES this address — it must be a company mailbox, not a
 *  personal one. Matches where the contact form already routes "Partnership / become a
 *  partner" enquiries (app/api/contact/route.ts), so partner replies land in one place. */
const OUTREACH_REPLY_TO = "partners@camel-global.com";

function isAllowed(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

function getLocale(country?: string | null): "en" | "es" | "fr" | "it" | "pt" | "de" {
  const c = (country || "").toLowerCase().trim();
  if (["spain", "españa", "espana"].includes(c)) return "es";
  if (["france"].includes(c)) return "fr";
  if (["italy", "italia"].includes(c)) return "it";
  if (["portugal"].includes(c)) return "pt";
  if (["germany", "deutschland"].includes(c)) return "de";
  return "en";
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
  // Deliberately the ROOT, not /partner/signup. The root IS the partner-recruitment
  // landing page, and it carries the outreach instrumentation: HomePageContent fires
  // `outreach_landing` (real browsers only — scanners pre-fetch without running JS,
  // so this is the honest human-click number) and `outreach_cta_click` on the way to
  // signup, and it renders the unsubscribed banner. Pointing this at /partner/signup
  // silently breaks all of that. Do not "fix" this URL.
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
        headers: { "Reply-To": OUTREACH_REPLY_TO },
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
        "Reply-To":              OUTREACH_REPLY_TO,
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
  const city = (prospect.city || "").trim();

  // Copy is WRITTEN per locale, not translated literally - a locale that reads like a
  // translation reads like spam to the operator receiving it. House style: hyphens, never
  // em dashes (matches the guide content sweep).
  //
  // Deliberately absent: any "priority visibility" / "limited founding places" claim. The
  // match loop in camel-customer emails EVERY live in-radius partner via Promise.allSettled
  // with no ordering or tier, so that promise was never deliverable.
  const btn = (label: string) => `
    <p style="text-align:left;margin:32px 0;">
      <a href="${signupUrl}" style="background:#ff7a00;color:#ffffff;padding:14px 36px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.05em;">${label}</a>
    </p>`;

  type OutreachCopy = { subject: string; greeting: string; body: string };

  const COPY: Record<"en" | "es" | "fr" | "it" | "pt" | "de", OutreachCopy> = {
    en: {
      subject: city
        ? `Customers are searching for car hire in ${city} right now`
        : `Customers are searching for car hire in your area right now`,
      greeting: contactFirst ? `<p>Hi ${contactFirst},</p>` : `<p>Hello,</p>`,
      body: `
    <p>Every rental fleet has days when cars sit idle. Camel Global is one way to fill a few of them.</p>
    <p>We're a meet &amp; greet car hire marketplace. A customer books online, you send a quote, and if they accept it your driver delivers the car to their airport, hotel or address - no desk, no queue.</p>
    <p>It runs alongside your existing business as an extra booking channel. Your prices, your vehicles, your drivers. Nothing about how you operate changes.</p>
    <p>Free to join - no sign-up fee, no subscription, no monthly cost. You pay commission only on bookings you complete.</p>
    <p>Registration takes about five minutes.</p>
    ${btn("REGISTER NOW")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Founder - Camel Global</p>`,
    },
    es: {
      subject: city
        ? `Ahora mismo hay clientes buscando alquiler de coches en ${city}`
        : `Ahora mismo hay clientes buscando alquiler de coches en su zona`,
      greeting: contactFirst ? `<p>Estimado/a ${contactFirst}:</p>` : `<p>Estimados señores:</p>`,
      body: `
    <p>Toda flota de alquiler tiene días en los que hay coches parados. Camel Global es una forma de llenar algunos de ellos.</p>
    <p>Somos un marketplace de alquiler de coches con entrega meet &amp; greet: el cliente reserva online, usted envía su presupuesto y, si lo acepta, su conductor le entrega el coche en el aeropuerto, el hotel o la dirección que indique. Sin mostrador y sin colas.</p>
    <p>Funciona en paralelo a su negocio actual, como un canal de reservas adicional. Sus precios, sus vehículos, sus conductores. No cambia nada en su forma de operar.</p>
    <p>Darse de alta es gratis: sin cuota de alta, sin suscripción y sin costes mensuales. Solo paga comisión por las reservas que complete.</p>
    <p>El registro le llevará unos cinco minutos.</p>
    ${btn("REGÍSTRESE AHORA")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fundador - Camel Global</p>`,
    },
    fr: {
      subject: city
        ? `En ce moment, des clients cherchent une location de voiture à ${city}`
        : `En ce moment, des clients cherchent une location de voiture dans votre région`,
      greeting: contactFirst ? `<p>Bonjour ${contactFirst},</p>` : `<p>Bonjour,</p>`,
      body: `
    <p>Toute flotte de location a des jours où des véhicules restent immobilisés. Camel Global est un moyen d'en remplir quelques-uns.</p>
    <p>Nous sommes une marketplace de location de voitures avec livraison meet &amp; greet : le client réserve en ligne, vous envoyez votre devis et, s'il l'accepte, votre chauffeur lui livre le véhicule à l'aéroport, à l'hôtel ou à l'adresse de son choix. Sans comptoir et sans file d'attente.</p>
    <p>Cela fonctionne en parallèle de votre activité actuelle, comme un canal de réservation supplémentaire. Vos tarifs, vos véhicules, vos chauffeurs. Rien ne change dans votre façon de travailler.</p>
    <p>L'inscription est gratuite : pas de frais d'ouverture, pas d'abonnement, aucun coût mensuel. Vous ne payez de commission que sur les réservations que vous réalisez.</p>
    <p>L'inscription prend environ cinq minutes.</p>
    ${btn("S'INSCRIRE MAINTENANT")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fondateur - Camel Global</p>`,
    },
    it: {
      subject: city
        ? `In questo momento ci sono clienti che cercano un'auto a noleggio a ${city}`
        : `In questo momento ci sono clienti che cercano un'auto a noleggio nella sua zona`,
      greeting: contactFirst ? `<p>Gentile ${contactFirst},</p>` : `<p>Gentili Signori,</p>`,
      body: `
    <p>Ogni flotta a noleggio ha giorni in cui le auto restano ferme. Camel Global è un modo per riempirne alcuni.</p>
    <p>Siamo un marketplace di autonoleggio con consegna meet &amp; greet: il cliente prenota online, lei invia il suo preventivo e, se lo accetta, il suo autista gli consegna l'auto in aeroporto, in hotel o all'indirizzo indicato. Senza banco e senza code.</p>
    <p>Funziona in parallelo alla sua attività attuale, come canale di prenotazione aggiuntivo. I suoi prezzi, i suoi veicoli, i suoi autisti. Non cambia nulla nel suo modo di operare.</p>
    <p>L'iscrizione è gratuita: nessuna quota di attivazione, nessun abbonamento, nessun costo mensile. Paga una commissione solo sulle prenotazioni che porta a termine.</p>
    <p>La registrazione richiede circa cinque minuti.</p>
    ${btn("ISCRIVITI ORA")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fondatore - Camel Global</p>`,
    },
    pt: {
      subject: city
        ? `Neste momento há clientes à procura de aluguer de automóveis em ${city}`
        : `Neste momento há clientes à procura de aluguer de automóveis na sua zona`,
      greeting: contactFirst ? `<p>Caro/a ${contactFirst},</p>` : `<p>Exmos. Senhores,</p>`,
      body: `
    <p>Todas as frotas de aluguer têm dias em que os carros ficam parados. A Camel Global é uma forma de preencher alguns deles.</p>
    <p>Somos um marketplace de aluguer de automóveis com entrega meet &amp; greet: o cliente reserva online, você envia o seu orçamento e, se o aceitar, o seu motorista entrega-lhe o carro no aeroporto, no hotel ou na morada indicada. Sem balcão e sem filas.</p>
    <p>Funciona em paralelo com o seu negócio atual, como um canal de reservas adicional. Os seus preços, os seus veículos, os seus motoristas. Não muda nada na sua forma de operar.</p>
    <p>A adesão é gratuita: sem taxa de inscrição, sem subscrição e sem custos mensais. Só paga comissão pelas reservas que concluir.</p>
    <p>O registo demora cerca de cinco minutos.</p>
    ${btn("REGISTAR AGORA")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Fundador - Camel Global</p>`,
    },
    de: {
      subject: city
        ? `Gerade jetzt suchen Kunden in ${city} nach einem Mietwagen`
        : `Gerade jetzt suchen Kunden in Ihrer Region nach einem Mietwagen`,
      greeting: contactFirst ? `<p>Guten Tag ${contactFirst},</p>` : `<p>Guten Tag,</p>`,
      body: `
    <p>In jeder Mietwagenflotte stehen an manchen Tagen Fahrzeuge still. Camel Global ist eine Möglichkeit, einige davon zu füllen.</p>
    <p>Wir sind ein Mietwagen-Marktplatz mit Meet-&amp;-Greet-Lieferung: Der Kunde bucht online, Sie senden Ihr Angebot, und wenn er es annimmt, liefert Ihr Fahrer den Wagen zum Flughafen, zum Hotel oder an die gewünschte Adresse. Ohne Schalter, ohne Warteschlange.</p>
    <p>Das läuft parallel zu Ihrem bestehenden Geschäft, als zusätzlicher Buchungskanal. Ihre Preise, Ihre Fahrzeuge, Ihre Fahrer. An Ihrem Betriebsablauf ändert sich nichts.</p>
    <p>Die Anmeldung ist kostenlos: keine Aufnahmegebühr, kein Abonnement, keine monatlichen Kosten. Provision zahlen Sie nur für Buchungen, die Sie tatsächlich abschließen.</p>
    <p>Die Registrierung dauert etwa fünf Minuten.</p>
    ${btn("JETZT ANMELDEN")}
    <p style="margin-top:24px;">Nicholas Trinnaman<br/>Gründer - Camel Global</p>`,
    },
  };

  const copy     = COPY[locale];
  const subject  = copy.subject;
  const greeting = copy.greeting;
  const htmlBody = `${greeting}${copy.body}`;

  const footerEs = `
    Recibes este email porque tu empresa fue identificada como posible socio en tu área.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Cancelar suscripción</a>
  `;

  const footerFr = `
    Vous recevez cet e-mail parce que votre entreprise a été identifiée comme partenaire potentiel dans votre zone.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Se désabonner</a>
  `;

  const footerIt = `
    Stai ricevendo questa e-mail perché la tua azienda è stata identificata come potenziale partner nella tua area.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Annulla iscrizione</a>
  `;

  const footerPt = `
    Está a receber este e-mail porque a sua empresa foi identificada como parceiro potencial na sua área.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Cancelar subscrição</a>
  `;

  const footerDe = `
    Sie erhalten diese E-Mail, weil Ihr Unternehmen als potenzieller Partner in Ihrer Region identifiziert wurde.<br/>
    <a href="${unsubscribeUrl}" style="color:#bbb;">Abbestellen</a>
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
        ${locale === "es" ? footerEs : locale === "fr" ? footerFr : locale === "it" ? footerIt : locale === "pt" ? footerPt : locale === "de" ? footerDe : footerEn}
      </div>
    </div>
  `;

  return { subject, htmlBody, fullHtml };
}
