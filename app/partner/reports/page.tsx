"use client";

const stats = [
  { label: "Bids Submitted", value: "24" },
  { label: "Accepted Bids", value: "8" },
  { label: "Completed Bookings", value: "6" },
  { label: "Revenue", value: "£1,842" },
];

export default function PartnerReportsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]"
          >
            <div className="text-sm font-medium text-slate-500">{stat.label}</div>
            <div className="mt-3 text-3xl font-semibold text-[#003768]">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">Reporting Roadmap</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5 text-sm text-slate-700">
            <div className="font-semibold text-[#003768]">Phase 1</div>
            <div className="mt-2">
              Daily and monthly booking totals, bid conversion, and gross revenue.
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5 text-sm text-slate-700">
            <div className="font-semibold text-[#003768]">Phase 2</div>
            <div className="mt-2">
              CSV export, date filters, status breakdown, and partner performance metrics.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}