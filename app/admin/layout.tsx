"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      setChecking(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        if (!mounted) return;
        setIsAdmin(false);
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
        return;
      }

      try {
        const adminRes = await fetch("/api/admin/is-admin", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const adminJson = await adminRes.json().catch(() => null);
        const ok = !!adminJson?.isAdmin;

        if (!mounted) return;

        setIsAdmin(ok);
        setChecking(false);

        if (!ok) {
          window.location.replace("/partner/login?reason=not_authorized");
        }
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
        setChecking(false);
        window.location.replace("/partner/login?reason=not_authorized");
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/partner/login?reason=signed_out");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  const linkClass = (href: string) =>
    `rounded-full px-3 py-2 hover:bg-white/10 ${isActive(href) ? "bg-white/15" : ""}`;

  const hideTopAdminApprovalsLink = pathname === "/admin/approvals";

  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      <header className="fixed left-0 top-0 z-50 w-full shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
        <div className="bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/camel-logo.png"
                alt="Camel Global Ltd logo"
                width={220}
                height={80}
                priority
                className="h-[64px] w-auto"
              />
            </Link>

            <nav className="ml-auto flex items-center gap-3 text-sm">
              <Link href="/" className={linkClass("/")}>
                Home
              </Link>

              {!hideTopAdminApprovalsLink && !checking && isAdmin ? (
                <Link href="/admin/approvals" className={linkClass("/admin/approvals")}>
                  Admin Approvals
                </Link>
              ) : null}

              {!checking && isAdmin ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  Logout
                </button>
              ) : null}
            </nav>
          </div>
        </div>
      </header>

      <div className="h-[105px] md:h-[115px]" />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl bg-white shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
          <div className="p-6 md:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}