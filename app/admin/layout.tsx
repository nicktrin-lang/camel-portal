"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PortalSidebar, { PortalRole } from "@/app/components/portal/PortalSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/admin/approvals": {
    title: "Admin Approvals",
    subtitle: "Review partner applications and approve or reject them.",
  },
  "/admin/users": {
    title: "Admin Users",
    subtitle: "Manage administrative user accounts and permissions.",
  },
};

function getMeta(pathname: string) {
  for (const key of Object.keys(pageMeta)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return pageMeta[key];
    }
  }

  return {
    title: "Admin Portal",
    subtitle: "System administration",
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<PortalRole>("admin");
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

        const nextRole =
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
  }, [supabase]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const meta = getMeta(pathname || "");

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff] px-4 py-8 md:px-8">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <p className="text-slate-600">Checking admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-115px)] bg-[#e3f4ff]">
      <PortalSidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-[290px]">
        <PortalTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}