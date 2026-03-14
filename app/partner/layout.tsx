"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PartnerSidebar from "@/app/components/partner/PartnerSidebar";
import PartnerTopbar from "@/app/components/partner/PartnerTopbar";

type AdminRole = "none" | "admin" | "super_admin";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/partner/dashboard": {
    title: "Partner Dashboard",
    subtitle: "Overview of your account and portal activity.",
  },
  "/partner/requests": {
    title: "Requests",
    subtitle: "Review booking requests and submit bids.",
  },
  "/partner/bookings": {
    title: "Bookings",
    subtitle: "Manage active, completed, and cancelled bookings.",
  },
  "/partner/account": {
    title: "Account Management",
    subtitle: "Business details, fleet settings, and operating profile.",
  },
  "/partner/reports": {
    title: "Report Management",
    subtitle: "Track bids, bookings, and revenue performance.",
  },
  "/partner/profile": {
    title: "Edit Profile",
    subtitle: "Update your business and car fleet location details.",
  },
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function getMeta(pathname: string) {
  for (const key of Object.keys(pageMeta)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return pageMeta[key];
    }
  }

  return {
    title: "Partner Portal",
    subtitle: "Manage requests, bookings, and your partner account.",
  };
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setAdminRole] = useState<AdminRole>("none");

  useEffect(() => {
    let mounted = true;

    async function guard() {
      setLoading(true);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const meJson = await safeJson(meRes);

        if (!mounted) return;
        setAdminRole(String(meJson?.role || "none") as AdminRole);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    guard();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const meta = getMeta(pathname || "");

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff] px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Loading portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff]">
      <PartnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[290px]">
        <PartnerTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}