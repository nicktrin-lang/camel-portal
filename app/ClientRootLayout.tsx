"use client";

import { usePathname } from "next/navigation";
import Footer from "@/app/components/Footer";

export default function ClientRootLayout({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass?: string;
}) {
  const pathname = usePathname();

  const isPartnerAuthPage =
    pathname === "/partner/login" ||
    pathname === "/partner/signup" ||
    pathname === "/partner/application-submitted";

  const isPartnerInfoPage =
    pathname === "/partner/terms" ||
    pathname === "/partner/operating-rules" ||
    pathname === "/partner/contact" ||
    pathname === "/partner/privacy" ||
    pathname === "/partner/cookies" ||
    pathname === "/partner/about";

  const isPortalAppPage =
    (pathname?.startsWith("/partner") && !isPartnerAuthPage && !isPartnerInfoPage) ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/driver");

  const showFooter = !isPortalAppPage;

  return (
    <>
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </>
  );
}