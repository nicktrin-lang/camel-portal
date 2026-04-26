"use client";

import Image from "next/image";
import Link from "next/link";

export default function PartnerApplicationSubmittedPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Header */}
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link href="/">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
          <Link href="/partner/login" className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
            Partner Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg text-center">
          <div className="mb-6 text-5xl">✓</div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-4">Application Received</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">
            Thank you for applying.
          </h1>
          <p className="mt-6 text-base font-semibold text-white/60 leading-relaxed">
            Your partner application has been received successfully. Our team will review your details and you will hear from us by email within 48 hours.
          </p>
          <div className="mt-10">
            <Link href="/partner/login" className="inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
              Go to Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 py-5 px-6">
        <p className="text-center text-xs font-bold text-white/30">
          © {new Date().getFullYear()} Camel Global Ltd. All rights reserved.
        </p>
      </div>

    </div>
  );
}