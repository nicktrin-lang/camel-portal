"use client";

import Link from "next/link";

export default function GlobalNotFoundPage() {
  return (
    <div className="min-h-screen bg-[#e3f4ff]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-12">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#003768]/70">
            Camel Global
          </div>

          <h1 className="mt-4 text-4xl font-semibold text-[#003768] md:text-5xl">
            Page not found
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
            The page you tried to open does not exist, may have moved, or the link may be
            incorrect.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/partner"
              className="inline-flex min-w-[180px] justify-center rounded-full bg-[#ff7a00] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Go to Portal
            </Link>

            <Link
              href="/admin"
              className="inline-flex min-w-[180px] justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
            >
              Go to Admin
            </Link>
          </div>

          <div className="mt-8 rounded-2xl bg-[#f3f8ff] p-4 text-left">
            <div className="text-sm font-semibold text-[#003768]">Helpful links</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/partner/requests"
                className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-black/[0.02]"
              >
                Partner Requests
              </Link>

              <Link
                href="/partner/bookings"
                className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-black/[0.02]"
              >
                Partner Bookings
              </Link>

              <Link
                href="/admin/approvals"
                className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-black/[0.02]"
              >
                Admin Approvals
              </Link>

              <Link
                href="/admin/accounts"
                className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-black/[0.02]"
              >
                Account Management
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}