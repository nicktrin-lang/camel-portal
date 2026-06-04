"use client";

import { useEffect, useState, useCallback } from "react";
import GoogleAnalyticsPageView from "@/app/components/GoogleAnalytics";
import ChatWidget from "@/app/components/ChatWidget";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

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

  const getToken = useCallback(async (): Promise<string | null> => null, []);

  return (
    <LanguageProvider>
      <GoogleAnalyticsPageView />
      <main className="flex-1">{children}</main>
      {isLoggedIn && (
        <ChatWidget getToken={getToken} apiPath="/api/chat" />
      )}
    </LanguageProvider>
  );
}