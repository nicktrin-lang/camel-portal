import Link from "next/link";
import Image from "next/image";

export default function PortalHomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Header */}
      <header className="w-full bg-black border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Image
            src="/camel-logo.png"
            alt="Camel Global"
            width={160}
            height={56}
            className="h-12 w-auto brightness-0 invert"
            priority
          />
          <Link
            href="https://camel-global.com"
            className="text-sm font-bold text-white/60 hover:text-white transition-colors"
          >
            Customer Site →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-3">
          Camel Global
        </p>
        <h1 className="text-5xl font-black text-white sm:text-6xl leading-none">
          Partner Portal
        </h1>
        <p className="mt-4 text-base font-bold text-white/50 max-w-md">
          Manage your fleet, bookings, drivers and reports. Built for car hire partners across Spain.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/partner/login"
            className="bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity"
          >
            Partner Login
          </Link>
          <Link
            href="/partner/signup"
            className="border border-white/30 px-10 py-4 text-base font-black text-white hover:bg-white/5 transition-colors"
          >
            Become a Partner
          </Link>
        </div>

        {/* Driver link */}
        <p className="mt-5 text-sm font-bold text-white/40">
          Driver?{" "}
          <Link href="/driver/login" className="text-white/70 underline hover:text-white transition-colors">
            Driver login →
          </Link>
        </p>
      </section>

      {/* Features strip */}
      <section className="border-t border-white/10 bg-white/5 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { title: "Manage Bookings", desc: "View all confirmed bookings, assign drivers and record fuel levels." },
              { title: "Fleet & Drivers", desc: "Add vehicles, manage your driver team and keep your profile live." },
              { title: "Reports",         desc: "Full revenue reconciliation with commission and fuel charge breakdowns." },
            ].map(({ title, desc }) => (
              <div key={title} className="border border-white/10 p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#ff7a00]">{title}</h3>
                <p className="mt-2 text-sm font-bold text-white/50">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal copyright bar */}
      <div className="border-t border-white/10 py-5 px-6">
        <p className="text-center text-xs font-bold text-white/30">
          © {new Date().getFullYear()} Camel Global Ltd. All rights reserved.
        </p>
      </div>

    </div>
  );
}