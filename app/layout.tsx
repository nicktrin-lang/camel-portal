import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { isGuideMarket, marketHrefLang } from "@/lib/guides";
import { headers } from "next/headers";
import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const BASE_URL = "https://portal.camel-global.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: "Camel Global Partner Portal | Join Spain's Meet & Greet Car Hire Platform",
      template: "%s | Camel Global Partner Portal",
    },
    description: "Join Camel Global and reach customers at Málaga, Alicante, Valencia, Madrid, Barcelona and all major Spanish airports. No monthly fees. You set the price. Apply in 5 minutes.",
    keywords: [
      "meet and greet car hire partner Spain",
      "car hire company Spain platform",
      "join car hire marketplace Spain",
      "car hire partner Málaga",
      "car hire partner Alicante",
      "car hire partner Valencia",
      "car hire partner Madrid",
      "car hire partner Barcelona",
      "Spanish car hire platform",
      "car hire delivery service Spain",
      "car hire business Spain marketplace",
      "become a car hire partner Spain",
    ],
    authors: [{ name: "Camel Global", url: "https://camel-global.com" }],
    creator: "Camel Global",
    publisher: "NTUK Ltd",
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: BASE_URL,
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: BASE_URL,
      siteName: "Camel Global",
      title: "Camel Global Partner Portal | Join Spain's Meet & Greet Car Hire Platform",
      description: "Reach more customers at every major Spanish airport. No monthly fees, no lock-in. Apply to become a Camel Global partner in 5 minutes.",
      images: [
        {
          url: `${BASE_URL}/camel-logo.png`,
          width: 1200,
          height: 630,
          alt: "Camel Global Partner Portal — Meet & Greet Car Hire Spain",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Camel Global Partner Portal",
      description: "Join Spain's meet & greet car hire platform. No monthly fees. Apply in 5 minutes.",
      images: [`${BASE_URL}/camel-logo.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

// GA only fires on the REAL production host. localhost, Vercel preview (*.vercel.app),
// test-portal staging, IPs and unknown hosts return "" so no gtag is injected — this
// is what stopped dev + preview traffic polluting the production property (the
// "localhost:3000" referrals and preview-crawler bot hits).
function getGaId(host: string): string {
  const h = host.toLowerCase();
  if (h === "portal.camel-global.com") return "G-YCZMDQJDM7";  // production
  return "";                                                    // localhost / preview / staging / unknown → no tracking
}

// Guides live at /<market>/guides/... where the segment is a COUNTRY, not a language.
// Declare the full BCP-47 tag so each post says which market it targets — language alone
// would collapse markets that share one (en-GB vs en-AU on the customer site).
function htmlLangFromPath(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})\/guides(\/|$)/);
  // Derived from the content, not a table: marketHrefLang reads the market's own
  // `language` frontmatter, so a country added tomorrow declares itself correctly.
  return m && isGuideMarket(m[1]) ? marketHrefLang(m[1]) : "en";
}

// Sitewide Organization schema so search and AI engines have a canonical entity for
// Camel Global (the partner-recruitment brand). Rendered as JSON-LD in <head>.
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Camel Global",
  url: "https://www.camel-global.com",
  logo: "https://portal.camel-global.com/camel-logo.png",
  description:
    "Spain's meet and greet car hire platform. Camel Global connects car hire partners with travellers at every major Spanish airport - no monthly fees.",
  areaServed: "ES",
  sameAs: [] as string[],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const gaId = getGaId(headerStore.get("host") || "");
  const htmlLang = htmlLangFromPath(headerStore.get("x-pathname") || "");
  return (
    <html lang={htmlLang}>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        {gaId && (
          <>
            <script dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{if(localStorage.getItem('cookie_consent')==='accepted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('config','${gaId}',{send_page_view:true});`,
            }} />
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          </>
        )}
      </head>
      <body className={`${font.variable} min-h-screen flex flex-col bg-[#f0f0f0]`}>
        <ClientRootLayout fontClass={font.variable}>
          {children}
        </ClientRootLayout>
      </body>
    </html>
  );
}