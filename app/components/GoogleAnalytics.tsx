"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

function resolveGaId() {
  if (typeof window === "undefined") return "";
  return window.location.hostname === "portal.camel-global.com"
    ? "G-YCZMDQJDM7"
    : "G-1Y758X38G4";
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [gaId, setGaId] = useState("");

  useEffect(() => {
    setGaId(resolveGaId());
  }, []);

  useEffect(() => {
    if (!gaId || typeof window === "undefined" || !window.gtag) return;

    const page = window.location.pathname + window.location.search;

    window.gtag("config", gaId, {
      page_path: page,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [gaId, pathname]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id={`google-analytics-${gaId}`} strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname + window.location.search,
            page_title: document.title,
            page_location: window.location.href
          });
        `}
      </Script>
    </>
  );
}