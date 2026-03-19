"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function PartnerIndexPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    let mounted = true;

    async function routeUser() {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          if (!mounted) return;
          router.replace("/partner/login");
          return;
        }

        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const meJson = await safeJson(meRes);

        if (!mounted) return;

        if (meJson?.role === "admin" || meJson?.role === "super_admin") {
          router.replace("/admin/approvals");
          return;
        }

        router.replace("/partner/requests");
      } catch {
        if (!mounted) return;
        router.replace("/partner/requests");
      }
    }

    routeUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#e3f4ff] pt-20">
      <div className="px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}