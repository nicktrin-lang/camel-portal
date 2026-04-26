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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Camel Global Portal",
    description: "Partner and admin portal for Camel Global.",
  };
}

const GA_ID = "G-YCZMDQJDM7";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* GA4 — initialise dataLayer before the async script loads */}
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