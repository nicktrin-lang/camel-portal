import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { AIRPORT_LABEL } from "@/lib/outreach/airportLabels";

// Partner outreach email: copy, language, airport line, and the one function that sends it
// to a prospect. Used by the admin send route (manual sends + test emails) and by the
// weekday auto-send cron (app/api/cron/outreach-autosend), so both send the same email
// under the same daily limit.

type Db = ReturnType<typeof createServiceRoleSupabaseClient>;

export const DAILY_LIMIT = 50;

/** Outreach is sent from a noreply@ address, so without an explicit Reply-To an
 *  interested partner who hits Reply reaches nobody. Cold B2B outreach lives on the
 *  reply, and the recipient SEES this address — it must be a company mailbox, not a
 *  personal one. Matches where the contact form already routes "Partnership / become a
 *  partner" enquiries (app/api/contact/route.ts), so partner replies land in one place. */
export const OUTREACH_REPLY_TO = "partners@camel-global.com";

/** Sender shown in the inbox. Nick's call: the company name, not his. The address is on the
 *  verified sending domain and has no mailbox; replies go to OUTREACH_REPLY_TO. The email
 *  body is still signed by Nicholas as founder. */
export const OUTREACH_FROM = "Camel Global <partners@e.camel-global.com>";

export type Locale = "en" | "es" | "fr" | "it" | "pt" | "de";

/** Nearest airport within this distance is named in the email's opening line. Matches the
 *  directory's Airports view (lib/outreach/groupByAirport.ts). */
const AIRPORT_RADIUS_KM = 30;

export type NearAirport = { iata: string; km: number };

/** The directory place(s) this prospect came from know their nearest airport. Prospects
 *  added by hand or CSV have no directory row and get the town-based email instead. */
export async function nearAirportFor(db: Db, prospectId: string): Promise<NearAirport | null> {
  const { data } = await db.from("outreach_directory")
    .select("nearest_airport, airport_km")
    .eq("prospect_id", prospectId)
    .not("nearest_airport", "is", null)
    .lte("airport_km", AIRPORT_RADIUS_KM)
    .order("airport_km")
    .limit(1);
  const row = data?.[0];
  return row?.nearest_airport && row.airport_km != null ? { iata: row.nearest_airport, km: Number(row.airport_km) } : null;
}

// One sample prospect per language for "Send Test Email", so each version can be read
// before it goes out. Real prospects never use these.
export const TEST_PROSPECTS: Record<Locale, { company_name: string; city: string; country: string; airport: NearAirport }> = {
  en: { company_name: "City Car Hire Ltd",  city: "Manchester", country: "UK",       airport: { iata: "MAN", km: 3.4 } },
  es: { company_name: "Autos Costa del Sol", city: "Málaga",    country: "Spain",    airport: { iata: "AGP", km: 1.2 } },
  fr: { company_name: "Azur Location",      city: "Nice",       country: "France",   airport: { iata: "NCE", km: 2.1 } },
  it: { company_name: "Etna Rent",          city: "Catania",    country: "Italy",    airport: { iata: "CTA", km: 1.8 } },
  pt: { company_name: "Algarve Rent",       city: "Faro",       country: "Portugal", airport: { iata: "FAO", km: 2.6 } },
  de: { company_name: "Isar Mietwagen",     city: "München",    country: "Germany",  airport: { iata: "MUC", km: 4.5 } },
};


// Countries whose business language is one of our six. The car hire directory adds
// prospects from every country (with English country names), so Spanish-speaking Latin
// America, Brazil, Austria etc. get their own language instead of English. Countries with
// several official languages (Switzerland, Belgium, Canada…) stay English on purpose.
const LOCALE_BY_COUNTRY: Record<string, "es" | "fr" | "it" | "pt" | "de"> = {
  spain: "es", "españa": "es", espana: "es", andorra: "es", mexico: "es", argentina: "es", chile: "es",
  colombia: "es", peru: "es", venezuela: "es", ecuador: "es", guatemala: "es", cuba: "es", bolivia: "es",
  "dominican republic": "es", honduras: "es", paraguay: "es", "el salvador": "es", nicaragua: "es",
  "costa rica": "es", panama: "es", uruguay: "es", "puerto rico": "es",
  france: "fr", monaco: "fr", "french guiana": "fr", "réunion": "fr", reunion: "fr", guadeloupe: "fr", martinique: "fr",
  italy: "it", italia: "it", "san marino": "it",
  portugal: "pt", brazil: "pt", angola: "pt", mozambique: "pt", "cape verde": "pt", "cabo verde": "pt",
  germany: "de", deutschland: "de", austria: "de", liechtenstein: "de",
};

export function getLocale(country?: string | null): Locale {
  const c = (country || "").toLowerCase().trim();
  return LOCALE_BY_COUNTRY[c] ?? "en";
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

export function buildUnsubscribeUrl(prospectId: string, country?: string | null): string {
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

/** Outreach emails sent since midnight (server time), the figure the daily limit counts. */
export async function sentTodayCount(db: Db): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await db
    .from("outreach_prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", todayStart.toISOString());
  return count || 0;
}

/** Sends the outreach email to one prospect and marks it sent. Throws if the send fails,
 *  leaving the prospect untouched. Callers check the daily limit and unsubscribes first. */
export async function sendToProspect(db: Db, prospect: { id: string; email: string; company_name: string; contact_name?: string | null; city?: string | null; country?: string | null; notes?: string | null }) {
  const emailHtml      = await generateEmail(prospect, await nearAirportFor(db, prospect.id));
  const unsubscribeUrl = buildUnsubscribeUrl(prospect.id, prospect.country);

  await sendEmail({
    to:      prospect.email,
    from:    OUTREACH_FROM,
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
    .eq("id", prospect.id);

  return emailHtml.subject;
}

export async function generateEmail(prospect: {
  id: string;
  company_name: string;
  contact_name?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
}, airport: NearAirport | null) {
  const locale        = getLocale(prospect.country);
  const signupUrl     = buildSignupUrl(prospect.id, prospect.country);
  const unsubscribeUrl = buildUnsubscribeUrl(prospect.id, prospect.country);

  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const contactFirst = prospect.contact_name ? esc(prospect.contact_name.split(" ")[0]) : null;
  const cityText = (prospect.city || "").trim();
  const city = esc(cityText);

  // Opening line uses the nearest airport when the prospect came from the directory and
  // sits within AIRPORT_RADIUS_KM of one; otherwise it speaks to the town.
  const ap = airport ? AIRPORT_LABEL[airport.iata] ?? null : null;
  const NUM_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-PT", de: "de-DE" };
  const km = airport ? airport.km.toLocaleString(NUM_LOCALE[locale], { maximumFractionDigits: 1 }) : "";
  const iata = airport?.iata ?? "";
  const frDe = (name: string) => (/^[aeiouyhàâäéèêëîïôöûüAEIOUYHÀÂÉÈÊÎÔÛ]/.test(name) ? `d'${name}` : `de ${name}`);

  // Copy is WRITTEN per locale, not translated literally - a locale that reads like a
  // translation reads like spam to the operator receiving it. House style: hyphens, never
  // em dashes (matches the guide content sweep).
  //
  // Short on purpose: the email's only job is the click; the portal homepage explains the
  // model. Deliberately absent: commission (left to the homepage), and any "priority
  // visibility" / "limited founding places" claim - the match loop in camel-customer emails
  // EVERY live in-radius partner via Promise.allSettled with no ordering or tier.
  const btn = (label: string) => `
    <p style="text-align:left;margin:28px 0;">
      <a href="${signupUrl}" style="background:#ff7a00;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${label}</a>
    </p>`;

  type OutreachCopy = { subject: string; greeting: string; body: string };

  const COPY: Record<Locale, OutreachCopy> = {
    en: {
      subject: airport
        ? (ap ? `Car hire bookings at ${ap} airport` : city ? `Airport car hire bookings in ${cityText}` : `Airport car hire bookings`)
        : (city ? `Car hire bookings in ${cityText}` : `Car hire bookings in your area`),
      greeting: contactFirst ? `<p>Hi ${contactFirst},</p>` : `<p>Hello,</p>`,
      body: `
    ${airport
      ? `<p>Your office is ${km} km from ${ap ? `${esc(ap)} airport` : "the nearest airport"} (${iata}), so you'll know most travellers still queue at a desk to collect their hire car.</p>
    <p>Camel Global lets those travellers skip the desk and have the car delivered wherever they choose: at arrivals, their hotel or any other address. You get the booking request and quote your own price, and if they accept, your driver hands over the keys. It's free to join.</p>`
      : `<p>I'm writing to car hire companies ${city ? `in ${city}` : "in your area"}.</p>
    <p>Camel Global lets travellers book a hire car delivered wherever they choose - the airport, their hotel or any other address - instead of queuing at a desk. You get the booking request and quote your own price, and if they accept, your driver hands over the keys. It's free to join.</p>`}
    <p>It takes two minutes to see how it works:</p>
    ${btn("See how it works")}
    <p>Nicholas Trinnaman<br/>Founder, Camel Global</p>`,
    },
    es: {
      subject: airport
        ? (ap ? `Reservas de alquiler de coches en el aeropuerto de ${ap}` : city ? `Reservas de alquiler de coches en ${cityText}` : `Reservas de alquiler de coches en su zona`)
        : (city ? `Reservas de alquiler de coches en ${cityText}` : `Reservas de alquiler de coches en su zona`),
      greeting: contactFirst ? `<p>Hola, ${contactFirst}:</p>` : `<p>Buenos días:</p>`,
      body: `
    ${airport
      ? `<p>Su oficina está a ${km} km ${ap ? `del aeropuerto de ${esc(ap)}` : "del aeropuerto más cercano"} (${iata}), así que sabrá que la mayoría de los viajeros todavía hacen cola en un mostrador para recoger su coche de alquiler.</p>
    <p>Camel Global permite a esos viajeros reservar un coche que se les entrega donde ellos elijan: en la zona de llegadas, en su hotel o en cualquier otra dirección. Usted recibe la solicitud de reserva y propone su propio precio y, si el cliente lo acepta, su conductor le entrega las llaves. Darse de alta es gratis.</p>`
      : `<p>Le escribo a las empresas de alquiler de coches ${city ? `de ${city}` : "de su zona"}.</p>
    <p>Camel Global permite a los viajeros reservar un coche de alquiler que se les entrega donde elijan (en el aeropuerto, en su hotel o en cualquier otra dirección) en lugar de hacer cola en un mostrador. Usted recibe la solicitud de reserva y propone su propio precio y, si el cliente lo acepta, su conductor le entrega las llaves. Darse de alta es gratis.</p>`}
    <p>En dos minutos puede ver cómo funciona:</p>
    ${btn("Ver cómo funciona")}
    <p>Nicholas Trinnaman<br/>Fundador, Camel Global</p>`,
    },
    fr: {
      subject: airport
        ? (ap ? `Réservations de location de voitures à l'aéroport ${frDe(ap)}` : city ? `Réservations de location de voitures à ${cityText}` : `Réservations de location de voitures dans votre région`)
        : (city ? `Réservations de location de voitures à ${cityText}` : `Réservations de location de voitures dans votre région`),
      greeting: contactFirst ? `<p>Bonjour ${contactFirst},</p>` : `<p>Bonjour,</p>`,
      body: `
    ${airport
      ? `<p>Votre agence est à ${km} km ${ap ? `de l'aéroport ${esc(frDe(ap))}` : "de l'aéroport le plus proche"} (${iata}) : vous savez donc que la plupart des voyageurs font encore la queue à un comptoir pour récupérer leur voiture de location.</p>
    <p>Camel Global permet à ces voyageurs de réserver une voiture livrée à l'endroit de leur choix : à l'arrivée, à leur hôtel ou à toute autre adresse. Vous recevez la demande de réservation et proposez votre propre prix ; si le client accepte, votre chauffeur lui remet les clés. L'inscription est gratuite.</p>`
      : `<p>Je m'adresse aux loueurs de voitures ${city ? `de ${city}` : "de votre région"}.</p>
    <p>Camel Global permet aux voyageurs de réserver une voiture de location livrée à l'endroit de leur choix (à l'aéroport, à leur hôtel ou à toute autre adresse) au lieu de faire la queue à un comptoir. Vous recevez la demande de réservation et proposez votre propre prix ; si le client accepte, votre chauffeur lui remet les clés. L'inscription est gratuite.</p>`}
    <p>Deux minutes suffisent pour voir comment cela fonctionne :</p>
    ${btn("Voir comment ça marche")}
    <p>Nicholas Trinnaman<br/>Fondateur, Camel Global</p>`,
    },
    it: {
      subject: airport
        ? (ap ? `Prenotazioni di auto a noleggio all'aeroporto di ${ap}` : city ? `Prenotazioni di auto a noleggio a ${cityText}` : `Prenotazioni di auto a noleggio nella sua zona`)
        : (city ? `Prenotazioni di auto a noleggio a ${cityText}` : `Prenotazioni di auto a noleggio nella sua zona`),
      greeting: contactFirst ? `<p>Buongiorno ${contactFirst},</p>` : `<p>Buongiorno,</p>`,
      body: `
    ${airport
      ? `<p>La sua sede è a ${km} km ${ap ? `dall'aeroporto di ${esc(ap)}` : "dall'aeroporto più vicino"} (${iata}), quindi sa bene che la maggior parte dei viaggiatori fa ancora la fila a un banco per ritirare l'auto a noleggio.</p>
    <p>Camel Global permette a questi viaggiatori di prenotare un'auto consegnata dove preferiscono: agli arrivi, in hotel o a qualsiasi altro indirizzo. Lei riceve la richiesta di prenotazione e propone il suo prezzo; se il cliente accetta, il suo autista gli consegna le chiavi. L'iscrizione è gratuita.</p>`
      : `<p>Scrivo alle società di autonoleggio ${city ? `di ${city}` : "della sua zona"}.</p>
    <p>Camel Global permette ai viaggiatori di prenotare un'auto a noleggio consegnata dove preferiscono (in aeroporto, in hotel o a qualsiasi altro indirizzo) invece di fare la fila a un banco. Lei riceve la richiesta di prenotazione e propone il suo prezzo; se il cliente accetta, il suo autista gli consegna le chiavi. L'iscrizione è gratuita.</p>`}
    <p>Bastano due minuti per vedere come funziona:</p>
    ${btn("Scopra come funziona")}
    <p>Nicholas Trinnaman<br/>Fondatore, Camel Global</p>`,
    },
    pt: {
      subject: airport
        ? (ap ? `Reservas de aluguer de automóveis no aeroporto de ${ap}` : city ? `Reservas de aluguer de automóveis em ${cityText}` : `Reservas de aluguer de automóveis na sua zona`)
        : (city ? `Reservas de aluguer de automóveis em ${cityText}` : `Reservas de aluguer de automóveis na sua zona`),
      greeting: contactFirst ? `<p>Olá, ${contactFirst},</p>` : `<p>Bom dia,</p>`,
      body: `
    ${airport
      ? `<p>O seu escritório fica a ${km} km ${ap ? `do aeroporto de ${esc(ap)}` : "do aeroporto mais próximo"} (${iata}), por isso sabe que a maioria dos viajantes ainda faz fila num balcão para levantar o carro alugado.</p>
    <p>A Camel Global permite que esses viajantes reservem um carro entregue onde preferirem: na zona de chegadas, no hotel ou em qualquer outra morada. Recebe o pedido de reserva e propõe o seu próprio preço; se o cliente aceitar, o seu motorista entrega-lhe as chaves. A adesão é gratuita.</p>`
      : `<p>Escrevo às empresas de aluguer de automóveis ${city ? `de ${city}` : "da sua zona"}.</p>
    <p>A Camel Global permite que os viajantes reservem um carro alugado entregue onde preferirem (no aeroporto, no hotel ou em qualquer outra morada), em vez de fazerem fila num balcão. Recebe o pedido de reserva e propõe o seu próprio preço; se o cliente aceitar, o seu motorista entrega-lhe as chaves. A adesão é gratuita.</p>`}
    <p>Em dois minutos pode ver como funciona:</p>
    ${btn("Ver como funciona")}
    <p>Nicholas Trinnaman<br/>Fundador, Camel Global</p>`,
    },
    de: {
      subject: airport
        ? (ap ? `Mietwagenbuchungen am Flughafen ${ap}` : city ? `Mietwagenbuchungen in ${cityText}` : `Mietwagenbuchungen in Ihrer Region`)
        : (city ? `Mietwagenbuchungen in ${cityText}` : `Mietwagenbuchungen in Ihrer Region`),
      greeting: contactFirst ? `<p>Guten Tag ${contactFirst},</p>` : `<p>Guten Tag,</p>`,
      body: `
    ${airport
      ? `<p>Ihr Standort liegt ${km} km ${ap ? `vom Flughafen ${esc(ap)}` : "vom nächstgelegenen Flughafen"} (${iata}) entfernt. Sie wissen also, dass die meisten Reisenden für ihren Mietwagen immer noch am Schalter anstehen.</p>
    <p>Mit Camel Global können diese Reisenden einen Wagen buchen, der ihnen dort übergeben wird, wo sie es wünschen: in der Ankunftshalle, am Hotel oder an jeder anderen Adresse. Sie erhalten die Buchungsanfrage und nennen Ihren eigenen Preis; nimmt der Kunde an, übergibt Ihr Fahrer die Schlüssel. Die Anmeldung ist kostenlos.</p>`
      : `<p>Ich schreibe an Autovermietungen ${city ? `in ${city}` : "in Ihrer Region"}.</p>
    <p>Mit Camel Global können Reisende einen Mietwagen buchen, der ihnen dort übergeben wird, wo sie es wünschen (am Flughafen, am Hotel oder an jeder anderen Adresse), statt am Schalter anzustehen. Sie erhalten die Buchungsanfrage und nennen Ihren eigenen Preis; nimmt der Kunde an, übergibt Ihr Fahrer die Schlüssel. Die Anmeldung ist kostenlos.</p>`}
    <p>In zwei Minuten sehen Sie, wie es funktioniert:</p>
    ${btn("So funktioniert es")}
    <p>Nicholas Trinnaman<br/>Gründer, Camel Global</p>`,
    },
  };

  const copy     = COPY[locale];
  const subject  = copy.subject;
  const greeting = copy.greeting;
  const htmlBody = `${greeting}${copy.body}`;

  const footerEs = `
    Recibe este correo porque su empresa fue identificada como posible socio en su zona.<br/>
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
      <div style="padding:8px 0 16px;font-size:15px;">
        ${htmlBody}
      </div>
      <div style="padding:16px 0;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.8;">
        ${locale === "es" ? footerEs : locale === "fr" ? footerFr : locale === "it" ? footerIt : locale === "pt" ? footerPt : locale === "de" ? footerDe : footerEn}
      </div>
    </div>
  `;

  return { subject, htmlBody, fullHtml };
}
