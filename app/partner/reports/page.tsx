"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type RequestRow = {
  id: string;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  request_status: string | null;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
};

type BookingRow = {
  id: string;
  request_id: string | null;
  booking_status: string | null;
  amount: number | string | null;
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  vehicle_category_name: string | null;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "bid_successful":
    case "approved":
    case "confirmed":
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "bid_submitted":
    case "pending":
    case "open":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "bid_unsuccessful":
    case "rejected":
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

function formatStatusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;

  const itemDate = new Date(value);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (itemDate < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);
    if (itemDate > toDate) return false;
  }

  return true;
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getMonthKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKey() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PartnerReportsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_signed_in");
        return;
      }

      const [requestsRes, bookingsRes] = await Promise.all([
        fetch("/api/partner/requests", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/partner/bookings", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const requestsJson = await safeJson(requestsRes);
      const bookingsJson = await safeJson(bookingsRes);

      if (!requestsRes.ok) {
        throw new Error(
          requestsJson?.error || requestsJson?._raw || "Failed to load requests report data."
        );
      }

      if (!bookingsRes.ok) {
        throw new Error(
          bookingsJson?.error || bookingsJson?._raw || "Failed to load bookings report data."
        );
      }

      setRequests(Array.isArray(requestsJson?.data) ? requestsJson.data : []);
      setBookings(Array.isArray(bookingsJson?.data) ? bookingsJson.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load report data.");
      setRequests([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRequests = requests.filter((row) =>
    matchesDateRange(row.created_at, dateFrom, dateTo)
  );

  const filteredBookings = bookings.filter((row) =>
    matchesDateRange(row.created_at, dateFrom, dateTo)
  );

  const bidsSubmitted = filteredRequests.filter((row) =>
    ["bid_submitted", "bid_successful", "bid_unsuccessful"].includes(
      String(row.status || "").toLowerCase()
    )
  ).length;

  const acceptedBids = filteredRequests.filter(
    (row) => String(row.status || "").toLowerCase() === "bid_successful"
  ).length;

  const completedBookings = filteredBookings.filter(
    (row) => String(row.booking_status || "").toLowerCase() === "completed"
  ).length;

  const bookedRevenue = filteredBookings.reduce((sum, row) => {
    const amount = Number(row.amount || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const openRequests = filteredRequests.filter(
    (row) => String(row.status || "").toLowerCase() === "open"
  ).length;

  const expiredRequests = filteredRequests.filter(
    (row) => String(row.status || "").toLowerCase() === "expired"
  ).length;

  const conversionRate =
    bidsSubmitted > 0 ? Math.round((acceptedBids / bidsSubmitted) * 100) : 0;

  const currentMonthKey = getCurrentMonthKey();
  const previousMonthKey = getPreviousMonthKey();

  const currentMonthRequests = filteredRequests.filter(
    (row) => getMonthKey(row.created_at) === currentMonthKey
  ).length;

  const previousMonthRequests = filteredRequests.filter(
    (row) => getMonthKey(row.created_at) === previousMonthKey
  ).length;

  const currentMonthBookings = filteredBookings.filter(
    (row) => getMonthKey(row.created_at) === currentMonthKey
  ).length;

  const previousMonthBookings = filteredBookings.filter(
    (row) => getMonthKey(row.created_at) === previousMonthKey
  ).length;

  const currentMonthRevenue = filteredBookings
    .filter((row) => getMonthKey(row.created_at) === currentMonthKey)
    .reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);

  const previousMonthRevenue = filteredBookings
    .filter((row) => getMonthKey(row.created_at) === previousMonthKey)
    .reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0);

  const requestStatusBreakdown = Array.from(
    filteredRequests.reduce((map, row) => {
      const key = String(row.status || "unknown").toLowerCase();
      const current = map.get(key) || { status: key, count: 0 };
      current.count += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { status: string; count: number }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count);

  const bookingStatusBreakdown = Array.from(
    filteredBookings.reduce((map, row) => {
      const key = String(row.booking_status || "unknown").toLowerCase();
      const current = map.get(key) || { status: key, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number(row.amount || 0) || 0;
      map.set(key, current);
      return map;
    }, new Map<string, { status: string; count: number; revenue: number }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.revenue - a.revenue);

  const vehicleBreakdown = Array.from(
    filteredBookings.reduce((map, row) => {
      const key = String(row.vehicle_category_name || "Unknown").trim() || "Unknown";
      const current = map.get(key) || { category: key, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number(row.amount || 0) || 0;
      map.set(key, current);
      return map;
    }, new Map<string, { category: string; count: number; revenue: number }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.revenue - a.revenue);

  const recentRequests = [...filteredRequests]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  const recentBookings = [...filteredBookings]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  function exportRequestsCsv() {
    const headers = [
      "Job Number",
      "Pickup Address",
      "Dropoff Address",
      "Pickup At",
      "Dropoff At",
      "Vehicle Category",
      "Request Status",
      "Partner Status",
      "Created At",
      "Expires At",
    ];

    const rows = filteredRequests.map((row) => [
      row.job_number || "",
      row.pickup_address || "",
      row.dropoff_address || "",
      row.pickup_at || "",
      row.dropoff_at || "",
      row.vehicle_category_name || "",
      row.request_status || "",
      row.status || "",
      row.created_at || "",
      row.expires_at || "",
    ]);

    downloadCsv("partner-requests-report.csv", headers, rows);
  }

  function exportBookingsCsv() {
    const headers = [
      "Job Number",
      "Pickup Address",
      "Dropoff Address",
      "Pickup At",
      "Vehicle Category",
      "Booking Status",
      "Amount",
      "Created At",
    ];

    const rows = filteredBookings.map((row) => [
      row.job_number || "",
      row.pickup_address || "",
      row.dropoff_address || "",
      row.pickup_at || "",
      row.vehicle_category_name || "",
      row.booking_status || "",
      row.amount || "",
      row.created_at || "",
    ]);

    downloadCsv("partner-bookings-report.csv", headers, rows);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#003768]">Report Filters</h2>
            <p className="mt-2 text-sm text-slate-600">
              Filter your reporting totals by created date.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <div>
              <label className="text-sm font-medium text-[#003768]">Date from</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#003768]">Date to</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 p-3 text-black"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportRequestsCsv}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#003768] hover:bg-black/5"
          >
            Export Requests CSV
          </button>

          <button
            type="button"
            onClick={exportBookingsCsv}
            className="rounded-full bg-[#ff7a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Export Bookings CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">This Month Requests</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{currentMonthRequests}</div>
          <div className="mt-2 text-xs text-slate-500">Previous month: {previousMonthRequests}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">This Month Bookings</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{currentMonthBookings}</div>
          <div className="mt-2 text-xs text-slate-500">Previous month: {previousMonthBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">This Month Revenue</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">
            {formatCurrency(currentMonthRevenue)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Previous month: {formatCurrency(previousMonthRevenue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Bids Submitted</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{bidsSubmitted}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Accepted Bids</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{acceptedBids}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Completed Bookings</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{completedBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Revenue</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">
            {formatCurrency(bookedRevenue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Conversion Rate</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{conversionRate}%</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Open Requests</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{openRequests}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Expired Requests</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{expiredRequests}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#003768]">Request Status Breakdown</h2>
              <p className="mt-1 text-sm text-slate-600">
                Request volume grouped by partner request status.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f8ff] text-[#003768]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Requests</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {requestStatusBreakdown.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-600" colSpan={2}>
                        No request data available for this period.
                      </td>
                    </tr>
                  ) : (
                    requestStatusBreakdown.map((row) => (
                      <tr key={row.status} className="hover:bg-black/[0.02]">
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                              row.status
                            )}`}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#003768]">Booking Status Revenue Breakdown</h2>
              <p className="mt-1 text-sm text-slate-600">
                Booking volume and revenue grouped by booking status.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f8ff] text-[#003768]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                    <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {bookingStatusBreakdown.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-600" colSpan={3}>
                        No booking data available for this period.
                      </td>
                    </tr>
                  ) : (
                    bookingStatusBreakdown.map((row) => (
                      <tr key={row.status} className="hover:bg-black/[0.02]">
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                              row.status
                            )}`}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{row.count}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#003768]">Vehicle Category Breakdown</h2>
            <p className="mt-1 text-sm text-slate-600">
              Booking volume and revenue grouped by vehicle category.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Vehicle Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                  <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {vehicleBreakdown.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={3}>
                      No vehicle data available for this period.
                    </td>
                  </tr>
                ) : (
                  vehicleBreakdown.map((row) => (
                    <tr key={row.category} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 font-medium text-slate-900">{row.category}</td>
                      <td className="px-4 py-4 text-slate-700">{row.count}</td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Recent Requests</h2>

          {recentRequests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No requests available for this period.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {recentRequests.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-black/5 bg-[#f9fbff] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#003768]">
                        {row.job_number || "No job number"}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {row.pickup_address || "—"} → {row.dropoff_address || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.vehicle_category_name || "—"} • {formatDateTime(row.created_at)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                        row.status
                      )}`}
                    >
                      {formatStatusLabel(row.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Recent Bookings</h2>

          {recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No bookings available for this period.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {recentBookings.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-black/5 bg-[#f9fbff] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#003768]">
                        {row.job_number || "No job number"}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {row.pickup_address || "—"} → {row.dropoff_address || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.vehicle_category_name || "—"} • {formatDateTime(row.created_at)}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#003768]">
                        {formatCurrency(Number(row.amount || 0))}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                        row.booking_status
                      )}`}
                    >
                      {formatStatusLabel(row.booking_status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}