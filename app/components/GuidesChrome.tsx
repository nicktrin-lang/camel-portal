import Link from "next/link";
import Image from "next/image";
import { GUIDE_LANG_LABEL, isGuideLang } from "@/lib/guides";

// Header + footer for the portal Guides section. The portal's ClientRootLayout
// is minimal (no global chrome), so the guides section carries its own — matching
// the portal's black/orange brand. The funnel here is partner signup.
export default function GuidesChrome({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  const guidesLabel = isGuideLang(lang) ? GUIDE_LANG_LABEL[lang] : "Guides";
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href={`/${lang}/guides`} className="flex items-center shrink-0">
            <Image
              src="/camel-logo-white.png"
              alt="Camel Global Partners"
              width={180}
              height={60}
              priority
              className="h-8 w-auto sm:h-11"
            />
          </Link>
          <nav className="flex items-center gap-3">
            {/* On mobile the logo already links to the index — hide the text link */}
            <Link
              href={`/${lang}/guides`}
              className="hidden text-sm font-bold text-white hover:underline sm:inline-block"
            >
              {guidesLabel}
            </Link>
            <Link
              href="/partner/signup"
              className="whitespace-nowrap bg-[#ff7a00] px-3 py-2 text-xs font-black text-white transition-opacity hover:opacity-90 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              Become a partner
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="w-full bg-black px-6 py-10 text-white/70">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold">© {new Date().getFullYear()} NTUK Ltd — Camel Global</p>
          <nav className="flex items-center gap-5 text-sm font-bold">
            <Link href={`/${lang}/guides`} className="hover:text-white">{guidesLabel}</Link>
            <Link href="/partner/signup" className="hover:text-white">Become a partner</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
