"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function PartnerApplicationSubmittedPage() {
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
      } catch {
        setStatus("guest");
      }
    }
    check();
  }, [supabase]);

  const content = {
    guest: {
      icon: "✓",
      label: "Application Received",
      title: "Thank you for applying.",
      body: "Your partner application has been received successfully. Our team will review your details and you will hear from us by email within 48 hours.",
      cta: { href: "/partner/login", label: "Go to Login →" },
    },
    pending: {
      icon: "⏳",
      label: "Under Review",
      title: "Your application is being reviewed.",
      body: "Our team is reviewing your details. You will receive an email once your account has been approved. This usually takes up to 48 hours.",
      cta: { href: "/partner/login", label: "Back to Login →" },
    },
    rejected: {
      icon: "✗",
      label: "Application Unsuccessful",
      title: "Your application was not approved.",
      body: "Unfortunately we were unable to approve your application at this time. If you believe this is a mistake or would like to discuss your application, please contact our team.",
      cta: { href: "/partner/contact", label: "Contact Us →" },
    },
    loading: {
      icon: "…",
      label: "",
      title: "",
      body: "",
      cta: { href: "/partner/login", label: "" },
    },
  }[status];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <Link href="/partner/login" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
            Partner Login
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        {status === "loading" ? (
          <p className="text-sm font-bold text-white/40">Loading…</p>
        ) : (
          <div className="w-full max-w-lg text-center">
            <div className={`mb-6 text-5xl ${status === "rejected" ? "text-red-400" : "text-[#ff7a00]"}`}>
              {content.icon}
            </div>
            {content.label && (
              <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-4">{content.label}</p>
            )}
            <h1 className="text-4xl font-black text-white md:text-5xl">{content.title}</h1>
            <p className="mt-6 text-base font-semibold text-white/60 leading-relaxed">{content.body}</p>

            {status === "pending" && (
              <div className="mt-8 border border-white/10 bg-white/5 px-6 py-5 text-left space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-white/40">What happens next?</p>
                {[
                  "Our team reviews your application details",
                  "You receive an approval email with next steps",
                  "Log in and complete your onboarding (fleet, drivers, Stripe payouts)",
                  "Go live and start receiving customer requests",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#ff7a00] text-xs font-black text-white mt-0.5">{i + 1}</span>
                    <span className="text-sm font-semibold text-white/60">{step}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10">
              <Link href={content.cta.href}
                className="inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
                {content.cta.label}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 py-5 px-6">
        <p className="text-center text-xs font-bold text-white/30">
          © {new Date().getFullYear()} NTUK Ltd. All rights reserved. Trading as Camel Global.
        </p>
      </div>
    </div>
  );
}