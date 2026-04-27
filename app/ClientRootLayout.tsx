"use client";

import { useEffect, useState, useCallback } from "react";
import GoogleAnalyticsPageView from "@/app/components/GoogleAnalytics";
import ChatWidget from "@/app/components/ChatWidget";

export default function ClientRootLayout({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass?: string;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (mounted) setIsLoggedIn(!!data?.user);
        supabase.auth.onAuthStateChange((_e: any, session: any) => {
          if (mounted) setIsLoggedIn(!!session?.user);
        });
      } catch { /* not on a portal page yet */ }
    }
    check();
    return () => { mounted = false; };
  }, []);

  // Portal uses cookie-based auth — no token needed, API uses getPortalUserRole()
  const getToken = useCallback(async (): Promise<string | null> => null, []);

  return (
    <>
      <GoogleAnalyticsPageView />
      <main className="flex-1">{children}</main>
      {isLoggedIn && (
        <ChatWidget getToken={getToken} apiPath="/api/chat" />
      )}
    </>
  );
}