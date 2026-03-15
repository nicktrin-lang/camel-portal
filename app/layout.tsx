"use client";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isHomepage = pathname === "/";

  const isPartnerAuthPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";

  const isPortalAppPage =
    (pathname?.startsWith("/partner") &&
      pathname !== "/partner/login" &&
      pathname !== "/partner/signup" &&
      pathname !== "/partner/application-submitted") ||
    pathname?.startsWith("/admin");

  const isTestBookingArea = pathname?.startsWith("/test-booking");

  const showGlobalHeader =
    !isHomepage && !isPartnerAuthPage && !isPortalAppPage;

  const partnerSupabase = useMemo(() => {
    if (isTestBookingArea) return null;
    return createBrowserSupabaseClient();
  }, [isTestBookingArea]);

  const [isPartnerLoggedIn, setIsPartnerLoggedIn] = useState(false);

  useEffect(() => {
    if (!partnerSupabase) {
      setIsPartnerLoggedIn(false);
      return;
    }

    let mounted = true;

    async function refreshUser() {
      const { data } = await partnerSupabase.auth.getUser();
      if (!mounted) return;
      setIsPartnerLoggedIn(!!data?.user);
    }

    refreshUser();

    const {
      data: { subscription },
    } = partnerSupabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [partnerSupabase]);

  async function handlePartnerLogout() {
    if (!partnerSupabase) return;

    await partnerSupabase.auth.signOut();
    setIsPartnerLoggedIn(false);

    router.replace("/partner/login?reason=signed_out");
    router.refresh();

    setTimeout(() => {
      window.location.href = "/partner/login?reason=signed_out";
    }, 50);
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#e3f4ff]">
        <GoogleAnalytics />

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

                    {isTestBookingArea ? (
                      <>
                        <Link href="/test-booking/signup" className="hover:opacity-90">
                          Customer Sign Up
                        </Link>

                        <Link href="/test-booking/login" className="hover:opacity-90">
                          Customer Login
                        </Link>
                      </>
                    ) : !isPartnerLoggedIn ? (
                      <>
                        <Link href="/partner/signup" className="hover:opacity-90">
                          Partner Sign Up
                        </Link>

                        <Link href="/partner/login" className="hover:opacity-90">
                          Partner Login
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePartnerLogout}
                        className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
                      >
                        Logout
                      </button>
                    )}
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