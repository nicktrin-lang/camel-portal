"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PortalSidebar, { PortalRole } from "@/app/components/portal/PortalSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<PortalRole>("partner");

  const isPublicPartnerPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";

  useEffect(() => {
    let mounted = true;

    async function guard() {
      if (isPublicPartnerPage) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: userData, error: userErr } =
          await supabase.auth.getUser();

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

        const nextRole: PortalRole =
          meJson?.role === "super_admin"
            ? "super_admin"
            : meJson?.role === "admin"
            ? "admin"
            : "partner";

        setRole(nextRole);
      } catch {
        if (!mounted) return;
        setRole("partner");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    guard();

    return () => {
      mounted = false;
    };
  }, [router, supabase, isPublicPartnerPage]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isPublicPartnerPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e3f4ff] pt-20">
        <div className="px-4 py-8 md:px-8">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-slate-600">Loading portal…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      <PortalTopbar onMenuClick={() => setSidebarOpen(true)} />

      <PortalSidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="pt-20 lg:pl-[290px]">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}