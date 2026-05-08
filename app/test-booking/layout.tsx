"use client";

import Link from "next/link";
import Image from "next/image";

export default function TestBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #003768 0%, #005b9f 100%)",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #003768, #005b9f)",
        padding: "0.6rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/test-booking">
          <img
            src="/camel-logo.png"
            alt="Camel Global"
            style={{ height: "64px", width: "auto", display: "block" }}
          />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <Link
            href="/test-booking"
            style={{
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.32)",
              borderRadius: "999px",
              padding: "0.65rem 1.1rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
              background: "rgba(255,255,255,0.08)",
              textDecoration: "none",
            }}
          >
            Home
          </Link>
          <Link
            href="/test-booking/signup"
            style={{
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.32)",
              borderRadius: "999px",
              padding: "0.65rem 1.1rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
              background: "rgba(255,255,255,0.08)",
              textDecoration: "none",
            }}
          >
            Sign Up
          </Link>
          <Link
            href="/test-booking/login"
            style={{
              color: "#fff",
              borderRadius: "999px",
              padding: "0.65rem 1.1rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              background: "#ff7a00",
              border: "none",
              boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
              textDecoration: "none",
            }}
          >
            Customer Login
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <main>
        {children}
      </main>
    </div>
  );
}