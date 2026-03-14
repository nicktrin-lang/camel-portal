"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

const MAIN_GA_ID = "G-1Y758X38G4";
const PORTAL_GA_ID = "G-YCZMDQJDM7";

function getGaIdFromHost(hostname: string) {
  if (hostname === "portal.camel-global.com") {
    return PORTAL_GA_ID;
  }
  return MAIN_GA_ID;
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [gaId, setGaId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGaId(getGaIdFromHost(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!gaId || typeof window === "undefined" || !window.gtag) return;

    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    window.gtag("config", gaId, {
      page_path: url,
    });
  }, [gaId, pathname, searchParams]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id={`gtag-init-${gaId}`} strategy="afterInteractive">
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