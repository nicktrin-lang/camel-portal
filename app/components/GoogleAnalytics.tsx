"use client";

import Script from "next/script";
import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  const gaId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.hostname === "portal.camel-global.com"
      ? "G-YCZMDQJDM7"
      : "G-1Y758X38G4";
  }, []);

  useEffect(() => {
    if (!gaId || typeof window === "undefined" || !window.gtag) return;

    const page = window.location.pathname + window.location.search;

    window.gtag("config", gaId, {
      page_path: page,
    });
  }, [gaId, pathname]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname + window.location.search,
          });
        `}
      </Script>
    </>
  );
}