import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendEmail, coerceEmailLocale, EmailLocale } from "@/lib/email";

// ── GET — list partner's own suggestions ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = createServiceRoleSupabaseClient();
  const { data, error } = await db
    .from("partner_suggestions")
    .select("id, title, category, description, status, admin_notes, created_at, updated_at")
    .eq("partner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suggestions: data || [] });
}

// ── POST — submit a new suggestion ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { title, category, description } = body || {};

  if (!title?.trim())       return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!category?.trim())    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

  const validCategories = ["feature", "bug", "improvement"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const db = createServiceRoleSupabaseClient();

  // Get partner name for email
  const { data: profile } = await db
    .from("partner_profiles")
    .select("company_name, contact_name, communication_locale")
    .eq("user_id", user.id)
    .maybeSingle();

  const partnerName = profile?.company_name || profile?.contact_name || user.email || "Unknown partner";

  const { data: inserted, error } = await db
    .from("partner_suggestions")
    .insert({
      partner_user_id: user.id,
      partner_name:    partnerName,
      title:           title.trim(),
      category,
      description:     description.trim(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categoryLabel = category === "feature" ? "Feature Request" : category === "bug" ? "Bug Report" : "Improvement";
  const portalUrl     = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";
  const adminEmails   = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

  // Email partner — confirmation (localized to the partner's communication_locale)
  {
    const emailLocale = coerceEmailLocale(profile?.communication_locale);
    const tL = <T,>(m: Record<EmailLocale, T>) => m[emailLocale] ?? m.en;
    const catL: Record<EmailLocale, Record<string, string>> = {
      en: { feature: "Feature Request", bug: "Bug Report", improvement: "Improvement" },
      es: { feature: "Solicitud de función", bug: "Informe de error", improvement: "Mejora" },
      fr: { feature: "Demande de fonctionnalité", bug: "Rapport de bug", improvement: "Amélioration" },
      it: { feature: "Richiesta di funzionalità", bug: "Segnalazione di bug", improvement: "Miglioramento" },
      pt: { feature: "Pedido de funcionalidade", bug: "Relatório de erro", improvement: "Melhoria" },
      de: { feature: "Funktionswunsch", bug: "Fehlerbericht", improvement: "Verbesserung" },
    };
    const subjectL: Record<EmailLocale, string> = {
      en: `We've received your suggestion — ${title}`,
      es: `Hemos recibido tu sugerencia — ${title}`,
      fr: `Nous avons bien reçu votre suggestion — ${title}`,
      it: `Abbiamo ricevuto il tuo suggerimento — ${title}`,
      pt: `Recebemos a sua sugestão — ${title}`,
      de: `Wir haben Ihren Vorschlag erhalten — ${title}`,
    };
    const headL: Record<EmailLocale, string> = { en: "Suggestion Received ✅", es: "Sugerencia recibida ✅", fr: "Suggestion reçue ✅", it: "Suggerimento ricevuto ✅", pt: "Sugestão recebida ✅", de: "Vorschlag eingegangen ✅" };
    const hiL: Record<EmailLocale, string> = { en: `Hi ${profile?.contact_name || partnerName},`, es: `Hola ${profile?.contact_name || partnerName},`, fr: `Bonjour ${profile?.contact_name || partnerName},`, it: `Ciao ${profile?.contact_name || partnerName},`, pt: `Olá ${profile?.contact_name || partnerName},`, de: `Hallo ${profile?.contact_name || partnerName},` };
    const thanksL: Record<EmailLocale, string> = {
      en: "Thanks for your suggestion. We've received it and our team will review it shortly.",
      es: "Gracias por tu sugerencia. La hemos recibido y nuestro equipo la revisará en breve.",
      fr: "Merci pour votre suggestion. Nous l'avons bien reçue et notre équipe l'examinera sous peu.",
      it: "Grazie per il tuo suggerimento. L'abbiamo ricevuto e il nostro team lo esaminerà a breve.",
      pt: "Obrigado pela sua sugestão. Recebemo-la e a nossa equipa irá analisá-la em breve.",
      de: "Vielen Dank für Ihren Vorschlag. Wir haben ihn erhalten und unser Team wird ihn in Kürze prüfen.",
    };
    const catLbl: Record<EmailLocale, string> = { en: "Category:", es: "Categoría:", fr: "Catégorie :", it: "Categoria:", pt: "Categoria:", de: "Kategorie:" };
    const trackL: Record<EmailLocale, string> = {
      en: "You can track the status of your suggestions in the partner portal.",
      es: "Puedes seguir el estado de tus sugerencias en el portal de socios.",
      fr: "Vous pouvez suivre l'état de vos suggestions dans le portail partenaire.",
      it: "Puoi seguire lo stato dei tuoi suggerimenti nel portale partner.",
      pt: "Pode acompanhar o estado das suas sugestões no portal de parceiro.",
      de: "Sie können den Status Ihrer Vorschläge im Partnerportal verfolgen.",
    };
    const ctaL: Record<EmailLocale, string> = { en: "View My Suggestions", es: "Ver mis sugerencias", fr: "Voir mes suggestions", it: "Vedi i miei suggerimenti", pt: "Ver as minhas sugestões", de: "Meine Vorschläge ansehen" };
    sendEmail({
      to: user.email!,
      subject: tL(subjectL),
      html: `
      <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
        <div style="background:#000;padding:20px 28px;">
          <h2 style="color:#fff;margin:0;">${tL(headL)}</h2>
        </div>
        <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
          <p>${tL(hiL)}</p>
          <p>${tL(thanksL)}</p>
          <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">${title}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#666;">${tL(catLbl)} ${tL(catL)[category] ?? categoryLabel}</p>
            <p style="margin:8px 0 0;font-size:14px;">${description}</p>
          </div>
          <p style="font-size:13px;color:#666;">${tL(trackL)}</p>
          <a href="${portalUrl}/partner/suggestions" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">${tL(ctaL)}</a>
          <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
        </div>
      </div>
    `,
    }).catch(e => console.error("Suggestion confirmation email failed:", e?.message));
  }

  // Email admin — notification
  for (const adminEmail of adminEmails) {
    sendEmail({
      to: adminEmail,
      subject: `[Admin] New suggestion from ${partnerName} — ${categoryLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
          <p>A partner has submitted a new suggestion.</p>
          <p>
            <strong>Partner:</strong> ${partnerName}<br/>
            <strong>Category:</strong> ${categoryLabel}<br/>
            <strong>Title:</strong> ${title}<br/>
            <strong>Description:</strong> ${description}
          </p>
          <a href="${portalUrl}/admin/suggestions" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;">View in Admin</a>
        </div>
      `,
    }).catch(e => console.error("Admin suggestion notification email failed:", e?.message));
  }

  return NextResponse.json({ success: true, id: inserted.id });
}