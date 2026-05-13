import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
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

const GA_ID = "G-YCZMDQJDM7";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true});`,
        }} />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      </head>
      <body className={`${font.variable} min-h-screen flex flex-col bg-[#f0f0f0]`}>
        <ClientRootLayout fontClass={font.variable}>
          {children}
        </ClientRootLayout>
      </body>
    </html>
  );
}