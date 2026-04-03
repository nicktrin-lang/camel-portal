"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import CurrencySelector from "@/app/components/CurrencySelector";

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isHomepage = pathname === "/";
  const isPartnerAuthPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";
  const isPortalAppPage =
    (pathname?.startsWith("/partner") && !isPartnerAuthPage) ||
    pathname?.startsWith("/admin");
  const isTestBookingArea = pathname?.startsWith("/test-booking");
  const showGlobalHeader = !isHomepage && !isPartnerAuthPage && !isPortalAppPage;

  const [isPartnerLoggedIn, setIsPartnerLoggedIn] = useState(false);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    if (isTestBookingArea || !showGlobalHeader) return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    async function check() {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (mounted) setIsPartnerLoggedIn(!!data?.user);
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setIsPartnerLoggedIn(!!session?.user);
      });
      unsub = () => subscription.unsubscribe();
    }
    check();
    return () => { mounted = false; unsub?.(); };
  }, [isTestBookingArea, showGlobalHeader]);

  useEffect(() => {
    if (!isTestBookingArea) return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    async function check() {
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      const supabase = createCustomerBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsCustomerLoggedIn(!!data?.user);
      setCustomerName(
        String(data?.user?.user_metadata?.full_name || "").trim() ||
        String(data?.user?.email || "").split("@")[0] || ""
      );
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setIsCustomerLoggedIn(!!session?.user);
          setCustomerName(
            String(session?.user?.user_metadata?.full_name || "").trim() ||
            String(session?.user?.email || "").split("@")[0] || ""
          );
        }
      });
      unsub = () => subscription.unsubscribe();
    }
    check();
    return () => { mounted = false; unsub?.(); };
  }, [isTestBookingArea]);

  async function handlePartnerLogout() {
    try {
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
      await Promise.race([createBrowserSupabaseClient().auth.signOut(), new Promise(r => setTimeout(r, 3000))]);
    } catch {}
    window.location.replace("/partner/login?reason=signed_out");
  }

  async function handleCustomerLogout() {
    try {
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      const { createCustomerBrowserClient } = await import("@/lib/supabase-customer/browser");
      await Promise.race([createCustomerBrowserClient().auth.signOut(), new Promise(r => setTimeout(r, 3000))]);
    } catch {}
    window.location.replace("/test-booking/login?reason=signed_out");
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
                    <Image src="/camel-logo.png" alt="Camel Global Ltd logo" width={220} height={80} priority className="h-[64px] w-auto" />
                  </Link>
                  <nav className="ml-auto flex items-center gap-4 text-sm font-medium">
                    <Link href="/" className="hover:opacity-90">Home</Link>
                    {isTestBookingArea ? (
                      <>
                        <CurrencySelector />
                        {isCustomerLoggedIn ? (
                          <>
                            <Link href="/test-booking/new" className="rounded-full bg-[#ff7a00] px-4 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 text-xs">New Booking</Link>
                            <Link href="/test-booking/requests" className="hover:opacity-90 text-xs">My Bookings</Link>
                            {customerName && <span className="hidden text-xs text-white/70 md:block">Welcome: {customerName}</span>}
                            <button type="button" onClick={handleCustomerLogout} className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Logout</button>
                          </>
                        ) : (
                          <>
                            <Link href="/test-booking/signup" className="hover:opacity-90">Customer Sign Up</Link>
                            <Link href="/test-booking/login" className="hover:opacity-90">Customer Login</Link>
                          </>
                        )}
                      </>
                    ) : !isPartnerLoggedIn ? (
                      <>
                        <Link href="/partner/signup" className="hover:opacity-90">Partner Sign Up</Link>
                        <Link href="/partner/login" className="hover:opacity-90">Partner Login</Link>
                      </>
                    ) : (
                      <button type="button" onClick={handlePartnerLogout} className="rounded-full bg-[#ff7a00] px-5 py-2 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95">Logout</button>
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
