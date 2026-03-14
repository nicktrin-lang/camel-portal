"use client";

const mockBookings = [
  {
    id: "BK-2001",
    customer: "James Walker",
    car: "VW Golf Auto",
    created: "2026-03-12",
    updated: "2026-03-14",
    status: "On Hire",
    total: "£265",
  },
  {
    id: "BK-2002",
    customer: "Sophie Martin",
    car: "Seat Arona",
    created: "2026-03-11",
    updated: "2026-03-13",
    status: "Pending Delivery",
    total: "£198",
  },
  {
    id: "BK-2003",
    customer: "Daniel Evans",
    car: "Ford Kuga",
    created: "2026-03-08",
    updated: "2026-03-10",
    status: "Completed",
    total: "£322",
  },
];

export default function PartnerBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {["All", "Pending", "Active", "Completed", "Cancelled"].map((tab, idx) => (
          <button
            key={tab}
            type="button"
            className={[
              "rounded-full px-5 py-2 text-sm font-semibold",
              idx === 0
                ? "bg-[#003768] text-white"
                : "border border-black/10 bg-white text-[#003768] hover:bg-black/5",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3f8ff] text-[#003768]">
              <tr>
                <th className="px-5 py-4 font-semibold">Booking ID</th>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Car</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold">Updated</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {mockBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-black/[0.02]">
                  <td className="px-5 py-4 font-semibold text-[#003768]">{booking.id}</td>
                  <td className="px-5 py-4 text-slate-800">{booking.customer}</td>
                  <td className="px-5 py-4 text-slate-700">{booking.car}</td>
                  <td className="px-5 py-4 text-slate-700">{booking.created}</td>
                  <td className="px-5 py-4 text-slate-700">{booking.updated}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-[#f3f8ff] px-3 py-1 text-xs font-semibold text-[#003768]">
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-800">{booking.total}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                    >
                      View Booking
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}