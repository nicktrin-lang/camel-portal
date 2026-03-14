"use client";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(!!data?.user);
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

    setIsLoggedIn(false);

    router.replace("/partner/login?reason=signed_out");
    router.refresh();

    setTimeout(() => {
      window.location.href = "/partner/login?reason=signed_out";
    }, 50);
  }

  const isHomepage = pathname === "/";
  const isPartnerAuthPage =
    pathname === "/partner/login" || pathname === "/partner/signup";

  const isPortalAppPage =
    (pathname?.startsWith("/partner") &&
      pathname !== "/partner/login" &&
      pathname !== "/partner/signup") ||
    pathname?.startsWith("/admin");

  const showGlobalHeader = !isHomepage && !isPartnerAuthPage && !isPortalAppPage;

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#e3f4ff]">
        {showGlobalHeader && (
          <>
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
                    <Link href="/" className="hover:opacity-90">
                      Home
                    </Link>

                    {!isLoggedIn ? (
                      <>
                        <Link href="/partner/signup" className="hover:opacity-90">
                          Partner Sign Up
                        </Link>

                        <Link href="/partner/login" className="hover:opacity-90">
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
          </>
        )}

        <main>{children}</main>
      </body>
    </html>
  );
}