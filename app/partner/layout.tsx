"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function PartnerLayout({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshUser() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;

      if (!mounted) return;

      setIsLoggedIn(!!user);

      if (user) {
        try {
          const res = await fetch("/api/admin/is-admin", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          });
          const json = await res.json().catch(() => null);
          if (!mounted) return;
          setIsAdmin(!!json?.isAdmin);
        } catch {
          if (!mounted) return;
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    }

    refreshUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
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
    `hover:opacity-90 ${isActive(href) ? "font-semibold" : ""}`;

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

            <nav className="ml-auto flex items-center gap-6 text-sm font-medium">
              <Link href="/" className={linkClass("/")}>
                Home
              </Link>

              {!isLoggedIn ? (
                <>
                  <Link href="/partner/signup" className={linkClass("/partner/signup")}>
                    Partner Sign Up
                  </Link>
                  <Link href="/partner/login" className={linkClass("/partner/login")}>
                    Partner Login
                  </Link>
                </>
              ) : null}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                >
                  Logout
                </button>
              ) : null}
            </nav>
          </div>
        </div>
      </header>

      <div className="h-[105px] md:h-[115px]" />

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}