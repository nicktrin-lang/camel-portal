"use client";

import GoogleAnalyticsPageView from "@/app/components/GoogleAnalytics";

export default function ClientRootLayout({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass?: string;
}) {
  return (
    <>
      <GoogleAnalyticsPageView />
      <main className="flex-1">{children}</main>
    </>
  );
}