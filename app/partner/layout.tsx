"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import PortalSidebar, { PortalRole } from "@/app/components/portal/PortalSidebar";
import PortalTopbar from "@/app/components/portal/PortalTopbar";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function clearStaleSupabaseLocks() {
  try {
    Object.keys(localStorage)
      .filter(k => k.includes("sb-") || k.includes("supabase"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

async function getUserWithTimeout(supabase: any, ms = 8000) {
  const userPromise = supabase.auth.getUser();
  const timeout = new Promise<{ data: null; error: Error }>(resolve =>
    setTimeout(() => resolve({ data: null, error: new Error("timeout") }), ms)
  );
  return Promise.race([userPromise, timeout]);
}

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<PortalRole>("partner");
  const [timedOut, setTimedOut] = useState(false);

  const isPublicPartnerPage =
    pathname === "/partner/login" ||
    pathname === "/partner/application-submitted" ||
    pathname === "/partner/signup" ||
    pathname.startsWith("/partner/signup/");

  useEffect(() => {
    let mounted = true;

    async function guard() {
      if (isPublicPartnerPage) { setLoading(false); return; }

      setLoading(true);

      try {
        const { data: userData, error: userErr } = await getUserWithTimeout(supabase);

        if (!mounted) return;

        if (userErr?.message === "timeout") {
          // Auth lock timed out — clear stale locks and redirect to login
          clearStaleSupabaseLocks();
          setTimedOut(true);
          setLoading(false);
          return;
        }

        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_signed_in");
          return;
        }

        let nextRole: PortalRole = "partner";

        try {
          const meRes = await fetch("/api/admin/me", {
            method: "GET", cache: "no-store", credentials: "include",
          });
          if (meRes.ok) {
            const meJson = await safeJson(meRes);
            nextRole =
              meJson?.role === "super_admin" ? "super_admin" :
              meJson?.role === "admin" ? "admin" : "partner";
          }
        } catch {
          nextRole = "partner";
        }

        if (!mounted) return;

        if (nextRole === "admin" || nextRole === "super_admin") {
          router.replace("/admin/approvals");
          return;
        }

        setRole(nextRole);
      } catch {
        if (!mounted) return;
        setRole("partner");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    guard();
    return () => { mounted = false; };
  }, [router, supabase, isPublicPartnerPage]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isPublicPartnerPage) return <>{children}</>;

  if (timedOut) {
    return (
      <div className="min-h-screen bg-[#e3f4ff] pt-20">
        <div className="px-4 py-8 md:px-8">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-red-700">Session error</h2>
            <p className="mt-2 text-slate-600">Your session has a conflict. Click below to clear it and log in again.</p>
            <button
              type="button"
              onClick={() => {
                clearStaleSupabaseLocks();
                window.location.href = "/partner/login?reason=not_signed_in";
              }}
              className="mt-4 rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white hover:opacity-95"
            >
              Clear session & log in again
            </button>
          </div>
        </div>
      </div>
    );
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
      <PortalSidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pt-20 lg:pl-[290px]">
        <div className="px-4 py-5 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}