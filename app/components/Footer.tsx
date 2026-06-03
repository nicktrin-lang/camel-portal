"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

const COPYRIGHT = `© ${year} NTUK Ltd. All rights reserved. Trading as Camel Global. · Registered in England & Wales · Company No. 08765474`;

// ── Partner / Admin footer ────────────────────────────────────────────────────
export function PortalFooter({ variant }: { variant: "partner" | "admin" }) {
  const prefix    = variant === "admin" ? "/admin" : "/partner";
  const termsHref = variant === "admin" ? "/admin/terms"           : "/partner/terms";
  const rulesHref = variant === "admin" ? "/admin/operating-rules" : "/partner/operating-rules";

  return (
    <footer className="w-full bg-black border-t border-white/10 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-3 shrink-0">
            <Link href="/">
              <Image src="/camel-logo.png" alt="Camel Global" width={160} height={58} className="h-14 w-auto brightness-0 invert" />
            </Link>
            <p className="max-w-[200px] text-sm font-bold text-white/50 leading-relaxed">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 md:gap-14">

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">Company</p>
              <Link href={`${prefix}/about`}   className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">About Us</Link>
              <Link href={`${prefix}/contact`} className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Contact</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">Legal</p>
              <Link href={termsHref}           className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Terms</Link>
              <Link href={rulesHref}           className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Operating Agreement</Link>
              <Link href={`${prefix}/privacy`} className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Privacy Policy</Link>
              <Link href={`${prefix}/cookies`} className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Cookie Policy</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/40">Platform</p>
              <Link href="https://camel-global.com" className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Customer Site</Link>
              <Link href="/partner/login"           className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Login</Link>
              {variant === "partner" && (
                <Link href="/partner/signup" className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Become a Partner</Link>
              )}
            </div>

          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs font-bold text-white/60 leading-relaxed">{COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}

// ── Driver footer — minimal, no portal links ──────────────────────────────────
function DriverFooter() {
  return (
    <footer className="w-full bg-black border-t border-white/10 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          <div className="flex flex-col gap-3 shrink-0">
            <Link href="/">
              <Image src="/camel-logo.png" alt="Camel Global" width={160} height={58} className="h-14 w-auto brightness-0 invert" />
            </Link>
            <p className="max-w-[200px] text-sm font-bold text-white/50 leading-relaxed">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Platform</p>
            <Link href="https://camel-global.com" className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Customer Site</Link>
            <Link href="/partner/login"           className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Login</Link>
            <Link href="/partner/signup"          className="text-sm font-bold text-white hover:text-[#ff7a00] transition-colors">Become a Partner</Link>
          </div>

        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs font-bold text-white/60 leading-relaxed">{COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}

// ── Customer footer ───────────────────────────────────────────────────────────
function CustomerFooter() {
  return (
    <footer className="w-full bg-black text-white">

      {/* Ready to book CTA */}
      <div className="border-b border-white/10 py-14">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to book?</h2>
          <p className="mt-2 text-base font-bold text-white/70">No account needed to start.</p>
          <Link href="/book"
            className="mt-6 inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            Book Now →
          </Link>
          <p className="mt-4 text-sm font-bold text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="text-white underline hover:opacity-80">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Logo + tagline */}
          <div className="shrink-0">
            <Image src="/camel-logo.png" alt="Camel" width={200} height={70} className="h-14 w-auto mb-4 brightness-0 invert" />
            <p className="max-w-[200px] text-sm font-bold text-white/60 leading-relaxed">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 md:gap-14">

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Company</p>
              <Link href="/about"          className="text-sm font-bold text-white hover:underline">About Us</Link>
              <Link href="/partner/signup" className="text-sm font-bold text-white hover:underline">Become a Partner</Link>
              <Link href="/contact"        className="text-sm font-bold text-white hover:underline">Contact</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Legal</p>
              <Link href="/terms"   className="text-sm font-bold text-white hover:underline">Customer Terms</Link>
              <Link href="/privacy" className="text-sm font-bold text-white hover:underline">Privacy Policy</Link>
              <Link href="/cookies" className="text-sm font-bold text-white hover:underline">Cookie Policy</Link>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Account</p>
              <Link href="/login"    className="text-sm font-bold text-white hover:underline">Sign In</Link>
              <Link href="/signup"   className="text-sm font-bold text-white hover:underline">Create Account</Link>
              <Link href="/bookings" className="text-sm font-bold text-white hover:underline">My Bookings</Link>
            </div>

          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6">
          <p className="text-xs font-bold text-white leading-relaxed">{COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin"))   return <PortalFooter variant="admin" />;
  if (pathname?.startsWith("/driver"))  return <DriverFooter />;
  if (pathname?.startsWith("/partner")) return <PortalFooter variant="partner" />;
  return <CustomerFooter />;
}