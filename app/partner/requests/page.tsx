"use client";

const mockRequests = [
  {
    id: "REQ-1001",
    customer: "James Walker",
    delivery: "Valencia Airport",
    collect: "Valencia Airport",
    created: "2026-03-14 10:10",
    expires: "2026-03-15 10:10",
    bids: 2,
    status: "Open",
  },
  {
    id: "REQ-1002",
    customer: "Sophie Martin",
    delivery: "Alicante Airport",
    collect: "Benidorm Centre",
    created: "2026-03-14 09:20",
    expires: "2026-03-15 09:20",
    bids: 1,
    status: "Open",
  },
  {
    id: "REQ-1003",
    customer: "Daniel Evans",
    delivery: "Malaga Airport",
    collect: "Marbella",
    created: "2026-03-13 17:45",
    expires: "2026-03-14 17:45",
    bids: 4,
    status: "Expiring Soon",
  },
];

export default function PartnerRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Search customer or request ID"
              className="w-full rounded-2xl border border-black/10 bg-white p-3 text-black placeholder:text-gray-500"
            />
            <select className="w-full rounded-2xl border border-black/10 bg-white p-3 text-black">
              <option>All statuses</option>
              <option>Open</option>
              <option>Expiring Soon</option>
              <option>Closed</option>
            </select>
            <select className="w-full rounded-2xl border border-black/10 bg-white p-3 text-black">
              <option>All locations</option>
              <option>Valencia</option>
              <option>Alicante</option>
              <option>Malaga</option>
            </select>
          </div>

          <button
            type="button"
            className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Refresh Requests
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f3f8ff] text-[#003768]">
              <tr>
                <th className="px-5 py-4 font-semibold">Request ID</th>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Delivery</th>
                <th className="px-5 py-4 font-semibold">Collect</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold">Expires</th>
                <th className="px-5 py-4 font-semibold">Bids</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {mockRequests.map((request) => (
                <tr key={request.id} className="hover:bg-black/[0.02]">
                  <td className="px-5 py-4 font-semibold text-[#003768]">
                    {request.id}
                  </td>
                  <td className="px-5 py-4 text-slate-800">{request.customer}</td>
                  <td className="px-5 py-4 text-slate-700">{request.delivery}</td>
                  <td className="px-5 py-4 text-slate-700">{request.collect}</td>
                  <td className="px-5 py-4 text-slate-700">{request.created}</td>
                  <td className="px-5 py-4 text-slate-700">{request.expires}</td>
                  <td className="px-5 py-4 text-slate-700">{request.bids}</td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        request.status === "Open"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-800",
                      ].join(" ")}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#003768] hover:bg-black/5"
                    >
                      View Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-black/10 bg-white/70 p-6 text-sm text-slate-600">
        Next step: we will connect this page to real booking requests and add the full bid form.
      </div>
    </div>
  );
}