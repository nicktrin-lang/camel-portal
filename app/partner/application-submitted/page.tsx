"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

// Fire a GA4 custom event if gtag is available
function fireGtagEvent(eventName: string, params?: Record<string, string>) {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params || {});
    }
  } catch {}
}

export default function PartnerApplicationSubmittedPage() {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [status, setStatus] = useState<"loading" | "pending" | "rejected" | "guest">("loading");

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) { setStatus("guest"); return; }
        const email = user.email.toLowerCase().trim();
        const { data } = await supabase
          .from("partner_applications")
          .select("status")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const s = String(data?.status || "pending").toLowerCase();
        setStatus(s === "rejected" ? "rejected" : "pending");
      } catch { setStatus("guest"); }
    }
    check();
  }, [supabase]);

  // Fire signup_complete GA event when status resolves to "pending"
  // (pending = just submitted for the first time, not yet reviewed)
  // Passes utm_term (country) if the partner arrived via outreach email
  useEffect(() => {
    if (status !== "pending") return;
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source") || "";
    const utmTerm = params.get("utm_term") || "";
    const utmCampaign = params.get("utm_campaign") || "";
    const eventParams: Record<string, string> = {
      method: "partner_signup",
    };
    if (utmSource) eventParams.utm_source = utmSource;
    if (utmTerm) eventParams.utm_term = utmTerm;
    if (utmCampaign) eventParams.utm_campaign = utmCampaign;
    fireGtagEvent("partner_signup_complete", eventParams);
  }, [status]);

  const year = new Date().getFullYear();

  const content = status === "loading" ? null : {
    guest: {
      icon: "✓", iconColor: "text-[#ff7a00]",
      label: t("appSubmitted.guest.label"),
      title: t("appSubmitted.guest.title"),
      body:  t("appSubmitted.guest.body"),
      cta:   { href: "/partner/login", label: t("appSubmitted.guest.cta") },
    },
    pending: {
      icon: "⏳", iconColor: "text-[#ff7a00]",
      label: t("appSubmitted.pending.label"),
      title: t("appSubmitted.pending.title"),
      body:  t("appSubmitted.pending.body"),
      cta:   { href: "/partner/login", label: t("appSubmitted.pending.cta") },
    },
    rejected: {
      icon: "✗", iconColor: "text-red-400",
      label: t("appSubmitted.rejected.label"),
      title: t("appSubmitted.rejected.title"),
      body:  t("appSubmitted.rejected.body"),
      cta:   { href: "/partner/contact", label: t("appSubmitted.rejected.cta") },
    },
  }[status];

  const pendingSteps = [
    t("appSubmitted.pending.step1"),
    t("appSubmitted.pending.step2"),
    t("appSubmitted.pending.step3"),
    t("appSubmitted.pending.step4"),
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/partner/login" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
              {t("appSubmitted.partnerLogin")}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        {status === "loading" ? (
          <p className="text-sm font-bold text-white/40">{t("appSubmitted.loading")}</p>
        ) : (
          <div className="w-full max-w-lg text-center">
            <div className={`mb-6 text-5xl ${content!.iconColor}`}>{content!.icon}</div>
            {content!.label && (
              <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-4">{content!.label}</p>
            )}
            <h1 className="text-4xl font-black text-white md:text-5xl">{content!.title}</h1>
            <p className="mt-6 text-base font-semibold text-white/60 leading-relaxed">{content!.body}</p>

            {status === "pending" && (
              <div className="mt-8 border border-white/10 bg-white/5 px-6 py-5 text-left space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-white/40">{t("appSubmitted.pending.whatNext")}</p>
                {pendingSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-xs font-black text-white mt-0.5">{i + 1}</span>
                    <span className="text-sm font-semibold text-white/60">{step}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10">
              <Link href={content!.cta.href}
                className="inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
                {content!.cta.label}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 py-5 px-6">
        <p className="text-center text-xs font-bold text-white/30">
          {t("appSubmitted.copyright", { year })}
        </p>
      </div>
    </div>
  );
}
