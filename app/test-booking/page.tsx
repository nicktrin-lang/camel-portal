"use client";

import Link from "next/link";

export default function TestBookingHomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#003768]/70">
          Camel Global
        </div>

        <h1 className="mt-3 text-3xl font-semibold text-[#003768]">
          Customer Booking Platform
        </h1>

        <p className="mt-3 text-slate-600 max-w-2xl">
          Welcome to the Camel Global customer platform. Create booking requests,
          receive offers from trusted partners, and manage your bookings in one place.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/test-booking/signup"
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Create Account
          </Link>

          <Link
            href="/test-booking/login"
            className="rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            Sign In
          </Link>

          <Link
            href="/test-booking/requests"
            className="rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            View My Requests
          </Link>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          This is a staging environment for testing the customer booking flow.
        </div>

      </div>
    </div>
  );
}