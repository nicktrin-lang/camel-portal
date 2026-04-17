"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// ── Partner footer ────────────────────────────────────────────────────────────
// Shown on /partner/*, /admin/*, /driver/*
// All links open in a new tab so the user never leaves the portal.
function PartnerFooter() {
  const year = new Date().getFullYear();

  async function handleOperatingRules() {
    const { downloadOperatingRulesPDF } = await import("@/lib/portal/operatingRules");
    downloadOperatingRulesPDF("Partner");
  }

  return (
    <footer className="w-full border-t border-white/10 bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          <div className="flex flex-col gap-3">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <Image src="/camel-logo.png" alt="Camel Global Ltd" width={160} height={58}
                className="h-[48px] w-auto brightness-0 invert" />
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-white/60">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          <div className="flex flex-wrap gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
              <Link href="/about" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">About Us</Link>
              <Link href="/partner/signup" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Become a Partner</Link>
              <Link href="/contact" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Contact</Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
              <Link href="/partner/terms" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Partner Terms</Link>
              <button
                type="button"
                onClick={handleOperatingRules}
                className="text-left text-white/80 hover:text-white transition-colors"
              >
                Partner Operating Agreement
              </button>
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/cookies" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Portals</span>
              <Link href="/partner/login" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">Partner Portal</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {year} Camel Global Ltd. All rights reserved.</p>
          <p>Registered in England &amp; Wales — <span className="italic">registration details to be updated</span></p>
        </div>
      </div>
    </footer>
  );
}

// ── Customer footer ───────────────────────────────────────────────────────────
// Shown on all public/customer-facing pages
function CustomerFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          <div className="flex flex-col gap-3">
            <Link href="/">
              <Image src="/camel-logo.png" alt="Camel Global Ltd" width={160} height={58}
                className="h-[48px] w-auto brightness-0 invert" />
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-white/60">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

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

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {year} Camel Global Ltd. All rights reserved.</p>
          <p>Registered in England &amp; Wales — <span className="italic">registration details to be updated</span></p>
        </div>
      </div>
    </footer>
  );
}

// ── Export: picks the right footer based on pathname ─────────────────────────
export default function Footer() {
  const pathname = usePathname();
  const isPortal =
    pathname?.startsWith("/partner") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/driver");

  return isPortal ? <PartnerFooter /> : <CustomerFooter />;
}