"use client";

export default function ClientRootLayout({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass?: string;
}) {
  return <main className="flex-1">{children}</main>;
}