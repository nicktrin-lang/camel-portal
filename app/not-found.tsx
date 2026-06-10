"use client";

import Image from "next/image";
import Link from "next/link";

export default function GlobalNotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2.5">
          <Link href="/partner/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
        </div>
      </header>

      <div className="w-full bg-black px-6 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">404</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Page not found</h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            The page you tried to open does not exist, may have moved, or the link may be incorrect.
          </p>
        </div>
      </div>

      <div className="w-full bg-[#f0f0f0] px-6 py-10 flex-1">
        <div className="mx-auto max-w-xl space-y-6">

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/partner/dashboard"
              className="flex-1 bg-[#ff7a00] py-4 text-center text-sm font-black text-white hover:opacity-90 transition-opacity">
              Go to Partner Portal
            </Link>
            <Link href="/admin/approvals"
              className="flex-1 bg-black py-4 text-center text-sm font-black text-white hover:opacity-80 transition-opacity">
              Go to Admin
            </Link>
          </div>

          <div className="bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-4">Helpful links</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { label: "Partner Requests",   href: "/partner/requests"   },
                { label: "Partner Bookings",   href: "/partner/bookings"   },
                { label: "Admin Approvals",    href: "/admin/approvals"    },
                { label: "Account Management", href: "/admin/accounts"     },
              ].map(({ label, href }) => (
                <Link key={href} href={href}
                  className="border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold text-black hover:bg-black/10 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
