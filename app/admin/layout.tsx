"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";

type AdminRole = "admin" | "super_admin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [, setRole] = useState<AdminRole>("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        if (!mounted) return;
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
        return;
      }

      try {
        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const meJson = await meRes.json().catch(() => null);

        const nextRole: AdminRole | null =
          meJson?.role === "super_admin"
            ? "super_admin"
            : meJson?.role === "admin"
              ? "admin"
              : null;

        if (!mounted) return;

        if (!nextRole) {
          setChecking(false);
          window.location.replace("/partner/login?reason=not_authorized");
          return;
        }

        setRole(nextRole);
        setChecking(false);
      } catch {
        if (!mounted) return;
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#e3f4ff] pt-20">
        <div className="px-4 py-8 md:px-8">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <p className="text-slate-600">Checking admin access…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      <PortalTopbar onMenuClick={() => setSidebarOpen(true)} />

      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="pt-20 lg:pl-[290px]">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}