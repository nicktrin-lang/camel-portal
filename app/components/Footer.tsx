"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

// All portal footer links open in a new tab so the user never navigates away.
const NT = { target: "_blank", rel: "noopener noreferrer" } as const;

function FooterBase({ children }: { children: React.ReactNode }) {
  return (
    <footer className="w-full border-t border-white/10 bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {children}
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {year} Camel Global Ltd. All rights reserved.</p>
          <p>Registered in England &amp; Wales — <span className="italic">registration details to be updated</span></p>
        </div>
      </div>
    </footer>
  );
}

function FooterLogo({ linkProps }: { linkProps?: object }) {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/" {...linkProps}>
        <Image src="/camel-logo.png" alt="Camel Global Ltd" width={160} height={58}
          className="h-[48px] w-auto brightness-0 invert" />
      </Link>
      <p className="max-w-[220px] text-xs leading-relaxed text-white/60">
        Meet &amp; greet car hire, delivered to your door.
      </p>
    </div>
  );
}

// ── Customer footer ───────────────────────────────────────────────────────────
// /test-booking/*, /about, /privacy, /cookies, /terms, /contact, /
// All links are standard internal navigation — no new tabs.
function CustomerFooter() {
  return (
    <FooterBase>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <FooterLogo />
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
            <Link href="/about" className="text-white/80 hover:text-white transition-colors">About Us</Link>
            <Link href="/partner/signup" className="text-white/80 hover:text-white transition-colors">Become a Partner</Link>
            <Link href="/contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
            <Link href="/terms" className="text-white/80 hover:text-white transition-colors">Customer Terms</Link>
            <Link href="/privacy" className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </FooterBase>
  );
}

// ── Partner footer ────────────────────────────────────────────────────────────
// /partner/* — all links stay within partner portal (no new tabs needed,
// operating-rules and terms are /partner/* routes rendered inside partner layout)
function PartnerFooter() {
  return (
    <FooterBase>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <FooterLogo />
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
            <Link href="/about" {...NT} className="text-white/80 hover:text-white transition-colors">About Us</Link>
            <Link href="/contact" {...NT} className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
            <Link href="/partner/terms" className="text-white/80 hover:text-white transition-colors">Partner Terms</Link>
            <Link href="/partner/operating-rules" className="text-white/80 hover:text-white transition-colors">Operating Agreement</Link>
            <Link href="/privacy" {...NT} className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cookies" {...NT} className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </FooterBase>
  );
}

// ── Driver footer ─────────────────────────────────────────────────────────────
// /driver/* — single link only
function DriverFooter() {
  return (
    <FooterBase>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FooterLogo linkProps={NT} />
        <Link
          href="/driver/login"
          className="text-sm text-white/80 hover:text-white transition-colors"
        >
          Driver Login
        </Link>
      </div>
    </FooterBase>
  );
}

// ── Admin footer ──────────────────────────────────────────────────────────────
// /admin/* — minimal, all links new tab
function AdminFooter() {
  return (
    <FooterBase>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <FooterLogo linkProps={NT} />
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
            <Link href="/privacy" {...NT} className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cookies" {...NT} className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </FooterBase>
  );
}

// ── Export: picks correct footer from pathname ────────────────────────────────
export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin"))   return <AdminFooter />;
  if (pathname?.startsWith("/driver"))  return <DriverFooter />;
  if (pathname?.startsWith("/partner")) return <PartnerFooter />;
  return <CustomerFooter />;
}