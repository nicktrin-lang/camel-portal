"use client";

import Link from "next/link";

export default function TestBookingHomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h1 className="text-3xl font-semibold text-[#003768]">
          Test Booking Engine
        </h1>
        <p className="mt-3 text-slate-600">
          Internal customer test area for creating requests and accepting partner bids.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/test-booking/signup"
            className="rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Customer Sign Up
          </Link>

          <Link
            href="/test-booking/login"
            className="rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            Customer Login
          </Link>

          <Link
            href="/test-booking/requests"
            className="rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            My Requests
          </Link>
        </div>
      </div>
    </div>
  );
}